import type { BlockName, CollectionName } from './content-schema.js';

/**
 * Initial content, copied from what the live site showed before the CMS existed,
 * so the first deploy looks identical. Edited afterwards from the admin panel.
 */
const u = (id: string, w = 1000) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;

export const seedBlocks: Record<BlockName, Record<string, unknown>> = {
  hero: {
    headline: 'We turn organic clips into scaled accounts.',
    sub: 'CLYX Media runs the creator whitelisting + performance engine behind brands that sell — Meta & Google ads, content, branding, and websites built for one job: conversion.',
  },
};

export const seedCollections: Record<CollectionName, Record<string, unknown>[]> = {
  stats: [
    { value: '₹1Cr+', label: 'Ad Spend Managed', detail: 'Across Meta & Google ad accounts' },
    { value: '5X+', label: 'Average ROAS Lift', detail: 'Whitelisted vs Standard brand ads' },
    { value: '250+', label: 'Active Creators', detail: 'Fashion, Beauty, Food, Tech benches' },
    { value: '₹10Cr+', label: 'Revenue Generated', detail: 'Delivered for high-growth D2C brands' },
  ],
  campaigns: [
    { client: 'KULTURE SKIN', category: 'CREATOR COMMERCE', roas: '3.4X ROAS SCALE', spend: '', status: 'Scaling', desc: 'Turned organic beauty creator clips into a repeatable Meta whitelisting engine.', img: u('photo-1522337360788-8b13dee7a37e'), ctaText: 'View Case Study', ctaUrl: '/case-studies' },
    { client: 'NOVA NUTRITION', category: 'PERFORMANCE ADS', roas: '42% LOWER CPA', spend: '', status: 'Scaling', desc: 'Rapid creative iteration testing 45+ hooks weekly to aggressively scale media spend.', img: u('photo-1541643600914-78b084683601'), ctaText: 'View Case Study', ctaUrl: '/case-studies' },
    { client: 'MUTHA BEAUTY', category: 'CULTURE FIRST', roas: '10M+ IMPRESSIONS', spend: '', status: 'Scaling', desc: 'Editorial and high-aesthetic brand storytelling engineered to convert on TikTok & Reels.', img: u('photo-1515886657613-9f3515b0c78f'), ctaText: 'View Case Study', ctaUrl: '/case-studies' },
    { client: 'ORBIT LABS', category: 'CONVERSION TECH', roas: '+28% CVR LIFT', spend: '', status: 'Scaling', desc: 'Custom headless storefronts tuned for 0.4s load times and lightning checkout flows.', img: u('photo-1496747611176-843222e1e57c'), ctaText: 'View Case Study', ctaUrl: '/case-studies' },
    { client: 'HALO D2C', category: 'UGC ENGINE', roas: '4.1X BLENDED ROAS', spend: '', status: 'Scaling', desc: 'Built and managed a dedicated roster of 120+ micro-creators producing genuine hooks.', img: u('photo-1483985988355-763728e1935b'), ctaText: 'View Case Study', ctaUrl: '/case-studies' },
  ],
  caseStudies: [
    { brand: 'Kulture Skin', category: 'Beauty / Creator commerce', headline: 'From organic proof to paid growth.', result: '3.4x ROAS', detail: 'A creator-led testing system that found the hooks worth scaling, then turned them into a repeatable paid engine.', image: u('photo-1522337360788-8b13dee7a37e', 1400), accent: '#FFDE59' },
    { brand: 'Nova Nutrition', category: 'Food / Performance', headline: 'More signal. Less spend.', result: '42% lower CPA', detail: 'A creative refresh and landing-page loop built around clearer proof, sharper offers, and faster iteration.', image: u('photo-1541643600914-78b084683601', 1400), accent: '#003AA3' },
    { brand: 'Mutha Beauty', category: 'Fashion / Social', headline: 'Make the feed feel like the brand.', result: '10M+ impressions', detail: 'A culture-first content system that kept the brand recognizable while expanding reach across paid channels.', image: u('photo-1515886657613-9f3515b0c78f', 1400), accent: '#FFDE59' },
    { brand: 'Orbit Labs', category: 'Tech / Conversion CRO', headline: 'Speed is a creative feature.', result: '+28% CVR lift', detail: 'Sub-second mobile checkout experiences and friction-free shopping architectures that capture lost demand.', image: u('photo-1460925895917-afdab827c52f', 1400), accent: '#003AA3' },
  ],
  team: [
    { name: 'Arjun Chaudhary', role: 'Founder & CEO', bio: 'Leads the CLYX team and sets the strategic direction across performance, creative, and growth.', badge: '₹80Cr+ Scaled', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop' },
    { name: 'Sanya Malhotra', role: 'Head of Creator Strategy & UGC', bio: 'Directs 200+ creator relationships and content production frameworks that convert.', badge: '200+ Creators', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop' },
    { name: 'Karan Johar', role: 'Head of Conversion Tech & CRO', bio: 'Builds fast, conversion-first digital experiences where every interaction earns its place.', badge: '0.4s Sub-Second Web', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop' },
  ],
  testimonials: [
    { quote: 'CLYX completely replaced our internal creative bottleneck. Their creator whitelisting pipeline drove our ROAS from 2.1x to 4.4x in just six weeks.', name: 'Aarav Kapoor', role: 'Founder & CEO', brand: 'Lumina Skincare', metrics: '+265% Revenue · ₹1.2Cr Added' },
    { quote: 'Most agencies give you fluff reports and vanity metrics. CLYX treats our ad budget like their own money. The blend of UGC + performance buying is deadly.', name: 'Natasha Roy', role: 'Head of Growth', brand: 'Aethel Streetwear', metrics: '3.9x ROAS · ₹40L/month Scale' },
    { quote: 'The landing page they built loaded in 0.4 seconds. Coupled with their whitelisted creator ads, our checkout conversion rate jumped from 1.8% to 4.8%.', name: 'Devang Patel', role: 'Co-Founder', brand: 'Volt Audio', metrics: '5.1x Peak ROAS · 0.4s Page Speed' },
  ],
  blog: [
    { title: 'Why the best creator ads do not feel like ads', tag: 'Creator economy', date: '12.09.25', readTime: '4 min read', style: 'yellow' },
    { title: 'The performance creative loop, explained', tag: 'Performance', date: '04.09.25', readTime: '6 min read', style: 'blue' },
    { title: 'From scroll-stopping hook to scalable system', tag: 'Growth', date: '28.08.25', readTime: '5 min read', style: 'soft' },
    { title: 'The page is part of the ad', tag: 'CRO', date: '19.08.25', readTime: '3 min read', style: 'yellow' },
    { title: 'What to do when everything is working a little', tag: 'Strategy', date: '11.08.25', readTime: '5 min read', style: 'blue' },
    { title: 'Briefing for a voice, not a demographic', tag: 'Creators', date: '02.08.25', readTime: '4 min read', style: 'soft' },
  ],
  careers: [
    { title: 'Performance Marketing Lead', type: 'Full-time / Remote', detail: 'Own the decisions that turn winning creative into efficient growth.' },
    { title: 'Creator Partnerships Manager', type: 'Full-time / Mumbai or Remote', detail: 'Build the relationships and systems behind our creator network.' },
    { title: 'Conversion Designer', type: 'Contract / Remote', detail: 'Shape the pages, offers, and interactions that turn attention into action.' },
  ],
  creators: [
    'photo-1534528741775-53994a69daeb',
    'photo-1517841905240-472988babdf9',
    'photo-1539571696357-5a69c17a67c6',
    'photo-1524504388940-b1c1722653e1',
    'photo-1507003211169-0a1dd7228f2d',
    'photo-1494790108377-be9c29b29330',
    'photo-1500648767791-00dcc994a43e',
    'photo-1522075469751-3a6694fb2f61',
    'photo-1488426862026-3ee34a7d66df',
    'photo-1519085360753-af0119f7cbe7',
    'photo-1506794778202-cad84cf45f1d',
    'photo-1492562080023-ab3db95bfbce',
  ].map((id, i) => ({ name: `Creator ${String(i + 1).padStart(2, '0')}`, handle: '', platform: '', reach: '', image: u(id, 800) })),
};
