import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/member/', // served at the /member/ subpath on GitHub Pages
  build: { outDir: 'dist' }
});
