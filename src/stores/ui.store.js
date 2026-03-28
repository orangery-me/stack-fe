import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  const isAiOpen = ref(false);
  const aiSidebarWidth = ref(380);

  function toggleAi() {
    isAiOpen.value = !isAiOpen.value;
  }

  function setAiSidebarWidth(w) {
    aiSidebarWidth.value = w;
  }

  return { isAiOpen, aiSidebarWidth, toggleAi, setAiSidebarWidth };
});
