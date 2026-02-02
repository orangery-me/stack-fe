<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Độ rộng từng dòng skeleton (ví dụ: ['85%', '55%', '70%']) */
    lineWidths?: string[];
    /** Số dòng nếu không truyền lineWidths (dùng width mặc định) */
    lineCount?: number;
    /** Class thêm cho wrapper (ví dụ: căn layout) */
    wrapperClass?: string;
  }>(),
  {
    lineWidths: () => ['85%', '55%', '70%'],
    lineCount: 3,
    wrapperClass: '',
  }
);

const defaultWidths = ['85%', '55%', '70%'];

function getWidths(): string[] {
  if (props.lineWidths?.length) return props.lineWidths;
  return defaultWidths.slice(0, Math.max(1, props.lineCount));
}
</script>

<template>
  <div
    class="loading-skeleton"
    :class="props.wrapperClass"
  >
    <div
      v-for="(width, i) in getWidths()"
      :key="i"
      class="loading-skeleton__line skeleton skeleton-wave"
      :style="{ '--skeleton-width': width }"
    />
  </div>
</template>

<style scoped lang="scss" src="./LoadingSkeleton.scss"></style>
