<script setup>
import { computed } from "vue";
import DatePicker from "primevue/datepicker";

defineOptions({ name: "CustomDatePicker" });

const props = defineProps({
  modelValue: {
    type: [String, Date, Number],
    default: "",
  },
  label: {
    type: String,
    default: "",
  },
  id: {
    type: String,
    default: undefined,
  },
  required: {
    type: Boolean,
    default: false,
  },
  showTime: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: "Select date",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: "md", // "sm", "md"
  },
  error: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue", "change", "hide"]);

const formattedValue = computed({
  get() {
    if (!props.modelValue) return null;
    return new Date(props.modelValue);
  },
  set(val) {
    if (!val) {
      emit("update:modelValue", "");
      emit("change", "");
      return;
    }
    const isoString = val.toISOString();
    emit("update:modelValue", isoString);
    emit("change", isoString);
  },
});
</script>

<template>
  <div 
    class="calm-field"
    :class="[
      `calm-datepicker--${size}`,
      { 'calm-datepicker--disabled': disabled },
      { 'calm-datepicker--error': !!error }
    ]"
  >
    <label
      v-if="label"
      class="calm-field__label"
      :for="id"
    >
      {{ label }}
      <span
        v-if="required"
        class="calm-field__required"
      >
        *
      </span>
    </label>

    <div class="calm-datepicker-wrapper">
      <DatePicker
        :id="id"
        v-model="formattedValue"
        :showTime="showTime"
        hourFormat="24"
        :placeholder="placeholder"
        :disabled="disabled"
        :fluid="true"
        :hideOnDateTimeSelect="false"
        :manualInput="true"
        @hide="emit('hide')"
        class="calm-datepicker-core"
        inputClass="calm-datepicker-input"
        panelClass="calm-datepicker-panel-custom"
      />
      <svg
        class="calm-datepicker-icon"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
        />
      </svg>
    </div>

    <p
      v-if="error"
      class="calm-field__error"
    >
      {{ error }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.calm-field {
  display: grid;
  gap: var(--space-8);
  font-family: inherit;
}

.calm-field__label {
  font-size: 12px;
  color: var(--ui-text);
  font-weight: 600;
  line-height: 1.3;
}

.calm-field__required {
  color: var(--error);
  margin-left: 2px;
}

.calm-datepicker-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

:deep(.calm-datepicker-core) {
  width: 100%;
  
  .p-datepicker-input {
    width: 100%;
    background-color: var(--ui-bg-surface, #FFFDFB) !important;
    border: 1px solid var(--ui-border, #E7E1DB) !important;
    color: var(--ui-text, #1F1A17) !important;
    font-family: inherit !important;
    font-weight: 550;
    outline: none !important;
    box-shadow: none !important;
    transition: border-color var(--ui-duration, 0.15s) var(--ui-ease, ease-out),
                box-shadow var(--ui-duration, 0.15s) var(--ui-ease, ease-out) !important;
    
    &::placeholder {
      color: var(--ui-text-hint, #8E8883) !important;
      font-weight: 400;
    }

    &:focus {
      border-color: var(--primary-500, #E95C47) !important;
      box-shadow: var(--ui-focus-ring) !important;
    }
  }
}

.calm-datepicker--md {
  :deep(.p-datepicker-input) {
    height: 38px !important;
    padding: 0 var(--space-32) 0 var(--space-12) !important;
    border-radius: var(--ui-radius-input, 8px) !important;
    font-size: 14px !important;
  }
  
  .calm-datepicker-icon {
    right: 12px;
  }
}

.calm-datepicker--sm {
  :deep(.p-datepicker-input) {
    height: 30px !important;
    padding: 0 var(--space-24) 0 10px !important;
    border-radius: 6px !important;
    font-size: 13px !important;
  }
  
  .calm-datepicker-icon {
    right: 8px;
    width: 15px;
    height: 15px;
  }
}

.calm-datepicker-icon {
  position: absolute;
  width: 18px;
  height: 18px;
  color: var(--ui-text-muted, #8E8883);
  pointer-events: none;
  transition: color 0.15s ease;
}

:deep(.calm-datepicker-core:focus-within) + .calm-datepicker-icon {
  color: var(--primary-500, #E95C47);
}

.calm-datepicker--error {
  :deep(.p-datepicker-input) {
    border-color: var(--error) !important;
    
    &:focus {
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.14) !important;
    }
  }
}

.calm-field__error {
  font-size: 12px;
  color: var(--error);
  line-height: 1.4;
  margin: 0;
}
</style>
