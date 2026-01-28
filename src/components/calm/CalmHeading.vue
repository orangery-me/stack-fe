<script setup>
import { computed } from "vue";

defineOptions({ name: "CalmHeading" });

const props = defineProps({
  level: {
    type: Number,
    default: 1, // 1 | 2 | 3
  },
});

const normalizedLevel = computed(() => {
  if (props.level <= 1) return 1;
  if (props.level === 2) return 2;
  return 3;
});
</script>

<template>
  <component
    :is="`h${normalizedLevel}`"
    :class="['calm-heading', `calm-heading--h${normalizedLevel}`]"
  >
    <slot />
  </component>
</template>

<style scoped lang="scss">
.calm-heading {
  color: var(--ui-text);
  font-weight: 700;
  line-height: 1.3;
}

.calm-heading--h1 {
  font-size: 28px;
}

.calm-heading--h2 {
  font-size: 22px;
}

.calm-heading--h3 {
  font-size: 18px;
}
</style>

