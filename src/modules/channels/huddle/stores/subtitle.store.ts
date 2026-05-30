import { defineStore } from 'pinia';
import { ref } from 'vue';

const STORAGE_KEY = 'huddle_subtitles_enabled';

export const useSubtitleStore = defineStore('huddle-subtitles', () => {
  const storedValue = localStorage.getItem(STORAGE_KEY);
  const enabled = ref(storedValue === null ? true : storedValue === 'true');

  function setEnabled(value: boolean) {
    enabled.value = value;
    localStorage.setItem(STORAGE_KEY, String(value));
  }

  function toggle() {
    setEnabled(!enabled.value);
  }

  return {
    enabled,
    setEnabled,
    toggle,
  };
});
