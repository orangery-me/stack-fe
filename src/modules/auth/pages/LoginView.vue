<script setup>
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import StarfieldButton from "@/components/StarfieldButton.vue";
import StarfieldCard from "@/components/StarfieldCard.vue";
import GlowText from "@/components/GlowText.vue";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const error = ref(route.query.error || "");
const loading = ref(false);

const isValid = computed(() => {
  return email.value && password.value && email.value.includes("@");
});

const handleLogin = async () => {
  if (!isValid.value || loading.value) return;

  error.value = "";
  loading.value = true;

  try {
    await authStore.login(email.value, password.value);

    // Redirect to intended route or home
    const redirect = route.query.redirect || "/";
    router.push(redirect);
  } catch (err) {
    error.value = err.message || "Đăng nhập thất bại. Vui lòng thử lại.";
  } finally {
    loading.value = false;
  }
};

const handleGoogleLogin = () => {
  authStore.googleAuth();
};

const goToRegister = () => {
  router.push("/register");
};
</script>

<template>
  <section class="login-section">
    <div class="container-center">
      <div class="login-container">
        <StarfieldCard class="login-card">
          <div class="login-header">
            <GlowText :level="2">
              Đăng Nhập
            </GlowText>
            <p class="login-subtitle">
              Chào mừng trở lại
            </p>
          </div>

          <form
            class="login-form"
            @submit.prevent="handleLogin"
          >
            <div
              v-if="error"
              class="error-message"
            >
              {{ error }}
            </div>

            <div class="form-group">
              <label
                for="email"
                class="form-label"
              >Email</label>
              <input
                id="email"
                v-model="email"
                type="email"
                class="form-input"
                placeholder="your@email.com"
                required
                autocomplete="email"
              >
            </div>

            <div class="form-group">
              <label
                for="password"
                class="form-label"
              >Mật khẩu</label>
              <input
                id="password"
                v-model="password"
                type="password"
                class="form-input"
                placeholder="••••••••"
                required
                autocomplete="current-password"
              >
            </div>

            <StarfieldButton
              type="submit"
              variant="primary"
              size="lg"
              :disabled="!isValid || loading"
              class="login-button"
            >
              {{ loading ? "Đang đăng nhập..." : "Đăng Nhập" }}
            </StarfieldButton>
          </form>

          <div class="divider">
            <span>hoặc</span>
          </div>

          <StarfieldButton
            variant="secondary"
            size="lg"
            :disabled="loading"
            class="google-button"
            @click="handleGoogleLogin"
          >
            <svg
              class="google-icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Đăng nhập bằng Google
          </StarfieldButton>

          <div class="register-link">
            <p>
              Chưa có tài khoản?
              <button
                type="button"
                class="link-button"
                @click="goToRegister"
              >
                Đăng ký ngay
              </button>
            </p>
          </div>
        </StarfieldCard>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.login-section {
  padding: 6rem 0;
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.container-center {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.login-card {
  width: 100%;
  max-width: 450px;
  padding: 3rem 2rem;
}

.login-header {
  text-align: center;
  margin-bottom: 2.5rem;

  .login-subtitle {
    font-size: 1.125rem;
    color: rgba(241, 245, 249, 0.7);
    font-weight: 300;
    margin-top: 0.5rem;
  }
}

.login-form {
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  color: #f1f5f9;
  font-size: 0.875rem;
  font-weight: 300;
  margin-bottom: 0.5rem;
  font-family: "Merriweather", serif;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(184, 167, 255, 0.3);
  border-radius: 2px;
  color: #f1f5f9;
  font-size: 1rem;
  font-family: "Merriweather", serif;
  font-weight: 300;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #b8a7ff;
    box-shadow: 0 0 10px rgba(184, 167, 255, 0.3);
  }

  &::placeholder {
    color: rgba(241, 245, 249, 0.5);
  }
}

.error-message {
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 2px;
  color: #fca5a5;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  text-align: center;
  font-family: "Merriweather", serif;
}

.login-button {
  width: 100%;
  margin-top: 0.5rem;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 2rem 0;
  color: rgba(241, 245, 249, 0.5);
  font-size: 0.875rem;
  font-family: "Merriweather", serif;

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-bottom: 1px solid rgba(184, 167, 255, 0.2);
  }

  span {
    padding: 0 1rem;
  }
}

.google-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.google-icon {
  flex-shrink: 0;
}

.register-link {
  margin-top: 2rem;
  text-align: center;
  color: rgba(241, 245, 249, 0.7);
  font-size: 0.875rem;
  font-family: "Merriweather", serif;

  p {
    margin: 0;
  }
}

.link-button {
  background: none;
  border: none;
  color: #b8a7ff;
  cursor: pointer;
  text-decoration: underline;
  font-family: "Merriweather", serif;
  font-size: 0.875rem;
  padding: 0;
  margin-left: 0.25rem;
  transition: all 0.3s ease;

  &:hover {
    color: #f1f5f9;
    text-shadow: 0 0 10px rgba(184, 167, 255, 0.5);
  }
}

@media (max-width: 768px) {
  .login-section {
    padding: 4rem 0;
  }

  .login-card {
    padding: 2rem 1.5rem;
  }
}
</style>
