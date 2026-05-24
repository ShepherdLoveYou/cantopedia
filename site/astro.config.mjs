import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://shepherdloveyou.github.io',
  base: '/cantopedia',
  trailingSlash: 'never',
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
