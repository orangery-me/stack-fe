<script setup>
import { ref, watch, computed } from 'vue';
import Drawer from 'primevue/drawer';
import { useTaskStore } from '@/modules/channels/stores/task.store.js';
import { useToast } from '@/composables/useToast.js';
import TaskDetailContent from './TaskDetailContent.vue';

const props = defineProps({
  task: { type: Object, required: true },
  workspaceId: { type: String, required: true },
});

const emit = defineEmits(['close', 'add-subtask']);

const taskStore = useTaskStore();
const { success } = useToast();

const drawerVisible = ref(true);
const headerTitle = ref('');
const isTitleSaving = ref(false);

watch(drawerVisible, (v) => {
  if (!v) emit('close');
});

watch(
  () => props.task?.id,
  async (id, prev) => {
    drawerVisible.value = true;
    if (id && props.workspaceId && id !== prev) {
      try {
        await taskStore.fetchTaskById(props.workspaceId, id);
      } catch (e) {
        console.warn('[TaskDetailPanel] Refresh task failed:', e);
      }
    }
  },
  { immediate: true }
);

/** Selected task merged with store after fetch-by-id */
const task = computed(() => {
  if (taskStore.selectedTask?.id === props.task.id) {
    return taskStore.selectedTask;
  }
  return props.task;
});

watch(
  () => task.value?.title,
  (t) => {
    headerTitle.value = t || '';
  },
  { immediate: true }
);

const commitTitle = async () => {
  const next = headerTitle.value.trim();
  if (!next || next === task.value.title) return;
  isTitleSaving.value = true;
  try {
    await taskStore.updateTask(props.workspaceId, task.value.id, { title: next });
    await taskStore.fetchTaskById(props.workspaceId, task.value.id);
    success('Task updated');
  } catch (e) {
    console.error('[TaskDetailPanel] Title save failed:', e);
    headerTitle.value = task.value.title || '';
  } finally {
    isTitleSaving.value = false;
  }
};
</script>

<template>
  <Drawer
    v-model:visible="drawerVisible"
    position="right"
    class="task-detail-drawer !w-full md:!w-80 lg:!w-[30rem]"
  >
    <template #header>
      <input
        v-model="headerTitle"
        type="text"
        class="task-drawer-title-input"
        :disabled="isTitleSaving"
        maxlength="500"
        aria-label="Task title"
        placeholder="Task title"
        @blur="commitTitle"
        @keydown.enter.prevent="$event.target.blur()"
      >
    </template>

    <div class="task-detail-drawer-body">
      <TaskDetailContent
        variant="drawer"
        :task="task"
        :workspace-id="workspaceId"
        @close="emit('close')"
        @add-subtask="emit('add-subtask', $event)"
      />
    </div>
  </Drawer>
</template>

<style scoped lang="scss">
:deep(.p-drawer-content) {
  padding: 0;
}

.task-detail-drawer-body {
  padding: 0 16px 16px;
}

:deep(.p-drawer-header) {
  align-items: center;
  gap: 8px;
}

.task-drawer-title-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--ui-text);
  outline: none;
  padding: 4px 0;
  line-height: 1.35;

  &:focus {
    box-shadow: 0 1px 0 0 var(--primary-400, #818cf8);
  }

  &:disabled {
    opacity: 0.6;
  }

  &::placeholder {
    color: var(--ui-text-muted);
    font-weight: 600;
  }
}
</style>
