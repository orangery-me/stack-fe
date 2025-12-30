import { createWebHistory, createRouter } from 'vue-router';
import routes from './routes';
import { useAuthStore } from '@/modules/auth/stores/auth.store.js';

const url = new URL(import.meta.env.BASE_URL, window.location.origin);
const router = createRouter({
  history: createWebHistory(url.pathname),
  routes: routes,
});

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/auth/google/callback'];

// navigation guard 
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  if (!authStore.isAuthenticated) {
    authStore.initAuth();
  }

  // Check if route requires authentication
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const isPublicRoute = publicRoutes.includes(to.path);


  if (requiresAuth && !authStore.isAuthenticated && !isPublicRoute) {
    // Store the intended route for redirect after login
    next({
      path: '/login',
      query: { redirect: to.fullPath },
    });
  } 

  else if (authStore.isAuthenticated && (to.path === '/login' || to.path === '/register')) {
    next('/');
  } 
  // Otherwise, allow navigation
  else {
    next();
  }
});

export default router;
