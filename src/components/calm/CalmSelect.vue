<script setup>
defineOptions({ name: "CalmSelect" });

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
  placeholder: {
    type: String,
    default: "",
  },
  options: {
    type: Array,
    default: () => [],
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
});

const emit = defineEmits(["update:modelValue"]);
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

    <select
      :id="id"
      class="calm-select"
      :class="{ 'calm-select--error': !!error }"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :aria-invalid="!!error"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option
        v-if="placeholder"
        value=""
        disabled
      >
        {{ placeholder }}
      </option>
      <option
        v-for="opt in options"
        :key="opt.value ?? opt"
        :value="opt.value ?? opt"
      >
        {{ opt.label ?? opt }}
      </option>
    </select>

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

.calm-select {
  height: 36px;
  border-radius: var(--ui-radius-input);
  border: 1px solid var(--ui-border);
  background: #ffffff;
  padding: 0 var(--space-12);
  color: var(--ui-text);
  cursor: pointer;
  transition: border-color var(--ui-duration) var(--ui-ease),
    box-shadow var(--ui-duration) var(--ui-ease);

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

.calm-select--error {
  border-color: var(--error);

  &:focus {
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.14);
  }
}

.calm-field__error {
  font-size: 12px;
  color: var(--error);
  line-height: 1.4;
}
</style>

