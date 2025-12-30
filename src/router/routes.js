import HomeView from '@/views/HomeView.vue';

export default [
	{
		path: '/',
		name: 'home',
		component: HomeView,
		meta: { title: 'Home' },
	},
	{
		// 404 fallback
		path: '/:pathMatch(.*)*',
		name: 'notFound',
		component: () => import('@/views/NotFoundView.vue'),
		meta: { title: '404 Not Found' },
	}
];
