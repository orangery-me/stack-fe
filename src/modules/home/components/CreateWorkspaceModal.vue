<script setup>
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import CalmModal from "@/components/calm/CalmModal.vue";
import CalmButton from "@/components/calm/CalmButton.vue";
import CalmInput from "@/components/calm/CalmInput.vue";
import CalmSelect from "@/components/calm/CalmSelect.vue";
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
const roleOptions = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

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
  <CalmModal
    v-model:open="isCreateWorkspaceModalOpen"
    title="Create workspace"
    :busy="createWorkspaceLoading"
  >
    <p class="create-workspace__description ui-muted">
      Create a workspace to start working with your team.
    </p>

    <form
      class="create-workspace__form"
      @submit.prevent="handleCreateWorkspace"
    >
      <CalmInput
        id="workspaceName"
        v-model="createWorkspaceForm.name"
        label="Workspace name"
        placeholder="Example: Marketing Team"
        :required="true"
        :error="createWorkspaceErrors.name"
      />

      <CalmInput
        id="workspaceDisplayName"
        v-model="createWorkspaceForm.displayName"
        label="Your display name"
        placeholder="Example: John Doe"
        :required="true"
        :error="createWorkspaceErrors.displayName"
      />

      <div class="create-workspace__section">
        <div class="create-workspace__sectionHeader">
          <h3 class="ui-h3 create-workspace__sectionTitle">Invite members</h3>
          <p class="ui-hint">
            Search and invite members (optional).
          </p>
        </div>

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
              <div class="invite-search__avatar" aria-hidden="true">
                {{ user.name.charAt(0).toUpperCase() }}
              </div>
              <div class="invite-search__info">
                <div class="invite-search__name">{{ user.name }}</div>
                <div class="invite-search__email">{{ user.email }}</div>
              </div>
            </button>
          </div>
        </div>

        <div
          v-if="invites.length > 0"
          :class="[
            'invites',
            { 'invites--scrollable': invites.length > 3 },
          ]"
        >
          <div
            v-for="(invite, index) in invites"
            :key="index"
            class="invites__row"
          >
            <div class="invites__user">
              <div class="invites__avatar" aria-hidden="true">
                {{ invite.name.charAt(0).toUpperCase() }}
              </div>
              <div class="invites__meta">
                <div class="invites__name">{{ invite.name }}</div>
                <div class="invites__email">{{ invite.email }}</div>
              </div>
            </div>

            <CalmSelect
              v-model="invite.role"
              :options="roleOptions"
              class="invites__role"
            />

            <button
              type="button"
              class="invites__remove ui-focusable"
              aria-label="Remove"
              @click="removeInvite(index)"
            >
              ×
            </button>
          </div>
        </div>

        <p
          v-if="createWorkspaceErrors.invites"
          class="create-workspace__error"
        >
          {{ createWorkspaceErrors.invites }}
        </p>
      </div>
    </form>

    <template #actions>
      <CalmButton
        variant="secondary"
        type="button"
        :disabled="createWorkspaceLoading"
        @click="closeCreateWorkspaceModal"
      >
        Cancel
      </CalmButton>
      <CalmButton
        variant="primary"
        type="submit"
        :loading="createWorkspaceLoading"
        :disabled="createWorkspaceLoading"
        @click="handleCreateWorkspace"
      >
        Create workspace
      </CalmButton>
    </template>
  </CalmModal>
</template>

<style scoped lang="scss" src="./CreateWorkspaceModal.scss"></style>


