<script setup>
import { computed } from "vue";
import AppLoading from "./AppLoading.vue";
import { useLoading } from "@/composables/useLoading.js";

const { state } = useLoading();

const active = computed(() => state.value.fullscreen.active);
const label = computed(() => state.value.fullscreen.label);
</script>

<template>
  <AppLoading
    :active="active"
    variant="fullscreen"
    :label="label"
  />
</template>

