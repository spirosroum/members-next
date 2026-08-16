import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import '@gym/shared-ui/tailwind';
import './style.css';

createApp(App).use(createPinia()).mount('#app');
