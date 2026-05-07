<script setup>
import { computed, ref } from 'vue';
import { useTaskStore } from '@/modules/channels/stores/task.store.js';

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  workspaceId: { type: String, required: true },
});

const emit = defineEmits(['taskClick']);
const taskStore = useTaskStore();
const draggingTask = ref(null);

const columns = [
  { key: 'todo', label: 'Todo' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

const groupedTasks = computed(() => {
  return columns.map((column) => ({
    ...column,
    tasks: props.tasks.filter((task) => task.status === column.key),
  }));
});

const onDragStart = (task) => {
  draggingTask.value = task;
};

const onDrop = async (status) => {
  if (!draggingTask.value) return;
  const task = draggingTask.value;
  draggingTask.value = null;
  if (task.status === status) return;
  await taskStore.updateTask(props.workspaceId, task.id, { status });
};
</script>

<template>
  <div class="task-kanban">
    <section
      v-for="column in groupedTasks"
      :key="column.key"
      class="task-kanban__column"
      @dragover.prevent
      @drop.prevent="onDrop(column.key)"
    >
      <header class="task-kanban__column-header">
        <span>{{ column.label }}</span>
        <span class="task-kanban__count">{{ column.tasks.length }}</span>
      </header>
      <div class="task-kanban__cards">
        <article
          v-for="task in column.tasks"
          :key="task.id"
          class="task-kanban__card"
          draggable="true"
          @dragstart="onDragStart(task)"
          @click="emit('taskClick', task)"
        >
          <h5 class="task-kanban__title">
            {{ task.title }}
          </h5>
          <p class="task-kanban__desc">
            {{ task.description || 'No description' }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.task-kanban {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.task-kanban__column {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  min-height: 320px;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
}

.task-kanban__column-header {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
}

.task-kanban__cards {
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-kanban__card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 0.6rem;
  cursor: pointer;
}

.task-kanban__title {
  margin: 0;
  font-size: 0.9rem;
}

.task-kanban__desc {
  margin: 0.35rem 0 0;
  color: #6b7280;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-kanban__count {
  color: #6b7280;
}
</style>
