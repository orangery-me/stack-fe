<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useToast } from "@/composables/useToast.js";
import CalmButton from "@/components/calm/CalmButton.vue";
import CalmCard from "@/components/calm/CalmCard.vue";
import CalmHeading from "@/components/calm/CalmHeading.vue";
import CalmInput from "@/components/calm/CalmInput.vue";

const router = useRouter();
const authStore = useAuthStore();
const { success: showSuccessToast, error: showErrorToast } = useToast();

const formData = ref({
  email: "",
  phone: "",
  password: "",
  name: "",
});

const confirmPassword = ref("");
const loading = ref(false);

const isValid = computed(() => {
  return (
    formData.value.email &&
    formData.value.email.includes("@") &&
    formData.value.phone &&
    formData.value.phone.length === 10 &&
    /^[0-9]+$/.test(formData.value.phone) &&
    formData.value.password &&
    formData.value.password.length >= 6 &&
    formData.value.name &&
    formData.value.name.length >= 2 &&
    formData.value.name.length <= 50 &&
    formData.value.password === confirmPassword.value
  );
});

const validateField = (field, value) => {
  switch (field) {
    case "email":
      if (value && !value.includes("@")) {
        return "Invalid email";
      }
      break;
    case "phone":
      if (value && (value.length !== 10 || !/^[0-9]+$/.test(value))) {
        return "Phone number must be exactly 10 digits";
      }
      break;
    case "password":
      if (value && value.length < 6) {
        return "Password must be at least 6 characters";
      }
      break;
    case "name":
      if (value && (value.length < 2 || value.length > 50)) {
        return "Name must be between 2 and 50 characters";
      }
      break;
  }
  return "";
};

const fieldErrors = ref({
  email: "",
  phone: "",
  password: "",
  name: "",
  confirmPassword: "",
});

const handleFieldBlur = (field) => {
  if (field === "confirmPassword") {
    fieldErrors.value.confirmPassword =
      confirmPassword.value !== formData.value.password
        ? "Passwords do not match"
        : "";
  } else {
    fieldErrors.value[field] = validateField(field, formData.value[field]);
  }
};

const handleRegister = async () => {
  if (!isValid.value || loading.value) return;

  // Clear previous errors
  Object.keys(fieldErrors.value).forEach((key) => {
    fieldErrors.value[key] = "";
  });

  // Validate all fields
  let hasErrors = false;
  Object.keys(formData.value).forEach((key) => {
    const err = validateField(key, formData.value[key]);
    if (err) {
      fieldErrors.value[key] = err;
      hasErrors = true;
    }
  });

  if (confirmPassword.value !== formData.value.password) {
    fieldErrors.value.confirmPassword = "Passwords do not match";
    hasErrors = true;
  }

  if (hasErrors) return;

  loading.value = true;

  try {
    const result = await authStore.register(formData.value);
    const successMessage =
      result.message ||
      "Registration successful. Please check your email to verify your account.";
    showSuccessToast(successMessage, 6000);

    // Redirect to login after 3 seconds so user can read the toast
    setTimeout(() => {
      router.push("/login");
    }, 3000);
  } catch (err) {
    const errorMessage =
      err.message || "Registration failed. Please try again.";
    showErrorToast(errorMessage);
  } finally {
    loading.value = false;
  }
};

const goToLogin = () => {
  router.push("/login");
};
</script>

<template>
  <section class="auth-page">
    <div class="container-center">
      <div class="auth-page__container">
        <CalmCard
          class="auth-card"
          padding="lg"
        >
          <header class="auth-card__header">
            <CalmHeading :level="2">
              Create account
            </CalmHeading>
            <p class="ui-muted auth-card__subtitle">
              Use your email to get started.
            </p>
          </header>

          <form
            class="auth-form"
            @submit.prevent="handleRegister"
          >
            <CalmInput
              id="email"
              v-model="formData.email"
              label="Email"
              type="email"
              placeholder="you@company.com"
              autocomplete="email"
              :required="true"
              :error="fieldErrors.email"
              @blur="handleFieldBlur('email')"
            />

            <CalmInput
              id="phone"
              v-model="formData.phone"
              label="Phone"
              type="tel"
              placeholder="0123456789"
              autocomplete="tel"
              :required="true"
              :error="fieldErrors.phone"
              @blur="handleFieldBlur('phone')"
            />

            <CalmInput
              id="name"
              v-model="formData.name"
              label="Full name"
              type="text"
              placeholder="John Doe"
              autocomplete="name"
              :required="true"
              :error="fieldErrors.name"
              @blur="handleFieldBlur('name')"
            />

            <CalmInput
              id="password"
              v-model="formData.password"
              label="Password"
              type="password"
              placeholder="••••••••"
              autocomplete="new-password"
              :required="true"
              :error="fieldErrors.password"
              @blur="handleFieldBlur('password')"
            />

            <CalmInput
              id="confirmPassword"
              v-model="confirmPassword"
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              autocomplete="new-password"
              :required="true"
              :error="fieldErrors.confirmPassword"
              @blur="handleFieldBlur('confirmPassword')"
            />

            <CalmButton
              type="submit"
              variant="primary"
              size="lg"
              :disabled="!isValid || loading"
              class="auth-form__submit"
              :loading="loading"
            >
              Create account
            </CalmButton>
          </form>

          <div class="auth-footer ui-muted">
            Already have an account?
            <button
              type="button"
              class="auth-link"
              @click="goToLogin"
            >
              Sign in
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
  max-width: 520px;
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
