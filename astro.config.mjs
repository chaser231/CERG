// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  // Продакшен домен
  site: 'https://cerh.pro',

  // Убрали base — сайт в корне домена
  // base: '/CERG', — использовать только для GitHub Pages

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [preact()],
  adapter: cloudflare()
});