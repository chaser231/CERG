// @ts-check
/**
 * Конфигурация для ПРОДАКШЕНА (VPS в РФ)
 * 
 * Использование:
 * 1. npm install @astrojs/sitemap
 * 2. Переименовать этот файл в astro.config.mjs (заменить текущий)
 * 3. Обновить домен site на реальный
 * 4. npm run build
 */
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Продакшен домен
  site: 'https://cerh.pro',
  
  // Убрать base для корневого домена
  // base: '/CERG', — только для GitHub Pages
  
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [
    preact(),
    sitemap({
      // Исключаем админку из sitemap
      filter: (page) => !page.includes('/admin')
    })
  ]
});
