import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://shepherdloveyou.github.io',
  base: '/cantopedia',
  integrations: [
    sitemap({ i18n: { defaultLocale: 'zh', locales: { zh: 'zh-Hant', yue: 'yue-Hant', en: 'en' } } }),
  ],
  trailingSlash: 'never',
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en', 'yue'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  build: {
    format: 'directory',
  },
  vite: {
    server: {
      fs: {
        // Allow Astro to load YAML from the sibling `data/` directory.
        allow: ['..'],
      },
    },
  },
});
