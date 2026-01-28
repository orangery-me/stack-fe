<script setup>
import { useToast } from '@/composables/useToast.js';
import Toast from './Toast.vue';

const { toasts, dismiss } = useToast();
</script>

<template>
  <div class="toast-container">
    <TransitionGroup
      name="toast-list"
      tag="div"
      class="toast-list"
    >
      <Toast
        v-for="toast in toasts"
        :id="toast.id"
        :key="toast.id"
        :type="toast.type"
        :message="toast.message"
        :duration="toast.duration"
        @dismiss="dismiss"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped lang="scss">
.toast-container {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-end;
  pointer-events: auto;
}

.toast-list-enter-active {
  transition: all 0.3s ease-out;
}

.toast-list-leave-active {
  transition: all 0.3s ease-in;
}

.toast-list-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-list-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-list-move {
  transition: transform 0.3s ease;
}

@media (max-width: 768px) {
  .toast-container {
    top: 1rem;
    right: 1rem;
    left: 1rem;
  }

  .toast-list {
    align-items: stretch;
  }
}
</style>

