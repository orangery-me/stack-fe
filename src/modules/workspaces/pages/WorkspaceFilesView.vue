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
const documents = ref([]);
const isLoadingDocuments = ref(false);
const documentsError = ref("");
const activeSection = ref("home");

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

const loadDocuments = async () => {
  try {
    isLoadingDocuments.value = true;
    documentsError.value = "";
    documents.value = await workspaceFilesService.fetchWorkspaceDocuments(
      workspaceId
    );
  } catch (err) {
    console.error("Failed to load workspace documents", err);
    documentsError.value = "Failed to load documents.";
    error("Failed to load documents");
  } finally {
    isLoadingDocuments.value = false;
  }
};

const handleOpenDocument = (document) => {
  if (!document?.id) return;
  router.push({
    name: "canvasEdit",
    params: { canvasId: document.id },
  });
};

onMounted(async () => {
  await loadDocuments();
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
              class="files-tab active"
              type="button"
            >
              Recent
            </button>
            <button
              class="files-tab"
              type="button"
            >
              Owned by Me
            </button>
            <button
              class="files-tab"
              type="button"
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
            v-if="isLoadingDocuments"
            class="files-table-body files-table-empty"
          >
            <span>Loading documents...</span>
          </div>
          <div
            v-else-if="documentsError"
            class="files-table-body files-table-empty"
          >
            <span>{{ documentsError }}</span>
          </div>
          <div
            v-else
            class="files-table-body"
          >
            <button
              v-for="doc in documents"
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
                {{ doc.location }}
              </div>
              <div class="col-owner">
                {{ doc.ownerName }}
              </div>
              <div class="col-updated">
                {{ doc.updatedAt }}
              </div>
            </button>

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

