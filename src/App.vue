<script setup>
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { RouterView } from "vue-router";
import TheFooter from "@/components/TheFooter.vue";
import TheHeader from "@/components/TheHeader.vue";
import ToastContainer from "@/components/ToastContainer.vue";

const route = useRoute();
const isWorkspaceDetail = computed(() => route.name === "workspaceDetail");
const isWorkspaceFiles = computed(() => route.name === "workspaceFiles");
const isCanvasEdit = computed(() => route.name === "canvasEdit");
const hideAppHeader = computed(
  () =>
    isWorkspaceDetail.value || isWorkspaceFiles.value || isCanvasEdit.value
);

// Prevent body scroll when on workspace detail or canvas edit page
watch(
  hideAppHeader,
  (hide) => {
    if (hide) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  },
  { immediate: true }
);
</script>

<template>
  <TheHeader v-if="!hideAppHeader" />

  <main>
    <router-view />
  </main>

  <TheFooter v-if="!hideAppHeader" />
  <ToastContainer />
</template>

<style scoped lang="scss">
main {
  min-height: calc(100vh - 200px);
  background: var(--ui-bg-page);
}
</style>
