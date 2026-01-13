<script setup>
import { ref, watch, computed } from "vue";
import { useRouter } from "vue-router";
import userService from "@/services/user.service.js";
import StarfieldButton from "@/components/StarfieldButton.vue";
import StarfieldCard from "@/components/StarfieldCard.vue";
import GlowText from "@/components/GlowText.vue";
import { useToast } from "@/composables/useToast.js";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";

const router = useRouter();
const toast = useToast();
const workspaceStore = useWorkspaceStore();

const form = ref({
  name: "",
  displayName: "",
  invites: [],
});

const loading = computed(() => workspaceStore.createWorkspaceLoading);
const errors = ref({});

// User search for autocomplete
const searchQuery = ref("");
const searchResults = ref([]);
const searchLoading = ref(false);
const showSuggestions = ref(false);
const searchTimeout = ref(null);

// Invite list
const invites = ref([]);

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
    role: "member", // Default role
  });

  searchQuery.value = "";
  searchResults.value = [];
  showSuggestions.value = false;
};

const removeInvite = (index) => {
  invites.value.splice(index, 1);
};

const validateForm = () => {
  errors.value = {};
  if (!form.value.name || form.value.name.length < 2) {
    errors.value.name = "Workspace name must be at least 2 characters";
    return false;
  }
  if (form.value.name.length > 255) {
    errors.value.name = "Workspace name must not exceed 255 characters";
    return false;
  }
  if (!form.value.displayName || form.value.displayName.length < 2) {
    errors.value.displayName = "Display name must be at least 2 characters";
    return false;
  }
  if (form.value.displayName.length > 50) {
    errors.value.displayName = "Display name must not exceed 50 characters";
    return false;
  }

  // Validate invites
  const invalidInvites = invites.value.filter(
    (inv) => !inv.role || !["owner", "admin", "member"].includes(inv.role)
  );
  if (invalidInvites.length > 0) {
    errors.value.invites =
      "Please select a valid role for all invited members";
    return false;
  }

  return true;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  try {
    const workspaceData = {
      name: form.value.name,
      displayName: form.value.displayName,
      invites: invites.value.map((inv) => ({
        email: inv.email,
        role: inv.role,
      })),
    };

    const workspace = await workspaceStore.createWorkspace(workspaceData);
    toast.success("Workspace created successfully!");
    router.push(`/workspaces/${workspace.id}`);
  } catch (error) {
    const message = error.message || "Unable to create workspace";
    toast.error(message);
    if (error.errors) {
      errors.value = { ...errors.value, ...error.errors };
    }
  }
};

const goBack = () => {
  router.back();
};

// Load default role (member role) - we'll need to get this from workspace roles
// For now, we'll set it when creating workspace
</script>

<template>
  <div class="create-workspace-page">
    <div class="container-center">
      <div class="page-header">
        <StarfieldButton
          variant="outline"
          size="sm"
          @click="goBack"
        >
          ← Back
        </StarfieldButton>
        <GlowText
          :level="1"
          class="page-title"
        >
          Create new workspace
        </GlowText>
        <p class="page-description">
          Create a workspace to start working with your team
        </p>
      </div>

      <StarfieldCard class="form-card">
        <form
          class="workspace-form"
          @submit.prevent="handleSubmit"
        >
          <div class="form-group">
            <label for="name">
              Workspace name <span class="required">*</span>
            </label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              placeholder="Example: My Workspace"
              :class="{ error: errors.name }"
            >
            <span
              v-if="errors.name"
              class="error-message"
            >
              {{ errors.name }}
            </span>
          </div>

          <div class="form-group">
            <label for="displayName">
              Your display name in the workspace
              <span class="required">*</span>
            </label>
            <input
              id="displayName"
              v-model="form.displayName"
              type="text"
              placeholder="Example: John Doe"
              :class="{ error: errors.displayName }"
            >
            <span
              v-if="errors.displayName"
              class="error-message"
            >
              {{ errors.displayName }}
            </span>
          </div>

          <div class="form-section">
            <h3 class="section-title">
              Invite members
            </h3>
            <p class="section-description">
              Search and invite members to the workspace (optional)
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
              class="invites-list"
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
              v-if="errors.invites"
              class="error-message"
            >
              {{ errors.invites }}
            </span>
          </div>

          <div class="form-actions">
            <StarfieldButton
              variant="outline"
              :disabled="loading"
              @click="goBack"
            >
              Cancel
            </StarfieldButton>
            <StarfieldButton
              variant="primary"
              type="submit"
              :disabled="loading"
            >
              {{ loading ? "Creating..." : "Create workspace" }}
            </StarfieldButton>
          </div>
        </form>
      </StarfieldCard>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./CreateWorkspaceView.scss"></style>
