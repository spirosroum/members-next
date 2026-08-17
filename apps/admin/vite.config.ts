import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/admin/', // served at the /admin/ subpath on GitHub Pages
  server: { port: 5174, strictPort: true },
  build: { outDir: 'dist' }
});
