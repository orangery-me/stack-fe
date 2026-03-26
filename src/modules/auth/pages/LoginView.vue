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
    showErrorToast(err?.message);
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
            <CalmHeading :level="2"> Sign in </CalmHeading>
            <p class="ui-muted auth-card__subtitle">Welcome back.</p>
          </header>

          <form class="auth-form" @submit.prevent="handleLogin">
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
            <img
              class="auth-google__icon"
              src="/logos/google-logo.png"
              alt=""
              aria-hidden="true"
            />
            Continue with Google
          </CalmButton>

          <div class="auth-footer ui-muted">
            Don’t have an account?
            <button type="button" class="auth-link" @click="goToRegister">
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
  width: 18px;
  height: 18px;
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
