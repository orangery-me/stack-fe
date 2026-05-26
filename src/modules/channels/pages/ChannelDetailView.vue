<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useToast } from "@/composables/useToast.js";
import MessageTabView from "@/modules/channels/components/messages/MessageTabView.vue";
import TaskTabView from "@/modules/channels/components/tasks/TaskTabView.vue";
import { useTaskStore } from "@/modules/channels/stores/task.store.js";
import AutoComplete from "primevue/autocomplete";
import Listbox from "primevue/listbox";
import AppLoading from "@/components/loading/AppLoading.vue";
import CustomSelect from "@/components/calm/CustomSelect.vue";


const route = useRoute();
const { success, info } = useToast();
const channelStore = useChannelStore();
const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();
const taskStore = useTaskStore();

const selectedChannel = computed(() => channelStore.selectedChannel);
const workspaceMembers = computed(() => workspaceStore.members || []);
const workspaceId = computed(() => route.params.id);

const isInviteModalOpen = ref(false);
const selectedMember = ref(null);
const isSubmittingInvite = ref(false);
const memberSearchKeyword = ref("");
const items = ref([]);
const isChannelMenuOpen = ref(false);
const isChannelDetailModalOpen = ref(false);
const channelMenuRef = ref(null);
const channelTabAddRef = ref(null);
const selectedChannelAction = ref(null);
const channelActions = ref([
  { name: "Settings", code: "settings", icon: "pi pi-cog" },
  { name: "Search in channel", code: "search-channel", icon: "pi pi-search" },
  { name: "Leave channel", code: "leave-channel", icon: "pi pi-sign-out" },
]);
const activeDetailTab = ref("about");
const activeMainTab = ref("messages");
const showAddTabMenu = ref(false);

const permissionOptions = [
  { value: "manager_only", label: "Managers only" },
  { value: "all_members", label: "All members" }
];

const channelMembers = computed(() => {
  const channelId = selectedChannel.value?.id;
  if (!channelId) return [];
  return channelStore.getChannelMembersById(channelId);
});

const taskLists = computed(() => {
  const channelId = selectedChannel.value?.id;
  if (!channelId) return [];
  return taskStore.getTaskListsByChannelId(channelId);
});

const activeTaskListId = computed(() => {
  if (activeMainTab.value.startsWith('task-')) {
    return activeMainTab.value.replace('task-', '');
  }
  return null;
});

const addTaskTab = async () => {
  showAddTabMenu.value = false;
  if (!selectedChannel.value?.id || !workspaceId.value) return;
  try {
    const newList = await taskStore.createTaskList(
      workspaceId.value,
      selectedChannel.value.id,
      "Untitled list"
    );
    activeMainTab.value = `task-${newList.id}`;
  } catch (e) {
    console.error("Failed to add task tab:", e);
  }
};

const handleUpdateListName = (listId, newName) => {
  // Store handles API/state update, component updates reactively
};

watch(
  () => selectedChannel.value?.id,
  async (newChannelId) => {
    if (newChannelId && workspaceId.value) {
      await taskStore.fetchTaskLists(workspaceId.value, newChannelId);
      // Reset tab on channel change
      activeMainTab.value = "messages";
    }
  },
  { immediate: true }
);

const isMembersLoading = computed(() => {
  const channelId = selectedChannel.value?.id;
  if (!channelId) return false;
  return !!channelStore.channelMembersLoadingById[channelId];
});

const canKickMember = computed(
  () => selectedChannel.value?.permissions?.canKick === true
);

const isPermissionsTabAvailable = computed(() => canKickMember.value === true);

const permissionDraft = ref({
  invitePolicy: "manager_only",
  postPolicy: "all_members",
  pinMessagePolicy: "manager_only",
  threadPolicy: "all_members",
});

const isSubmittingPermissions = ref(false);

const initPermissionDraft = () => {
  const p = selectedChannel.value?.settings?.permissions;
  if (!p) return;

  permissionDraft.value = {
    invitePolicy: p.invitePolicy || "manager_only",
    postPolicy: p.postPolicy || "all_members",
    pinMessagePolicy: p.pinMessagePolicy || "manager_only",
    threadPolicy: p.threadPolicy || "all_members",
  };
};

const hasPermissionChanges = computed(() => {
  const p = selectedChannel.value?.settings?.permissions;
  if (!p) return false;
  return (
    permissionDraft.value.invitePolicy !== p.invitePolicy ||
    permissionDraft.value.postPolicy !== p.postPolicy ||
    permissionDraft.value.pinMessagePolicy !== p.pinMessagePolicy ||
    permissionDraft.value.threadPolicy !== p.threadPolicy
  );
});

watch(isPermissionsTabAvailable, (available) => {
  if (!available && activeDetailTab.value === "permissions") {
    activeDetailTab.value = "about";
  }
});

watch(activeDetailTab, (tabKey) => {
  if (tabKey === "permissions") {
    initPermissionDraft();
  }
});

watch(
  () => selectedChannel.value?.settings?.permissions,
  () => {
    if (activeDetailTab.value === "permissions") {
      initPermissionDraft();
    }
  }
);

const saveChannelPermissions = async () => {
  if (!selectedChannel.value?.id || !workspaceId.value) return;
  if (!hasPermissionChanges.value) return;

  isSubmittingPermissions.value = true;
  try {
    await channelStore.updateChannelPermissions(workspaceId.value, selectedChannel.value.id, {
      invitePolicy: permissionDraft.value.invitePolicy,
      postPolicy: permissionDraft.value.postPolicy,
      pinMessagePolicy: permissionDraft.value.pinMessagePolicy,
      threadPolicy: permissionDraft.value.threadPolicy,
    });
    success("Channel permissions updated successfully.");
    initPermissionDraft();
  } finally {
    isSubmittingPermissions.value = false;
  }
};

const channelDetailTabs = computed(() => [
  { key: "about", label: "About" },
  { key: "members", label: "Members" },
  // { key: "tabs", label: "Tabs" },
  // { key: "integrations", label: "Integrations" },
  ...(isPermissionsTabAvailable.value ? [{ key: "permissions", label: "Permissions" }] : []),
]);

const filteredChannelMembers = computed(() => {
  const keyword = memberSearchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return channelMembers.value;
  }

  return channelMembers.value.filter((member) => {
    const searchable = `${member.name || ""} ${member.email || ""} ${member.userId || ""}`.toLowerCase();
    return searchable.includes(keyword);
  });
});

const createdByDisplay = computed(() => {
  if (!selectedChannel.value?.createdById) return "Unknown";
  const creator = workspaceMembers.value.find(
    (member) => member.id === selectedChannel.value.createdById
  );
  return creator?.name || creator?.email || "Unknown";
});

const createdAtDisplay = computed(() => {
  if (!selectedChannel.value?.createdAt) return "";
  return new Date(selectedChannel.value.createdAt).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
});

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
    await channelStore.addMemberToChannel(workspaceId.value, selectedChannel.value.id, {
      userId: selectedMember.value.userId,
      memberRole: "member",
    });
    success("Member added to channel successfully.");
    closeInviteTeammatesModal();
  } finally {
    isSubmittingInvite.value = false;
  }
};

const removeMember = async (member) => {
  if (!selectedChannel.value || !workspaceId.value || !member?.userId) {
    return;
  }

  await channelStore.kickMemberFromChannel(
    workspaceId.value,
    selectedChannel.value.id,
    member.userId
  );
  success("Member removed from channel.");
};

const closeChannelMenu = () => {
  isChannelMenuOpen.value = false;
  selectedChannelAction.value = null;
};

const toggleChannelMenu = () => {
  isChannelMenuOpen.value = !isChannelMenuOpen.value;
};

const openChannelDetailsModal = () => {
  activeDetailTab.value = "about";
  memberSearchKeyword.value = "";
  isChannelDetailModalOpen.value = true;
  if (workspaceId.value && selectedChannel.value?.id) {
    channelStore
      .fetchChannelById(workspaceId.value, selectedChannel.value.id)
      .catch(() => {});
  }
};

const closeChannelDetailsModal = () => {
  isChannelDetailModalOpen.value = false;
  memberSearchKeyword.value = "";
};

const selectDetailTab = async (tabKey) => {
  activeDetailTab.value = tabKey;
  if (
    tabKey === "members" &&
    selectedChannel.value?.id &&
    workspaceId.value
  ) {
    await channelStore.fetchChannelMembers(
      workspaceId.value,
      selectedChannel.value.id
    );
  }
};


const isAbleToKick = (userId, memberRole) => {
  // không kick chính mình
  return canKickMember.value && userId !== authStore.user?.id && memberRole !== "manager";
}

const leaveChannel = () => {
  info("Leave channel flow is coming soon.");
};

const onChannelActionChange = (action) => {
  switch (action?.code) {
    case "settings":
      openChannelDetailsModal();
      break;
    case "search-channel":
      info("Search in channel is coming soon.");
      break;
    case "edit-settings":
      info("Edit channel settings is coming soon.");
      break;
    case "leave-channel":
      leaveChannel();
      break;
    default:
      break;
  }
  closeChannelMenu();
};

const handleClickOutsideChannelMenu = (event) => {
  if (!isChannelMenuOpen.value) return;
  if (channelMenuRef.value?.contains(event.target)) return;
  closeChannelMenu();
};

const handleClickOutsideTabMenu = (event) => {
  if (channelTabAddRef.value && !channelTabAddRef.value.contains(event.target)) {
    showAddTabMenu.value = false;
  }
};



onMounted(() => {
  document.addEventListener("click", handleClickOutsideChannelMenu);
  document.addEventListener("click", handleClickOutsideTabMenu);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutsideChannelMenu);
  document.removeEventListener("click", handleClickOutsideTabMenu);
});
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
        <div class="channel-header-right flex items-center gap-2">

          <button
            v-if="selectedChannel"
            class="header-button"
            title="Invite teammates"
            type="button"
            @click="openInviteTeammatesModal"
          >
            Invite teammates
          </button>
          <div
            ref="channelMenuRef"
            class="channel-actions-menu"
          >
            <button
              class="header-button"
              title="More options"
              type="button"
              @click.stop="toggleChannelMenu"
            >
              <i
                class="pi pi-ellipsis-v"
                style="font-size: 12px"
              />
            </button>
            <div
              v-if="isChannelMenuOpen"
              class="channel-actions-menu__overlay"
            >
              <Listbox
                v-model="selectedChannelAction"
                :options="channelActions"
                option-label="name"
                class="channel-actions-listbox"
                @change="onChannelActionChange($event.value)"
              >
                <template #option="{ option }">
                  <div class="channel-actions-option">
                    <i :class="option.icon" />
                    <span>{{ option.name }}</span>
                  </div>
                </template>
              </Listbox>
            </div>
          </div>
        </div>
      </div>
      <!-- list of tabs -->
      <div
        v-if="selectedChannel"
        class="channel-tabs"
      >
        <button
          class="channel-tab"
          :class="{ active: activeMainTab === 'messages' }"
          type="button"
          @click="activeMainTab = 'messages'"
        >
          <i
            class="pi pi-comments"
            style="font-size: 12px"
          />
          <span class="channel-tab-text">Messages</span>
        </button>

        <!-- Dynamic task tabs -->
        <button
          v-for="list in taskLists"
          :key="list.id"
          class="channel-tab"
          :class="{ active: activeMainTab === `task-${list.id}` }"
          type="button"
          @click="activeMainTab = `task-${list.id}`"
          :title="list.name || 'Untitled list'"
        >
          <i
            class="pi pi-check-square"
            style="font-size: 12px"
          />
          <span class="channel-tab-text">{{ list.name || 'Untitled list' }}</span>
        </button>

        <!-- + Button dropdown -->
        <div
          ref="channelTabAddRef"
          class="channel-tab-add"
        >
          <button
            class="channel-tab-add-btn"
            type="button"
            @click="showAddTabMenu = !showAddTabMenu"
          >
            <i
              class="pi pi-plus"
              style="font-size: 12px"
            />
          </button>

          <div
            v-if="showAddTabMenu"
            class="channel-tab-dropdown"
          >
            <button
              class="channel-tab-dropdown-item"
              type="button"
              @click="addTaskTab"
            >
              <i class="pi pi-check-square" />
              Tasks
            </button>
          </div>
        </div>
      </div>
    </div>

    <MessageTabView
      v-if="selectedChannel && activeMainTab === 'messages'"
      @add-people-to-channel="openInviteTeammatesModal"
    />

    <TaskTabView
      v-if="selectedChannel && activeTaskListId"
      :workspace-id="workspaceId"
      :task-list-id="activeTaskListId"
      :list-name="taskLists.find(l => l.id === activeTaskListId)?.name"
      @update-name="(name) => handleUpdateListName(activeTaskListId, name)"
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

    <div
      v-if="isChannelDetailModalOpen"
      class="channel-detail-overlay"
      @click.self="closeChannelDetailsModal"
    >
      <div class="channel-detail-modal">
        <div class="channel-detail-modal__header">
          <h3># {{ selectedChannel?.name || "Unknown channel" }}</h3>
          <button
            type="button"
            class="channel-detail-modal__close"
            @click="closeChannelDetailsModal"
          >
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="channel-detail-tabs">
          <button
            v-for="tab in channelDetailTabs"
            :key="tab.key"
            type="button"
            class="channel-detail-tab"
            :class="{ 'channel-detail-tab--active': activeDetailTab === tab.key }"
            @click="selectDetailTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="channel-detail-modal__content">
          <div class="channel-detail-modal__body">
            <template v-if="activeDetailTab === 'about'">
              <div class="channel-detail-section">
                <span class="channel-detail-section__label">Channel name</span>
                <span class="channel-detail-section__value"># {{ selectedChannel?.name || "Unknown channel" }}</span>
              </div>
              <div class="channel-detail-group">
                <div class="channel-detail-row">
                  <div class="channel-detail-row__content">
                    <span class="channel-detail-section__label">
                      <i class="pi pi-tag" /> Topic
                    </span>
                    <span class="channel-detail-section__value">{{ selectedChannel?.topic || "Add a topic" }}</span>
                  </div>
                  <button
                    type="button"
                    class="channel-detail-edit-btn"
                    @click="info('Edit topic is coming soon.')"
                  >
                    Edit
                  </button>
                </div>
                <div class="channel-detail-row">
                  <div class="channel-detail-row__content">
                    <span class="channel-detail-section__label">
                      <i class="pi pi-align-left" /> Description
                    </span>
                    <span class="channel-detail-section__value">{{ selectedChannel?.description || "No description yet." }}</span>
                  </div>
                  <button
                    type="button"
                    class="channel-detail-edit-btn"
                    @click="info('Edit description is coming soon.')"
                  >
                    Edit
                  </button>
                </div>
                <div class="channel-detail-row">
                  <div class="channel-detail-row__content">
                    <span class="channel-detail-section__label">
                      <i class="pi pi-user" /> Created by
                    </span>
                    <span class="channel-detail-section__value">
                      {{ createdByDisplay }}{{ createdAtDisplay ? ` on ${createdAtDisplay}` : "" }}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                class="channel-leave-btn"
                @click="leaveChannel"
              >
                Leave channel
              </button>
              <div class="channel-detail-id">
                Channel ID: {{ selectedChannel?.id || "N/A" }}
              </div>
            </template>
  
            <template v-else-if="activeDetailTab === 'members'">
              <div class="channel-members-toolbar">
                <div class="channel-members-search">
                  <i class="pi pi-search" />
                  <input
                    v-model="memberSearchKeyword"
                    type="text"
                    placeholder="Find members"
                  >
                </div>
                <button
                  type="button"
                  class="channel-members-add"
                  @click="openInviteTeammatesModal"
                >
                  <i class="pi pi-user-plus" />
                  <span>Add people</span>
                </button>
              </div>
              <div
                v-if="isMembersLoading"
                class="d-flex justify-content-center align-items-center"
                style="height: 100%"
              >
                <AppLoading
                  :active="true"
                  variant="inline"
                  min-height="220px"
                />
              </div>
              <div
                v-else-if="!filteredChannelMembers.length"
                class="channel-members-empty"
              >
                {{ channelMembers.length ? "No members match your search." : "No members in this channel." }}
              </div>
              <div
                v-else
                class="channel-members-list"
              >
                <div
                  v-for="member in filteredChannelMembers"
                  :key="member.userId"
                  class="channel-members-row"
                >
                  <div class="channel-members-user">
                    <div class="channel-members-name">
                      {{ member.name || member.email || member.userId }}
                      <span v-if="member.userId === authStore.user?.id">(you)</span>
                    </div>
                    <div class="channel-members-role">
                      {{ member.memberRole }}
                    </div>
                  </div>
                  <button
                    v-if="isAbleToKick(member.userId, member.memberRole)"
                    type="button"
                    class="channel-detail-edit-btn"
                    @click="removeMember(member)"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </template>

            <template v-else-if="activeDetailTab === 'permissions'">
              <div
                v-if="selectedChannel?.settings?.permissions"
                class="channel-detail-permissions-wrap"
              >
                <div class="channel-detail-group">
                  <div class="channel-detail-row">
                    <div class="channel-detail-row__content">
                      <span class="channel-detail-section__label">Who can invite members?</span>
                      <span class="channel-detail-section__value">
                        Managers can control who can invite.
                      </span>
                    </div>
                    <div>
                      <CustomSelect
                        v-model="permissionDraft.invitePolicy"
                        :options="permissionOptions"
                        size="sm"
                        width="150px"
                        :disabled="isSubmittingPermissions"
                      />
                    </div>
                  </div>

                  <div class="channel-detail-row">
                    <div class="channel-detail-row__content">
                      <span class="channel-detail-section__label">Who can post messages?</span>
                      <span class="channel-detail-section__value">
                        Controls who can write in this channel.
                      </span>
                    </div>
                    <div>
                      <CustomSelect
                        v-model="permissionDraft.postPolicy"
                        :options="permissionOptions"
                        size="sm"
                        width="150px"
                        :disabled="isSubmittingPermissions"
                      />
                    </div>
                  </div>

                  <div class="channel-detail-row">
                    <div class="channel-detail-row__content">
                      <span class="channel-detail-section__label">Who can pin messages?</span>
                      <span class="channel-detail-section__value">
                        Controls who can pin messages.
                      </span>
                    </div>
                    <div>
                      <CustomSelect
                        v-model="permissionDraft.pinMessagePolicy"
                        :options="permissionOptions"
                        size="sm"
                        width="150px"
                        open-up
                        :disabled="isSubmittingPermissions"
                      />
                    </div>
                  </div>

                  <div class="channel-detail-row">
                    <div class="channel-detail-row__content">
                      <span class="channel-detail-section__label">Who can create threads?</span>
                      <span class="channel-detail-section__value">
                        Controls who can open new threads.
                      </span>
                    </div>
                    <div>
                      <CustomSelect
                        v-model="permissionDraft.threadPolicy"
                        :options="permissionOptions"
                        size="sm"
                        width="150px"
                        open-up
                        :disabled="isSubmittingPermissions"
                      />
                    </div>
                  </div>
                </div>

                <div class="channel-permissions-actions">
                  <button
                    type="button"
                    class="channel-invite-btn channel-invite-btn--primary"
                    :disabled="isSubmittingPermissions || !hasPermissionChanges"
                    @click="saveChannelPermissions"
                  >
                    {{ isSubmittingPermissions ? "Saving..." : "Save permissions" }}
                  </button>
                </div>
              </div>

              <div
                v-else
                class="d-flex justify-content-center align-items-center"
                style="height: 100%"
              >
                <AppLoading
                  :active="true"
                  variant="inline"
                  min-height="220px"
                />
              </div>
            </template>
  
            <div
              v-else
              class="channel-members-empty"
            >
              This tab is coming soon.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./ChannelDetailView.scss"></style>
