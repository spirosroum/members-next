import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './style.css';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'checkin', component: () => import('./views/CheckinView.vue') },
    { path: '/members', name: 'members', component: () => import('./views/DirectoryView.vue') },
    { path: '/payments', name: 'payments', component: () => import('./views/PaymentsView.vue') },
    { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue') }
  ]
});

createApp(App).use(createPinia()).use(router).mount('#app');
