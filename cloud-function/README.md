# Yandex Cloud Function — Обработка формы ЦЕРГ

Serverless-функция для обработки заявок с сайта и отправки уведомлений в Telegram.

## 🏗️ Архитектура

```
Сайт ЦЕРГ → Yandex Cloud Function → Telegram Bot → Чат заказчика
```

## 📋 Требования

1. Аккаунт Yandex Cloud
2. Telegram Bot (создаётся через @BotFather)
3. Telegram Chat ID

---

## 🚀 Инструкция по настройке

### Шаг 1: Создание Telegram бота

1. Открой Telegram, найди @BotFather
2. Отправь команду `/newbot`
3. Введи имя бота: `CERG Заявки`
4. Введи username: `cerg_leads_bot` (или любой свободный)
5. **Сохрани токен** — он понадобится позже

### Шаг 2: Получение Chat ID

**Вариант А: Личные сообщения**
1. Напиши боту любое сообщение
2. Открой: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Найди `"chat":{"id": XXXXXXX}` — это твой Chat ID

**Вариант Б: Групповой чат**
1. Добавь бота в группу
2. Напиши что-нибудь в группе
3. Открой: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Chat ID группы будет отрицательным: `-100XXXXXXXXXX`

### Шаг 3: Настройка Yandex Cloud

#### 3.1 Создание сервисного аккаунта

```bash
# Установи Yandex Cloud CLI
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash

# Авторизуйся
yc init

# Создай сервисный аккаунт
yc iam service-account create --name cerg-function-sa

# Назначь роль
yc resource-manager folder add-access-binding <FOLDER_ID> \
  --role functions.functionInvoker \
  --service-account-name cerg-function-sa
```

#### 3.2 Создание функции

```bash
# Перейди в папку с функцией
cd cloud-function

# Создай ZIP-архив
zip function.zip index.js

# Создай функцию
yc serverless function create --name cerg-contact-form

# Создай версию функции
yc serverless function version create \
  --function-name cerg-contact-form \
  --runtime nodejs18 \
  --entrypoint index.handler \
  --memory 128m \
  --execution-timeout 10s \
  --source-path function.zip \
  --environment TELEGRAM_BOT_TOKEN=<YOUR_BOT_TOKEN> \
  --environment TELEGRAM_CHAT_ID=<YOUR_CHAT_ID> \
  --environment ALLOWED_ORIGIN=https://your-site.netlify.app
```

#### 3.3 Создание API Gateway (для HTTPS-доступа)

```bash
# Создай API Gateway
yc serverless api-gateway create --name cerg-api --spec api-gateway.yaml
```

Файл `api-gateway.yaml`:
```yaml
openapi: 3.0.0
info:
  title: CERG Contact Form API
  version: 1.0.0

paths:
  /submit:
    post:
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: <FUNCTION_ID>
        service_account_id: <SERVICE_ACCOUNT_ID>
    options:
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: <FUNCTION_ID>
        service_account_id: <SERVICE_ACCOUNT_ID>
```

### Шаг 4: Получение URL функции

После создания API Gateway, получи URL:
```bash
yc serverless api-gateway get --name cerg-api
```

URL будет выглядеть примерно так:
```
https://d5d1234567890.apigw.yandexcloud.net/submit
```

### Шаг 5: Обновление формы на сайте

В файле `src/components/sections/ContactForm.astro` замени endpoint:
```javascript
const FORM_ENDPOINT = "https://d5d1234567890.apigw.yandexcloud.net/submit";
```

---

## 🧪 Тестирование

```bash
curl -X POST https://your-api-gateway-url/submit \
  -H "Content-Type: application/json" \
  -d '{"name": "Тест", "email": "test@test.ru", "phone": "+7 (999) 123-45-67"}'
```

Ожидаемый ответ:
```json
{"success": true, "message": "Заявка успешно отправлена"}
```

---

## 💰 Стоимость

Yandex Cloud Functions — практически бесплатно для небольших нагрузок:
- **1 млн вызовов/месяц** — бесплатно
- **Далее** — ~0.04₽ за вызов

---

## 🔧 Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather | `123456:ABC-DEF...` |
| `TELEGRAM_CHAT_ID` | ID чата для уведомлений | `123456789` или `-100123456789` |
| `ALLOWED_ORIGIN` | Домен сайта для CORS | `https://cerg.ru` |

---

## 📝 Формат уведомления

```
📋 Новая заявка с сайта ЦЕРГ

👤 Имя: Иван Иванов
📧 Email: ivan@mail.ru
📱 Телефон: +7 (999) 123-45-67

🕐 25.12.2024, 14:30
```

