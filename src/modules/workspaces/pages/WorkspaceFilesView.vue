<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "@/composables/useToast.js";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import workspaceFilesService from "@/services/workspaceFiles.service";

const { error } = useToast();
const route = useRoute();
const router = useRouter();
const workspaceId = route.params.id;

const authStore = useAuthStore();
const currentUser = computed(() => authStore.user);

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

const documents = computed(() => {
  if (activeSection.value === "recent") return recentCanvases.value;
  if (activeSection.value === "owned") return myCanvases.value;
  if (activeSection.value === "shared") return sharedWithMeCanvases.value;
  return [];
});

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
      const shared = await workspaceFilesService.getSharedWithMeCanvases(workspaceId);
      sharedWithMeCanvases.value = shared;
    }
  } catch (err) {
    console.error("Failed to load workspace canvases", err);
    loadError.value = "Failed to load canvases.";
    error("Failed to load canvases");
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
  } catch (err) {
    console.error("Failed to create canvas", err);
    error("Failed to create canvas");
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await loadCanvasesForTab();
});
</script>

<template>
  <div class="workspace-files-page">
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

        <button
          class="icon-menu-item"
          title="Activity"
          type="button"
        >
          <img
            src="/icons/notification.svg"
            alt="Activity"
            class="icon-menu-svg"
          >
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
              @click="() => { setActiveSection('recent'); loadCanvasesForTab(); }"
            >
              Recent
            </button>
            <button
              class="files-tab"
              :class="{ active: activeSection === 'owned' }"
              type="button"
              @click="() => { setActiveSection('owned'); loadCanvasesForTab(); }"
            >
              Owned by Me
            </button>
            <button
              class="files-tab"
              :class="{ active: activeSection === 'shared' }"
              type="button"
              @click="() => { setActiveSection('shared'); loadCanvasesForTab(); }"
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
            <div class="col-name">
              Name
            </div>
            <div class="col-location">
              Location
            </div>
            <div class="col-owner">
              Owner
            </div>
            <div class="col-updated">
              Updated
            </div>
          </div>

          <div
            v-if="isLoading"
            class="files-table-body files-table-empty"
          >
            <span>Loading documents...</span>
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
                <div class="col-name">
                  <span class="file-icon">📄</span>
                  <span class="file-title">{{ doc.title }}</span>
                </div>
                <div class="col-location">
                  Recent
                </div>
                <div class="col-owner">
                  {{ doc.ownerId }}
                </div>
                <div class="col-updated">
                  {{ new Date(doc.updatedAt).toLocaleString() }}
                </div>
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
                <div class="col-name">
                  <span class="file-icon">📄</span>
                  <span class="file-title">{{ doc.title }}</span>
                </div>
                <div class="col-location">
                  Owned by me
                </div>
                <div class="col-owner">
                  You
                </div>
                <div class="col-updated">
                  {{ new Date(doc.updatedAt).toLocaleString() }}
                </div>
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
                <div class="col-name">
                  <span class="file-icon">📄</span>
                  <span class="file-title">{{ doc.title }}</span>
                </div>
                <div class="col-location">
                  Shared with me
                </div>
                <div class="col-owner">
                  {{ doc.ownerId }}
                </div>
                <div class="col-updated">
                  {{ new Date(doc.updatedAt).toLocaleString() }}
                </div>
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
  </div>
</template>

<style scoped lang="scss" src="./WorkspaceFilesView.scss"></style>

