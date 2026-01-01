<script setup>
import { RouterView } from "vue-router";
import TheFooter from "@/components/TheFooter.vue";
import TheHeader from "@/components/TheHeader.vue";
import ToastContainer from "@/components/ToastContainer.vue";
</script>

<template>
  <TheHeader />

  <main>
    <router-view />
  </main>

  <TheFooter />
  <ToastContainer />
</template>

<style scoped lang="scss">
main {
	min-height: calc(100vh - 200px);
}
</style>
