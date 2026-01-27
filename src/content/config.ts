import { defineCollection, z } from 'astro:content';

/**
 * Content Collections Configuration
 * Определяет схемы данных для всех коллекций контента
 * Используется для типобезопасности и валидации
 */

// Коллекция услуг
const servicesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    price: z.number(),
    priceLabel: z.string().optional().default('₽'),
    duration: z.number(), // в минутах
    durationLabel: z.string().optional().default('мин'),
    image: z.string(),
    order: z.number().optional().default(0),
    featured: z.boolean().optional().default(false),
    category: z.enum(['services', 'packages']).optional().default('services'), // Терапия или Пакеты
  }),
});

// Коллекция курсов
const coursesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    price: z.number(),
    priceLabel: z.string().optional().default('₽'),
    lessonsCount: z.number(),
    hoursCount: z.number(),
    description: z.string().optional(),
    order: z.number().optional().default(0),
    featured: z.boolean().optional().default(false),
  }),
});

// Коллекция отзывов
const reviewsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string().optional(), // Опционально для анонимных отзывов клиентов
    role: z.string().optional(), // Опционально для анонимных отзывов
    quote: z.string(), // Краткая цитата (превью)
    fullText: z.string().optional(), // Полный текст отзыва (для модалки)
    image: z.string().optional(), // Опционально для анонимных отзывов клиентов
    category: z.enum(['clients', 'students']), // Клиенты или Ученики
    order: z.number().optional().default(0),
  }),
});

// Коллекция экспертов
const expertsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    specialization: z.string(),
    description: z.string(),
    image: z.string(),
    badges: z.array(z.string()).optional().default([]),
    lightBackground: z.boolean().optional().default(false), // Для тёмного оверлея
    order: z.number().optional().default(0),
  }),
});

// Коллекция FAQ
const faqCollection = defineCollection({
  type: 'content',
  schema: z.object({
    question: z.string(),
    order: z.number().optional().default(0),
  }),
});

// Коллекция направлений
const directionsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    number: z.string(), // "01", "02", etc.
    image: z.string(),
    order: z.number().optional().default(0),
  }),
});

// Настройки сайта (singleton)
const settingsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    siteTitle: z.string(),
    siteDescription: z.string(),
    heroTitle: z.array(z.string()), // ["Центр", "регрессивного", "гипноза"]
    heroDescription: z.string(),
    aboutTitle: z.string(),
    aboutDescription: z.string(),
    contactEmail: z.string().email(),
    contactPhone: z.string(),
    contactAddress: z.string(),
    socialVk: z.string().url().optional(),
    socialTelegram: z.string().url().optional(),
  }),
});

export const collections = {
  services: servicesCollection,
  courses: coursesCollection,
  reviews: reviewsCollection,
  experts: expertsCollection,
  faq: faqCollection,
  directions: directionsCollection,
  settings: settingsCollection,
};

