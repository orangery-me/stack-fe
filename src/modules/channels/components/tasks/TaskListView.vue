<script setup>
const props = defineProps({
  tasks: { type: Array, default: () => [] },
  selectedTaskId: { type: String, default: null },
});

const emit = defineEmits(['taskClick']);

const statusLabel = (status) => {
  const map = { todo: 'Not started', in_progress: 'In progress', done: 'Done' };
  return map[status] || status;
};

const statusClass = (status) => `task-status--${status}`;

const priorityStars = (priority) => {
  const map = { low: 1, medium: 2, high: 3, urgent: 3 };
  return map[priority] || 2;
};

const priorityDots = (priority) => {
  const totalSlots = 3;
  return totalSlots - priorityStars(priority);
};

const priorityClass = (priority) => `task-priority-stars--${priority}`;

const formatDueDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const isDueDateOverdue = (date, status) => {
  if (!date || status === 'done') return false;
  return new Date(date) < new Date();
};

const truncateText = (text, max = 30) => {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
};
</script>

<template>
  <div class="task-list-table">
    <div
      v-for="task in tasks"
      :key="task.id"
      class="task-row"
      :class="{
        'task-row--selected': task.id === selectedTaskId,
        'task-row--done': task.status === 'done',
      }"
      @click="emit('taskClick', task)"
    >
      <!-- Check circle -->
      <div class="task-col task-col--check">
        <span
          class="task-check-circle"
          :class="{ 'task-check-circle--done': task.status === 'done' }"
        >
          <i
            v-if="task.status === 'done'"
            class="pi pi-check"
          />
        </span>
      </div>

      <!-- Name -->
      <div class="task-col task-col--name">
        <span class="task-row-title">{{ task.title }}</span>
      </div>

      <!-- Status -->
      <div class="task-col task-col--status">
        <span
          class="task-status-chip"
          :class="statusClass(task.status)"
        >
          {{ statusLabel(task.status) }}
        </span>
      </div>

      <!-- Priority -->
      <div class="task-col task-col--priority">
        <span
          class="task-priority-stars"
          :class="priorityClass(task.priority)"
        >
          <i
            v-for="n in priorityStars(task.priority)"
            :key="'s' + n"
            class="pi pi-star-fill task-star"
          />
          <span
            v-for="n in priorityDots(task.priority)"
            :key="'d' + n"
            class="task-star-dot"
          >•</span>
        </span>
      </div>

      <!-- Description -->
      <div class="task-col task-col--desc">
        <span class="task-row-desc">{{ truncateText(task.description) }}</span>
      </div>

      <!-- Assignee -->
      <div class="task-col task-col--assignee">
        <template v-if="task.assignees && task.assignees.length">
          <span
            v-for="assignee in task.assignees.slice(0, 2)"
            :key="assignee.id"
            class="task-avatar-sm"
            :title="assignee.name || assignee.email"
          >
            {{ (assignee.name || assignee.email || '?')[0].toUpperCase() }}
          </span>
          <span
            v-if="task.assignees.length > 2"
            class="task-avatar-more"
          >+{{ task.assignees.length - 2 }}</span>
        </template>
        <i
          v-else
          class="pi pi-user task-no-assignee-icon"
        />
      </div>

      <!-- Due Date -->
      <div class="task-col task-col--due">
        <template v-if="task.dueDate">
          <span
            class="task-due-text"
            :class="{ 'task-due-text--overdue': isDueDateOverdue(task.dueDate, task.status) }"
          >
            <i class="pi pi-calendar" />
            {{ formatDueDate(task.dueDate) }}
          </span>
        </template>
        <i
          v-else
          class="pi pi-calendar task-no-due-icon"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.task-list-table {
  display: flex;
  flex-direction: column;
}

.task-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--ui-divider);
  cursor: pointer;
  transition: background 0.1s;
  position: relative;

  &:hover {
    background: #fafbfc;
  }

  &--selected {
    background: #f0f4ff;
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--primary-500, #6366f1);
    }
  }

  &--done {
    .task-row-title {
      text-decoration: line-through;
      color: var(--ui-text-muted);
    }
  }

  &:last-child {
    border-bottom: none;
  }
}

/* ─── Columns ─── */
.task-col {
  padding: 10px 10px;
  font-size: 13px;
  color: var(--ui-text);
  display: flex;
  align-items: center;
  border-right: 1px solid var(--ui-divider);
  min-height: 40px;

  &:last-child { border-right: none; }
}

.task-col--check  { width: 36px; flex-shrink: 0; justify-content: center; padding: 10px 4px; }
.task-col--name   { flex: 1; min-width: 160px; }
.task-col--status { width: 110px; flex-shrink: 0; }
.task-col--priority { width: 100px; flex-shrink: 0; }
.task-col--desc   { width: 180px; flex-shrink: 0; }
.task-col--assignee { width: 80px; flex-shrink: 0; justify-content: center; gap: 2px; }
.task-col--due    { width: 100px; flex-shrink: 0; }

/* ─── Check circle ─── */
.task-check-circle {
  width: 18px;
  height: 18px;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;

  &--done {
    background: #16a34a;
    border-color: #16a34a;

    .pi-check {
      color: #fff;
      font-size: 10px;
    }
  }
}

/* ─── Title ─── */
.task-row-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ui-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Status chip ─── */
.task-status-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid transparent;

  &.task-status--todo {
    background: #f8fafc;
    border-color: #e2e8f0;
    color: #64748b;
  }
  &.task-status--in_progress {
    background: #ecfdf5;
    border-color: #a7f3d0;
    color: #059669;
  }
  &.task-status--done {
    background: #f0fdf4;
    border-color: #86efac;
    color: #16a34a;
  }
}

/* ─── Priority stars ─── */
.task-priority-stars {
  display: inline-flex;
  align-items: center;
  gap: 2px;

  .task-star {
    font-size: 12px;
  }

  .task-star-dot {
    font-size: 16px;
    line-height: 1;
    color: #cbd5e1;
  }

  &--low .task-star { color: #cbd5e1; }
  &--medium .task-star { color: #f59e0b; }
  &--high .task-star { color: #f59e0b; }
  &--urgent .task-star { color: #ef4444; }
}

/* ─── Description ─── */
.task-row-desc {
  font-size: 12px;
  color: var(--ui-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Assignee ─── */
.task-avatar-sm {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a5b4fc, #818cf8);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #fff;
  margin-left: -3px;
  flex-shrink: 0;

  &:first-child { margin-left: 0; }
}

.task-avatar-more {
  font-size: 10px;
  color: var(--ui-text-muted);
  margin-left: 2px;
}

.task-no-assignee-icon {
  font-size: 16px;
  color: #d1d5db;
}

/* ─── Due Date ─── */
.task-due-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--ui-text-muted);

  i { font-size: 11px; }

  &--overdue {
    color: #ef4444;
    font-weight: 600;
  }
}

.task-no-due-icon {
  font-size: 15px;
  color: #d1d5db;
}
</style>
