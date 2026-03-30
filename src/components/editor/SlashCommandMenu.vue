<script setup lang="ts">
import { computed, watch, ref } from "vue";

export interface SlashItem {
  id: string;
  label: string;
  description?: string;
  icon: string;
}

const props = defineProps<{
  items: SlashItem[];
  selectedIndex: number;
  clientRect: DOMRect | null;
}>();

const emit = defineEmits<{
  select: [item: SlashItem];
}>();

const menuStyle = computed(() => {
  const rect = props.clientRect;
  if (!rect) return {};

  const top = rect.bottom + window.scrollY + 4;
  const left = rect.left + window.scrollX;

  return {
    top: `${top}px`,
    left: `${left}px`,
  };
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="items.length > 0 && clientRect"
      class="slash-menu"
      :style="menuStyle"
    >
      <button
        v-for="(item, index) in items"
        :key="item.id"
        class="slash-menu__item"
        :class="{ 'slash-menu__item--active': index === selectedIndex }"
        @mousedown.prevent="emit('select', item)"
      >
        <span class="slash-menu__icon">{{ item.icon }}</span>
        <span class="slash-menu__text">
          <span class="slash-menu__label">{{ item.label }}</span>
          <span v-if="item.description" class="slash-menu__desc">{{ item.description }}</span>
        </span>
      </button>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.slash-menu {
  position: absolute;
  z-index: 1000;
  min-width: 220px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px;
  overflow: hidden;

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    background: none;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;

    &:hover,
    &--active {
      background: #f3f4f6;
    }
  }

  &__icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 14px;
    flex-shrink: 0;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  &__label {
    font-size: 13px;
    font-weight: 500;
    color: #111827;
    line-height: 1.3;
  }

  &__desc {
    font-size: 11px;
    color: #9ca3af;
    line-height: 1.3;
  }
}
</style>
