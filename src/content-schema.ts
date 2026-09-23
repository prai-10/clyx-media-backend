import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max).default('');
const required = (max: number) => z.string().trim().min(1, 'This field is required').max(max);

// Only http(s) URLs or site-relative paths, so a stored value can never be a javascript: URL.
const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .default('')
  .refine((v) => v === '' || /^https?:\/\//i.test(v) || v.startsWith('/'), 'Must be an http(s) URL or a /path');

const linkUrl = z
  .string()
  .trim()
  .max(500)
  .default('')
  .refine((v) => v === '' || /^(https?:\/\/|mailto:|\/|#)/i.test(v), 'Must be an http(s) URL, mailto:, /path or #anchor');

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #FFDE59')
  .default('#FFDE59');

/** Field rules for each repeating list. Unknown keys are stripped on save. */
export const collectionSchemas = {
  // Admin "Campaigns": client/category/roas/spend/status are the admin card fields;
  // desc/img/cta* feed the homepage carousel (client -> title, category -> tag, roas -> subtitle).
  campaigns: z.object({
    client: required(120),
    category: text(80),
    roas: text(80),
    spend: text(80),
    status: z.enum(['Active', 'Scaling', 'Optimizing', 'Completed']).default('Scaling'),
    desc: text(500),
    img: imageUrl,
    ctaText: text(60),
    ctaUrl: linkUrl,
  }),
  caseStudies: z.object({
    brand: required(120),
    category: text(120),
    headline: text(200),
    result: text(80),
    detail: text(800),
    image: imageUrl,
    accent: hexColor,
  }),
  team: z.object({
    name: required(120),
    role: text(120),
    bio: text(600),
    badge: text(60),
    img: imageUrl,
  }),
  testimonials: z.object({
    name: required(120),
    quote: required(600),
    role: text(120),
    brand: text(120),
    metrics: text(120),
  }),
  blog: z.object({
    title: required(200),
    tag: text(60),
    date: text(30),
    readTime: text(30),
    style: z.enum(['yellow', 'blue', 'soft']).default('yellow'),
  }),
  careers: z.object({
    title: required(160),
    type: text(80),
    detail: text(400),
  }),
  creators: z.object({
    name: text(120),
    handle: text(80),
    platform: text(40),
    reach: text(30),
    image: imageUrl,
  }),
  stats: z.object({
    value: required(30),
    label: text(120),
    detail: text(200),
  }),
} as const;

export type CollectionName = keyof typeof collectionSchemas;
export const collectionNames = Object.keys(collectionSchemas) as CollectionName[];
export const collectionEnum = z.enum(collectionNames as [CollectionName, ...CollectionName[]]);

/** Singleton blocks (one record each). */
export const blockSchemas = {
  hero: z.object({
    headline: text(200),
    sub: text(500),
  }),
} as const;

export type BlockName = keyof typeof blockSchemas;
export const blockNames = Object.keys(blockSchemas) as BlockName[];
export const blockEnum = z.enum(blockNames as [BlockName, ...BlockName[]]);
