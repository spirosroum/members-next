import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/admin/', // served at the /admin/ subpath on GitHub Pages
  build: { outDir: 'dist' }
});
