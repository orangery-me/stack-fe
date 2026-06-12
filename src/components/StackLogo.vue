<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

defineProps({
  clickable: {
    type: Boolean,
    default: true,
  },
});
</script>

<template>
  <div
    :class="[
      'flex items-center gap-2.5 cursor-pointer',
      { 'cursor-default': !clickable },
    ]"
    @click="clickable && router.push('/')"
  >
    <svg
      class="w-8 h-8"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="5" fill="#E95C47" />
      <path
        d="M6 12L9 15L18 6"
        stroke="white"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M6 16L9 19L18 10"
        stroke="white"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.8"
      />
    </svg>
    <span class="text-2xl font-black tracking-tight text-[#1F1A17] font-sans">
      Stack
    </span>
  </div>
</template>
