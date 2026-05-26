<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useToast } from "@/composables/useToast.js";
import StackLogo from "@/components/StackLogo.vue";

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
  <div class="flex flex-col md:flex-row w-full min-h-screen bg-white select-none">
    <!-- Left Column (2/3 width, organic apricot conic-gradient decorative panel) -->
    <div class="bg-[#fff9f3] hidden md:flex md:w-[62%] lg:w-[67%] xl:w-[70%] items-center justify-center relative overflow-hidden">
      <!-- Center Illustration -->
      <div class="w-full h-full overflow-hidden flex items-center justify-center">
        <img
          class="object-cover select-none pointer-events-none animate-fade-in scale-[1.1]"
          src="/login-illustration.png"
          alt="Minimalist Productivity Illustration"
        >
      </div>
    </div>

    <!-- Right Column (1/3 width, centered registration form) -->
    <div class="w-full md:w-[38%] lg:w-[33%] xl:w-[30%] flex flex-col justify-between p-8 sm:p-12 md:p-10 lg:p-12 xl:p-16 bg-white overflow-y-auto">
      <!-- Form Content Wrapper -->
      <div class="flex-1 flex flex-col justify-center max-w-[360px] mx-auto w-full py-8">
        <!-- Stack Logo -->
        <div>
          <StackLogo />
        </div>

        <!-- Heading -->
        <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight text-[#1F1A17] mb-2 font-sans">
          Create account
        </h1>
        <p class="text-sm text-[#5F5A56] mb-8 font-sans">
          Use your email to get started.
        </p>

        <!-- Registration Form -->
        <form @submit.prevent="handleRegister" class="flex flex-col gap-4 !mt-0">
          <!-- Email -->
          <div class="flex flex-col gap-1.5 w-full">
            <label for="email" class="text-xs font-bold text-[#1F1A17]">Email</label>
            <input
              id="email"
              type="email"
              v-model="formData.email"
              placeholder="you@company.com"
              required
              class="w-full h-10 px-3 rounded-md border border-[#E7E1DB] bg-white text-[#1F1A17] placeholder-[#8E8883] focus:outline-none focus:border-[#E95C47] focus:ring-2 focus:ring-[#E95C47]/10 transition duration-200 text-sm"
              :disabled="loading"
              @blur="handleFieldBlur('email')"
            />
            <span v-if="fieldErrors.email" class="text-xs text-red-500">{{ fieldErrors.email }}</span>
          </div>

          <!-- Full Name -->
          <div class="flex flex-col gap-1.5 w-full">
            <label for="name" class="text-xs font-bold text-[#1F1A17]">Full name</label>
            <input
              id="name"
              type="text"
              v-model="formData.name"
              placeholder="John Doe"
              required
              class="w-full h-10 px-3 rounded-md border border-[#E7E1DB] bg-white text-[#1F1A17] placeholder-[#8E8883] focus:outline-none focus:border-[#E95C47] focus:ring-2 focus:ring-[#E95C47]/10 transition duration-200 text-sm"
              :disabled="loading"
              @blur="handleFieldBlur('name')"
            />
            <span v-if="fieldErrors.name" class="text-xs text-red-500">{{ fieldErrors.name }}</span>
          </div>

          <!-- Phone -->
          <div class="flex flex-col gap-1.5 w-full">
            <label for="phone" class="text-xs font-bold text-[#1F1A17]">Phone</label>
            <input
              id="phone"
              type="tel"
              v-model="formData.phone"
              placeholder="0123456789"
              required
              class="w-full h-10 px-3 rounded-md border border-[#E7E1DB] bg-white text-[#1F1A17] placeholder-[#8E8883] focus:outline-none focus:border-[#E95C47] focus:ring-2 focus:ring-[#E95C47]/10 transition duration-200 text-sm"
              :disabled="loading"
              @blur="handleFieldBlur('phone')"
            />
            <span v-if="fieldErrors.phone" class="text-xs text-red-500">{{ fieldErrors.phone }}</span>
          </div>

          <!-- Password -->
          <div class="flex flex-col gap-1.5 w-full">
            <label for="password" class="text-xs font-bold text-[#1F1A17]">Password</label>
            <input
              id="password"
              type="password"
              v-model="formData.password"
              placeholder="••••••••"
              required
              class="w-full h-10 px-3 rounded-md border border-[#E7E1DB] bg-white text-[#1F1A17] placeholder-[#8E8883] focus:outline-none focus:border-[#E95C47] focus:ring-2 focus:ring-[#E95C47]/10 transition duration-200 text-sm"
              :disabled="loading"
              @blur="handleFieldBlur('password')"
            />
            <span v-if="fieldErrors.password" class="text-xs text-red-500">{{ fieldErrors.password }}</span>
          </div>

          <!-- Confirm Password -->
          <div class="flex flex-col gap-1.5 w-full">
            <label for="confirmPassword" class="text-xs font-bold text-[#1F1A17]">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              v-model="confirmPassword"
              placeholder="••••••••"
              required
              class="w-full h-10 px-3 rounded-md border border-[#E7E1DB] bg-white text-[#1F1A17] placeholder-[#8E8883] focus:outline-none focus:border-[#E95C47] focus:ring-2 focus:ring-[#E95C47]/10 transition duration-200 text-sm"
              :disabled="loading"
              @blur="handleFieldBlur('confirmPassword')"
            />
            <span v-if="fieldErrors.confirmPassword" class="text-xs text-red-500">{{ fieldErrors.confirmPassword }}</span>
          </div>

          <!-- CTA primary Submit -->
          <button
            type="submit"
            :disabled="!isValid || loading"
            class="w-full h-10 bg-[#E95C47] hover:bg-[#D94B35] active:bg-[#C93B26] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-md transition duration-200 cursor-pointer shadow-xs flex items-center justify-center gap-2 mt-2"
          >
            <span v-if="loading" class="w-4 h-4 rounded-full border-2 border-white/50 border-t-transparent animate-spin"></span>
            Create account
          </button>
        </form>

        <!-- Privacy Terms Disclaimer -->
        <p class="mt-6 text-[10px] text-[#5F5A56] leading-relaxed">
          By signing up, you agree to Stack's <a href="#" class="text-[#E95C47] hover:underline hover:text-[#D94B35] font-semibold">Terms of Service</a> and <a href="#" class="text-[#E95C47] hover:underline hover:text-[#D94B35] font-semibold">Privacy Policy</a>.
        </p>

        <!-- Separator -->
        <hr class="my-6 border-[#E7E1DB]" />

        <!-- Router redirection footer -->
        <p class="text-xs text-[#5F5A56] text-center">
          Already have an account? 
          <button
            type="button"
            class="text-[#E95C47] hover:underline hover:text-[#D94B35] font-bold cursor-pointer ml-1"
            @click="goToLogin"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.animate-fade-in {
  animation: fadeIn 0.8s var(--ui-ease) forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
