/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './apps/kiosk/index.html',
    './apps/member/index.html',
    './apps/admin/index.html',
    './apps/*/src/**/*.{vue,ts}',
    './packages/shared-ui/**/*.{vue,ts}'
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
