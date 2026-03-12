<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import lottie, { type AnimationItem } from "lottie-web";

const props = withDefaults(
  defineProps<{
    animationData: any;
    loop?: boolean;
    autoplay?: boolean;
    renderer?: "svg" | "canvas" | "html";
    preserveAspectRatio?: string;
    width?: number | string;
    height?: number | string;
  }>(),
  {
    loop: true,
    autoplay: true,
    renderer: "svg",
    preserveAspectRatio: "xMidYMid meet",
    width: undefined,
    height: undefined,
  }
);

const containerRef = ref<HTMLElement | null>(null);
let anim: AnimationItem | null = null;

const sizeStyle = computed(() => {
  const style: Record<string, string> = {};
  if (props.width !== undefined) {
    style.width = typeof props.width === "number" ? `${props.width}px` : props.width;
  }
  if (props.height !== undefined) {
    style.height =
      typeof props.height === "number" ? `${props.height}px` : props.height;
  }
  return style;
});

function destroy() {
  try {
    anim?.destroy();
  } catch {
    // ignore
  }
  anim = null;
  if (containerRef.value) containerRef.value.innerHTML = "";
}

function mount() {
  const el = containerRef.value;
  if (!el) return;

  destroy();

  anim = lottie.loadAnimation({
    container: el,
    renderer: props.renderer,
    loop: props.loop,
    autoplay: props.autoplay,
    animationData: props.animationData,
    rendererSettings: {
      progressiveLoad: true,
      preserveAspectRatio: props.preserveAspectRatio,
    },
  });
}

onMounted(mount);

watch(
  () => [
    props.animationData,
    props.loop,
    props.autoplay,
    props.renderer,
    props.preserveAspectRatio,
  ],
  () => mount(),
  { deep: false }
);

onBeforeUnmount(() => destroy());
</script>

<template>
  <div
    ref="containerRef"
    class="lottie-player"
    :style="sizeStyle"
  />
</template>

<style scoped>
.lottie-player {
  display: block;
}
</style>

