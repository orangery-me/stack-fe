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
    const code = route.query.code;
    const state = route.query.state;

    if (!code || !state) {
      throw new Error('Missing Google OAuth data');
    }

    await authStore.googleSignIn({
      code,
      state,
    });

    const redirect = route.query.redirect || '/';
    router.replace(redirect);
  } catch (error) {
    console.error('Google sign-in failed:', error);
    // router.replace({
    //   path: '/login',
    //   query: {
    //     error: error.message || 'Google login failed',
    //   },
    // });
  }
});

</script>

<template>
  <section class="callback-section">
    <div class="container-center">
      <div class="callback-container">
        <GlowText level="3">
          Processing sign in...
        </GlowText>
        <p class="callback-message">
          Please wait a moment
        </p>
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
