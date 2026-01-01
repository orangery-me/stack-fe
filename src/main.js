import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from "@/router/index.js";
import App from './App.vue';
import './assets/styles/main.scss';
import { useAuthStore } from '@/modules/auth/stores/auth.store.js';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Initialize auth state on app start
const authStore = useAuthStore();
authStore.initAuth();

app.mount('#app');
