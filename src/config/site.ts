export const SITE = {
  name: '中国',
  title: 'Nico to 中国',
  description: 'A premium travel monograph and route planner for the modern explorer. Atmospheric journals meet precise flight calendars.',
  lang: 'en',
  url:
    (typeof process !== 'undefined' && process.env.SITE_URL) ||
    'https://example.com',
  twitterHandle: '@example',
  socials: {
    twitter: 'https://twitter.com/example',
    instagram: 'https://instagram.com/example',
    linkedin: 'https://www.linkedin.com/company/example',
    dribbble: 'https://dribbble.com/example',
  },
} as const;

export type SiteConfig = typeof SITE;
