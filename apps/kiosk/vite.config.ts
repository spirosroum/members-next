import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/members-next/', // project-site root
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist' }
});
