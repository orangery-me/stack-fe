import { defineStore } from "pinia";
import { ref } from "vue";

export const useUiStore = defineStore("ui", () => {
  const isAiOpen = ref(false);
  const aiSidebarWidth = ref(380);
  const aiDraft = ref("");
  const aiSelectedContext = ref(null);
  const pendingAiCommand = ref(null);
  const isAiBusy = ref(false);

  function toggleAi() {
    isAiOpen.value = !isAiOpen.value;
  }

  function setAiDraft(text = "") {
    aiSelectedContext.value = null;
    aiDraft.value = text;
  }

  function clearAiDraft() {
    aiDraft.value = "";
  }

  function setAiSelectedContext(context = null) {
    if (!context?.fullText?.trim()) {
      aiSelectedContext.value = null;
      return;
    }

    const fullText = context.fullText.trim();
    aiSelectedContext.value = {
      source: context.source || "canvas-selection",
      label: context.label || "Selected text",
      fullText,
      preview:
        context.preview ||
        fullText.replace(/\s+/g, " ").slice(0, 220),
    };
  }

  function clearAiSelectedContext() {
    aiSelectedContext.value = null;
  }

  function openAiWithSelectedContext(context = null) {
    setAiSelectedContext(context);
    aiDraft.value = "";
    isAiOpen.value = true;
  }

  function openAiWithDraft(text = "") {
    aiSelectedContext.value = null;
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
    aiSelectedContext,
    pendingAiCommand,
    isAiBusy,
    toggleAi,
    setAiDraft,
    clearAiDraft,
    setAiSelectedContext,
    clearAiSelectedContext,
    openAiWithSelectedContext,
    openAiWithDraft,
    setPendingAiCommand,
    clearPendingAiCommand,
    setAiBusy,
    setAiSidebarWidth,
  };
});
