import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/member/', // served at the /member/ subpath on GitHub Pages
  server: { port: 5175, strictPort: true },
  build: { outDir: 'dist' }
});
