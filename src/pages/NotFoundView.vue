<script setup>
import CalmButton from "@/components/calm/CalmButton.vue";
import CalmHeading from "@/components/calm/CalmHeading.vue";
</script>

<template>
  <div class="not-found">
    <div class="container-center">
      <div class="not-found__inner">
        <div class="not-found__code">404</div>
        <CalmHeading :level="2">Page not found</CalmHeading>
        <p class="ui-muted not-found__desc">
          The page you’re looking for doesn’t exist.
        </p>
        <router-link to="/">
          <CalmButton variant="primary" size="lg">
            Go back to home
          </CalmButton>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.not-found {
  padding: var(--space-48) 0;
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
}

.not-found__inner {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: var(--space-12);
}

.not-found__code {
  font-size: 48px;
  font-weight: 600;
  line-height: 1.1;
  color: var(--ui-text);
  letter-spacing: -0.02em;
}

.not-found__desc {
  margin: 0 0 var(--space-12);
}
</style>