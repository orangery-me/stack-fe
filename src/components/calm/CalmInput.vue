<script setup>
defineOptions({ name: "CalmInput" });

defineProps({
  modelValue: {
    type: [String, Number],
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
  type: {
    type: String,
    default: "text",
  },
  placeholder: {
    type: String,
    default: "",
  },
  hint: {
    type: String,
    default: "",
  },
  error: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
  autocomplete: {
    type: String,
    default: undefined,
  },
});

const emit = defineEmits(["update:modelValue"]);

const onInput = (e) => emit("update:modelValue", e.target.value);
</script>

<template>
  <div class="calm-field">
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

    <input
      :id="id"
      class="calm-input"
      :class="{ 'calm-input--error': !!error }"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :autocomplete="autocomplete"
      :aria-invalid="!!error"
      @input="onInput"
    >

    <p
      v-if="error"
      class="calm-field__error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      class="calm-field__hint"
    >
      {{ hint }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.calm-field {
  display: grid;
  gap: var(--space-8);
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

.calm-input {
  height: 36px;
  border-radius: var(--ui-radius-input);
  border: 1px solid var(--ui-border);
  background: #ffffff;
  padding: 0 var(--space-12);
  color: var(--ui-text);
  transition: border-color var(--ui-duration) var(--ui-ease),
    box-shadow var(--ui-duration) var(--ui-ease);

  &::placeholder {
    color: var(--ui-text-hint);
  }

  &:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: var(--ui-focus-ring);
  }

  &:disabled {
    background: var(--gray-100);
    color: var(--ui-text-muted);
    cursor: not-allowed;
  }
}

.calm-input--error {
  border-color: var(--error);

  &:focus {
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.14);
  }
}

.calm-field__hint {
  font-size: 12px;
  color: var(--ui-text-hint);
  line-height: 1.4;
}

.calm-field__error {
  font-size: 12px;
  color: var(--error);
  line-height: 1.4;
}
</style>

