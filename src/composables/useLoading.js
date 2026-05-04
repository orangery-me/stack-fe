import { ref } from "vue";

const state = ref({
  fullscreen: {
    active: false,
    label: "",
  },
});

function showFullscreen(options = {}) {
  state.value.fullscreen.active = true;
  state.value.fullscreen.label = options.label || "";
}

function hideFullscreen() {
  state.value.fullscreen.active = false;
  state.value.fullscreen.label = "";
}

async function withFullscreen(promiseOrFn, options = {}) {
  showFullscreen(options);
  try {
    if (typeof promiseOrFn === "function") {
      return await promiseOrFn();
    }
    return await promiseOrFn;
  } finally {
    hideFullscreen();
  }
}

export function useLoading() {
  return {
    state,
    showFullscreen,
    hideFullscreen,
    withFullscreen,
    createLocalLoading,
  };
}

/**
 * Create a component-scoped (non-fullscreen) loading state.
 * Usage: const { isLoading, withLoading } = createLocalLoading();
 */
export function createLocalLoading() {
  const isLoading = ref(false);

  const show = () => { isLoading.value = true; };
  const hide = () => { isLoading.value = false; };

  async function withLoading(promiseOrFn) {
    show();
    try {
      if (typeof promiseOrFn === 'function') {
        return await promiseOrFn();
      }
      return await promiseOrFn;
    } finally {
      hide();
    }
  }

  return { isLoading, show, hide, withLoading };
}

