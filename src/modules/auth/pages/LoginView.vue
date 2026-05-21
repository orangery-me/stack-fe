<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useToast } from "@/composables/useToast.js";
import NotebookBackground from "@/components/calm/NotebookBackground.vue";
import { Eye, EyeOff } from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { error: showErrorToast } = useToast();

const email = ref("");
const password = ref("");
const loading = ref(false);
const showPassword = ref(false);

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
  <div class="flex flex-col md:flex-row w-full bg-white select-none">
    <!-- Left Column (1/3 width, centered login form) -->
    <div class="w-full md:w-[38%] lg:w-[33%] xl:w-[30%] flex flex-col justify-between p-8 sm:p-12 md:p-10 lg:p-12 xl:p-16 bg-white overflow-y-auto">
      <!-- Form Content Wrapper -->
      <div class="flex-1 flex flex-col justify-center max-w-[360px] mx-auto w-full py-8">
        <!-- Premium Todoist-style Stack Logo -->
        <div class="flex items-center gap-2.5 mb-10 cursor-pointer" @click="router.push('/')">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="5" fill="#E95C47" />
            <path d="M6 12L9 15L18 6" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 16L9 19L18 10" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
          </svg>
          <span class="text-2xl font-black tracking-tight text-[#1F1A17] font-sans">stack</span>
        </div>

        <!-- Heading -->
        <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight text-[#1F1A17] mb-8 font-sans">
          Welcome back!
        </h1>

        <!-- Social Quick Login Options -->
        <div class="flex flex-col gap-3 mb-6">
          <!-- Google -->
          <button
            type="button"
            class="w-full h-10 border border-[#E7E1DB] bg-white hover:bg-[#F8F6F3] flex items-center justify-center gap-3 px-4 rounded-md text-sm font-bold text-[#1F1A17] transition duration-200 cursor-pointer shadow-xs"
            @click="handleGoogleLogin"
          >
            <img
              class="w-4 h-4 flex-shrink-0"
              src="/logos/google-logo.png"
              alt="Google"
            >
            Continue with Google
          </button>
          
          <!-- Facebook -->
          <button
            type="button"
            class="w-full h-10 border border-[#E7E1DB] bg-white hover:bg-[#F8F6F3] flex items-center justify-center gap-3 px-4 rounded-md text-sm font-bold text-[#1F1A17] transition duration-200 cursor-pointer shadow-xs"
          >
            <svg class="w-4 h-4 text-[#1877F2] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>
        </div>

        <!-- Form Credentials -->
        <form @submit.prevent="handleLogin" class="flex flex-col gap-4 !mt-7">
          <!-- Email -->
          <div class="flex flex-col gap-1.5 w-full">
            <label for="email" class="text-xs font-bold text-[#1F1A17]">Email</label>
            <input
              id="email"
              type="email"
              v-model="email"
              placeholder="Enter your email..."
              required
              class="w-full h-10 px-3 rounded-md border border-[#E7E1DB] bg-white text-[#1F1A17] placeholder-[#8E8883] focus:outline-none focus:border-[#E95C47] focus:ring-2 focus:ring-[#E95C47]/10 transition duration-200 text-sm"
              :disabled="loading"
            />
          </div>

          <!-- Password with eye toggle -->
          <div class="flex flex-col gap-1.5 w-full relative">
            <label for="password" class="text-xs font-bold text-[#1F1A17]">Password</label>
            <div class="relative w-full">
              <input
                id="password"
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                placeholder="Enter your password..."
                required
                class="w-full h-10 px-3 pl-3 pr-10 rounded-md border border-[#E7E1DB] bg-white text-[#1F1A17] placeholder-[#8E8883] focus:outline-none focus:border-[#E95C47] focus:ring-2 focus:ring-[#E95C47]/10 transition duration-200 text-sm"
                :disabled="loading"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8883] hover:text-[#5F5A56] focus:outline-none cursor-pointer transition-colors duration-200"
                @click="showPassword = !showPassword"
              >
                <Eye v-if="!showPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- CTA primary Submit -->
          <button
            type="submit"
            :disabled="!isValid || loading"
            class="w-full h-10 bg-[#E95C47] hover:bg-[#D94B35] active:bg-[#C93B26] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-md transition duration-200 cursor-pointer shadow-xs flex items-center justify-center gap-2 mt-2"
          >
            <span v-if="loading" class="w-4 h-4 rounded-full border-2 border-white/50 border-t-transparent animate-spin"></span>
            Log in
          </button>
        </form>

        <!-- Forgot Password -->
        <div class="mt-4 text-xs">
          <a href="#" class="text-[#E95C47] hover:underline hover:text-[#D94B35] font-semibold">Forgot your password?</a>
        </div>

        <!-- Privacy Terms Disclaimer -->
        <p class="mt-6 text-[10px] text-[#5F5A56] leading-relaxed">
          By continuing with Google, Apple, or Email, you agree to Stack's <a href="#" class="text-[#E95C47] hover:underline hover:text-[#D94B35] font-semibold">Terms of Service</a> and <a href="#" class="text-[#E95C47] hover:underline hover:text-[#D94B35] font-semibold">Privacy Policy</a>.
        </p>

        <!-- Separator -->
        <hr class="my-6 border-[#E7E1DB]" />

        <!-- Router redirection footer -->
        <p class="text-xs text-[#5F5A56] text-center">
          Don't have an account? 
          <button
            type="button"
            class="text-[#E95C47] hover:underline hover:text-[#D94B35] font-bold cursor-pointer ml-1"
            @click="goToRegister"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>

    <!-- Right Column (2/3 width, organic apricot conic-gradient decorative panel) -->
    <div class="bg-[#fff9f3] hidden justify-center md:flex md:w-[62%] lg:w-[67%] xl:w-[70%] xl:h-[70%] relative overflow-hidden">
      <div class="">
        <!-- Center Illustration zoomed to fit the entire 2/3 interface -->
        <div class="w-full h-full overflow-hidden flex items-center justify-center">
          <img
            class="object-cover select-none pointer-events-none animate-fade-in scale-[1.1]"
            src="/login-illustration.png"
            alt="Minimalist Productivity Illustration"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.mix-blend-multiply {
  mix-blend-mode: multiply;
}

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

