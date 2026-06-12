<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

defineOptions({ name: "CustomSelect" });

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: "",
  },
  options: {
    type: Array,
    default: () => [], // Array of strings or { value: any, label: string }
  },
  placeholder: {
    type: String,
    default: "Select option",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: "md", // "sm", "md"
  },
  alignRight: {
    type: Boolean,
    default: false,
  },
  width: {
    type: String,
    default: "auto", // "auto", "100%", or specific width e.g., "150px"
  },
  openUp: {
    type: Boolean,
    default: false,
  }
});

const emit = defineEmits(["update:modelValue", "change"]);

const isOpen = ref(false);
const selectRef = ref(null);

const formattedOptions = computed(() => {
  return props.options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value ?? '',
        label: opt.label ?? String(opt.value ?? '')
      };
    }
    return { value: opt, label: String(opt) };
  });
});

const selectedOption = computed(() => {
  // Loose equality is useful here to match numbers and string equivalents cleanly if any
  return formattedOptions.value.find(opt => String(opt.value) === String(props.modelValue)) || null;
});

const displayLabel = computed(() => {
  return selectedOption.value ? selectedOption.value.label : props.placeholder;
});

const toggleDropdown = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
};

const selectOption = (opt) => {
  emit("update:modelValue", opt.value);
  emit("change", opt.value);
  isOpen.value = false;
};

const handleClickOutside = (event) => {
  if (selectRef.value && !selectRef.value.contains(event.target)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div
    ref="selectRef"
    class="custom-select-container"
    :class="[
      `custom-select-container--${size}`,
      { 'custom-select-container--disabled': disabled },
      { 'custom-select-container--open': isOpen }
    ]"
    :style="{ width: width === 'auto' ? 'auto' : width }"
  >
    <!-- Trigger Button -->
    <button
      type="button"
      class="custom-select-trigger"
      :disabled="disabled"
      @click="toggleDropdown"
    >
      <span class="custom-select-label" :class="{ 'custom-select-label--placeholder': !selectedOption }">
        {{ displayLabel }}
      </span>
      <svg
        class="custom-select-chevron"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="m6 8 4 4 4-4"
        />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <transition name="dropdown-slide">
      <ul
        v-if="isOpen"
        class="custom-select-menu"
        :class="{ 'custom-select-menu--align-right': alignRight, 'custom-select-menu--open-up': openUp }"
      >
        <li
          v-for="opt in formattedOptions"
          :key="opt.value"
          class="custom-select-item"
          :class="{ 'custom-select-item--active': String(opt.value) === String(modelValue) }"
          @click="selectOption(opt)"
        >
          {{ opt.label }}
        </li>
      </ul>
    </transition>
  </div>
</template>

<style scoped lang="scss">
.custom-select-container {
  position: relative;
  display: inline-block;
  font-family: inherit;
}

/* Trigger Button */
.custom-select-trigger {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background-color: var(--ui-bg-surface, #FFFDFB);
  border: 1px solid var(--ui-border, #E7E1DB);
  color: var(--ui-text, #1F1A17);
  cursor: pointer;
  outline: none;
  text-align: left;
  user-select: none;
  transition: border-color var(--ui-duration, 0.15s) var(--ui-ease, ease),
              box-shadow var(--ui-duration, 0.15s) var(--ui-ease, ease);
}

.custom-select-container--md .custom-select-trigger {
  height: 38px;
  padding: 0 12px;
  border-radius: var(--ui-radius-input, 8px);
  font-size: 14px;
}

.custom-select-container--sm .custom-select-trigger {
  height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 13px;
}

.custom-select-trigger:hover:not(:disabled) {
  border-color: var(--gray-300, #C2B6AD);
}

.custom-select-container--open {
  z-index: 1000 !important;
}

.custom-select-container--open .custom-select-trigger {
  border-color: var(--primary-500, #E95C47);
  box-shadow: var(--ui-focus-ring);
}

.custom-select-label {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.custom-select-label--placeholder {
  color: var(--ui-text-muted, #8E8883);
}

.custom-select-chevron {
  width: 18px;
  height: 18px;
  color: var(--ui-text-muted, #8E8883);
  flex-shrink: 0;
  transition: transform 0.2s ease, color 0.2s ease;
}

.custom-select-container--open .custom-select-chevron {
  transform: rotate(180deg);
  color: var(--primary-500, #E95C47);
}

/* Dropdown Menu */
.custom-select-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 9999 !important;
  margin-top: 4px;
  padding: 0;
  list-style: none;
  background: rgba(255, 253, 251, 0.96);
  backdrop-filter: blur(8px);
  border: 1px solid var(--ui-border, #E7E1DB);
  border-radius: 8px;
  box-shadow: 0 10px 25px -5px rgba(31, 26, 23, 0.08),
              0 8px 10px -6px rgba(31, 26, 23, 0.08);
  min-width: 100%;
  width: 100%;
  box-sizing: border-box;
  max-height: 240px;
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

.custom-select-menu--align-right {
  left: auto;
  right: 0;
}

.custom-select-menu--open-up {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 4px;
}

.custom-select-item {
  padding: 8px 12px;
  font-size: 13px;
  color: var(--ui-text, #1F1A17);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background var(--ui-duration, 0.15s) var(--ui-ease, ease),
              color var(--ui-duration, 0.15s) var(--ui-ease, ease);
}

.custom-select-container--sm .custom-select-item {
  padding: 6px 10px;
  font-size: 12px;
}

.custom-select-item:hover {
  background-color: rgba(233, 92, 71, 0.08);
  color: var(--primary-600, #D94B35);
}

.custom-select-item--active {
  background-color: rgba(233, 92, 71, 0.04);
  color: var(--primary-500, #E95C47);
  font-weight: 700;
}

/* Disabled State */
.custom-select-container--disabled .custom-select-trigger {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--gray-100, #F1ECE6);
}

/* Transitions */
.dropdown-slide-enter-active,
.dropdown-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-slide-enter-from,
.dropdown-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.custom-select-menu--open-up.dropdown-slide-enter-from,
.custom-select-menu--open-up.dropdown-slide-leave-to {
  transform: translateY(4px);
}
</style>
