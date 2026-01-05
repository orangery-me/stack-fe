<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import workspaceService from '@/services/workspace.service.js';
import StarfieldButton from '@/components/StarfieldButton.vue';
import StarfieldCard from '@/components/StarfieldCard.vue';
import GlowText from '@/components/GlowText.vue';
import { useToast } from '@/composables/useToast.js';

const router = useRouter();
const route = useRoute();
const toast = useToast();

const workspaceId = route.params.id;
const workspace = ref(null);
const roles = ref([]);
const members = ref([]);

const form = ref({
  email: '',
  roleId: '',
});

const loading = ref(false);
const loadingData = ref(true);
const errors = ref({});

const fetchWorkspaceData = async () => {
  try {
    loadingData.value = true;
    const [membersData, rolesData] = await Promise.all([
      workspaceService.getWorkspaceMembers(workspaceId),
      // TODO: Fetch roles when API is available
      Promise.resolve([]),
    ]);
    members.value = membersData;
    // For now, use member roles to get available roles
    const uniqueRoles = [...new Map(membersData.map(m => [m.roleId, { id: m.roleId, name: m.roleName }])).values()];
    roles.value = uniqueRoles;
    if (roles.value.length > 0 && !form.value.roleId) {
      form.value.roleId = roles.value.find(r => r.name === 'member')?.id || roles.value[0].id;
    }
  } catch (error) {
    toast.error('Không thể tải thông tin workspace');
    router.back();
  } finally {
    loadingData.value = false;
  }
};

const validateForm = () => {
  errors.value = {};
  if (!form.value.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Email không hợp lệ';
    return false;
  }
  if (!form.value.roleId) {
    errors.value.roleId = 'Vui lòng chọn role';
    return false;
  }
  return true;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  loading.value = true;
  try {
    await workspaceService.inviteMember(workspaceId, {
      email: form.value.email,
      roleId: form.value.roleId,
    });
    toast.success('Đã gửi lời mời thành công!');
    form.value = { email: '', roleId: roles.value[0]?.id || '' };
    await fetchWorkspaceData();
  } catch (error) {
    const message = error.message || 'Không thể gửi lời mời';
    toast.error(message);
    if (error.errors) {
      errors.value = error.errors;
    }
  } finally {
    loading.value = false;
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
          ← Quay lại
        </StarfieldButton>
        <GlowText level="1" class="page-title">
          Mời thành viên
        </GlowText>
        <p class="page-description">
          Gửi lời mời để thêm thành viên vào workspace
        </p>
      </div>

      <div
        v-if="loadingData"
        class="loading-state"
      >
        <p>Đang tải...</p>
      </div>

      <div
        v-else
        class="content-grid"
      >
        <StarfieldCard class="form-card">
          <form
            @submit.prevent="handleSubmit"
            class="invite-form"
          >
            <div class="form-group">
              <label for="email">
                Email <span class="required">*</span>
              </label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                placeholder="user@example.com"
                :class="{ error: errors.email }"
              />
              <span
                v-if="errors.email"
                class="error-message"
              >
                {{ errors.email }}
              </span>
            </div>

            <div class="form-group">
              <label for="roleId">
                Vai trò <span class="required">*</span>
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
                  {{ role.name === 'owner' ? 'Owner' : role.name === 'admin' ? 'Admin' : 'Member' }}
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
                @click="goBack"
                :disabled="loading"
              >
                Hủy
              </StarfieldButton>
              <StarfieldButton
                variant="primary"
                type="submit"
                :disabled="loading"
              >
                {{ loading ? 'Đang gửi...' : 'Gửi lời mời' }}
              </StarfieldButton>
            </div>
          </form>
        </StarfieldCard>

        <StarfieldCard class="members-card">
          <h3 class="card-title">Thành viên hiện tại</h3>
          <div
            v-if="members.length === 0"
            class="empty-state"
          >
            <p>Chưa có thành viên nào</p>
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
                  <p class="member-name">{{ member.name }}</p>
                  <p class="member-email">{{ member.email }}</p>
                </div>
              </div>
              <span class="member-role">
                {{ member.roleName === 'owner' ? 'Owner' : member.roleName === 'admin' ? 'Admin' : 'Member' }}
              </span>
            </div>
          </div>
        </StarfieldCard>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.invite-member-page {
  padding: 4rem 0;
  min-height: calc(100vh - 200px);
}

.page-header {
  margin-bottom: 3rem;

  .page-title {
    margin-top: 1.5rem;
    margin-bottom: 1rem;
  }

  .page-description {
    font-size: 1.125rem;
    color: rgba(241, 245, 249, 0.7);
    font-weight: 300;
  }
}

.loading-state {
  text-align: center;
  padding: 4rem 0;
  color: rgba(241, 245, 249, 0.7);
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }
}

.form-card,
.members-card {
  .card-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.25rem;
    color: #f1f5f9;
    margin-bottom: 1.5rem;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
}

.invite-form {
  .form-group {
    margin-bottom: 2rem;

    label {
      display: block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      color: #f1f5f9;
      margin-bottom: 0.5rem;
      font-weight: 600;
      letter-spacing: 0.05em;

      .required {
        color: #b8a7ff;
      }
    }

    input,
    select {
      width: 100%;
      padding: 0.75rem 1rem;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(184, 167, 255, 0.3);
      border-radius: 2px;
      color: #f1f5f9;
      font-family: 'Merriweather', serif;
      font-size: 1rem;
      transition: all 0.3s ease;

      &:focus {
        outline: none;
        border-color: rgba(184, 167, 255, 0.6);
        box-shadow: 0 0 10px rgba(184, 167, 255, 0.2);
      }

      &.error {
        border-color: rgba(255, 82, 82, 0.5);
      }

      &::placeholder {
        color: rgba(241, 245, 249, 0.4);
      }
    }

    select {
      cursor: pointer;
    }

    .error-message {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: rgba(255, 82, 82, 0.8);
    }
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2.5rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(184, 167, 255, 0.2);
  }
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.member-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(184, 167, 255, 0.1);
  border-radius: 2px;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 2px;
  background: rgba(184, 167, 255, 0.2);
  border: 1px solid rgba(184, 167, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  color: #b8a7ff;
  font-size: 1.125rem;
}

.member-details {
  .member-name {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
    color: #f1f5f9;
    margin-bottom: 0.25rem;
  }

  .member-email {
    font-size: 0.875rem;
    color: rgba(241, 245, 249, 0.6);
  }
}

.member-role {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: rgba(184, 167, 255, 0.8);
  padding: 0.25rem 0.75rem;
  background: rgba(184, 167, 255, 0.1);
  border: 1px solid rgba(184, 167, 255, 0.2);
  border-radius: 2px;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: rgba(241, 245, 249, 0.5);
}
</style>

