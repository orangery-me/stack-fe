<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "@/composables/useToast.js";
import CalmHeading from "@/components/calm/CalmHeading.vue";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";

const router = useRouter();
const route = useRoute();
const { success } = useToast();
const workspaceStore = useWorkspaceStore();

const loading = computed(() => workspaceStore.acceptInviteLoading);
const status = ref("processing"); // processing, success, error

onMounted(async () => {
  const token = route.query.token;

  if (!token) {
    throw new Error(
      "Invalid token. Please check the link in your email."
    );
  }

  try {
    // Call API to accept invite
    const response = await workspaceStore.acceptInvite(token);

    // Success
    status.value = "success";

    // Show success toast with message from API
    const message = response?.message || "Successfully joined workspace!";
    success(message, 5000);

    // Redirect to workspace detail page after 2 seconds
    const workspaceId = response?.workspaceId;
    if (workspaceId) {
      setTimeout(() => {
        router.push(`/workspaces/${workspaceId}`);
      }, 2000);
    } else {
      setTimeout(() => {
        router.push("/");
      }, 2000);
    }
  } catch {
    status.value = "error";

    // Redirect to home after 3 seconds
    setTimeout(() => {
      router.push("/");
    }, 3000);
  }
});
</script>

<template>
  <section class="invite-status">
    <div class="container-center">
      <div class="invite-status__container">
        <CalmHeading :level="3">
          <template v-if="loading || status === 'processing'">
            Processing invitation...
          </template>
          <template v-else-if="status === 'success'">
            Joined workspace successfully!
          </template>
          <template v-else>
            Unable to accept invitation
          </template>
        </CalmHeading>
        <p class="invite-status__message ui-muted">
          <template v-if="loading || status === 'processing'">
            Please wait a moment
          </template>
          <template v-else-if="status === 'success'">
            Redirecting to workspace...
          </template>
          <template v-else>
            Redirecting to home...
          </template>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss" src="./AcceptInviteView.scss"></style>
