<script setup>
import { ref, watch, computed } from "vue";
import { useRouter } from "vue-router";
import userService from "@/services/user.service.js";
import CalmButton from "@/components/calm/CalmButton.vue";
import CalmCard from "@/components/calm/CalmCard.vue";
import CalmHeading from "@/components/calm/CalmHeading.vue";
import CalmInput from "@/components/calm/CalmInput.vue";
import CalmSelect from "@/components/calm/CalmSelect.vue";
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
const roleOptions = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

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
    // Toast is shown by the global axios interceptor
    if (error?.errors) {
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
        <CalmButton
          variant="secondary"
          size="sm"
          type="button"
          @click="goBack"
        >
          Back
        </CalmButton>
        <CalmHeading
          :level="1"
          class="page-title"
        >
          Create workspace
        </CalmHeading>
        <p class="page-description ui-muted">
          Create a workspace to start working with your team
        </p>
      </div>

      <CalmCard
        class="form-card"
        padding="lg"
      >
        <form
          class="workspace-form"
          @submit.prevent="handleSubmit"
        >
          <CalmInput
            id="name"
            v-model="form.name"
            label="Workspace name"
            placeholder="Example: My Workspace"
            :required="true"
            :error="errors.name"
          />

          <CalmInput
            id="displayName"
            v-model="form.displayName"
            label="Your display name"
            placeholder="Example: John Doe"
            :required="true"
            :error="errors.displayName"
          />

          <div class="form-section">
            <h3 class="section-title ui-h3">
              Invite members
            </h3>
            <p class="section-description ui-hint">
              Search and invite members to the workspace (optional)
            </p>

            <div class="invite-search">
              <div class="invite-search__inputWrap">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Enter email or name to search…"
                  class="invite-search__input ui-focusable"
                  @focus="showSuggestions = searchResults.length > 0"
                  @blur="
                    setTimeout(() => {
                      showSuggestions = false;
                    }, 200)
                  "
                >
                <div
                  v-if="searchLoading"
                  class="invite-search__loading ui-hint"
                >
                  Searching…
                </div>
              </div>

              <div
                v-if="showSuggestions && searchResults.length > 0"
                class="invite-search__dropdown"
              >
                <button
                  v-for="user in searchResults"
                  :key="user.id"
                  type="button"
                  class="invite-search__item"
                  @mousedown.prevent="selectUser(user)"
                >
                  <div
                    class="invite-search__avatar"
                    aria-hidden="true"
                  >
                    {{ user.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="invite-search__info">
                    <div class="invite-search__name">
                      {{ user.name }}
                    </div>
                    <div class="invite-search__email">
                      {{ user.email }}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div
              v-if="invites.length > 0"
              class="invites"
            >
              <div
                v-for="(invite, index) in invites"
                :key="index"
                class="invites__row"
              >
                <div class="invites__user">
                  <div
                    class="invites__avatar"
                    aria-hidden="true"
                  >
                    {{ invite.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="invites__meta">
                    <div class="invites__name">
                      {{ invite.name }}
                    </div>
                    <div class="invites__email">
                      {{ invite.email }}
                    </div>
                  </div>
                </div>
                <CalmSelect
                  v-model="invite.role"
                  :options="roleOptions"
                />
                <button
                  type="button"
                  class="invites__remove ui-focusable"
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
            <CalmButton
              variant="secondary"
              type="button"
              :disabled="loading"
              @click="goBack"
            >
              Cancel
            </CalmButton>
            <CalmButton
              variant="primary"
              type="submit"
              :loading="loading"
              :disabled="loading"
            >
              Create workspace
            </CalmButton>
          </div>
        </form>
      </CalmCard>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./CreateWorkspaceView.scss"></style>
