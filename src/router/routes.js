import HomeView from '@/modules/home/pages/HomeView.vue';
import NotFoundView from '@/pages/NotFoundView.vue';
import LoginView from '@/modules/auth/pages/LoginView.vue';
import RegisterView from '../modules/auth/pages/RegisterView.vue';
import GoogleCallbackView from '@/modules/auth/pages/GoogleCallbackView.vue';
import VerifyEmailView from '@/modules/auth/pages/VerifyEmailView.vue';

export default [
	{
		path: '/',
		name: 'home',
		component: HomeView,
		meta: { title: 'Home', requiresAuth: false },
	},
	{
		path: '/login',
		name: 'login',
		component: LoginView,
		meta: { title: 'Login' },
	},
	{
		path: '/register',
		name: 'register',
		component: RegisterView,
		meta: { title: 'Register' },
	},
	{
		path: '/auth/google/callback',
		name: 'googleCallback',
		component: GoogleCallbackView,
		meta: { title: 'Google OAuth Callback' },
	},
	{
		path: '/auth/verify-email',
		name: 'verifyEmail',
		component: VerifyEmailView,
		meta: { title: 'Email Verification' },
	},
	{
		// 404 fallback
		path: '/:pathMatch(.*)*',
		name: 'notFound',
		component: NotFoundView,
		meta: { title: '404 Not Found' },
	}
];
