import { defineStore } from 'pinia';
import { getMessageFromApiError } from '@/helpers/api.helper.js';
import authService from '@/services/auth.service.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  }),

  getters: {
    isLoggedIn: (state) => state.isAuthenticated && !!state.accessToken,
    userName: (state) => state.user?.name || null,
    userEmail: (state) => state.user?.email || null,
  },

  actions: {
    /**
     * Initialize auth state from localStorage
     */
    initAuth() {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      const userStr = localStorage.getItem('user');

      if (accessToken && refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.isAuthenticated = true;

        if (userStr) {
          try {
            this.user = JSON.parse(userStr);
          } catch (e) {
            console.error('Failed to parse user from localStorage', e);
          }
        }
      }
    },

    /**
     * Set authentication tokens and user info
     * @param {string} accessToken
     * @param {string} refreshToken
     * @param {Object} user
     */
    setAuth(accessToken, refreshToken, user = null) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.isAuthenticated = true;
      this.user = user;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    },

    /**
     * Clear authentication state
     */
    clearAuth() {
      this.user = null;
      this.accessToken = null;
      this.refreshToken = null;
      this.isAuthenticated = false;

      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },

    /**
     * Login with email and password
     * @param {string} email
     * @param {string} password
     * @returns {Promise<void>}
     */
    async login(email, password) {
      try {
        const tokenData = await authService.login(email, password);
        const user = tokenData.name ? { name: tokenData.name, email } : null;
        this.setAuth(tokenData.accessToken, tokenData.refreshToken, user);
        return { success: true };
      } catch (error) {
        const message = getMessageFromApiError(error, 'Sign in failed');
        console.error('Login error:', message);
        throw { success: false, message };
      }
    },

    /**
     * Register new user
     * @param {Object} registerData
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async register(registerData) {
      try {
        const response = await authService.register(registerData);
        return {
          success: true,
          message:
            response.message ||
            'Registration successful. Please check your email to verify your account.',
        };
      } catch (error) {
        const message = getMessageFromApiError(error, 'Registration failed');
        throw { success: false, message };
      }
    },

    /**
     * Logout current user
     * @returns {Promise<void>}
     */
    async logout() {
      try {
        await authService.logout();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        this.clearAuth();
      }
    },

    /**
     * Refresh access token
     * @returns {Promise<void>}
     */
    async refreshToken() {
      try {
        const tokenData = await authService.refreshToken();
        this.accessToken = tokenData.accessToken;
        localStorage.setItem('accessToken', tokenData.accessToken);
      } catch (error) {
        console.error('Token refresh error:', error);
        this.clearAuth();
        throw error;
      }
    },

    /**
     * Initiate Google OAuth
     */
    googleAuth() {
      authService.googleAuth();
    },

    /**
     * Sign in with Google using authorization code
     * @param {string} code - Authorization code from Google
     * @returns {Promise<{success: boolean}>}
     */
    async googleSignIn(payload) {
      try {
        const tokenData = await authService.verifyGoogleCode(payload);
        const user = tokenData.name ? { name: tokenData.name } : null;
        this.setAuth(tokenData.accessToken, tokenData.refreshToken, user);
        return { success: true };
      } catch (error) {
        const message = getMessageFromApiError(error, 'Google sign in failed');
        throw { success: false, message };
      }
    },
  },
});

