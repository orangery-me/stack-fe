<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import workspaceService from '@/services/workspace.service.js';
import StarfieldButton from '@/components/StarfieldButton.vue';
import StarfieldCard from '@/components/StarfieldCard.vue';
import GlowText from '@/components/GlowText.vue';
import { useToast } from '@/composables/useToast.js';

const router = useRouter();
const toast = useToast();

const form = ref({
  name: '',
  slug: '',
});

const loading = ref(false);
const errors = ref({});

const generateSlug = () => {
  if (!form.value.name) return;
  form.value.slug = form.value.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const validateForm = () => {
  errors.value = {};
  if (!form.value.name || form.value.name.length < 2) {
    errors.value.name = 'Tên workspace phải có ít nhất 2 ký tự';
    return false;
  }
  if (!form.value.slug || form.value.slug.length < 2) {
    errors.value.slug = 'Slug phải có ít nhất 2 ký tự';
    return false;
  }
  if (!/^[a-z0-9-]+$/.test(form.value.slug)) {
    errors.value.slug = 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang';
    return false;
  }
  return true;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  loading.value = true;
  try {
    const workspace = await workspaceService.createWorkspace(form.value);
    toast.success('Tạo workspace thành công!');
    router.push(`/workspaces/${workspace.id}`);
  } catch (error) {
    const message = error.message || 'Không thể tạo workspace';
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
          ← Quay lại
        </StarfieldButton>
        <GlowText level="1" class="page-title">
          Tạo workspace mới
        </GlowText>
        <p class="page-description">
          Tạo workspace để bắt đầu làm việc cùng team của bạn
        </p>
      </div>

      <StarfieldCard class="form-card">
        <form
          @submit.prevent="handleSubmit"
          class="workspace-form"
        >
          <div class="form-group">
            <label for="name">
              Tên workspace <span class="required">*</span>
            </label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              placeholder="Ví dụ: My Workspace"
              :class="{ error: errors.name }"
              @input="generateSlug"
            />
            <span
              v-if="errors.name"
              class="error-message"
            >
              {{ errors.name }}
            </span>
          </div>

          <div class="form-group">
            <label for="slug">
              Slug (URL) <span class="required">*</span>
            </label>
            <input
              id="slug"
              v-model="form.slug"
              type="text"
              placeholder="my-workspace"
              :class="{ error: errors.slug }"
            />
            <span
              v-if="errors.slug"
              class="error-message"
            >
              {{ errors.slug }}
            </span>
            <p class="help-text">
              Slug sẽ được dùng trong URL của workspace
            </p>
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
              {{ loading ? 'Đang tạo...' : 'Tạo workspace' }}
            </StarfieldButton>
          </div>
        </form>
      </StarfieldCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
.create-workspace-page {
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

.form-card {
  max-width: 600px;
  margin: 0 auto;
}

.workspace-form {
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

    input {
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

    .error-message {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: rgba(255, 82, 82, 0.8);
    }

    .help-text {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: rgba(241, 245, 249, 0.5);
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
</style>

