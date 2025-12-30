<script setup>
import { onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import GlowText from "@/components/GlowText.vue";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

onMounted(async () => {
  try {
    // Check if tokens are in query params (if backend redirects with them)
    const accessToken = route.query.accessToken;
    const refreshToken = route.query.refreshToken;
    const name = route.query.name;

    if (accessToken && refreshToken) {
      // Store tokens and redirect
      const user = name ? { name } : null;
      authStore.setAuth(accessToken, refreshToken, user);

      // Redirect to intended route or home
      const redirect = route.query.redirect || "/";
      router.push(redirect);
      return;
    }

    // If no tokens in query, check if backend sent them via postMessage (popup flow)
    // or make a request to get user info
    // For now, if no tokens, redirect to login with error
    router.push({
      path: "/login",
      query: { error: "Không thể xác thực với Google. Vui lòng thử lại." },
    });
  } catch (error) {
    console.error("Google callback error:", error);
    router.push({
      path: "/login",
      query: { error: "Đã xảy ra lỗi khi xác thực với Google." },
    });
  }
});
</script>

<template>
  <section class="callback-section">
    <div class="container-center">
      <div class="callback-container">
        <GlowText level="3">Đang xử lý đăng nhập...</GlowText>
        <p class="callback-message">Vui lòng đợi trong giây lát</p>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.callback-section {
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

.callback-container {
  text-align: center;
}

.callback-message {
  color: rgba(241, 245, 249, 0.7);
  font-size: 1.125rem;
  font-weight: 300;
  margin-top: 1rem;
  font-family: "Merriweather", serif;
}
</style>
