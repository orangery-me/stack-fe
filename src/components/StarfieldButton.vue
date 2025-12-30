<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary', // 'primary' | 'secondary' | 'outline'
  },
  size: {
    type: String,
    default: 'md', // 'sm' | 'md' | 'lg'
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <button
    :class="[
      'starfield-button',
      `starfield-button--${variant}`,
      `starfield-button--${size}`,
      { 'starfield-button--disabled': disabled }
    ]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped lang="scss">
.starfield-button {
  position: relative;
  background: rgba(184, 167, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid #B8A7FF;
  color: #F1F5F9;
  font-weight: 300;
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(184, 167, 255, 0.3), transparent);
    transition: left 0.5s ease;
  }
  
  &:hover:not(:disabled)::before {
    left: 100%;
  }
  
  &:hover:not(:disabled) {
    background: rgba(184, 167, 255, 0.2);
    box-shadow: 0 0 20px rgba(184, 167, 255, 0.5), 0 0 40px rgba(184, 167, 255, 0.3);
    border-color: #B8A7FF;
    transform: translateY(-1px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &--primary {
    background: rgba(184, 167, 255, 0.15);
    border-color: #B8A7FF;
    box-shadow: 0 0 10px rgba(184, 167, 255, 0.3);
  }
  
  &--secondary {
    background: rgba(241, 245, 249, 0.05);
    border-color: rgba(241, 245, 249, 0.3);
    box-shadow: 0 0 10px rgba(241, 245, 249, 0.1);
    
    &:hover:not(:disabled) {
      background: rgba(241, 245, 249, 0.1);
      box-shadow: 0 0 20px rgba(241, 245, 249, 0.3), 0 0 40px rgba(241, 245, 249, 0.1);
      border-color: rgba(241, 245, 249, 0.5);
    }
  }
  
  &--outline {
    background: transparent;
    border-color: #B8A7FF;
    
    &:hover:not(:disabled) {
      background: rgba(184, 167, 255, 0.1);
    }
  }
  
  &--sm {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    border-radius: 2px;
  }
  
  &--md {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: 2px;
  }
  
  &--lg {
    padding: 1rem 2rem;
    font-size: 1.125rem;
    border-radius: 2px;
  }
  
  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>

