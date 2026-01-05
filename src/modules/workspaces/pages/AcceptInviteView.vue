<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useToast } from "@/composables/useToast.js";
import GlowText from "@/components/GlowText.vue";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";

const router = useRouter();
const route = useRoute();
const { success, error } = useToast();
const workspaceStore = useWorkspaceStore();

const loading = computed(() => workspaceStore.acceptInviteLoading);
const status = ref("processing"); // processing, success, error

onMounted(async () => {
  const token = route.query.token;

  if (!token) {
    throw new Error(
      "Token không hợp lệ. Vui lòng kiểm tra lại link trong email."
    );
  }

  try {
    // Call API to accept invite
    const response = await workspaceStore.acceptInvite(token);

    // Success
    status.value = "success";

    // Show success toast with message from API
    const message = response?.message || "Tham gia workspace thành công!";
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
  } catch (err) {
    // Error
    status.value = "error";

    // Show error toast with error message
    const errorMessage =
      err?.message || "Không thể chấp nhận lời mời. Vui lòng thử lại.";
    error(errorMessage, 5000);

    // Redirect to home after 3 seconds
    setTimeout(() => {
      router.push("/");
    }, 3000);
  }
});
</script>

<template>
  <section class="accept-invite-section">
    <div class="container-center">
      <div class="accept-container">
        <GlowText :level="3">
          <template v-if="loading || status === 'processing'">
            Đang xử lý lời mời...
          </template>
          <template v-else-if="status === 'success'">
            Tham gia workspace thành công!
          </template>
          <template v-else>
            Không thể chấp nhận lời mời
          </template>
        </GlowText>
        <p class="accept-message">
          <template v-if="loading || status === 'processing'">
            Vui lòng đợi một chút
          </template>
          <template v-else-if="status === 'success'">
            Đang chuyển hướng đến workspace...
          </template>
          <template v-else>
            Đang chuyển hướng về trang chủ...
          </template>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss" src="./AcceptInviteView.scss"></style>
