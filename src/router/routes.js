import HomeView from '@/modules/home/pages/HomeView.vue';
import NotFoundView from '@/pages/NotFoundView.vue';
import LoginView from '@/modules/auth/pages/LoginView.vue';
import RegisterView from '../modules/auth/pages/RegisterView.vue';
import GoogleCallbackView from '@/modules/auth/pages/GoogleCallbackView.vue';
import VerifyEmailView from '@/modules/auth/pages/VerifyEmailView.vue';
import CreateWorkspaceView from '@/modules/workspaces/pages/CreateWorkspaceView.vue';
import InviteMemberView from '@/modules/workspaces/pages/InviteMemberView.vue';
import WorkspaceDetailView from '@/modules/workspaces/pages/WorkspaceDetailView.vue';

export default [
	{
		path: '/',
		name: 'home',
		component: HomeView,
		meta: { title: 'Home', requiresAuth: false },
	},
	{
		path: '/workspaces/create',
		name: 'createWorkspace',
		component: CreateWorkspaceView,
		meta: { title: 'Create Workspace', requiresAuth: true },
	},
	{
		path: '/workspaces/:id',
		name: 'workspaceDetail',
		component: WorkspaceDetailView,
		meta: { title: 'Workspace', requiresAuth: true },
	},
	{
		path: '/workspaces/:id/invite',
		name: 'inviteMember',
		component: InviteMemberView,
		meta: { title: 'Invite Member', requiresAuth: true },
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
