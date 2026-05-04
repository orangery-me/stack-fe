import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/config/queryClient.js';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import router from "@/router/index.js";
import App from './App.vue';
import { useAuthStore } from '@/modules/auth/stores/auth.store.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'primeicons/primeicons.css';
import './assets/styles/main.scss';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(VueQueryPlugin, { queryClient });
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
});

// Initialize auth state on app start
const authStore = useAuthStore();
authStore.initAuth();

app.mount('#app');
