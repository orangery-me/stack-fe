<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useNotificationStore } from "@/modules/notifications/stores/notification.store.js";
import { useUiStore } from "@/stores/ui.store.js";
import workspaceFilesService from "@/services/workspaceFiles.service";
import AppLoading from "@/components/loading/AppLoading.vue";
import AiChatSidebar from "@/components/ai/AiChatSidebar.vue";

const route = useRoute();
const router = useRouter();
const workspaceId = route.params.id;

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const uiStore = useUiStore();
const currentUser = computed(() => authStore.user);
const unreadCount = computed(() => notificationStore.unreadCount);
const notifications = computed(() => notificationStore.items);

// Files page state
const myCanvases = ref([]);
const recentCanvases = ref([]);
const sharedWithMeCanvases = ref([]);
const isLoading = ref(false);
const loadError = ref("");
const activeSection = ref("recent");

const workspaceInitials = computed(() => "W");

const getUserInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
};

const setActiveSection = (section) => {
  activeSection.value = section;
};

const goToWorkspaceHome = () => {
  router.push({
    name: "workspaceDetail",
    params: { id: workspaceId },
  });
};

const goToWorkspaceFiles = () => {
  if (route.name !== "workspaceFiles") {
    router.push({
      name: "workspaceFiles",
      params: { id: workspaceId },
    });
  }
};

const toggleActivityPanel = async () => {
  if (notificationStore.isPanelOpen) {
    notificationStore.closePanel();
    return;
  }
  await notificationStore.openPanel(workspaceId);
};

const markNotificationRead = async (notificationId) => {
  await notificationStore.markRead(notificationId, workspaceId);
};

const markAllNotificationsRead = async () => {
  await notificationStore.markAllRead(workspaceId);
};

const documents = computed(() => {
  if (activeSection.value === "recent") return recentCanvases.value;
  if (activeSection.value === "owned") return myCanvases.value;
  if (activeSection.value === "shared") return sharedWithMeCanvases.value;
  return [];
});

const LOCATION_ICON_MY_DOCUMENT = "/icons/canvas/my-document.svg";
const LOCATION_ICON_SHARE_WITH_ME = "/icons/canvas/share-with-me.svg";

/** Recent list mixes owned + shared; use API `isShared` when present. */
const locationIconForRecentDoc = (doc) =>
  doc?.isShared ? LOCATION_ICON_SHARE_WITH_ME : LOCATION_ICON_MY_DOCUMENT;

const loadCanvasesForTab = async () => {
  try {
    isLoading.value = true;
    loadError.value = "";

    if (activeSection.value === "home") {
      const [my, recent, shared] = await Promise.all([
        workspaceFilesService.getMyCanvases(workspaceId),
        workspaceFilesService.getRecentCanvases(workspaceId),
        workspaceFilesService.getSharedWithMeCanvases(workspaceId),
      ]);
      myCanvases.value = my;
      recentCanvases.value = recent;
      sharedWithMeCanvases.value = shared;
    } else if (activeSection.value === "recent") {
      const recent = await workspaceFilesService.getRecentCanvases(workspaceId);
      recentCanvases.value = recent;
    } else if (activeSection.value === "owned") {
      const my = await workspaceFilesService.getMyCanvases(workspaceId);
      myCanvases.value = my;
    } else if (activeSection.value === "shared") {
      const shared = await workspaceFilesService.getSharedWithMeCanvases(
        workspaceId
      );
      sharedWithMeCanvases.value = shared;
    }
  } catch {
    loadError.value = "Failed to load canvases.";
    // Toast is shown by the global axios interceptor
  } finally {
    isLoading.value = false;
  }
};

const handleOpenDocument = (document) => {
  if (!document?.id) return;
  router.push({
    name: "canvasEdit",
    params: { canvasId: document.id },
  });
};

const openCanvasInNewTab = (canvasId) => {
  if (!canvasId) return;
  const resolved = router.resolve({
    name: "canvasEdit",
    params: { canvasId },
  });
  const url = `${window.location.origin}${resolved.href}`;
  window.open(url, "_blank");
};

const handleCreateNewCanvas = async () => {
  try {
    isLoading.value = true;
    const created = await workspaceFilesService.createCanvas(workspaceId, {
      title: "Untitled",
    });
    openCanvasInNewTab(created.id);
    await loadCanvasesForTab();
  } catch {
    // Toast is shown by the global axios interceptor
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await notificationStore.fetchUnreadCount(workspaceId);
  await notificationStore.connectRealtime(workspaceId);
  await loadCanvasesForTab();
});

onBeforeUnmount(() => {
  notificationStore.disconnectRealtime();
});
</script>

<template>
  <div
    class="workspace-files-page"
    :style="{ paddingRight: uiStore.isAiOpen ? uiStore.aiSidebarWidth + 'px' : '0' }"
  >
    <!-- Left Icon Menu Bar (giữ nguyên như WorkspaceDetail để điều hướng dễ dàng) -->
    <div class="icon-menu-bar">
      <div class="icon-menu-header">
        <div class="workspace-logo">
          <span>{{ workspaceInitials }}</span>
        </div>
      </div>

      <div class="icon-menu-items">
        <button
          class="icon-menu-item"
          :class="{ active: route.name === 'workspaceDetail' }"
          title="Home"
          type="button"
          @click="goToWorkspaceHome"
        >
          <img
            src="/icons/home.svg"
            alt="Home"
            class="icon-menu-svg"
          >
          <span class="icon-menu-label">Home</span>
        </button>

        <button
          class="icon-menu-item"
          title="DMs"
          type="button"
        >
          <img
            src="/icons/message-circle-dot.svg"
            alt="DMs"
            class="icon-menu-svg"
          >
          <span class="notification-badge">1</span>
          <span class="icon-menu-label">DMs</span>
        </button>

        <button class="icon-menu-item" title="Activity" type="button" @click="toggleActivityPanel">
          <img
            src="/icons/notification.svg"
            alt="Activity"
            class="icon-menu-svg"
          >
          <span v-if="unreadCount > 0" class="notification-badge">{{
            unreadCount > 99 ? "99+" : unreadCount
          }}</span>
          <span class="icon-menu-label">Activity</span>
        </button>

        <button
          class="icon-menu-item"
          :class="{ active: route.name === 'workspaceFiles' }"
          title="Files"
          type="button"
          @click="goToWorkspaceFiles"
        >
          <img
            src="/icons/file.svg"
            alt="Files"
            class="icon-menu-svg"
          >
          <span class="icon-menu-label">Files</span>
        </button>

        <button
          class="icon-menu-item"
          :class="{ active: uiStore.isAiOpen }"
          title="AI Assistant"
          type="button"
          @click="uiStore.toggleAi"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon-menu-svg"
          >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          </svg>
          <span class="icon-menu-label">AI</span>
        </button>

        <button
          class="icon-menu-item"
          title="More"
          type="button"
        >
          <img
            src="/icons/more-horizontal.svg"
            alt="More"
            class="icon-menu-svg"
          >
          <span class="icon-menu-label">More</span>
        </button>

        <button
          class="icon-menu-item"
          title="Admin"
          type="button"
        >
          <img
            src="/icons/setting.svg"
            alt="Admin"
            class="icon-menu-svg"
          >
          <span class="icon-menu-label">Admin</span>
        </button>
      </div>

      <div class="icon-menu-footer">
        <div class="profile-icon">
          {{ getUserInitials(currentUser?.name || "U") }}
        </div>
      </div>
    </div>

    <!-- Files layout: sidebar + content -->
    <div class="files-main">
      <div class="files-sidebar">
        <div class="files-nav-group">
          <button
            class="files-nav-item"
            :class="{ active: activeSection === 'home' }"
            type="button"
            @click="setActiveSection('home')"
          >
            Home
          </button>
          <button
            class="files-nav-item"
            :class="{ active: activeSection === 'drive' }"
            type="button"
            @click="setActiveSection('drive')"
          >
            Drive
          </button>
          <button
            class="files-nav-item"
            :class="{ active: activeSection === 'wiki' }"
            type="button"
            @click="setActiveSection('wiki')"
          >
            Wiki
          </button>
        </div>

        <div class="files-nav-group">
          <div class="files-nav-label">
            Pinned Docs
          </div>
          <button
            class="files-nav-item is-muted"
            type="button"
          >
            Getting Started with Docs
          </button>
        </div>

        <div class="files-nav-group">
          <div class="files-nav-label">
            My Document Library
          </div>
          <button
            class="files-nav-item primary"
            type="button"
            @click="handleCreateNewCanvas"
          >
            Create New
          </button>
        </div>
      </div>

      <div class="files-content">
        <div class="files-header">
          <div class="files-header-title">
            <h1>Home</h1>
          </div>
          <div class="files-header-actions">
            <button
              class="files-btn files-btn-primary"
              type="button"
              @click="handleCreateNewCanvas"
            >
              New
            </button>
            <button
              class="files-btn"
              type="button"
            >
              Upload
            </button>
            <button
              class="files-btn"
              type="button"
            >
              Templates
            </button>
          </div>
        </div>

        <div class="files-filters">
          <div class="files-tabs">
            <button
              class="files-tab"
              :class="{ active: activeSection === 'recent' }"
              type="button"
              @click="
                () => {
                  setActiveSection('recent');
                  loadCanvasesForTab();
                }
              "
            >
              Recent
            </button>
            <button
              class="files-tab"
              :class="{ active: activeSection === 'owned' }"
              type="button"
              @click="
                () => {
                  setActiveSection('owned');
                  loadCanvasesForTab();
                }
              "
            >
              Owned by Me
            </button>
            <button
              class="files-tab"
              :class="{ active: activeSection === 'shared' }"
              type="button"
              @click="
                () => {
                  setActiveSection('shared');
                  loadCanvasesForTab();
                }
              "
            >
              Shared With Me
            </button>
            <button
              class="files-tab"
              type="button"
            >
              Favorites
            </button>
          </div>
        </div>

        <div class="files-table">
          <div class="files-table-header">
            <span class="col-name">
              Name
            </span>
            <span class="col-location">
              Location
            </span>
            <span class="col-owner">
              Owner
            </span>
            <span class="col-updated">
              Updated
            </span>
          </div>

          <div
            v-if="isLoading"
            class="files-table-body files-table-empty"
          >
            <AppLoading
              :active="true"
              variant="inline"
              min-height="240px"
            />
          </div>
          <div
            v-else-if="loadError"
            class="files-table-body files-table-empty"
          >
            <span>{{ loadError }}</span>
          </div>
          <div
            v-else
            class="files-table-body"
          >
            <template v-if="activeSection === 'recent'">
              <button
                v-for="doc in recentCanvases"
                :key="doc.id"
                class="files-row"
                type="button"
                @click="handleOpenDocument(doc)"
              >
                <span class="col-name">
                  <img
                    src="/icons/canvas/docs.svg"
                    alt=""
                    class="file-icon-img"
                    width="24"
                    height="24"
                  >
                  <span class="file-title">{{ doc.title }}</span>
                </span>
                <span class="col-location">
                  <img
                    :src="locationIconForRecentDoc(doc)"
                    alt=""
                    class="col-inline-icon"
                    width="14"
                    height="14"
                  >
                  Recent
                </span>
                <span class="col-owner">
                  {{ doc.owner?.name || doc.ownerId }}
                </span>
                <span class="col-updated">
                  {{ new Date(doc.updatedAt).toLocaleString() }}
                </span>
              </button>
            </template>

            <template v-else-if="activeSection === 'owned'">
              <button
                v-for="doc in myCanvases"
                :key="doc.id"
                class="files-row"
                type="button"
                @click="handleOpenDocument(doc)"
              >
                <span class="col-name">
                  <img
                    src="/icons/canvas/docs.svg"
                    alt=""
                    class="file-icon-img"
                    width="24"
                    height="24"
                  >
                  <span class="file-title">{{ doc.title }}</span>
                </span>
                <span class="col-location">
                  <img
                    :src="LOCATION_ICON_MY_DOCUMENT"
                    alt=""
                    class="col-inline-icon"
                    width="14"
                    height="14"
                  >
                  Owned by me
                </span>
                <span class="col-owner">
                  You
                </span>
                <span class="col-updated">
                  {{ new Date(doc.updatedAt).toLocaleString() }}
                </span>
              </button>
            </template>

            <template v-else-if="activeSection === 'shared'">
              <button
                v-for="doc in sharedWithMeCanvases"
                :key="doc.id"
                class="files-row"
                type="button"
                @click="handleOpenDocument(doc)"
              >
                <span class="col-name">
                  <img
                    src="/icons/canvas/docs.svg"
                    alt=""
                    class="file-icon-img"
                    width="24"
                    height="24"
                  >
                  <span class="file-title">{{ doc.title }}</span>
                </span>
                <span class="col-location">
                  <img
                    :src="LOCATION_ICON_SHARE_WITH_ME"
                    alt=""
                    class="col-inline-icon"
                    width="14"
                    height="14"
                  >
                  Shared with me
                </span>
                <span class="col-owner">
                  {{ doc.owner?.name || doc.ownerId }}
                </span>
                <span class="col-updated">
                  {{ new Date(doc.updatedAt).toLocaleString() }}
                </span>
              </button>
            </template>

            <div
              v-if="!documents || documents.length === 0"
              class="files-table-empty"
            >
              <span>You've reached the end.</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AiChatSidebar v-model:open="uiStore.isAiOpen" />

    <div
      v-if="notificationStore.isPanelOpen"
      class="notification-overlay"
      @click.self="notificationStore.closePanel()"
    >
      <div class="notification-panel">
        <div class="notification-panel-header">
          <h3>Activity</h3>
          <button type="button" @click="markAllNotificationsRead">
            Mark all as read
          </button>
        </div>
        <div v-if="notificationStore.loading" class="notification-empty">
          Loading...
        </div>
        <div v-else-if="notifications.length === 0" class="notification-empty">
          No notifications yet.
        </div>
        <div v-else class="notification-list">
          <button
            v-for="item in notifications"
            :key="item.id"
            class="notification-item"
            :class="{ unread: !item.readAt }"
            type="button"
            @click="markNotificationRead(item.id)"
          >
            <div class="notification-item-title">{{ item.title || "Notification" }}</div>
            <div class="notification-item-body">{{ item.body || "You have a new update." }}</div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./WorkspaceFilesView.scss"></style>
