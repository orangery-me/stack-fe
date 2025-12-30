<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import StarfieldButton from "@/components/StarfieldButton.vue";
import StarfieldCard from "@/components/StarfieldCard.vue";
import GlowText from "@/components/GlowText.vue";

const router = useRouter();
const authStore = useAuthStore();

const formData = ref({
  email: "",
  phone: "",
  password: "",
  name: "",
});

const confirmPassword = ref("");
const error = ref("");
const success = ref("");
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
        return "Email không hợp lệ";
      }
      break;
    case "phone":
      if (value && (value.length !== 10 || !/^[0-9]+$/.test(value))) {
        return "Số điện thoại phải có đúng 10 số";
      }
      break;
    case "password":
      if (value && value.length < 6) {
        return "Mật khẩu phải có ít nhất 6 ký tự";
      }
      break;
    case "name":
      if (value && (value.length < 2 || value.length > 50)) {
        return "Tên phải từ 2 đến 50 ký tự";
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
        ? "Mật khẩu xác nhận không khớp"
        : "";
  } else {
    fieldErrors.value[field] = validateField(field, formData.value[field]);
  }
};

const handleRegister = async () => {
  if (!isValid.value || loading.value) return;

  // Clear previous errors
  error.value = "";
  success.value = "";
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
    fieldErrors.value.confirmPassword = "Mật khẩu xác nhận không khớp";
    hasErrors = true;
  }

  if (hasErrors) return;

  loading.value = true;

  try {
    const result = await authStore.register(formData.value);
    success.value = result.message;
    error.value = "";

    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  } catch (err) {
    error.value = err.message || "Đăng ký thất bại. Vui lòng thử lại.";
    success.value = "";
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
            <GlowText :level="2">Đăng Ký</GlowText>
            <p class="register-subtitle">Tạo tài khoản mới</p>
          </div>

          <form @submit.prevent="handleRegister" class="register-form">
            <div v-if="error" class="error-message">
              {{ error }}
            </div>

            <div v-if="success" class="success-message">
              {{ success }}
            </div>

            <div class="form-group">
              <label for="email" class="form-label">Email *</label>
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
              />
              <span v-if="fieldErrors.email" class="field-error">
                {{ fieldErrors.email }}
              </span>
            </div>

            <div class="form-group">
              <label for="phone" class="form-label">Số điện thoại *</label>
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
              />
              <span v-if="fieldErrors.phone" class="field-error">
                {{ fieldErrors.phone }}
              </span>
            </div>

            <div class="form-group">
              <label for="name" class="form-label">Họ và tên *</label>
              <input
                id="name"
                v-model="formData.name"
                type="text"
                class="form-input"
                :class="{ 'form-input--error': fieldErrors.name }"
                placeholder="Nguyễn Văn A"
                required
                maxlength="50"
                autocomplete="name"
                @blur="handleFieldBlur('name')"
              />
              <span v-if="fieldErrors.name" class="field-error">
                {{ fieldErrors.name }}
              </span>
            </div>

            <div class="form-group">
              <label for="password" class="form-label">Mật khẩu *</label>
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
              />
              <span v-if="fieldErrors.password" class="field-error">
                {{ fieldErrors.password }}
              </span>
            </div>

            <div class="form-group">
              <label for="confirmPassword" class="form-label">
                Xác nhận mật khẩu *
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
              />
              <span v-if="fieldErrors.confirmPassword" class="field-error">
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
              {{ loading ? "Đang đăng ký..." : "Đăng Ký" }}
            </StarfieldButton>
          </form>

          <div class="login-link">
            <p>
              Đã có tài khoản?
              <button type="button" class="link-button" @click="goToLogin">
                Đăng nhập ngay
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

.success-message {
  padding: 1rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 2px;
  color: #86efac;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  text-align: center;
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
