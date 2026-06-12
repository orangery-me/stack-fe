<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import CalmModal from "@/components/calm/CalmModal.vue";
import CalmInput from "@/components/calm/CalmInput.vue";
import CalmButton from "@/components/calm/CalmButton.vue";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  workspaceId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["update:open"]);

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();
const channelStore = useChannelStore();

const searchKeyword = ref("");
const isPreparing = ref(false);
const openingUserId = ref("");

const isOpen = computed({
  get() {
    return props.open;
  },
  set(value) {
    emit("update:open", value);
  },
});

const currentUserId = computed(() => authStore.user?.id);
const isBusy = computed(
  () =>
    isPreparing.value ||
    workspaceStore.membersLoading ||
    channelStore.channelsLoading ||
    channelStore.directMessageLoading
);

const availableMembers = computed(() =>
  (workspaceStore.members || [])
    .filter((member) => member.userId && member.userId !== currentUserId.value)
    .sort((a, b) =>
      String(a.name || a.email || "").localeCompare(String(b.name || b.email || ""))
    )
);

const filteredMembers = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) return availableMembers.value;

  return availableMembers.value.filter((member) => {
    const searchable = `${member.name || ""} ${member.email || ""}`.toLowerCase();
    return searchable.includes(keyword);
  });
});

const getInitials = (name, email) => {
  const value = String(name || email || "?").trim();
  if (!value) return "?";
  const parts = value.split(" ");
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return value[0].toUpperCase();
};

const preparePicker = async () => {
  if (!props.workspaceId) return;
  isPreparing.value = true;
  try {
    await Promise.all([
      workspaceStore.fetchMembers(props.workspaceId),
      channelStore.fetchUserChannels(props.workspaceId),
    ]);
  } finally {
    isPreparing.value = false;
  }
};

watch(
  () => props.open,
  (opened) => {
    if (!opened) {
      searchKeyword.value = "";
      openingUserId.value = "";
      return;
    }
    preparePicker().catch(() => {});
  }
);

const openDirectMessage = async (member) => {
  if (!member?.userId || !props.workspaceId) return;
  openingUserId.value = member.userId;
  try {
    const channel = await channelStore.findOrCreateDirectMessage(
      props.workspaceId,
      member.userId
    );

    if (route.name !== "workspaceDetail") {
      await router.push({
        name: "workspaceDetail",
        params: { id: props.workspaceId },
      });
    }

    if (channel?.id) {
      channelStore.selectChannel(channel.id);
    }

    isOpen.value = false;
  } finally {
    openingUserId.value = "";
  }
};
</script>

<template>
  <CalmModal
    v-model:open="isOpen"
    title="Start a direct message"
    :busy="isBusy"
  >
    <div class="dm-picker">
      <CalmInput
        id="dmMemberSearch"
        v-model="searchKeyword"
        placeholder="Search by name or email"
        autocomplete="off"
      />

      <div
        v-if="isPreparing"
        class="dm-picker__state"
      >
        Loading people...
      </div>

      <div
        v-else-if="!filteredMembers.length"
        class="dm-picker__state"
      >
        No matching workspace members.
      </div>

      <div
        v-else
        class="dm-picker__list"
      >
        <button
          v-for="member in filteredMembers"
          :key="member.userId"
          class="dm-picker__row"
          type="button"
          :disabled="isBusy"
          @click="openDirectMessage(member)"
        >
          <span class="dm-picker__avatar">
            {{ getInitials(member.name, member.email) }}
          </span>
          <span class="dm-picker__identity">
            <span class="dm-picker__name">{{ member.name || member.email }}</span>
            <span class="dm-picker__email">{{ member.email }}</span>
          </span>
          <span
            v-if="openingUserId === member.userId"
            class="dm-picker__status"
          >
            Opening...
          </span>
        </button>
      </div>
    </div>

    <template #actions>
      <CalmButton
        variant="secondary"
        type="button"
        :disabled="isBusy"
        @click="isOpen = false"
      >
        Cancel
      </CalmButton>
    </template>
  </CalmModal>
</template>

<style scoped lang="scss">
.dm-picker {
  display: grid;
  gap: 14px;
}

.dm-picker__state {
  padding: 20px 0;
  color: var(--ui-text-muted);
  font-size: 14px;
  text-align: center;
}

.dm-picker__list {
  display: grid;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
}

.dm-picker__row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 1px solid var(--ui-divider);
  border-radius: 8px;
  background: #ffffff;
  padding: 10px 12px;
  color: var(--ui-text);
  cursor: pointer;
  text-align: left;
  transition:
    background var(--ui-duration) var(--ui-ease),
    border-color var(--ui-duration) var(--ui-ease);

  &:hover:not(:disabled) {
    background: var(--primary-50);
    border-color: rgba(37, 99, 235, 0.28);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
}

.dm-picker__avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-100);
  color: var(--primary-700);
  font-size: 12px;
  font-weight: 700;
}

.dm-picker__identity {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.dm-picker__name,
.dm-picker__email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-picker__name {
  font-size: 14px;
  font-weight: 600;
}

.dm-picker__email,
.dm-picker__status {
  color: var(--ui-text-muted);
  font-size: 12px;
}
</style>
