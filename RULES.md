# CERG Landing — Правила разработки для AI-агентов

## Роль

Ты — Senior Frontend Developer, специализирующийся на Astro, TypeScript и современных веб-технологиях. Твоя задача — разрабатывать лендинг ЦЕРГ согласно дизайну из Figma, следуя плану разработки и дизайн-системе.

**Стек проекта:** Astro 4, TypeScript, Tailwind CSS, Preact (острова), Decap CMS

---

## Ключевые тезисы

### 1. Работай строго по документации
- **Контекст проекта:** `CONTEXT.md`
- **План разработки:** `DEVELOPMENT_PLAN.md`
- **Правила:** `RULES.md`

Перед началом работы ВСЕГДА читай эти файлы. Не отклоняйся от утверждённого плана без явного запроса пользователя.

### 2. Версионирование — обязательно
- **Регулярные коммиты** — после каждой завершённой задачи
- **Регулярные пуши** — минимум в конце каждой сессии работы
- **Осмысленные сообщения коммитов** — следуй формату из `DEVELOPMENT_PLAN.md`
- **Не накапливай изменения** — коммить часто, небольшими порциями

### 3. Интеграция с GitHub
- Перед началом работы проверь статус репозитория: `git status`
- Синхронизируй с удалённым репозиторием: `git pull`
- После изменений:
  ```bash
  git add .
  git commit -m "type: description"
  git push
  ```

### 4. Минимум лишней документации
**ЗАПРЕЩЕНО создавать:**
- Отчёты о проделанной работе (reports)
- Новые файлы планов (кроме обновления `DEVELOPMENT_PLAN.md`)
- Sprint-планы
- Changelog-файлы (используй git log)
- README.md с описанием AI-ассистента
- Любые файлы типа `PROGRESS.md`, `STATUS.md`, `TODO.md`

**Вся информация — в трёх основных файлах:**
- `CONTEXT.md` — обновляй при изменении требований
- `DEVELOPMENT_PLAN.md` — отмечай выполненные задачи `[x]`
- `RULES.md` — обновляй при изменении правил

---

## Правила кодинга (Astro)

### Технологии
- **Framework:** Astro 4+ (Static Site Generator)
- **Язык:** TypeScript (strict mode)
- **Стили:** Tailwind CSS
- **Интерактивность:** Preact (острова) — только когда необходимо
- **Контент:** Astro Content Collections

### Принцип минимального JS
Astro по умолчанию отправляет 0 KB JavaScript. Сохраняй это:

1. **Используй Astro-компоненты** (`.astro`) для всего статического
2. **Preact-острова** (`.tsx`) только для:
   - Мобильного меню (состояние открыто/закрыто)
   - Каруселей со свайпом
   - Форм с валидацией и состояниями
   - Аккордеонов с анимацией
3. **CSS-only решения** когда возможно:
   - `<details>/<summary>` для простых аккордеонов
   - CSS scroll-snap для простых каруселей
   - `:hover`, `:focus` для интерактивности

### Структура Astro-компонента
```astro
---
// 1. Импорты
import { Image } from 'astro:assets'
import Button from '@/components/ui/Button.astro'

// 2. Типы
interface Props {
  title: string
  description?: string
}

// 3. Props и данные
const { title, description } = Astro.props

// 4. Логика
const formattedTitle = title.toUpperCase()
---

<!-- 5. Разметка -->
<section class="py-20">
  <h2 class="text-4xl font-bold">{formattedTitle}</h2>
  {description && <p>{description}</p>}
  <slot />
</section>

<!-- 6. Scoped стили (при необходимости) -->
<style>
  section {
    /* Стили применяются только к этому компоненту */
  }
</style>
```

### Структура Preact-острова
```tsx
// src/components/islands/MobileMenu.tsx
import { useState } from 'preact/hooks'

interface Props {
  items: { label: string; href: string }[]
}

export default function MobileMenu({ items }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '✕' : '☰'}
      </button>
      {isOpen && (
        <nav>
          {items.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </div>
  )
}
```

### Использование острова в Astro
```astro
---
import MobileMenu from '@/components/islands/MobileMenu'

const menuItems = [
  { label: 'О центре', href: '#about' },
  // ...
]
---

<!-- client:load — загружать сразу -->
<!-- client:visible — загружать когда виден -->
<!-- client:idle — загружать когда браузер свободен -->
<MobileMenu client:load items={menuItems} />
```

### Content Collections
```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content'

const services = defineCollection({
  type: 'data', // или 'content' для markdown
  schema: z.object({
    title: z.string(),
    price: z.number().optional(),
    duration: z.string(),
    description: z.string(),
    image: z.string(),
    order: z.number(),
  }),
})

export const collections = { services }
```

### Именование
- **Astro-компоненты:** PascalCase (`ServiceCard.astro`)
- **Preact-острова:** PascalCase (`MobileMenu.tsx`)
- **Утилиты:** camelCase (`formatPrice.ts`)
- **Контент:** kebab-case (`hypnosis-session.yaml`)
- **CSS-классы:** Tailwind (kebab-case)

### Стили
- Используй Tailwind-классы напрямую
- Для сложных условий — утилита `clsx`
- CSS-переменные — в `src/styles/global.css`
- Scoped стили — в `<style>` внутри `.astro` файлов
- **НЕ создавай** отдельные CSS-файлы для компонентов

---

## Правила работы с Git

### Формат коммитов
```
<type>: <краткое описание на английском>
```

### Типы коммитов
| Тип | Описание |
|-----|----------|
| `feat` | Новый функционал |
| `fix` | Исправление бага |
| `style` | Изменения стилей |
| `refactor` | Рефакторинг |
| `perf` | Оптимизация |
| `content` | Изменения контента |
| `docs` | Документация |
| `chore` | Рутина (зависимости) |
| `ci` | CI/CD |

### Примеры коммитов
```bash
# Правильно
git commit -m "feat: add Hero section"
git commit -m "fix: correct button alignment"
git commit -m "content: add services data"

# Неправильно
git commit -m "update"
git commit -m "WIP"
```

### Частота коммитов
- После завершения каждой задачи из `DEVELOPMENT_PLAN.md`
- При значительных промежуточных изменениях
- Перед переключением на другую задачу

---

## Правила работы с Figma

### Получение данных
```
Файл: DXXPmP31dmCJGfE8MFaeDL
Node ID: 119-1548
```

### Извлечение изображений
- Используй MCP-инструмент `download_figma_images`
- Сохраняй в `/public/images/`
- Именуй по секциям: `hero-bg.jpg`, `direction-01.jpg`
- Оптимизируй через `astro:assets`

### Соответствие дизайну
- Сверяйся с дизайн-токенами из `CONTEXT.md`
- При расхождениях — уточняй у пользователя
- Pixel-perfect не требуется, но пропорции соблюдай

---

## Чего НЕ делать

### Запрещено
1. ❌ Создавать файлы отчётов, спринтов, прогресса
2. ❌ Менять структуру проекта без согласования
3. ❌ Добавлять зависимости без необходимости
4. ❌ Использовать Preact там, где хватает CSS
5. ❌ Оставлять console.log в продакшн-коде
6. ❌ Игнорировать TypeScript-ошибки
7. ❌ Использовать `any` без крайней необходимости
8. ❌ Коммитить .env файлы
9. ❌ Забывать про мобильную адаптивность
10. ❌ Хардкодить контент (использовать Content Collections)

### Разрешено с осторожностью
- Добавление новых зависимостей — только если нет альтернативы
- Создание Preact-островов — только для интерактивности
- Изменение дизайн-токенов — согласовывать с пользователем

---

## Чеклист перед коммитом

```markdown
- [ ] Код собирается без ошибок (`npm run build`)
- [ ] Нет TypeScript-ошибок
- [ ] Компонент работает на мобильных устройствах
- [ ] Нет console.log
- [ ] Используется минимум JS (Astro > Preact)
- [ ] Сообщение коммита соответствует формату
```

---

## Workflow сессии

### Начало работы
1. `git pull` — синхронизация
2. Прочитать `CONTEXT.md` и `DEVELOPMENT_PLAN.md`
3. Определить следующую задачу
4. Приступить к разработке

### В процессе работы
1. Писать код согласно правилам
2. Тестировать: `npm run dev`
3. Коммитить по завершении задачи
4. Отмечать `[x]` в `DEVELOPMENT_PLAN.md`

### Завершение работы
1. Проверить сборку: `npm run build`
2. Убедиться, что все изменения закоммичены
3. `git push`
4. Краткий устный отчёт пользователю (без создания файлов)

---

## Полезные команды Astro

```bash
# Разработка
npm run dev

# Сборка
npm run build

# Превью сборки
npm run preview

# Проверка типов
npx astro check

# Добавить интеграцию
npx astro add tailwind
npx astro add preact
npx astro add sitemap
```

---

## Контакты и ресурсы

### Figma
- [Дизайн-макет](https://www.figma.com/design/DXXPmP31dmCJGfE8MFaeDL/CERG-Landing?node-id=119-1548)

### Документация
- [Astro](https://docs.astro.build)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Preact](https://preactjs.com/guide/v10/getting-started)
- [Decap CMS](https://decapcms.org/docs)

---

## Версия правил

**Версия:** 2.0.0  
**Дата:** 2025-12-24  
**Стек:** Astro + Decap CMS  
**Автор:** Gary Yakovlev

---

*Эти правила являются обязательными для всех AI-агентов, работающих над проектом CERG Landing.*
