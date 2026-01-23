import apiHelper from "@/helpers/apiHelper.js";
import axios from "axios";
import { API_ENDPOINTS } from "@/config/api.js";
import { API_BASE_URL } from "@/config/api.js";

/**
 * Authentication API Service
 */
class AuthService {
  /**
   * Login with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{accessToken: string, refreshToken?: string, name?: string}>}
   */
  async login(email, password) {
    const response = await apiHelper.post(API_ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
    });
    return response.data.data;
  }

  /**
   * Register new user
   * @param {Object} registerData
   * @param {string} registerData.email
   * @param {string} registerData.phone
   * @param {string} registerData.password
   * @param {string} registerData.name
   * @returns {Promise<{message: string, email: string}>}
   */
  async register(registerData) {
    const response = await apiHelper.post(
      API_ENDPOINTS.AUTH.REGISTER,
      registerData
    );
    return response.data.data;
  }

  /**
   * Logout current user
   * @returns {Promise<void>}
   */
  async logout() {
    await apiHelper.get(API_ENDPOINTS.AUTH.LOGOUT);
  }

  /**
   * Refresh access token
   * @returns {Promise<{accessToken: string}>}
   */
  async refreshToken() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    // Use axios directly to avoid interceptor loop
    const response = await axios.get(
      `${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    );
    return response.data.data;
  }

  /**
   * Initiate Google OAuth flow
   * Redirects to backend Google OAuth endpoint
   */
  googleAuth() {
    // Generate a random state parameter for security
    const state = crypto.randomUUID();
    const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirect_uri = import.meta.env.VITE_GOOGLE_CALLBACK_URL;
    // Save state to sessionStorage to verify after redirect
    sessionStorage.setItem("google_oauth_state", state);

    const params = new URLSearchParams({
      client_id: client_id,
      redirect_uri: redirect_uri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "consent",
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async verifyGoogleCode({ code, state }) {
    const savedState = sessionStorage.getItem("google_oauth_state");
    if (state !== savedState) {
      throw new Error("Invalid OAuth state");
    }
    sessionStorage.removeItem("google_oauth_state");
    
    const response = await apiHelper.post(API_ENDPOINTS.AUTH.GOOGLE_LOGIN, {
      code,
      state,
    });
    return response.data.data;
  }

  /**
   * Verify email with token
   * @param {string} token - Verification token from email
   * @returns {Promise<{message: string}>}
   */
  async verifyEmail(token) {
    const response = await apiHelper.get(
      `${API_ENDPOINTS.AUTH.VERIFY_EMAIL}?token=${token}`
    );
    return response.data.data;
  }
}

export default new AuthService();
