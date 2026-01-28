import { createWebHistory, createRouter } from 'vue-router';
import routes from './routes';
import { useAuthStore } from '@/modules/auth/stores/auth.store.js';

const url = new URL(import.meta.env.BASE_URL, window.location.origin);
const router = createRouter({
  history: createWebHistory(url.pathname),
  routes: routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0 };
  },
});

// Public routes that don't require authentication
const authRoutes = ['/login', '/register', '/auth/google/callback', '/auth/verify-email'];
const publicRoutes = ['/'];

// navigation guard 
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  if (!authStore.isAuthenticated) {
    authStore.initAuth();
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const isAuthRoute = authRoutes.includes(to.path);
  const isPublicRoute = publicRoutes.includes(to.path);

  // Allow home route without authentication
  if (isPublicRoute) {
    next();
    return;
  }

  // For other routes: if requires auth and not authenticated and not public, redirect to login
  if (requiresAuth && !authStore.isAuthenticated && !isAuthRoute) {
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
