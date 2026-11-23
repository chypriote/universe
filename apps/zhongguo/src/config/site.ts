export const SITE = {
  name: '中国',
  title: 'Nico to 中国',
  description: 'Trip reports, trip plans, photography and flight prices from my travels in China.',
  lang: 'en',
  url:
    (typeof process !== 'undefined' && process.env.SITE_URL) ||
    'https://zhongguo.nicolastemeni.workers.dev',
  twitterHandle: '@example',
  socials: {
    twitter: 'https://twitter.com/example',
    instagram: 'https://instagram.com/example',
    linkedin: 'https://www.linkedin.com/company/example',
    dribbble: 'https://dribbble.com/example',
  },
} as const;

export type SiteConfig = typeof SITE;
