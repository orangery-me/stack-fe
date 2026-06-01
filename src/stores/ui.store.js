import { defineStore } from "pinia";
import { ref } from "vue";

export const useUiStore = defineStore("ui", () => {
  const isAiOpen = ref(false);
  const aiSidebarWidth = ref(380);
  const aiDraft = ref("");
  const pendingAiCommand = ref(null);
  const isAiBusy = ref(false);

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

  function setPendingAiCommand(command) {
    pendingAiCommand.value = command;
    isAiOpen.value = true;
  }

  function clearPendingAiCommand(commandId) {
    if (!commandId || pendingAiCommand.value?.id === commandId) {
      pendingAiCommand.value = null;
    }
  }

  function setAiBusy(busy) {
    isAiBusy.value = Boolean(busy);
  }

  function setAiSidebarWidth(w) {
    aiSidebarWidth.value = w;
  }

  return {
    isAiOpen,
    aiSidebarWidth,
    aiDraft,
    pendingAiCommand,
    isAiBusy,
    toggleAi,
    setAiDraft,
    clearAiDraft,
    openAiWithDraft,
    setPendingAiCommand,
    clearPendingAiCommand,
    setAiBusy,
    setAiSidebarWidth,
  };
});
