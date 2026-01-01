<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "@/composables/useToast.js";
import authService from "@/services/auth.service.js";
import GlowText from "@/components/GlowText.vue";

const router = useRouter();
const route = useRoute();
const { success, error } = useToast();

const loading = ref(true);
const status = ref("processing"); // processing, success, error

onMounted(async () => {
  const token = route.query.token;

  if (!token) {
    status.value = "error";
    loading.value = false;
    error(
      "Invalid verification token. Please check the link in your email."
    );
    setTimeout(() => {
      router.push("/login");
    }, 3000);
    return;
  }

  try {
    // Call API to verify email
    const response = await authService.verifyEmail(token);

    // Success
    status.value = "success";
    loading.value = false;

    // Show success toast with message from API
    const message =
      response?.message ||
      "Email verification successful. You can sign in now.";
    success(message, 5000);

    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  } catch (err) {
    // Error
    status.value = "error";
    loading.value = false;

    console.log(err);

    // Show error toast with error message
    const errorMessage =
      err?.message || "Email verification failed. Please try again.";
    error(errorMessage, 5000);

    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  }
});
</script>

<template>
  <section class="verify-email-section">
    <div class="container-center">
      <div class="verify-container">
        <GlowText :level="3">
          <template v-if="loading || status === 'processing'">
            Verifying email...
          </template>
          <template v-else-if="status === 'success'">
            Verification successful!
          </template>
          <template v-else>
            Verification failed
          </template>
        </GlowText>
        <p class="verify-message">
          <template v-if="loading || status === 'processing'">
            Please wait a moment
          </template>
          <template v-else-if="status === 'success'">
            Redirecting to sign in page...
          </template>
          <template v-else>
            Redirecting to sign in page...
          </template>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.verify-email-section {
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

.verify-container {
  text-align: center;
}

.verify-message {
  color: rgba(241, 245, 249, 0.7);
  font-size: 1.125rem;
  font-weight: 300;
  margin-top: 1rem;
  font-family: "Merriweather", serif;
}
</style>
