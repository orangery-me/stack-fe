<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import GlowText from '@/components/GlowText.vue';
import StarfieldCard from '@/components/StarfieldCard.vue';

const route = useRoute();
const workspaceId = route.params.id;

// Placeholder - sẽ triển khai sau
</script>

<template>
  <div class="workspace-detail-page">
    <div class="container-center">
      <StarfieldCard>
        <GlowText level="1">Workspace Detail</GlowText>
        <p style="margin-top: 1rem; color: rgba(241, 245, 249, 0.7);">
          Workspace ID: {{ workspaceId }}
        </p>
        <p style="margin-top: 1rem; color: rgba(241, 245, 249, 0.5);">
          Màn hình chi tiết workspace sẽ được triển khai sau.
        </p>
      </StarfieldCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
.workspace-detail-page {
  padding: 4rem 0;
  min-height: calc(100vh - 200px);
}
</style>

