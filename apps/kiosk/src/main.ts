import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import MobileCheckin from './MobileCheckin.vue';
import '@gym/shared-ui/tailwind';
import './style.css';

// Minimal hash router: `#/mobile` = mobile check-in, otherwise the kiosk.
const isMobileRoute = () => window.location.hash.replace(/^#\/?/, '').startsWith('mobile');

function mount() {
  const root = document.getElementById('app')!;
  const app = createApp(isMobileRoute() ? MobileCheckin : App);
  app.use(createPinia()).mount(root);
}

window.addEventListener('hashchange', () => {
  const root = document.getElementById('app')!;
  root.innerHTML = '';
  mount();
});

mount();
