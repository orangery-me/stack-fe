<script setup>
defineProps({
  level: {
    type: Number,
    default: 1, // 1-6 for h1-h6
  },
  glow: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <component
    :is="`h${level}`"
    :class="['glow-text', `glow-text--h${level}`, { 'glow-text--glow': glow }]"
  >
    <slot />
  </component>
</template>

<style scoped lang="scss">
.glow-text {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: #F1F5F9;
  letter-spacing: 0.05em;
  
  &--h1 {
    font-size: 3.5rem;
    line-height: 1.1;
    margin-bottom: 1.5rem;
  }
  
  &--h2 {
    font-size: 2.5rem;
    line-height: 1.2;
    margin-bottom: 1.25rem;
  }
  
  &--h3 {
    font-size: 2rem;
    line-height: 1.3;
    margin-bottom: 1rem;
  }
  
  &--h4 {
    font-size: 1.5rem;
    line-height: 1.4;
    margin-bottom: 0.875rem;
  }
  
  &--h5 {
    font-size: 1.25rem;
    line-height: 1.5;
    margin-bottom: 0.75rem;
  }
  
  &--h6 {
    font-size: 1.125rem;
    line-height: 1.5;
    margin-bottom: 0.5rem;
  }
  
  &--glow {
    text-shadow: 0 0 20px rgba(184, 167, 255, 0.5), 0 0 40px rgba(184, 167, 255, 0.3);
  }
}

@media (max-width: 768px) {
  .glow-text {
    &--h1 {
      font-size: 2.5rem;
    }
    
    &--h2 {
      font-size: 2rem;
    }
    
    &--h3 {
      font-size: 1.75rem;
    }
  }
}
</style>

