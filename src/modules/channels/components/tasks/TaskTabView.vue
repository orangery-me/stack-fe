<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useTaskStore, TaskSortField } from '@/modules/channels/stores/task.store.js';
import { useQuery } from '@tanstack/vue-query';
import taskService from '@/services/task.service.js';
import TaskListView from './TaskListView.vue';
import TaskCreateModal from './TaskCreateModal.vue';
import TaskDetailPanel from './TaskDetailPanel.vue';
import TaskKanbanView from './TaskKanbanView.vue';
import AppLoading from '@/components/loading/AppLoading.vue';

const props = defineProps({
  taskListId: { type: String, required: true },
  workspaceId: { type: String, required: true },
  listName: { type: String, default: 'Untitled list' },
});

const emit = defineEmits(['update-name']);

const taskStore = useTaskStore();

const isCreateModalOpen = ref(false);
const statusFilter = ref('');
const searchQuery = ref('');
const showSearch = ref(false);
const viewType = ref('list');

// ─── Sorting ─────────────────────────────────────────────
const sortField = ref(TaskSortField.CREATED_AT);
const sortDirection = ref('asc');

const STATUS_ORDER = { todo: 0, in_progress: 1, done: 2 };
const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

const toggleSort = (field) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = 'asc';
  }
};

const sortIcon = (field) => {
  if (sortField.value !== field) return '';
  return sortDirection.value === 'asc' ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down';
};

// ─── Data ────────────────────────────────────────────────
const { data: rawTasks, isFetching: isLoading } = useQuery({
  queryKey: ['tasks', computed(() => props.workspaceId), computed(() => props.taskListId)],
  queryFn: () => taskService.getTasksByList(props.workspaceId, props.taskListId),
  enabled: computed(() => !!props.workspaceId && !!props.taskListId),
});

const tasks = computed(() => rawTasks.value?.tasks || []);
const selectedTask = computed(() => taskStore.selectedTask);

const filteredAndSortedTasks = computed(() => {
  let result = tasks.value;

  // Filter by status
  if (statusFilter.value) {
    result = result.filter((t) => t.status === statusFilter.value);
  }
  // Filter by search
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    result = result.filter((t) => t.title.toLowerCase().includes(q));
  }

  // Sort
  const dir = sortDirection.value === 'asc' ? 1 : -1;
  return [...result].sort((a, b) => {
    switch (sortField.value) {
      case TaskSortField.DUE_DATE:
        return dir * ((a.dueDate || '9999') > (b.dueDate || '9999') ? 1 : -1);
      case TaskSortField.STATUS:
        return dir * ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
      case TaskSortField.PRIORITY:
        return dir * ((PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
      case TaskSortField.TITLE:
        return dir * a.title.localeCompare(b.title);
      case TaskSortField.CREATED_AT:
      default:
        return dir * (new Date(a.createdAt) - new Date(b.createdAt));
    }
  });
});

// ─── Editable title ──────────────────────────────────────
const isEditingTitle = ref(false);
const editTitleValue = ref('');

const startEditTitle = () => {
  editTitleValue.value = props.listName;
  isEditingTitle.value = true;
};

const saveTitle = async () => {
  const newName = editTitleValue.value.trim();
  isEditingTitle.value = false;
  if (newName && newName !== props.listName) {
    try {
      await taskStore.updateTaskList(props.workspaceId, props.taskListId, { name: newName });
      emit('update-name', newName);
    } catch (e) {
      console.error('[TaskTabView] Failed to update name:', e);
    }
  }
};

// ─── Actions ─────────────────────────────────────────────
// Removed loadTasks as it's handled by useQuery

const handleTaskCreated = () => {
  isCreateModalOpen.value = false;
};

const handleTaskClick = (task) => {
  taskStore.selectTask(task);
};

const handleCloseDetail = () => {
  taskStore.clearSelectedTask();
};

const toggleSearch = () => {
  showSearch.value = !showSearch.value;
  if (!showSearch.value) searchQuery.value = '';
};

watch(() => props.taskListId, () => {
  taskStore.clearSelectedTask();
});
</script>

<template>
  <div class="task-tab-root">
    <!-- Header -->
    <div class="task-tab-header">
      <div class="task-tab-header-left">
        <template v-if="isEditingTitle">
          <input
            v-model="editTitleValue"
            type="text"
            class="task-tab-title-input"
            autofocus
            maxlength="255"
            @keydown.enter="saveTitle"
            @keydown.escape="isEditingTitle = false"
            @blur="saveTitle"
          >
        </template>
        <h2
          v-else
          class="task-tab-title"
          @click="startEditTitle"
        >
          {{ listName }}
        </h2>
        <p class="task-tab-desc">
          Manage and monitor tasks as a team
        </p>
      </div>
      <div class="task-tab-header-right">
        <button
          type="button"
          class="task-icon-btn"
          title="Create task"
          @click="isCreateModalOpen = true"
        >
          <i class="pi pi-plus" />
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="task-tab-toolbar">
      <div class="task-tab-toolbar-left">
        <div class="task-filter-dropdown">
          <i class="pi pi-folder" />
          <select
            v-model="statusFilter"
            class="task-filter-native-select"
          >
            <option value="">
              All items
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
          <i class="pi pi-chevron-down task-filter-chevron" />
        </div>

        <span class="task-toolbar-divider" />

        <button
          type="button"
          class="task-icon-btn"
          :class="{ 'task-icon-btn--active': showSearch }"
          title="Search"
          @click="toggleSearch"
        >
          <i class="pi pi-search" />
        </button>
        <span class="task-toolbar-divider" />
        <button
          type="button"
          class="task-icon-btn"
          :class="{ 'task-icon-btn--active': viewType === 'list' }"
          title="List view"
          @click="viewType = 'list'"
        >
          <i class="pi pi-list" />
        </button>
        <button
          type="button"
          class="task-icon-btn"
          :class="{ 'task-icon-btn--active': viewType === 'kanban' }"
          title="Kanban view"
          @click="viewType = 'kanban'"
        >
          <i class="pi pi-th-large" />
        </button>
      </div>

      <div
        v-if="showSearch"
        class="task-search-box"
      >
        <i class="pi pi-search" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search tasks..."
          class="task-search-input"
        >
        <button
          type="button"
          class="task-search-clear"
          @click="toggleSearch"
        >
          <i class="pi pi-times" />
        </button>
      </div>
    </div>

    <!-- Main body -->
    <div class="task-tab-body">
      <div
        class="task-tab-list-area"
        :class="{ 'has-detail': !!selectedTask }"
      >
        <!-- Loading overlay (non-fullscreen) -->
        <div
          v-if="isLoading"
          class="d-flex justify-content-center align-items-center task-tab-loading-overlay"
        >
          <AppLoading
            :active="true"
            variant="inline"
            min-height="220px"
          />
        </div>

        <!-- Single table group -->
        <div
          v-if="viewType === 'list'"
          class="task-group"
        >
          <!-- Table header (sortable) -->
          <div class="task-table-header">
            <div class="task-col task-col--check" />
            <div
              class="task-col task-col--name task-col--sortable"
              @click="toggleSort(TaskSortField.TITLE)"
            >
              <i class="pi pi-check-circle" />
              Task
              <i
                v-if="sortField === TaskSortField.TITLE"
                :class="sortIcon(TaskSortField.TITLE)"
                class="task-sort-icon"
              />
            </div>
            <div
              class="task-col task-col--status task-col--sortable"
              @click="toggleSort(TaskSortField.STATUS)"
            >
              Status
              <i
                v-if="sortField === TaskSortField.STATUS"
                :class="sortIcon(TaskSortField.STATUS)"
                class="task-sort-icon"
              />
            </div>
            <div
              class="task-col task-col--priority task-col--sortable"
              @click="toggleSort(TaskSortField.PRIORITY)"
            >
              Priority
              <i
                v-if="sortField === TaskSortField.PRIORITY"
                :class="sortIcon(TaskSortField.PRIORITY)"
                class="task-sort-icon"
              />
            </div>
            <div class="task-col task-col--desc">
              Description
            </div>
            <div class="task-col task-col--assignee">
              Assignee
            </div>
            <div
              class="task-col task-col--due task-col--sortable"
              @click="toggleSort(TaskSortField.DUE_DATE)"
            >
              Due Date
              <i
                v-if="sortField === TaskSortField.DUE_DATE"
                :class="sortIcon(TaskSortField.DUE_DATE)"
                class="task-sort-icon"
              />
            </div>
          </div>

          <!-- Task rows -->
          <TaskListView
            :tasks="filteredAndSortedTasks"
            :selected-task-id="selectedTask?.id"
            @task-click="handleTaskClick"
          />

          <!-- Empty state inside table -->
          <div
            v-if="filteredAndSortedTasks.length === 0 && !isLoading"
            class="task-empty-inline"
          >
            <span>No tasks yet</span>
          </div>

          <!-- Add item → opens modal -->
          <div class="task-inline-add">
            <button
              type="button"
              class="task-add-item-btn"
              @click="isCreateModalOpen = true"
            >
              <i class="pi pi-plus" />
              Add item
            </button>
          </div>
        </div>

        <div
          v-else
          class="task-group task-group--kanban"
        >
          <TaskKanbanView
            :tasks="filteredAndSortedTasks"
            :workspace-id="workspaceId"
            @task-click="handleTaskClick"
          />
        </div>
      </div>

      <!-- Detail panel -->
      <TaskDetailPanel
        v-if="selectedTask"
        :task="selectedTask"
        :workspace-id="workspaceId"
        @close="handleCloseDetail"
      />
    </div>

    <!-- Create modal -->
    <TaskCreateModal
      v-if="isCreateModalOpen"
      :workspace-id="workspaceId"
      :task-list-id="taskListId"
      @close="isCreateModalOpen = false"
      @created="handleTaskCreated"
    />
  </div>
</template>

<style scoped lang="scss">
.task-tab-root {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #fff;
}

/* ─── Header ─── */
.task-tab-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 28px 8px;
}

.task-tab-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--ui-text);
  line-height: 1.3;
  cursor: pointer;
  border-radius: 4px;
  padding: 0 4px;
  margin: 0 -4px;

  &:hover {
    background: var(--gray-50, #f8fafc);
  }
}

.task-tab-title-input {
  font-size: 20px;
  font-weight: 800;
  color: var(--ui-text);
  border: 1px solid var(--primary-300, #a5b4fc);
  border-radius: 4px;
  outline: none;
  padding: 0 4px;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  width: 300px;
}

.task-tab-desc {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--ui-text-muted);
}

/* ─── Toolbar ─── */
.task-tab-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 28px 12px;
}

.task-tab-toolbar-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-filter-dropdown {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--ui-divider);
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: var(--ui-text);
  cursor: pointer;

  .pi-folder { font-size: 13px; color: var(--ui-text-muted); }
  .task-filter-chevron { font-size: 10px; color: var(--ui-text-muted); }
}

.task-filter-native-select {
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--ui-text);
  cursor: pointer;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  padding-right: 2px;
}

.task-toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--ui-divider);
  margin: 0 4px;
}

.task-icon-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;

  i { font-size: 14px; }

  &:hover {
    background: var(--gray-100, #f1f5f9);
    color: var(--ui-text);
  }

  &--active {
    background: var(--gray-100, #f1f5f9);
    color: var(--primary-600, #4f46e5);
  }
}

.task-search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--primary-300, #a5b4fc);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.08);

  .pi-search { font-size: 13px; color: var(--ui-text-muted); }
}

.task-search-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--ui-text);
  width: 180px;

  &::placeholder { color: var(--ui-text-muted); }
}

.task-search-clear {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--ui-text-muted);
  padding: 0;
  display: inline-flex;

  i { font-size: 12px; }
  &:hover { color: var(--ui-text); }
}

/* ─── Body ─── */
.task-tab-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.task-tab-list-area {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  padding: 0 28px 20px;
  position: relative;

  &.has-detail {
    flex: 0.6;
    border-right: 1px solid var(--ui-divider);
  }
}

/* ─── Loading overlay (non-fullscreen) ─── */
.task-tab-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 8px;
}

.task-tab-loading-spinner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #fff;
  border: 1px solid var(--ui-divider);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  font-size: 13px;
  color: var(--ui-text-muted);

  i { font-size: 16px; }
}

/* ─── Table group ─── */
.task-group {
  border: 1px solid var(--ui-divider);
  border-radius: 8px;
  overflow: hidden;
}

.task-group--kanban {
  padding: 12px;
}

/* ─── Table header ─── */
.task-table-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--ui-divider);
  background: #fafafa;

  .task-col {
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ui-text-muted);
    border-right: 1px solid var(--ui-divider);
    display: flex;
    align-items: center;
    gap: 4px;
    user-select: none;

    &:last-child { border-right: none; }

    i { font-size: 12px; color: var(--ui-text-muted); }
  }

  .task-col--sortable {
    cursor: pointer;
    transition: background 0.1s;

    &:hover {
      background: #f0f0f0;
      color: var(--ui-text);
    }
  }
}

.task-sort-icon {
  font-size: 10px !important;
  color: var(--primary-500, #6366f1) !important;
}

/* ─── Column widths ─── */
.task-col--check  { width: 36px; flex-shrink: 0; justify-content: center; }
.task-col--name   { flex: 1; min-width: 160px; }
.task-col--status { width: 110px; flex-shrink: 0; }
.task-col--priority { width: 100px; flex-shrink: 0; }
.task-col--desc   { width: 180px; flex-shrink: 0; }
.task-col--assignee { width: 80px; flex-shrink: 0; justify-content: center; }
.task-col--due    { width: 100px; flex-shrink: 0; }

/* ─── Empty inline ─── */
.task-empty-inline {
  padding: 24px 14px;
  text-align: center;
  color: var(--ui-text-muted);
  font-size: 13px;
}

/* ─── Add item ─── */
.task-inline-add {
  border-top: 1px solid var(--ui-divider);
}

.task-add-item-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  border: none;
  background: transparent;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--ui-text-muted);
  cursor: pointer;
  transition: all 0.12s;

  i { font-size: 12px; }

  &:hover {
    background: var(--gray-50, #f8fafc);
    color: var(--ui-text);
  }
}
</style>
