import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/', // kiosk served at site root
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist' }
});
