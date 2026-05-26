<script setup>
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import taskService from "@/services/task.service.js";
import TaskDetailPanel from "@/modules/channels/components/tasks/TaskDetailPanel.vue";
import TaskCreateModal from "@/modules/channels/components/tasks/TaskCreateModal.vue";
import { useToast } from "@/composables/useToast.js";
import CustomSelect from "@/components/calm/CustomSelect.vue";

const props = defineProps({
  workspaceId: { type: String, required: true },
});

const { warning } = useToast();

const statusOptions = [
  { value: '', label: 'All status' },
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' }
];

const isCreateModalOpen = ref(false);
const createModalParentTaskId = ref(null);
const createModalTaskListId = ref(null);

const taskFilters = ref({
  status: "",
  channelId: "",
  dueFrom: "",
  dueTo: "",
});
const selectedTask = ref(null);

const queryTaskFilters = computed(() => {
  return Object.fromEntries(
    Object.entries(taskFilters.value).filter(([, value]) => Boolean(value))
  );
});

const { data: myTasksPayload, isLoading: myTasksLoading } = useQuery({
  queryKey: ["my-tasks", props.workspaceId, queryTaskFilters],
  queryFn: () => taskService.getMyTasks(props.workspaceId, queryTaskFilters.value),
  enabled: computed(() => Boolean(props.workspaceId)),
});

const myTasks = computed(() => myTasksPayload.value?.tasks || []);

const openCreateSubtask = (parentTask) => {
  if (!parentTask?.taskListId) {
    warning("Cannot create sub-task: missing task list. Open this task from a channel task list.");
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

const handleSubtaskCreated = () => {
  closeCreateModal();
};

const now = computed(() => new Date());
const tableOverdueFilters = ref({
  status: "",
  dueFrom: "",
  dueTo: "",
});
const tableActiveFilters = ref({
  status: "",
  monthKey: "current",
});

const isOverdueTask = (task) => {
  if (!task?.dueDate || task?.status === "done") return false;
  return new Date(task.dueDate) < now.value;
};

const parseDateValue = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;
  return new Date(value).getTime();
};

const sortedTasks = computed(() => {
  return [...myTasks.value].sort((a, b) => parseDateValue(a.dueDate) - parseDateValue(b.dueDate));
});

const overdueTasks = computed(() => sortedTasks.value.filter((task) => isOverdueTask(task)));
const inProgressTasks = computed(() =>
  sortedTasks.value.filter((task) => task.status === "in_progress")
);
const doneTasks = computed(() => sortedTasks.value.filter((task) => task.status === "done"));
const todoTasks = computed(() => sortedTasks.value.filter((task) => task.status === "todo"));

const monthLabel = computed(() => {
  return now.value.toLocaleString("en-US", { month: "long" });
});

const statusLabel = (status) => {
  const map = { todo: "To do", in_progress: "In progress", done: "Done" };
  return map[status] || "Unknown";
};

const priorityLabel = (priority) => {
  const map = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
  return map[priority] || "Medium";
};

const formatDueDate = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
};

const assigneeText = (task) => {
  if (!task?.assignees?.length) return "--";
  if (task.assignees.length === 1) {
    return task.assignees[0].name || task.assignees[0].email || "--";
  }
  return `${task.assignees.length} people`;
};

const taskCode = (task) => `TSK-${String(task.id || "").slice(0, 6).toUpperCase()}`;

const statusClass = (status) => `status-chip--${status}`;
const priorityClass = (priority) => `priority-chip--${priority || "medium"}`;

const getMonthKey = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${month}/${date.getFullYear()}`;
};

const isWithinRange = (dateValue, fromValue, toValue) => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (fromValue && date < new Date(fromValue)) return false;
  if (toValue) {
    const toDate = new Date(toValue);
    toDate.setHours(23, 59, 59, 999);
    if (date > toDate) return false;
  }
  return true;
};

const previousMonthDate = computed(() => {
  const date = new Date(now.value);
  date.setMonth(date.getMonth() - 1);
  return date;
});

const monthOptions = computed(() => {
  const baseOptions = [
    { value: "current", label: "Tháng hiện tại" },
    { value: "previous", label: "Tháng trước" },
  ];

  const dynamicMonthMap = new Map();
  sortedTasks.value.forEach((task) => {
    const dateValue = task.dueDate || task.createdAt;
    const key = getMonthKey(dateValue);
    if (!key) return;
    dynamicMonthMap.set(key, { value: key, label: `T${key}` });
  });

  return [...baseOptions, ...Array.from(dynamicMonthMap.values())];
});

const filteredOverdueTasks = computed(() => {
  return overdueTasks.value.filter((task) => {
    const statusMatch =
      !tableOverdueFilters.value.status || task.status === tableOverdueFilters.value.status;
    const dueMatch = isWithinRange(
      task.dueDate,
      tableOverdueFilters.value.dueFrom,
      tableOverdueFilters.value.dueTo
    );
    return statusMatch && dueMatch;
  });
});

const filteredAllTasks = computed(() => {
  return sortedTasks.value.filter((task) => {
    const statusMatch =
      !tableActiveFilters.value.status || task.status === tableActiveFilters.value.status;

    if (tableActiveFilters.value.monthKey === "current") {
      const currentMonthKey = getMonthKey(now.value);
      return statusMatch && getMonthKey(task.dueDate || task.createdAt) === currentMonthKey;
    }

    if (tableActiveFilters.value.monthKey === "previous") {
      const prevMonthKey = getMonthKey(previousMonthDate.value);
      return statusMatch && getMonthKey(task.dueDate || task.createdAt) === prevMonthKey;
    }

    return (
      statusMatch &&
      getMonthKey(task.dueDate || task.createdAt) === tableActiveFilters.value.monthKey
    );
  });
});
</script>

<template>
  <div class="my-tasks-content">
    <div class="my-tasks-content__body">
      <div
        v-if="myTasksLoading"
        class="my-tasks-content__loading"
      >
        Loading...
      </div>
      <template v-else>
        <div class="my-tasks-content__dashboard">
          <section class="summary-panel">
            <h3>My Tasks in {{ monthLabel }}</h3>
            <div class="summary-grid">
              <article class="summary-card">
                <p>Total tasks</p>
                <strong>{{ myTasks.length }}</strong>
              </article>
              <article class="summary-card summary-card--todo">
                <p>To do</p>
                <strong>{{ todoTasks.length }}</strong>
              </article>
              <article class="summary-card summary-card--in-progress">
                <p>In progress</p>
                <strong>{{ inProgressTasks.length }}</strong>
              </article>
              <article class="summary-card summary-card--done">
                <p>Done</p>
                <strong>{{ doneTasks.length }}</strong>
              </article>
              <article class="summary-card summary-card--overdue">
                <p>Overdue</p>
                <strong>{{ overdueTasks.length }}</strong>
              </article>
            </div>
          </section>

          <section class="table-panel">
            <div class="table-panel__header">
              <h4>Overdue / Needs Attention</h4>
              <span>{{ filteredOverdueTasks.length }} tasks</span>
            </div>
            <div class="table-panel__filters">
              <label>
                <span>Status</span>
                <CustomSelect
                  v-model="tableOverdueFilters.status"
                  :options="statusOptions"
                  size="sm"
                  width="110px"
                />
              </label>
              <label>
                <span>Due from</span>
                <input
                  v-model="tableOverdueFilters.dueFrom"
                  type="date"
                >
              </label>
              <label>
                <span>Due to</span>
                <input
                  v-model="tableOverdueFilters.dueTo"
                  type="date"
                >
              </label>
            </div>
            <div class="task-table-wrap">
              <table class="task-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="task in filteredOverdueTasks"
                    :key="`over-${task.id}`"
                    :class="{ active: selectedTask?.id === task.id }"
                    @click="selectedTask = task"
                  >
                    <td>
                      {{ taskCode(task) }}
                    </td>
                    <td class="task-title">
                      {{ task.title }}
                    </td>
                    <td>
                      <span
                        class="status-chip"
                        :class="statusClass(task.status)"
                      >{{ statusLabel(task.status) }}</span>
                    </td>
                    <td>
                      <span
                        class="priority-chip"
                        :class="priorityClass(task.priority)"
                      >{{ priorityLabel(task.priority) }}</span>
                    </td>
                    <td>{{ assigneeText(task) }}</td>
                    <td class="due-overdue">
                      {{ formatDueDate(task.dueDate) }}
                    </td>
                  </tr>
                  <tr v-if="!filteredOverdueTasks.length">
                    <td
                      colspan="6"
                      class="task-table__empty"
                    >
                      No overdue tasks.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="table-panel">
            <div class="table-panel__header">
              <h4>All Active Tasks</h4>
              <span>{{ filteredAllTasks.length }} tasks</span>
            </div>
            <div class="table-panel__filters">
              <label>
                <span>Status</span>
                <CustomSelect
                  v-model="tableActiveFilters.status"
                  :options="statusOptions"
                  size="sm"
                  width="110px"
                />
              </label>
              <label>
                <span>Thời gian</span>
                <CustomSelect
                  v-model="tableActiveFilters.monthKey"
                  :options="monthOptions"
                  size="sm"
                  width="120px"
                />
              </label>
            </div>
            <div class="task-table-wrap">
              <table class="task-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="task in filteredAllTasks"
                    :key="task.id"
                    :class="{ active: selectedTask?.id === task.id }"
                    @click="selectedTask = task"
                  >
                    <td>
                      {{ taskCode(task) }}
                    </td>
                    <td class="task-title">
                      {{ task.title }}
                    </td>
                    <td>
                      <span
                        class="status-chip"
                        :class="statusClass(task.status)"
                      >{{ statusLabel(task.status) }}</span>
                    </td>
                    <td>
                      <span
                        class="priority-chip"
                        :class="priorityClass(task.priority)"
                      >{{ priorityLabel(task.priority) }}</span>
                    </td>
                    <td>{{ assigneeText(task) }}</td>
                    <td :class="{ 'due-overdue': isOverdueTask(task) }">
                      {{ formatDueDate(task.dueDate) }}
                    </td>
                  </tr>
                  <tr v-if="!filteredAllTasks.length">
                    <td
                      colspan="6"
                      class="task-table__empty"
                    >
                      No tasks found with current filters.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <TaskDetailPanel
          v-if="selectedTask"
          :task="selectedTask"
          :workspace-id="workspaceId"
          @close="selectedTask = null"
          @add-subtask="openCreateSubtask"
        />
      </template>
    </div>

    <TaskCreateModal
      v-if="isCreateModalOpen && createModalTaskListId"
      :workspace-id="workspaceId"
      :task-list-id="createModalTaskListId"
      :parent-task-id="createModalParentTaskId"
      @close="closeCreateModal"
      @created="handleSubtaskCreated"
    />
  </div>
</template>

<style scoped lang="scss">
.my-tasks-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: var(--gray-50);
}

.my-tasks-content__filters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--ui-divider);

  select,
  input,
  button {
    height: 32px;
    border: 1px solid var(--ui-divider);
    border-radius: 6px;
    background: var(--ui-bg-surface);
    font-size: 13px;
    color: var(--ui-text);
    padding: 0 10px;
  }

  input {
    min-width: 120px;
  }
}

.my-tasks-content__messages-btn {
  margin-left: auto;
  font-weight: 600;
  color: var(--primary-500);
}

.my-tasks-content__body {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  gap: 0;
}

.my-tasks-content__dashboard {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.my-tasks-content__loading {
  padding: 16px;
  color: var(--ui-text-muted);
}

.summary-panel,
.table-panel {
  background: var(--ui-bg-surface);
  border: 1px solid var(--ui-divider);
  border-radius: 10px;
}

.summary-panel {
  padding: 14px;

  h3 {
    margin: 0 0 10px;
    font-size: 15px;
    color: var(--gray-900);
  }
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.summary-card {
  border: 1px solid var(--ui-divider);
  border-radius: 8px;
  padding: 10px;
  background: var(--gray-50);

  p {
    margin: 0;
    font-size: 12px;
    color: var(--gray-500);
  }

  strong {
    font-size: 24px;
    color: var(--gray-900);
  }
}

.summary-card--todo strong { color: var(--gray-700); }
.summary-card--in-progress strong { color: #0ea5e9; }
.summary-card--done strong { color: #16a34a; }
.summary-card--overdue strong { color: #dc2626; }

.table-panel__header {
  padding: 11px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--primary-200);
  background: linear-gradient(90deg, var(--primary-500) 0%, var(--primary-600) 100%);

  h4 {
    margin: 0;
    font-size: 14px;
    color: var(--primary-100);
    font-weight: 700;
  }

  span {
    font-size: 12px;
    color: var(--primary-100);
    font-weight: 600;
  }
}

.table-panel__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--ui-divider);
  background: var(--gray-50);

  label {
    display: flex;
    align-items: center;
    gap: 6px;

    span {
      font-size: 12px;
      color: var(--gray-700);
      font-weight: 600;
    }
  }

  select,
  input {
    height: 28px;
    border: 1px solid var(--ui-border);
    border-radius: 6px;
    background: var(--ui-bg-surface);
    color: var(--gray-900);
    font-size: 12px;
    padding: 0 8px;
  }
}

.task-table-wrap {
  overflow: auto;
}

.task-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    border-bottom: 1px solid var(--ui-divider);
    padding: 9px 10px;
    font-size: 12px;
    color: var(--gray-700);
    text-align: left;
    white-space: nowrap;
  }

  th {
    background: var(--gray-50);
    color: var(--gray-700);
    font-weight: 600;
  }

  tbody tr {
    cursor: pointer;
    transition: background 0.15s ease;
  }

  tbody tr:hover {
    background: var(--gray-50);
  }

  tbody tr.active {
    background: var(--primary-100);
  }
}

.task-title {
  font-weight: 600;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-chip,
.priority-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-weight: 600;
  font-size: 11px;
  padding: 3px 8px;
}

.status-chip--todo { background: #f1f5f9; color: #475569; }
.status-chip--in_progress { background: #ecfeff; color: #0e7490; }
.status-chip--done { background: #f0fdf4; color: #166534; }

.priority-chip--low { background: #f8fafc; color: #64748b; }
.priority-chip--medium { background: #fef3c7; color: #92400e; }
.priority-chip--high { background: #ffedd5; color: #c2410c; }
.priority-chip--urgent { background: #fee2e2; color: #b91c1c; }

.due-overdue {
  color: var(--error) !important;
  font-weight: 700;
}

.task-table__empty {
  text-align: center !important;
  color: var(--gray-300) !important;
}

@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
