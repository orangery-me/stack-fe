import { defineStore } from "pinia";
import { ref } from "vue";

export const useUiStore = defineStore("ui", () => {
  const isAiOpen = ref(false);
  const aiSidebarWidth = ref(380);
  const aiDraft = ref("");

  function toggleAi() {
    isAiOpen.value = !isAiOpen.value;
  }

  function setAiDraft(text = "") {
    aiDraft.value = text;
  }

  function clearAiDraft() {
    aiDraft.value = "";
  }

  function openAiWithDraft(text = "") {
    aiDraft.value = text;
    isAiOpen.value = true;
  }

  function setAiSidebarWidth(w) {
    aiSidebarWidth.value = w;
  }

  return {
    isAiOpen,
    aiSidebarWidth,
    aiDraft,
    toggleAi,
    setAiDraft,
    clearAiDraft,
    openAiWithDraft,
    setAiSidebarWidth,
  };
});
