<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import channelService from "@/services/channel.service.js";
import { useToast } from "@/composables/useToast.js";
import MessageTabView from "@/modules/channels/components/messages/MessageTabView.vue";
import AutoComplete from "primevue/autocomplete";

const route = useRoute();
const { success, info } = useToast();
const channelStore = useChannelStore();
const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();

const selectedChannel = computed(() => channelStore.selectedChannel);
const workspaceMembers = computed(() => workspaceStore.members || []);
const workspaceId = computed(() => route.params.id);

const isInviteModalOpen = ref(false);
const selectedMember = ref(null);
const isSubmittingInvite = ref(false);
const items = ref([]);

const availableMembers = computed(() => {
  const currentUserId = authStore.user?.id;

  return workspaceMembers.value.filter(
    (member) =>
      member.userId &&
      member.userId !== currentUserId
  );
});

const searchMembers = (event) => {
  const keyword = (event?.query || "").trim().toLowerCase();
  items.value = availableMembers.value
    .filter((member) => {
      if (!keyword) return true;
      const searchable = `${member.name || ""} ${member.email || ""}`.toLowerCase();
      return searchable.includes(keyword);
    })
    .map((member) => ({
      ...member,
      display: `${member.name || "Unknown"} (${member.email || "No email"})`,
    }));
};

const openInviteTeammatesModal = () => {
  if (!selectedChannel.value) return;
  if (!availableMembers.value.length) {
    info("No available members to add.");
    return;
  }
  selectedMember.value = null;
  items.value = availableMembers.value.map((member) => ({
    ...member,
    display: `${member.name || "Unknown"} (${member.email || "No email"})`,
  }));
  isInviteModalOpen.value = true;
};

const closeInviteTeammatesModal = () => {
  isInviteModalOpen.value = false;
  selectedMember.value = null;
  items.value = [];
};

const submitInviteTeammate = async () => {
  if (!selectedChannel.value || !workspaceId.value || !selectedMember.value?.userId) {
    return;
  }

  isSubmittingInvite.value = true;
  try {
    await channelService.addMember(workspaceId.value, selectedChannel.value.id, {
      userId: selectedMember.value.userId,
      memberRole: "member",
    });
    success("Member added to channel successfully.");
    closeInviteTeammatesModal();
  } finally {
    isSubmittingInvite.value = false;
  }
};
</script>

<template>
  <div class="channel-detail-view">
    <div class="main-content-header">
      <!-- channel header -->
      <div class="channel-header">
        <div class="channel-header-left">
          <span class="channel-title">
            # {{ selectedChannel?.name || "Select a channel" }}
          </span>
          <span
            v-if="selectedChannel"
            class="channel-star"
          >
            <img
              src="/icons/star.svg"
              alt="Star channel"
              class="channel-star-icon"
            >
          </span>
        </div>
        <div class="channel-header-right">
          <button
            v-if="selectedChannel"
            class="header-button"
            title="Invite teammates"
            type="button"
            @click="openInviteTeammatesModal"
          >
            Invite teammates
          </button>
          <button
            class="header-button"
            title="More options"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="1"
                fill="currentColor"
              />
              <circle
                cx="19"
                cy="12"
                r="1"
                fill="currentColor"
              />
              <circle
                cx="5"
                cy="12"
                r="1"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>
      <!-- list of tabs -->
      <div
        v-if="selectedChannel"
        class="channel-tabs"
      >
        <button
          class="channel-tab active"
          type="button"
        >
          Messages
        </button>
      </div>
    </div>

    <MessageTabView
      v-if="selectedChannel"
      @add-people-to-channel="openInviteTeammatesModal"
    />

    <div
      v-if="isInviteModalOpen"
      class="channel-invite-overlay"
      @click.self="closeInviteTeammatesModal"
    >
      <div class="channel-invite-modal">
        <h3 class="channel-invite-title">
          Add people to channel
        </h3>
        <p class="channel-invite-subtitle">
          Select a teammate in workspace to add into this channel.
        </p>

        <div class="channel-invite-label">
          Search teammate
        </div>
        <div class="card channel-invite-autocomplete">
          <AutoComplete
            v-model="selectedMember"
            :suggestions="items"
            option-label="display"
            placeholder="Search by name or email..."
            fluid
            @complete="searchMembers"
          />
        </div>

        <div class="channel-invite-actions">
          <button
            type="button"
            class="channel-invite-btn channel-invite-btn--secondary"
            :disabled="isSubmittingInvite"
            @click="closeInviteTeammatesModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="channel-invite-btn channel-invite-btn--primary"
            :disabled="isSubmittingInvite || !selectedMember?.userId"
            @click="submitInviteTeammate"
          >
            {{ isSubmittingInvite ? "Adding..." : "Add to channel" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./ChannelDetailView.scss"></style>
