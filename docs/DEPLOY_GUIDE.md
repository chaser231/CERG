# Руководство по деплою ЦЕРГ

## Содержание
1. [Telegram-бот для заявок](#1-telegram-бот-для-заявок)
2. [VPS в РФ](#2-vps-в-рф)
3. [Настройка домена](#3-настройка-домена)
4. [Яндекс.Метрика](#4-яндексметрика)
5. [CMS (админка)](#5-cms-админка)
6. [Чеклист перед запуском](#6-чеклист-перед-запуском)

---

## 1. Telegram-бот для заявок

### 1.1 Создание бота

1. Откройте Telegram, найдите **@BotFather**
2. Отправьте `/newbot`
3. Введите имя: `ЦЕРГ Заявки`
4. Введите username: `cerg_leads_bot` (или любой свободный)
5. **Сохраните токен** — он понадобится для Cloud Function

### 1.2 Получение Chat ID

**Для личных сообщений:**
1. Напишите боту любое сообщение
2. Откройте в браузере: `https://api.telegram.org/bot<ТОКЕН>/getUpdates`
3. Найдите `"chat":{"id": XXXXXXX}` — это ваш Chat ID

**Для группового чата:**
1. Добавьте бота в группу
2. Напишите что-нибудь в группе
3. Откройте: `https://api.telegram.org/bot<ТОКЕН>/getUpdates`
4. Chat ID группы будет отрицательным: `-100XXXXXXXXXX`

### 1.3 Развёртывание Cloud Function

Подробная инструкция в файле `cloud-function/README.md`

**Краткие шаги:**
```bash
# 1. Установите Yandex Cloud CLI
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash

# 2. Авторизуйтесь
yc init

# 3. Создайте функцию
cd cloud-function
zip function.zip index.js
yc serverless function create --name cerg-contact-form

# 4. Загрузите код с переменными
yc serverless function version create \
  --function-name cerg-contact-form \
  --runtime nodejs18 \
  --entrypoint index.handler \
  --memory 128m \
  --execution-timeout 10s \
  --source-path function.zip \
  --environment TELEGRAM_BOT_TOKEN=<ТОКЕН_БОТА> \
  --environment TELEGRAM_CHAT_ID=<CHAT_ID> \
  --environment ALLOWED_ORIGIN=https://cerh.pro

# 5. Создайте API Gateway (см. cloud-function/README.md)
```

### 1.4 Обновление формы на сайте

После получения URL API Gateway, обновите файл `src/components/sections/ContactForm.astro`:

```javascript
const FORM_ENDPOINT = "https://ВАША_ФУНКЦИЯ.apigw.yandexcloud.net/submit";
```

---

## 2. VPS в РФ

### 2.1 Рекомендуемые провайдеры

| Провайдер | Минимальный тариф | Примечание |
|-----------|------------------|------------|
| **Timeweb Cloud** | ~300₽/мес | Простая панель |
| **Selectel** | ~400₽/мес | Надёжный |
| **Yandex Cloud Compute** | ~500₽/мес | Единая экосистема |
| **REG.RU VPS** | ~350₽/мес | Популярный |

**Минимальные требования:**
- 1 CPU, 1GB RAM, 10GB SSD
- Ubuntu 22.04 LTS

### 2.2 Настройка сервера

```bash
# 1. Подключитесь к VPS
ssh root@YOUR_VPS_IP

# 2. Обновите систему
apt update && apt upgrade -y

# 3. Установите Nginx
apt install nginx -y

# 4. Создайте пользователя для деплоя
adduser deploy
usermod -aG sudo deploy

# 5. Настройте SSH-ключи для deploy пользователя
su - deploy
mkdir ~/.ssh
chmod 700 ~/.ssh
# Добавьте публичный ключ в ~/.ssh/authorized_keys

# 6. Создайте директорию для сайта
sudo mkdir -p /var/www/cerg
sudo chown deploy:deploy /var/www/cerg
```

### 2.3 Конфигурация Nginx

Создайте файл `/etc/nginx/sites-available/cerg`:

```nginx
server {
    listen 80;
    server_name cerh.pro www.cerh.pro;
    root /var/www/cerg;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Кэширование статики
    location ~* \.(js|css|png|jpg|jpeg|gif|webp|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback для Astro
    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    # Запрет доступа к скрытым файлам
    location ~ /\. {
        deny all;
    }
}
```

```bash
# Активируйте конфиг
sudo ln -s /etc/nginx/sites-available/cerg /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2.4 SSL-сертификат (Certbot)

```bash
# Установите Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получите сертификат
sudo certbot --nginx -d cerh.pro -d www.cerh.pro

# Автоматическое обновление (добавится автоматически)
sudo certbot renew --dry-run
```

### 2.5 Настройка GitHub Actions

1. Сгенерируйте SSH-ключ для деплоя:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key
```

2. Добавьте **публичный ключ** на VPS:
```bash
cat deploy_key.pub >> ~/.ssh/authorized_keys
```

3. Добавьте **секреты** в GitHub репозиторий (Settings → Secrets):
   - `VPS_HOST`: IP-адрес VPS
   - `VPS_USER`: `deploy`
   - `VPS_SSH_KEY`: содержимое файла `deploy_key` (приватный ключ)
   - `VPS_PATH`: `/var/www/cerg`

4. Workflow уже создан: `.github/workflows/deploy-vps.yml`

---

## 3. Настройка домена cerh.pro

### 3.1 Регистрация домена

**Выбранный регистратор:** NIC.ru

**При покупке выбирайте минимум:**
- ❌ Хостинг — не нужен
- ❌ SSL — не нужен (бесплатный Certbot)
- ❌ Конструктор сайтов — не нужен
- ✅ **Только домен**

### 3.2 DNS-записи в NIC.ru

В панели управления NIC.ru → **DNS** → добавьте:

| Тип | Хост | Значение | TTL |
|-----|------|----------|-----|
| A | @ | IP_ВАШЕГО_VPS | 3600 |
| A | www | IP_ВАШЕГО_VPS | 3600 |

### 3.3 Конфиг Astro

Конфиг уже настроен на `cerh.pro`:
```javascript
site: 'https://cerh.pro',
```

---

## 4. Яндекс.Метрика

### 4.1 Создание счётчика

1. Откройте [Яндекс.Метрика](https://metrika.yandex.ru)
2. Нажмите «Добавить счётчик»
3. Укажите:
   - Имя: `ЦЕРГ`
   - Адрес сайта: `cerg.ru`
4. Скопируйте код счётчика

### 4.2 Добавление на сайт

Добавьте код в `src/layouts/Layout.astro` перед закрывающим тегом `</head>`:

```html
<!-- Яндекс.Метрика -->
<script type="text/javascript">
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

   ym(XXXXXXXX, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true,
        webvisor:true
   });
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/XXXXXXXX" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
```

Замените `XXXXXXXX` на номер вашего счётчика.

### 4.3 Цели для формы

В Метрике создайте цель:
- Тип: JavaScript-событие
- Идентификатор: `form_submit`

В `ContactForm.astro` добавьте после успешной отправки:
```javascript
if (typeof ym !== 'undefined') {
  ym(XXXXXXXX, 'reachGoal', 'form_submit');
}
```

---

## 5. CMS (админка)

Админка доступна по адресу `https://cerh.pro/admin/` и позволяет редактировать контент сайта через удобный интерфейс.

### 5.1 Создание GitHub OAuth App

1. Войдите в GitHub под аккаунтом, который имеет доступ к репозиторию
2. Перейдите: **Settings → Developer settings → OAuth Apps → New OAuth App**
3. Заполните:
   - **Application name:** `ЦЕРГ CMS`
   - **Homepage URL:** `https://cerh.pro`
   - **Authorization callback URL:** `https://cerh.pro/oauth/callback`
4. Нажмите **Register application**
5. **Сохраните Client ID** (виден сразу)
6. Нажмите **Generate a new client secret** и **сохраните Client Secret** (показывается только один раз!)

### 5.2 Развёртывание OAuth сервера на VPS

```bash
# 1. Подключитесь к VPS
ssh deploy@YOUR_VPS_IP

# 2. Установите Node.js (если не установлен)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Создайте директорию для OAuth сервера
sudo mkdir -p /var/www/cerg-oauth
sudo chown deploy:deploy /var/www/cerg-oauth

# 4. Скопируйте файлы из oauth-server/
# (можно через scp или git clone)
cd /var/www/cerg-oauth
# Разместите здесь index.js и package.json из папки oauth-server/
```

### 5.3 Создание systemd сервиса

Создайте файл `/etc/systemd/system/cerg-oauth.service`:

```ini
[Unit]
Description=CERG OAuth Server for Decap CMS
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/cerg-oauth
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=10

# Переменные окружения (замените на реальные значения!)
Environment=GITHUB_CLIENT_ID=ваш_client_id
Environment=GITHUB_CLIENT_SECRET=ваш_client_secret
Environment=ORIGIN=https://cerh.pro
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

```bash
# Активируйте и запустите сервис
sudo systemctl daemon-reload
sudo systemctl enable cerg-oauth
sudo systemctl start cerg-oauth

# Проверьте статус
sudo systemctl status cerg-oauth
```

### 5.4 Настройка Nginx proxy

Добавьте в `/etc/nginx/sites-available/cerg` внутри блока `server`:

```nginx
# OAuth proxy для CMS
location /oauth/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

```bash
# Проверьте конфиг и перезагрузите
sudo nginx -t
sudo systemctl reload nginx
```

### 5.5 Проверка работы

1. Откройте `https://cerh.pro/admin/`
2. Нажмите **Войти через GitHub**
3. Авторизуйтесь в GitHub
4. После успешного входа вы увидите панель управления контентом

### 5.6 Кто может редактировать контент?

Доступ к CMS имеют пользователи GitHub, у которых есть права на запись в репозиторий `chaser231/CERG`. Чтобы добавить нового редактора:

1. Перейдите в репозиторий на GitHub
2. **Settings → Collaborators → Add people**
3. Добавьте GitHub-аккаунт редактора

---

## 6. Чеклист перед запуском

### Функционал
- [ ] Все секции отображаются корректно
- [ ] Форма отправляет заявки в Telegram
- [ ] Навигация работает (скролл к секциям)
- [ ] Мобильное меню открывается/закрывается
- [ ] FAQ аккордеон работает

### Адаптивность
- [ ] Мобильный (375px) — нет горизонтального скролла
- [ ] Планшет (768px) — сетки корректны
- [ ] Десктоп (1440px) — соответствует макету

### SEO
- [ ] Title и description заполнены
- [ ] robots.txt доступен по /robots.txt
- [ ] sitemap.xml генерируется

### Юридическое
- [ ] /privacy доступна
- [ ] /terms доступна
- [ ] Чекбокс согласия в форме работает

### Безопасность
- [ ] SSL-сертификат установлен (https://)
- [ ] /admin/ защищён авторизацией

### CMS (админка)
- [ ] GitHub OAuth App создан
- [ ] OAuth сервер запущен на VPS (systemctl status cerg-oauth)
- [ ] Nginx proxy настроен для /oauth/
- [ ] Вход через GitHub работает
- [ ] Можно редактировать и сохранять контент

---

## Контакты разработчика

По техническим вопросам обращайтесь: [указать контакт]
