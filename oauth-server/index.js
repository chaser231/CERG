/**
 * OAuth сервер для Decap CMS
 * Обеспечивает авторизацию через GitHub для редактирования контента
 * 
 * Переменные окружения:
 * - GITHUB_CLIENT_ID: Client ID из GitHub OAuth App
 * - GITHUB_CLIENT_SECRET: Client Secret из GitHub OAuth App
 * - ORIGIN: домен сайта (например, https://cerh.pro)
 */

const http = require('http');
const https = require('https');
const url = require('url');

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const ORIGIN = process.env.ORIGIN || 'https://cerh.pro';
const PORT = process.env.PORT || 3000;

/**
 * Выполняет HTTPS POST запрос
 */
function httpsPost(hostname, path, data) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams(data).toString();
    
    const options = {
      hostname,
      port: 443,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          // GitHub может вернуть данные как query string
          resolve(Object.fromEntries(new URLSearchParams(body)));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * HTML страница для передачи токена обратно в CMS
 */
function renderCallback(status, content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OAuth Callback</title>
</head>
<body>
  <script>
    (function() {
      function receiveMessage(e) {
        console.log("receiveMessage %o", e);
        window.opener.postMessage(
          'authorization:github:${status}:${JSON.stringify(content)}',
          e.origin
        );
        window.removeEventListener("message", receiveMessage, false);
      }
      window.addEventListener("message", receiveMessage, false);
      window.opener.postMessage("authorizing:github", "*");
    })();
  </script>
</body>
</html>
`;
}

/**
 * Основной HTTP сервер
 */
const server = http.createServer(async (req, res) => {
  const { pathname, query } = url.parse(req.url, true);

  // Проверка конфигурации
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server configuration error');
    return;
  }

  // /auth - начало OAuth flow, редирект на GitHub
  if (pathname === '/auth') {
    const scope = query.scope || 'repo,user';
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('scope', scope);
    
    console.log(`[OAuth] Redirecting to GitHub authorization`);
    res.writeHead(302, { 'Location': authUrl.toString() });
    res.end();
    return;
  }

  // /callback - обмен code на access_token
  if (pathname === '/callback') {
    const code = query.code;
    
    if (!code) {
      console.error('[OAuth] Missing code parameter');
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(renderCallback('error', { error: 'Missing code parameter' }));
      return;
    }

    try {
      console.log(`[OAuth] Exchanging code for access token`);
      
      // Обмен кода на токен
      const tokenResponse = await httpsPost('github.com', '/login/oauth/access_token', {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code
      });

      if (tokenResponse.error) {
        console.error('[OAuth] GitHub error:', tokenResponse.error_description || tokenResponse.error);
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(renderCallback('error', { 
          error: tokenResponse.error_description || tokenResponse.error 
        }));
        return;
      }

      const token = tokenResponse.access_token;
      
      if (!token) {
        console.error('[OAuth] No access_token in response');
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(renderCallback('error', { error: 'Failed to get access token' }));
        return;
      }

      console.log(`[OAuth] Successfully obtained access token`);
      
      // Возвращаем токен в CMS через postMessage
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(renderCallback('success', { 
        token: token,
        provider: 'github'
      }));
      
    } catch (error) {
      console.error('[OAuth] Error:', error.message);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(renderCallback('error', { error: error.message }));
    }
    return;
  }

  // Любой другой путь
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[OAuth] Server running on port ${PORT}`);
  console.log(`[OAuth] Origin: ${ORIGIN}`);
  console.log(`[OAuth] Client ID configured: ${CLIENT_ID ? 'Yes' : 'No'}`);
});
