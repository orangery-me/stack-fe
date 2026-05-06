<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import taskService from '@/services/task.service.js';
import TaskListView from '@/modules/channels/components/tasks/TaskListView.vue';
import TaskDetailPanel from '@/modules/channels/components/tasks/TaskDetailPanel.vue';

const route = useRoute();
const router = useRouter();
const workspaceId = computed(() => route.params.id);

const filters = ref({
  status: '',
  channelId: '',
  dueFrom: '',
  dueTo: '',
});
const selectedTask = ref(null);

const queryFilters = computed(() => {
  return Object.fromEntries(
    Object.entries(filters.value).filter(([, value]) => Boolean(value))
  );
});

const { data: payload, isLoading, refetch } = useQuery({
  queryKey: ['my-tasks', workspaceId, queryFilters],
  queryFn: () => taskService.getMyTasks(workspaceId.value, queryFilters.value),
  enabled: computed(() => !!workspaceId.value),
});

const tasks = computed(() => payload.value?.tasks || []);

const goBackWorkspace = () => {
  router.push({ name: 'workspaceDetail', params: { id: workspaceId.value } });
};
</script>

<template>
  <div class="my-tasks-page">
    <div class="my-tasks-page__header">
      <button
        type="button"
        class="my-tasks-page__back"
        @click="goBackWorkspace"
      >
        <i class="pi pi-arrow-left" />
        Back
      </button>
      <h2>My Tasks</h2>
    </div>

    <div class="my-tasks-page__filters">
      <select v-model="filters.status">
        <option value="">
          All status
        </option>
        <option value="todo">
          Todo
        </option>
        <option value="in_progress">
          In Progress
        </option>
        <option value="done">
          Done
        </option>
      </select>
      <input
        v-model="filters.channelId"
        type="text"
        placeholder="Channel ID"
      >
      <input
        v-model="filters.dueFrom"
        type="date"
      >
      <input
        v-model="filters.dueTo"
        type="date"
      >
      <button
        type="button"
        @click="refetch"
      >
        Apply
      </button>
    </div>

    <div class="my-tasks-page__body">
      <div class="my-tasks-page__list">
        <div v-if="isLoading">
          Loading...
        </div>
        <TaskListView
          v-else
          :tasks="tasks"
          :selected-task-id="selectedTask?.id"
          @task-click="selectedTask = $event"
        />
      </div>

      <TaskDetailPanel
        v-if="selectedTask"
        :task="selectedTask"
        :workspace-id="workspaceId"
        @close="selectedTask = null"
      />
    </div>
  </div>
</template>

<style scoped>
.my-tasks-page {
  min-height: 100vh;
  background: #fff;
  padding: 1rem;
}

.my-tasks-page__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.my-tasks-page__back {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  padding: 0.35rem 0.55rem;
}

.my-tasks-page__filters {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
}

.my-tasks-page__body {
  display: flex;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.my-tasks-page__list {
  flex: 1;
  min-width: 0;
}
</style>
