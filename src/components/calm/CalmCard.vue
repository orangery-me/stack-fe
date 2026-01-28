<script setup>
defineOptions({ name: "CalmCard" });

defineProps({
  padding: {
    type: String,
    default: "md", // sm | md | lg
  },
});
</script>

<template>
  <div :class="['calm-card', `calm-card--${padding}`]">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.calm-card {
  background: var(--ui-bg-surface);
  border: 1px solid var(--ui-divider);
  border-radius: var(--ui-radius-card);
  box-shadow: var(--ui-shadow-card);
}

.calm-card--sm {
  padding: var(--space-16);
}

.calm-card--md {
  padding: var(--space-24);
}

.calm-card--lg {
  padding: var(--space-32);
}
</style>

