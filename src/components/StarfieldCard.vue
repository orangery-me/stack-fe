<script setup>
defineProps({
  glow: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <div :class="['starfield-card', { 'starfield-card--glow': glow }]">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.starfield-card {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(184, 167, 255, 0.3);
  border-radius: 2px;
  padding: 2rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #B8A7FF, transparent);
    opacity: 0.5;
  }
  
  &--glow {
    box-shadow: 0 0 20px rgba(184, 167, 255, 0.1), 0 0 40px rgba(184, 167, 255, 0.05);
  }
  
  &:hover {
    border-color: rgba(184, 167, 255, 0.5);
    box-shadow: 0 0 30px rgba(184, 167, 255, 0.2), 0 0 60px rgba(184, 167, 255, 0.1);
    transform: translateY(-2px);
  }
}
</style>

