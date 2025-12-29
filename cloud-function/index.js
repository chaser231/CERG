/**
 * Yandex Cloud Function для обработки формы заявок
 * Отправляет данные в Telegram-чат
 * 
 * Переменные окружения:
 * - TELEGRAM_BOT_TOKEN: токен бота от @BotFather
 * - TELEGRAM_CHAT_ID: ID чата для уведомлений
 * - ALLOWED_ORIGIN: домен сайта (для CORS)
 */

const https = require('https');

// Отправка сообщения в Telegram
async function sendTelegramMessage(botToken, chatId, message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Telegram API error: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Форматирование даты
function formatDate() {
  const now = new Date();
  const options = { 
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return now.toLocaleString('ru-RU', options);
}

// Экранирование HTML
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Основной обработчик
module.exports.handler = async function (event, context) {
  // CORS headers
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Обработка preflight запроса
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Только POST запросы
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    // Парсинг тела запроса
    let body;
    if (event.isBase64Encoded) {
      body = Buffer.from(event.body, 'base64').toString('utf-8');
    } else {
      body = event.body;
    }

    // Поддержка form-data и JSON
    let data;
    const contentType = event.headers['Content-Type'] || event.headers['content-type'] || '';
    
    if (contentType.includes('application/json')) {
      data = JSON.parse(body);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      data = Object.fromEntries(new URLSearchParams(body));
    } else if (contentType.includes('multipart/form-data')) {
      // Простой парсинг multipart (для FormData)
      const boundary = contentType.split('boundary=')[1];
      const parts = body.split(`--${boundary}`);
      data = {};
      for (const part of parts) {
        const match = part.match(/name="([^"]+)"\r\n\r\n([^\r\n]*)/);
        if (match) {
          data[match[1]] = match[2];
        }
      }
    } else {
      data = JSON.parse(body);
    }

    // Валидация данных
    const { name, email, phone } = data;
    
    if (!name || !email || !phone) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: name, email, phone' 
        })
      };
    }

    // Формирование сообщения для Telegram
    const message = `
<b>📋 Новая заявка с сайта ЦЕРГ</b>

<b>👤 Имя:</b> ${escapeHtml(name)}
<b>📧 Email:</b> ${escapeHtml(email)}
<b>📱 Телефон:</b> ${escapeHtml(phone)}

<i>🕐 ${formatDate()}</i>
    `.trim();

    // Отправка в Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        })
      };
    }

    await sendTelegramMessage(botToken, chatId, message);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true, 
        message: 'Заявка успешно отправлена' 
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      })
    };
  }
};

