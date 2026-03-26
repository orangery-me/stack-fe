<script setup>
import { onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import CalmHeading from "@/components/calm/CalmHeading.vue";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

onMounted(async () => {
  try {
    const code = route.query.code;
    const state = route.query.state;

    if (!code || !state) {
      throw new Error("Missing Google OAuth data");
    }

    await authStore.googleSignIn({
      code,
      state,
    });

    const redirect = route.query.redirect || "/";
    router.replace(redirect);
  } catch (err) {
    // Toast is shown by the global axios interceptor
    router.replace({
      path: "/login",
      query: {
        error: err?.message || "Google login failed",
      },
    });
  }
});
</script>

<template>
  <section class="auth-status">
    <div class="container-center">
      <div class="auth-status__container">
        <CalmHeading :level="3"> Processing sign in... </CalmHeading>
        <p class="auth-status__message ui-muted">Please wait a moment</p>
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
