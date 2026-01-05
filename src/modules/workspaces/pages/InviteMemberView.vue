<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import StarfieldButton from "@/components/StarfieldButton.vue";
import StarfieldCard from "@/components/StarfieldCard.vue";
import GlowText from "@/components/GlowText.vue";
import { useToast } from "@/composables/useToast.js";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";

const router = useRouter();
const route = useRoute();
const toast = useToast();
const workspaceStore = useWorkspaceStore();

const workspaceId = route.params.id;
const roles = ref([]);
const members = computed(() => workspaceStore.members);

const form = ref({
  email: "",
  roleId: "",
});

const loading = computed(() => workspaceStore.inviteMemberLoading);
const loadingData = computed(() => workspaceStore.membersLoading);
const errors = ref({});

const fetchWorkspaceData = async () => {
  try {
    const membersData = await workspaceStore.fetchMembers(workspaceId);
    // For now, use member roles to get available roles
    const uniqueRoles = [
      ...new Map(
        membersData.map((m) => [m.roleId, { id: m.roleId, name: m.roleName }])
      ).values(),
    ];
    roles.value = uniqueRoles;
    if (roles.value.length > 0 && !form.value.roleId) {
      form.value.roleId =
        roles.value.find((r) => r.name === "member")?.id || roles.value[0].id;
    }
  } catch (error) {
    toast.error("Unable to load workspace information");
    console.error(error);
    router.back();
  }
};

const validateForm = () => {
  errors.value = {};
  if (
    !form.value.email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)
  ) {
    errors.value.email = "Invalid email address";
    return false;
  }
  if (!form.value.roleId) {
    errors.value.roleId = "Please select a role";
    return false;
  }
  return true;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  try {
    await workspaceStore.inviteMember(workspaceId, {
      email: form.value.email,
      roleId: form.value.roleId,
    });
    toast.success("Invitation sent successfully!");
    form.value = { email: "", roleId: roles.value[0]?.id || "" };
  } catch (error) {
    const message = error.message || "Unable to send invitation";
    toast.error(message);
    if (error.errors) {
      errors.value = error.errors;
    }
  }
};

const goBack = () => {
  router.back();
};

onMounted(() => {
  fetchWorkspaceData();
});
</script>

<template>
  <div class="invite-member-page">
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
          level="1"
          class="page-title"
        >
          Invite member
        </GlowText>
        <p class="page-description">
          Send invitations to add members to this workspace
        </p>
      </div>

      <div
        v-if="loadingData"
        class="loading-state"
      >
        <p>Loading...</p>
      </div>

      <div
        v-else
        class="content-grid"
      >
        <StarfieldCard class="form-card">
          <form
            class="invite-form"
            @submit.prevent="handleSubmit"
          >
            <div class="form-group">
              <label for="email"> Email <span class="required">*</span> </label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                placeholder="user@example.com"
                :class="{ error: errors.email }"
              >
              <span
                v-if="errors.email"
                class="error-message"
              >
                {{ errors.email }}
              </span>
            </div>

            <div class="form-group">
              <label for="roleId">
                Role <span class="required">*</span>
              </label>
              <select
                id="roleId"
                v-model="form.roleId"
                :class="{ error: errors.roleId }"
              >
                <option
                  v-for="role in roles"
                  :key="role.id"
                  :value="role.id"
                >
                  {{
                    role.name === "owner"
                      ? "Owner"
                      : role.name === "admin"
                        ? "Admin"
                        : "Member"
                  }}
                </option>
              </select>
              <span
                v-if="errors.roleId"
                class="error-message"
              >
                {{ errors.roleId }}
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
                {{ loading ? "Sending..." : "Send invitation" }}
              </StarfieldButton>
            </div>
          </form>
        </StarfieldCard>

        <StarfieldCard class="members-card">
          <h3 class="card-title">
            Current members
          </h3>
          <div
            v-if="members.length === 0"
            class="empty-state"
          >
            <p>No members yet</p>
          </div>
          <div
            v-else
            class="members-list"
          >
            <div
              v-for="member in members"
              :key="member.id"
              class="member-item"
            >
              <div class="member-info">
                <div class="member-avatar">
                  {{ member.name.charAt(0).toUpperCase() }}
                </div>
                <div class="member-details">
                  <p class="member-name">
                    {{ member.name }}
                  </p>
                  <p class="member-email">
                    {{ member.email }}
                  </p>
                </div>
              </div>
              <span class="member-role">
                {{
                  member.roleName === "owner"
                    ? "Owner"
                    : member.roleName === "admin"
                      ? "Admin"
                      : "Member"
                }}
              </span>
            </div>
          </div>
        </StarfieldCard>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./InviteMemberView.scss"></style>
