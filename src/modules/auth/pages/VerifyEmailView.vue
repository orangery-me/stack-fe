<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "@/composables/useToast.js";
import authService from "@/services/auth.service.js";
import CalmHeading from "@/components/calm/CalmHeading.vue";

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
  <section class="auth-status">
    <div class="container-center">
      <div class="auth-status__container">
        <CalmHeading :level="3">
          <template v-if="loading || status === 'processing'">
            Verifying email...
          </template>
          <template v-else-if="status === 'success'">
            Verification successful!
          </template>
          <template v-else>
            Verification failed
          </template>
        </CalmHeading>
        <p class="auth-status__message ui-muted">
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
.auth-status {
  padding: var(--space-48) 0;
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-status__container {
  text-align: center;
  display: grid;
  gap: var(--space-12);
}

.auth-status__message {
  margin: 0;
  font-size: 14px;
}
</style>
