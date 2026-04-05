<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  iconRect: DOMRect | null;
}>();

const emit = defineEmits<{
  click: [];
}>();

const style = computed(() => {
  const r = props.iconRect;
  if (!r) return { display: "none" };
  // Position the icon to the right of the selection end, vertically centred to the line
  const top = r.top + r.height / 2 - 14; // centre the 28px icon on the line
  const left = r.left;
  return {
    top: `${top}px`,
    left: `${left}px`,
  };
});
</script>

<template>
  <Teleport to="body">
    <button
      v-if="iconRect"
      class="ai-sel-icon"
      :style="style"
      title="Chỉnh sửa bằng AI (✦)"
      aria-label="AI edit"
      @mousedown.prevent
      @click.stop="emit('click')"
    >
      ✦
    </button>
  </Teleport>
</template>

<style scoped>
.ai-sel-icon {
  position: fixed;
  z-index: 1003;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: #8b5cf6;
  color: #fff;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.45);
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  animation: ai-icon-pop 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  user-select: none;
}

.ai-sel-icon:hover {
  background: #7c3aed;
  transform: scale(1.12);
  box-shadow: 0 3px 12px rgba(139, 92, 246, 0.55);
}

.ai-sel-icon:active {
  transform: scale(0.96);
}

@keyframes ai-icon-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
