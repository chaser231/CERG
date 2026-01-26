# Руководство по деплою ЦЕРГ

## Содержание
1. [Telegram-бот для заявок](#1-telegram-бот-для-заявок)
2. [VPS в РФ](#2-vps-в-рф)
3. [Настройка домена](#3-настройка-домена)
4. [Яндекс.Метрика](#4-яндексметрика)
5. [Чеклист перед запуском](#5-чеклист-перед-запуском)

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
  --environment ALLOWED_ORIGIN=https://cerg.ru

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
    server_name cerg.ru www.cerg.ru;
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
sudo certbot --nginx -d cerg.ru -d www.cerg.ru

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

## 3. Настройка домена

### 3.1 Регистрация домена

Рекомендуемые регистраторы для .ru:
- REG.RU
- Beget
- Timeweb

### 3.2 DNS-записи

Добавьте следующие записи:

| Тип | Имя | Значение | TTL |
|-----|-----|----------|-----|
| A | @ | IP_VPS | 3600 |
| A | www | IP_VPS | 3600 |
| CNAME | www | cerg.ru | 3600 |

### 3.3 Обновление конфига Astro

Перед деплоем замените `astro.config.mjs` на `astro.config.production.mjs`:

```bash
cp astro.config.production.mjs astro.config.mjs
```

Убедитесь, что `site` указывает на ваш домен:
```javascript
site: 'https://cerg.ru',
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

## 5. Чеклист перед запуском

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

---

## Контакты разработчика

По техническим вопросам обращайтесь: [указать контакт]
