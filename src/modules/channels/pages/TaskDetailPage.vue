<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useTaskStore } from '@/modules/channels/stores/task.store.js';
import TaskDetailContent from '@/modules/channels/components/tasks/TaskDetailContent.vue';
import TaskCreateModal from '@/modules/channels/components/tasks/TaskCreateModal.vue';
import { useToast } from '@/composables/useToast.js';

const route = useRoute();
const router = useRouter();
const taskStore = useTaskStore();
const { selectedTaskLoading } = storeToRefs(taskStore);
const { success, warning } = useToast();

const workspaceId = computed(() => String(route.params.workspaceId ?? ''));
const taskId = computed(() => String(route.params.taskId ?? ''));

const loadError = ref(null);

watch(
  [workspaceId, taskId],
  async () => {
    loadError.value = null;
    if (!workspaceId.value || !taskId.value) return;
    try {
      await taskStore.fetchTaskById(workspaceId.value, taskId.value);
    } catch (e) {
      console.error('[TaskDetailPage] Load failed:', e);
      loadError.value = e;
    }
  },
  { immediate: true }
);

const task = computed(() =>
  taskStore.selectedTask?.id === taskId.value ? taskStore.selectedTask : null
);

const headerTitle = ref('');
watch(
  () => task.value?.title,
  (t) => {
    headerTitle.value = t || '';
  },
  { immediate: true }
);

const isTitleSaving = ref(false);
const commitTitle = async () => {
  const next = headerTitle.value.trim();
  if (!task.value || !next || next === task.value.title) return;
  isTitleSaving.value = true;
  try {
    await taskStore.updateTask(workspaceId.value, task.value.id, { title: next });
    await taskStore.fetchTaskById(workspaceId.value, task.value.id);
    success('Task updated');
  } catch (e) {
    console.error('[TaskDetailPage] Title save failed:', e);
    headerTitle.value = task.value.title || '';
  } finally {
    isTitleSaving.value = false;
  }
};

const goWorkspace = () => {
  router.push({ name: 'workspaceDetail', params: { id: workspaceId.value } });
};

const isCreateModalOpen = ref(false);
const createModalParentTaskId = ref(null);
const createModalTaskListId = ref(null);

const openCreateSubtask = (parentTask) => {
  if (!parentTask?.taskListId) {
    warning('Cannot create sub-task: missing task list.');
    return;
  }
  createModalParentTaskId.value = parentTask.id;
  createModalTaskListId.value = parentTask.taskListId;
  isCreateModalOpen.value = true;
};

const closeCreateModal = () => {
  isCreateModalOpen.value = false;
  createModalParentTaskId.value = null;
  createModalTaskListId.value = null;
};

const onSubtaskCreated = async () => {
  closeCreateModal();
  if (workspaceId.value && taskId.value) {
    await taskStore.fetchTaskById(workspaceId.value, taskId.value);
  }
};
</script>

<template>
  <div class="task-detail-page-root">
    <header class="task-detail-page-top">
      <nav
        class="task-detail-page__crumb"
        aria-label="Breadcrumb"
      >
        <router-link :to="{ name: 'workspaceDetail', params: { id: workspaceId } }">
          Workspace
        </router-link>
        <span class="task-detail-page__crumb-sep">/</span>
        <span>Task</span>
      </nav>
      <div class="task-detail-page__toolbar">
        <button
          type="button"
          class="task-page-back"
          @click="goWorkspace"
        >
          <i class="pi pi-arrow-left" />
          Back
        </button>
      </div>
    </header>

    <div
      v-if="selectedTaskLoading && !task"
      class="task-detail-page__loading"
    >
      Loading…
    </div>
    <div
      v-else-if="loadError || !task"
      class="task-detail-page__error"
    >
      <p>Could not load this task.</p>
      <button
        type="button"
        class="task-page-back"
        @click="goWorkspace"
      >
        Return to workspace
      </button>
    </div>

    <template v-else>
      <div class="task-detail-page__title-block">
        <input
          v-model="headerTitle"
          type="text"
          class="task-page-title-input"
          :disabled="isTitleSaving"
          maxlength="500"
          aria-label="Task title"
          @blur="commitTitle"
          @keydown.enter.prevent="$event.target.blur()"
        >
      </div>

      <TaskDetailContent
        variant="page"
        :task="task"
        :workspace-id="workspaceId"
        @close="goWorkspace"
        @add-subtask="openCreateSubtask"
      />
    </template>

    <TaskCreateModal
      v-if="isCreateModalOpen && createModalTaskListId"
      :workspace-id="workspaceId"
      :task-list-id="createModalTaskListId"
      :parent-task-id="createModalParentTaskId"
      @close="closeCreateModal"
      @created="onSubtaskCreated"
    />
  </div>
</template>

<style scoped lang="scss">
.task-detail-page-root {
  min-height: 100vh;
  background: #fff;
  padding: 20px 28px 40px;
  max-width: 1100px;
  margin: 0 auto;
}

.task-detail-page-top {
  margin-bottom: 16px;
}

.task-detail-page__crumb {
  font-size: 13px;
  color: var(--ui-text-muted);
  margin-bottom: 8px;

  a {
    color: var(--primary-600, #4f46e5);
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
}

.task-detail-page__crumb-sep {
  margin: 0 6px;
}

.task-detail-page__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-page-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--ui-divider);
  background: #fff;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: #f8fafc;
  }
}

.task-detail-page__title-block {
  margin-bottom: 20px;
}

.task-page-title-input {
  width: 100%;
  border: none;
  border-bottom: 2px solid var(--ui-divider);
  font-size: 1.65rem;
  font-weight: 800;
  color: var(--ui-text);
  padding: 8px 0;
  outline: none;
  background: transparent;

  &:focus {
    border-color: var(--primary-400, #818cf8);
  }

  &:disabled {
    opacity: 0.6;
  }
}

.task-detail-page__loading,
.task-detail-page__error {
  padding: 40px;
  text-align: center;
  color: var(--ui-text-muted);
}
</style>
