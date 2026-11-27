// @ts-check
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { fontProviders, sessionDrivers } from 'astro/config';
import { globSync } from 'glob';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import remarkGfm from 'remark-gfm';

import remarkToc from './src/plugins/remark-toc.mjs';
import remarkTableZh from './src/plugins/remark-table-zh.mjs';

const siteUrl = process.env.SITE_URL || 'https://zhongguo.nicolastemeni.workers.dev';
const projectRoot = dirname(fileURLToPath(import.meta.url));

// Scan pages once at config load for noIndex={true} so we can exclude them
// from the sitemap. Matches the runtime behaviour of the noIndex prop in
// BaseLayout/SEOHead, which renders <meta name="robots" content="noindex">.
function collectNoIndexPaths() {
  const files = globSync('src/pages/**/*.astro', { cwd: projectRoot });
  const paths = new Set();
  for (const file of files) {
    if (/\[.*\]/.test(file)) continue;
    const content = readFileSync(join(projectRoot, file), 'utf-8');
    if (!/noIndex\s*=\s*\{\s*true\s*\}/.test(content)) continue;
    let route = file.replace(/^src\/pages/, '').replace(/\.astro$/, '');
    if (route.endsWith('/index')) route = route.slice(0, -'index'.length);
    if (route === '') route = '/';
    if (!route.endsWith('/')) route += '/';
    paths.add(route);
  }
  return paths;
}

const noIndexPaths = collectNoIndexPaths();

// Pre-bundle React during dev so Vite does not discover it mid-request and
// reload the optimizer (that clears React's hook dispatcher).
// https://github.com/withastro/astro/issues/17166
//
// Keep the island hydrator and React off the `astro` optimizer. That env
// resolves renderer-url for the browser; prebundling React there produces a
// second copy (invalid hook call) and a Node rolldown-runtime (createRequire).
const reactClientOptimizerDeps = [
  '@astrojs/react/client.js',
  'react',
  'react-dom',
  'react-dom/client',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
];

const astroRuntimeOptimizerDeps = [
  'astro/assets/services/noop',
  'astro/env/runtime',
  'astro/virtual-modules/transitions.js',
  'astro/zod',
];

const reactSsrOptimizerDeps = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom/server',
  ...astroRuntimeOptimizerDeps,
];

const browserOnlyOptimizerDeps = ['@astrojs/react/client.js', 'react-dom/client'];

/** @returns {NonNullable<import('astro').ViteUserConfig['plugins']>[number]} */
function prebundleCloudflareDevDeps() {
  return {
    name: 'prebundle-cloudflare-dev-deps',
    /** @param {string} environmentName */
    configEnvironment(environmentName) {
      if (environmentName === 'client') {
        return {
          optimizeDeps: {
            noDiscovery: true,
            include: reactClientOptimizerDeps,
            exclude: ['react-dom/server', '@astrojs/react/server.js'],
          },
          resolve: {
            dedupe: ['react', 'react-dom'],
            alias: {
              'react-dom/server': 'react-dom/server.browser.js',
            },
          },
        };
      }

      if (environmentName === 'astro') {
        return {
          optimizeDeps: {
            include: astroRuntimeOptimizerDeps,
            exclude: [
              ...browserOnlyOptimizerDeps,
              'react',
              'react-dom',
              'react/jsx-runtime',
              'react/jsx-dev-runtime',
              'react-dom/server',
              '@astrojs/react/server.js',
            ],
          },
          resolve: { dedupe: ['react', 'react-dom'] },
        };
      }

      return {
        optimizeDeps: {
          include: reactSsrOptimizerDeps,
          exclude: browserOnlyOptimizerDeps,
        },
        resolve: { dedupe: ['react', 'react-dom'] },
      };
    },
  };
}

// https://astro.build/config
export default defineConfig({
  // Static by default. Home, /trips, /trips/<slug> and /gallery set `prerender = false`: they read D1 on each request.
  output: 'static',
  adapter: cloudflare(),
  trailingSlash: 'never',
  // Astro 6 + @astrojs/cloudflare 13 auto-provision a SESSION KV namespace
  // per deploy. Pinning a non-KV driver tells the adapter "sessions are
  // handled" so it skips emitting the SESSION binding. Our pages never call
  // Astro.session at runtime.
  session: {
    driver: sessionDrivers.lruCache(),
  },
  site: siteUrl,
  // CSRF origin check for form-encoded POST/PUT/PATCH/DELETE. This is the
  // Astro 5/6 default; pinned explicitly so a template edit can't silently
  // disable it. Note it does NOT cover /api/auth/* (JSON posts) — those are
  // protected by Better Auth trustedOrigins in the auth integration.
  security: {
    checkOrigin: true,
  },
  redirects: {
    '/guides/visa-entry': '/guides/visa-policy',
  },
  integrations: [
    react({
      include: ['**/islands/**/*.{tsx,ts,jsx,js}'],
      experimentalDisableStreaming: true,
    }),
    // MDX support for blog posts, docs, and content
    mdx(),
    // Generate sitemap.xml, excluding pages flagged noIndex={true}
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        const normalized = pathname.endsWith('/') ? pathname : pathname + '/';
        return !noIndexPaths.has(normalized);
      },
    }),
  ],
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-dark',
    },
    processor: unified({
      remarkPlugins: [remarkGfm, remarkToc, remarkTableZh],
    }),
  },
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    // A snapshot of a Trip page belongs to the build that made it (docs/adr/0004).
    define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
    plugins: [tailwindcss(), prebundleCloudflareDevDeps()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      noDiscovery: true,
      include: reactClientOptimizerDeps,
      exclude: ['react-dom/server', '@astrojs/react/server.js'],
    },
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--font-inter',
      styles: ['normal'],
      weights: ['300 700'],
    },
  ],
});
