<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import CalmButton from "@/components/calm/CalmButton.vue";
import CalmCard from "@/components/calm/CalmCard.vue";
import CalmHeading from "@/components/calm/CalmHeading.vue";
import CalmInput from "@/components/calm/CalmInput.vue";
import CalmSelect from "@/components/calm/CalmSelect.vue";
import { useToast } from "@/composables/useToast.js";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import AppLoading from "@/components/loading/AppLoading.vue";

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
const roleOptions = computed(() =>
  roles.value.map((r) => ({
    value: r.id,
    label:
      r.name === "owner" ? "Owner" : r.name === "admin" ? "Admin" : "Member",
  }))
);

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
  } catch {
    // Toast is shown by the global axios interceptor
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
    // Toast is shown by the global axios interceptor
    if (error?.errors) {
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
          Invite member
        </CalmHeading>
        <p class="page-description ui-muted">
          Send invitations to add members to this workspace
        </p>
      </div>

      <div
        v-if="loadingData"
        class="loading-state"
      >
        <AppLoading
          :active="true"
          variant="inline"
          label="Loading…"
          min-height="200px"
        />
      </div>

      <div
        v-else
        class="content-grid"
      >
        <CalmCard
          class="form-card"
          padding="lg"
        >
          <form
            class="invite-form"
            @submit.prevent="handleSubmit"
          >
            <CalmInput
              id="email"
              v-model="form.email"
              label="Email"
              type="email"
              placeholder="user@example.com"
              :required="true"
              :error="errors.email"
            />

            <CalmSelect
              id="roleId"
              v-model="form.roleId"
              label="Role"
              :required="true"
              :options="roleOptions"
              :error="errors.roleId"
            />

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
                Send invitation
              </CalmButton>
            </div>
          </form>
        </CalmCard>

        <CalmCard
          class="members-card"
          padding="lg"
        >
          <h3 class="ui-h3 card-title">
            Current members
          </h3>
          <div
            v-if="members.length === 0"
            class="empty-state"
          >
            <p class="ui-hint">
              No members yet
            </p>
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
        </CalmCard>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./InviteMemberView.scss"></style>
