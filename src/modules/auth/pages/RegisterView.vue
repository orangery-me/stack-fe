<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useToast } from "@/composables/useToast.js";
import StarfieldButton from "@/components/StarfieldButton.vue";
import StarfieldCard from "@/components/StarfieldCard.vue";
import GlowText from "@/components/GlowText.vue";

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
    showSuccessToast(successMessage);

    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push("/login");
    }, 2000);
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
  <section class="register-section">
    <div class="container-center">
      <div class="register-container">
        <StarfieldCard class="register-card">
          <div class="register-header">
            <GlowText :level="2">
              Sign Up
            </GlowText>
            <p class="register-subtitle">
              Create a new account
            </p>
          </div>

          <form
            class="register-form"
            @submit.prevent="handleRegister"
          >
            <div class="form-group">
              <label
                for="email"
                class="form-label"
              >Email *</label>
              <input
                id="email"
                v-model="formData.email"
                type="email"
                class="form-input"
                :class="{ 'form-input--error': fieldErrors.email }"
                placeholder="your@email.com"
                required
                autocomplete="email"
                @blur="handleFieldBlur('email')"
              >
              <span
                v-if="fieldErrors.email"
                class="field-error"
              >
                {{ fieldErrors.email }}
              </span>
            </div>

            <div class="form-group">
              <label
                for="phone"
                class="form-label"
              >Phone *</label>
              <input
                id="phone"
                v-model="formData.phone"
                type="tel"
                class="form-input"
                :class="{ 'form-input--error': fieldErrors.phone }"
                placeholder="0123456789"
                required
                maxlength="10"
                autocomplete="tel"
                @blur="handleFieldBlur('phone')"
              >
              <span
                v-if="fieldErrors.phone"
                class="field-error"
              >
                {{ fieldErrors.phone }}
              </span>
            </div>

            <div class="form-group">
              <label
                for="name"
                class="form-label"
              >Full Name *</label>
              <input
                id="name"
                v-model="formData.name"
                type="text"
                class="form-input"
                :class="{ 'form-input--error': fieldErrors.name }"
                placeholder="John Doe"
                required
                maxlength="50"
                autocomplete="name"
                @blur="handleFieldBlur('name')"
              >
              <span
                v-if="fieldErrors.name"
                class="field-error"
              >
                {{ fieldErrors.name }}
              </span>
            </div>

            <div class="form-group">
              <label
                for="password"
                class="form-label"
              >Password *</label>
              <input
                id="password"
                v-model="formData.password"
                type="password"
                class="form-input"
                :class="{ 'form-input--error': fieldErrors.password }"
                placeholder="••••••••"
                required
                minlength="6"
                autocomplete="new-password"
                @blur="handleFieldBlur('password')"
              >
              <span
                v-if="fieldErrors.password"
                class="field-error"
              >
                {{ fieldErrors.password }}
              </span>
            </div>

            <div class="form-group">
              <label
                for="confirmPassword"
                class="form-label"
              >
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                type="password"
                class="form-input"
                :class="{ 'form-input--error': fieldErrors.confirmPassword }"
                placeholder="••••••••"
                required
                autocomplete="new-password"
                @blur="handleFieldBlur('confirmPassword')"
              >
              <span
                v-if="fieldErrors.confirmPassword"
                class="field-error"
              >
                {{ fieldErrors.confirmPassword }}
              </span>
            </div>

            <StarfieldButton
              type="submit"
              variant="primary"
              size="lg"
              :disabled="!isValid || loading"
              class="register-button"
            >
              {{ loading ? "Signing up..." : "Sign Up" }}
            </StarfieldButton>
          </form>

          <div class="login-link">
            <p>
              Already have an account?
              <button
                type="button"
                class="link-button"
                @click="goToLogin"
              >
                Sign in now
              </button>
            </p>
          </div>
        </StarfieldCard>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.register-section {
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

.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.register-card {
  width: 100%;
  max-width: 500px;
  padding: 3rem 2rem;
}

.register-header {
  text-align: center;
  margin-bottom: 2.5rem;

  .register-subtitle {
    font-size: 1.125rem;
    color: rgba(241, 245, 249, 0.7);
    font-weight: 300;
    margin-top: 0.5rem;
  }
}

.register-form {
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

  &--error {
    border-color: rgba(239, 68, 68, 0.5);
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.2);
  }
}

.field-error {
  display: block;
  color: #fca5a5;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  font-family: "Merriweather", serif;
}

.register-button {
  width: 100%;
  margin-top: 0.5rem;
}

.login-link {
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
  .register-section {
    padding: 4rem 0;
  }

  .register-card {
    padding: 2rem 1.5rem;
  }
}
</style>
