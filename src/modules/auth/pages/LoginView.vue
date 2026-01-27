<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useToast } from "@/composables/useToast.js";
import CalmButton from "@/components/calm/CalmButton.vue";
import CalmCard from "@/components/calm/CalmCard.vue";
import CalmHeading from "@/components/calm/CalmHeading.vue";
import CalmInput from "@/components/calm/CalmInput.vue";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { error: showErrorToast } = useToast();

const email = ref("");
const password = ref("");
const loading = ref(false);

const isValid = computed(() => {
  return email.value && password.value && email.value.includes("@");
});

// Show error from query params if exists (e.g., from redirect)
onMounted(() => {
  if (route.query.error) {
    showErrorToast(route.query.error);
  }
});

const handleLogin = async () => {
  if (!isValid.value || loading.value) return;

  loading.value = true;

  try {
    await authStore.login(email.value, password.value);

    // Redirect to intended route or home
    const redirect = route.query.redirect || "/";
    router.push(redirect);
  } catch (err) {
    const errorMessage = err.message || "Sign in failed. Please try again.";
    showErrorToast(errorMessage);
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
  <section class="auth-page">
    <div class="container-center">
      <div class="auth-page__container">
        <CalmCard class="auth-card" padding="lg">
          <header class="auth-card__header">
            <CalmHeading :level="2">Sign in</CalmHeading>
            <p class="ui-muted auth-card__subtitle">Welcome back.</p>
          </header>

          <form
            class="auth-form"
            @submit.prevent="handleLogin"
          >
            <CalmInput
              id="email"
              v-model="email"
              label="Email"
              type="email"
              placeholder="you@company.com"
              autocomplete="email"
              :required="true"
            />

            <CalmInput
              id="password"
              v-model="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              :required="true"
            />

            <CalmButton
              type="submit"
              variant="primary"
              size="lg"
              class="auth-form__submit"
              :loading="loading"
              :disabled="!isValid || loading"
            >
              Sign in
            </CalmButton>
          </form>

          <div class="auth-divider">
            <span>or</span>
          </div>

          <CalmButton
            variant="secondary"
            size="lg"
            class="auth-google"
            :disabled="loading"
            @click="handleGoogleLogin"
          >
            <svg
              class="auth-google__icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
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
            Continue with Google
          </CalmButton>

          <div class="auth-footer ui-muted">
            Don’t have an account?
            <button
              type="button"
              class="auth-link"
              @click="goToRegister"
            >
              Create one
            </button>
          </div>
        </CalmCard>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.auth-page {
  padding: var(--space-48) 0;
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-page__container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.auth-card {
  width: 100%;
  max-width: 480px;
}

.auth-card__header {
  text-align: center;
  margin-bottom: var(--space-24);

  .auth-card__subtitle {
    margin-top: var(--space-8);
  }
}

.auth-form {
  display: grid;
  gap: var(--space-16);
  margin-bottom: var(--space-16);
}

.auth-form__submit {
  width: 100%;
}

.auth-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: var(--space-16) 0;
  color: var(--ui-text-hint);
  font-size: 12px;

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-bottom: 1px solid var(--ui-divider);
  }

  span {
    padding: 0 1rem;
  }
}

.auth-google {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-google__icon {
  flex-shrink: 0;
}

.auth-footer {
  margin-top: var(--space-16);
  text-align: center;
}

.auth-link {
  background: none;
  border: none;
  color: var(--primary-600);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  margin-left: 0.25rem;
  text-decoration: underline;

  &:hover {
    color: var(--primary-500);
  }
}

@media (max-width: 768px) {
  .auth-page {
    padding: var(--space-40) 0;
  }
}
</style>
