<script setup>
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { RouterView } from "vue-router";
import TheFooter from "@/components/TheFooter.vue";
import TheHeader from "@/components/TheHeader.vue";
import ToastContainer from "@/components/ToastContainer.vue";

const route = useRoute();
const isWorkspaceDetail = computed(() => route.name === 'workspaceDetail');

// Prevent body scroll when on workspace detail page
watch(isWorkspaceDetail, (isDetail) => {
  if (isDetail) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}, { immediate: true });
</script>

<template>
  <TheHeader />

  <main>
    <router-view />
  </main>

  <TheFooter v-if="!isWorkspaceDetail" />
  <ToastContainer />
</template>

<style scoped lang="scss">
main {
	min-height: calc(100vh - 200px);
}
</style>
