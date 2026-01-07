<script setup>
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import StarfieldButton from "@/components/StarfieldButton.vue";
import userService from "@/services/user.service.js";
import { useToast } from "@/composables/useToast.js";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:open", "created"]);

const router = useRouter();
const toast = useToast();
const workspaceStore = useWorkspaceStore();

const isCreateWorkspaceModalOpen = computed({
  get() {
    return props.open;
  },
  set(value) {
    emit("update:open", value);
  },
});

const createWorkspaceForm = ref({
  name: "",
  displayName: "",
});

const createWorkspaceErrors = ref({});

const createWorkspaceLoading = computed(
  () => workspaceStore.createWorkspaceLoading
);

// Invite members state
const searchQuery = ref("");
const searchResults = ref([]);
const searchLoading = ref(false);
const showSuggestions = ref(false);
const searchTimeout = ref(null);
const invites = ref([]);

const resetCreateWorkspaceForm = () => {
  createWorkspaceForm.value = {
    name: "",
    displayName: "",
  };
  createWorkspaceErrors.value = {};
  searchQuery.value = "";
  searchResults.value = [];
  showSuggestions.value = false;
  invites.value = [];
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetCreateWorkspaceForm();
    }
  }
);

const closeCreateWorkspaceModal = () => {
  if (createWorkspaceLoading.value) return;
  isCreateWorkspaceModalOpen.value = false;
};

// Search users with debounce
const searchUsers = async (query) => {
  if (!query || query.length < 2) {
    searchResults.value = [];
    showSuggestions.value = false;
    return;
  }

  searchLoading.value = true;
  try {
    const users = await userService.searchUsers(query, 10);
    searchResults.value = users.filter(
      (user) => !invites.value.some((inv) => inv.email === user.email)
    );
    showSuggestions.value = searchResults.value.length > 0;
  } catch (error) {
    console.error("Search users error:", error);
    searchResults.value = [];
    showSuggestions.value = false;
  } finally {
    searchLoading.value = false;
  }
};

watch(searchQuery, (newQuery) => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }

  searchTimeout.value = setTimeout(() => {
    searchUsers(newQuery);
  }, 300);
});

const selectUser = (user) => {
  if (invites.value.some((inv) => inv.email === user.email)) {
    return;
  }

  invites.value.push({
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: "member",
  });

  searchQuery.value = "";
  searchResults.value = [];
  showSuggestions.value = false;
};

const removeInvite = (index) => {
  invites.value.splice(index, 1);
};

const validateCreateWorkspaceForm = () => {
  const errors = {};
  const { name, displayName } = createWorkspaceForm.value;

  if (!name || name.trim().length < 2) {
    errors.name = "Workspace name must be at least 2 characters";
  } else if (name.length > 255) {
    errors.name = "Workspace name must not exceed 255 characters";
  }

  if (!displayName || displayName.trim().length < 2) {
    errors.displayName = "Display name must be at least 2 characters";
  } else if (displayName.length > 50) {
    errors.displayName = "Display name must not exceed 50 characters";
  }

  // Validate invites roles
  const invalidInvites = invites.value.filter(
    (inv) => !inv.role || !["owner", "admin", "member"].includes(inv.role)
  );
  if (invalidInvites.length > 0) {
    errors.invites = "Please select a valid role for all invited members";
  }

  createWorkspaceErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const handleCreateWorkspace = async () => {
  if (!validateCreateWorkspaceForm()) return;

  try {
    const workspaceData = {
      name: createWorkspaceForm.value.name.trim(),
      displayName: createWorkspaceForm.value.displayName.trim(),
      invites: invites.value.map((inv) => ({
        email: inv.email,
        role: inv.role,
      })),
    };

    const workspace = await workspaceStore.createWorkspace(workspaceData);

    toast.success("Workspace created successfully!");

    emit("created", workspace);
    isCreateWorkspaceModalOpen.value = false;
    router.push(`/workspaces/${workspace.id}`);
  } catch (error) {
    const message = error?.message || "Unable to create workspace";
    toast.error(message);

    if (error?.errors && typeof error.errors === "object") {
      createWorkspaceErrors.value = {
        ...createWorkspaceErrors.value,
        ...error.errors,
      };
    }
  } finally {
    // loading state comes from workspaceStore
  }
};
</script>

<template>
  <div
    v-if="isCreateWorkspaceModalOpen"
    class="create-workspace-modal"
  >
    <div
      class="create-workspace-modal__backdrop"
      @click="closeCreateWorkspaceModal"
    />
    <div class="create-workspace-modal__dialog">
      <div class="create-workspace-modal__header">
        <h2 class="heading-lg create-workspace-modal__title">
          Create new workspace
        </h2>
        <button
          type="button"
          class="create-workspace-modal__close"
          @click="closeCreateWorkspaceModal"
        >
          ×
        </button>
      </div>
      <p class="create-workspace-modal__description">
        Create a workspace to start working with your team.
      </p>
      <form
        class="create-workspace-modal__form"
        @submit.prevent="handleCreateWorkspace"
      >
        <div class="form-group">
          <label for="workspaceName">
            Workspace name <span class="required">*</span>
          </label>
          <input
            id="workspaceName"
            v-model="createWorkspaceForm.name"
            type="text"
            placeholder="Example: Marketing Team"
            :class="{ error: createWorkspaceErrors.name }"
          >
          <span
            v-if="createWorkspaceErrors.name"
            class="error-message"
          >
            {{ createWorkspaceErrors.name }}
          </span>
        </div>

        <div class="form-group">
          <label for="workspaceDisplayName">
            Your display name in the workspace
            <span class="required">*</span>
          </label>
          <input
            id="workspaceDisplayName"
            v-model="createWorkspaceForm.displayName"
            type="text"
            placeholder="Example: John Doe"
            :class="{ error: createWorkspaceErrors.displayName }"
          >
          <span
            v-if="createWorkspaceErrors.displayName"
            class="error-message"
          >
            {{ createWorkspaceErrors.displayName }}
          </span>
        </div>

        <div class="form-section">
          <h3 class="form-section__title">
            Invite members
          </h3>
          <p class="form-section__description">
            Search and invite members to the workspace (optional).
          </p>

          <div class="invite-search-wrapper">
            <div class="search-input-wrapper">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Enter email or name to search..."
                class="search-input"
                @focus="showSuggestions = searchResults.length > 0"
                @blur="
                  setTimeout(() => {
                    showSuggestions = false;
                  }, 200)
                "
              >
              <div
                v-if="searchLoading"
                class="search-loading"
              >
                Searching...
              </div>
            </div>

            <div
              v-if="showSuggestions && searchResults.length > 0"
              class="suggestions-dropdown"
            >
              <div
                v-for="user in searchResults"
                :key="user.id"
                class="suggestion-item"
                @mousedown.prevent="selectUser(user)"
              >
                <div class="user-avatar">
                  {{ user.name.charAt(0).toUpperCase() }}
                </div>
                <div class="user-info">
                  <p class="user-name">
                    {{ user.name }}
                  </p>
                  <p class="user-email">
                    {{ user.email }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="invites.length > 0"
            :class="['invites-list', { 'invites-list--scrollable': invites.length > 3 }]"
          >
            <div
              v-for="(invite, index) in invites"
              :key="index"
              class="invite-item"
            >
              <div class="invite-user-info">
                <div class="user-avatar">
                  {{ invite.name.charAt(0).toUpperCase() }}
                </div>
                <div class="user-details">
                  <p class="user-name">
                    {{ invite.name }}
                  </p>
                  <p class="user-email">
                    {{ invite.email }}
                  </p>
                </div>
              </div>
              <div class="invite-role-select">
                <select
                  v-model="invite.role"
                  class="role-select"
                >
                  <option value="member">
                    Member
                  </option>
                  <option value="admin">
                    Admin
                  </option>
                </select>
              </div>
              <button
                type="button"
                class="remove-btn"
                @click="removeInvite(index)"
              >
                ×
              </button>
            </div>
          </div>

          <span
            v-if="createWorkspaceErrors.invites"
            class="error-message"
          >
            {{ createWorkspaceErrors.invites }}
          </span>
        </div>

        <div class="create-workspace-modal__actions">
          <StarfieldButton
            variant="outline"
            type="button"
            :disabled="createWorkspaceLoading"
            @click="closeCreateWorkspaceModal"
          >
            Cancel
          </StarfieldButton>
          <StarfieldButton
            variant="primary"
            type="submit"
            :disabled="createWorkspaceLoading"
          >
            {{ createWorkspaceLoading ? "Creating..." : "Create workspace" }}
          </StarfieldButton>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./CreateWorkspaceModal.scss"></style>


