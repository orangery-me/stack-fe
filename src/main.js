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

import { OhVueIcon, addIcons } from "oh-vue-icons";
import { 
  FcBriefcase, 
  FcSms, 
  FcCollaboration, 
  FcInfo, 
  FcCheckmark, 
  FcHighPriority, 
  FcIdea,
  FcSettings,
  FcApproval
} from "oh-vue-icons/icons";

addIcons(
  FcBriefcase, 
  FcSms, 
  FcCollaboration, 
  FcInfo, 
  FcCheckmark, 
  FcHighPriority, 
  FcIdea,
  FcSettings,
  FcApproval
);

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(VueQueryPlugin, { queryClient });
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
  zIndex: {
    modal: 1100,
    overlay: 9999, // Ensure AutoComplete, DatePicker, and menus show on top of teleported modals
    menu: 1000,
    tooltip: 11000
  }
});

app.component("VIcon", OhVueIcon);

// Initialize auth state on app start
const authStore = useAuthStore();
authStore.initAuth();

app.mount('#app');
