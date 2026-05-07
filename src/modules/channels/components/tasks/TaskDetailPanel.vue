<script setup>
import { ref, watch, computed } from 'vue';
import { useTaskStore } from '@/modules/channels/stores/task.store.js';
import { useToast } from '@/composables/useToast.js';
import TaskCommentSection from './TaskCommentSection.vue';

const props = defineProps({
  task: { type: Object, required: true },
  workspaceId: { type: String, required: true },
});

const emit = defineEmits(['close']);

const taskStore = useTaskStore();
const { success } = useToast();

// Editable fields
const editingField = ref(null);
const editTitle = ref('');
const editDescription = ref('');
const editStatus = ref('');
const editPriority = ref('');
const editDueDate = ref('');
const isSaving = ref(false);

const statusOptions = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const statusLabel = computed(() => {
  const opt = statusOptions.find((o) => o.value === props.task.status);
  return opt?.label || props.task.status;
});

const priorityLabel = computed(() => {
  const opt = priorityOptions.find((o) => o.value === props.task.priority);
  return opt?.label || props.task.priority;
});

const formatDate = (date) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const startEditing = (field) => {
  editingField.value = field;
  if (field === 'title') editTitle.value = props.task.title;
  if (field === 'description') editDescription.value = props.task.description || '';
  if (field === 'status') editStatus.value = props.task.status;
  if (field === 'priority') editPriority.value = props.task.priority;
  if (field === 'dueDate') {
    if (props.task.dueDate) {
      const d = new Date(props.task.dueDate);
      editDueDate.value = d.toISOString().slice(0, 16);
    } else {
      editDueDate.value = '';
    }
  }
};

const cancelEditing = () => {
  editingField.value = null;
};

const saveField = async (field) => {
  isSaving.value = true;
  try {
    const data = {};
    if (field === 'title') data.title = editTitle.value.trim();
    if (field === 'description') data.description = editDescription.value.trim();
    if (field === 'status') data.status = editStatus.value;
    if (field === 'priority') data.priority = editPriority.value;
    if (field === 'dueDate') data.dueDate = editDueDate.value || null;

    await taskStore.updateTask(props.workspaceId, props.task.id, data);
    editingField.value = null;
    success('Task updated');
  } catch (error) {
    console.error('[TaskDetailPanel] Save failed:', error);
  } finally {
    isSaving.value = false;
  }
};

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this task?')) return;
  try {
    await taskStore.deleteTask(props.workspaceId, props.task.id, props.task.channelId);
    success('Task deleted');
    emit('close');
  } catch (error) {
    console.error('[TaskDetailPanel] Delete failed:', error);
  }
};

watch(
  () => props.task,
  () => {
    editingField.value = null;
  }
);
</script>

<template>
  <div class="task-detail-panel">
    <!-- Header -->
    <div class="task-detail-header">
      <span class="task-detail-header__title">Task Detail</span>
      <button
        type="button"
        class="task-detail-close"
        @click="emit('close')"
      >
        <i class="pi pi-times" />
      </button>
    </div>

    <div class="task-detail-body">
      <!-- Title -->
      <div class="task-detail-field">
        <div class="task-detail-field__header">
          <label class="task-detail-label">Title</label>
          <button
            v-if="editingField !== 'title'"
            type="button"
            class="task-detail-edit-btn"
            @click="startEditing('title')"
          >
            Edit
          </button>
        </div>
        <template v-if="editingField === 'title'">
          <input
            v-model="editTitle"
            type="text"
            class="task-detail-input"
            @keydown.enter="saveField('title')"
            @keydown.escape="cancelEditing"
          >
          <div class="task-detail-field__actions">
            <button
              type="button"
              class="task-btn task-btn--sm task-btn--primary"
              :disabled="isSaving"
              @click="saveField('title')"
            >
              Save
            </button>
            <button
              type="button"
              class="task-btn task-btn--sm task-btn--secondary"
              @click="cancelEditing"
            >
              Cancel
            </button>
          </div>
        </template>
        <span
          v-else
          class="task-detail-value task-detail-value--title"
        >{{ task.title }}</span>
      </div>

      <!-- Description -->
      <div class="task-detail-field">
        <div class="task-detail-field__header">
          <label class="task-detail-label">Description</label>
          <button
            v-if="editingField !== 'description'"
            type="button"
            class="task-detail-edit-btn"
            @click="startEditing('description')"
          >
            Edit
          </button>
        </div>
        <template v-if="editingField === 'description'">
          <textarea
            v-model="editDescription"
            class="task-detail-textarea"
            rows="3"
            @keydown.escape="cancelEditing"
          />
          <div class="task-detail-field__actions">
            <button
              type="button"
              class="task-btn task-btn--sm task-btn--primary"
              :disabled="isSaving"
              @click="saveField('description')"
            >
              Save
            </button>
            <button
              type="button"
              class="task-btn task-btn--sm task-btn--secondary"
              @click="cancelEditing"
            >
              Cancel
            </button>
          </div>
        </template>
        <span
          v-else
          class="task-detail-value"
        >{{ task.description || 'No description' }}</span>
      </div>

      <!-- Status -->
      <div class="task-detail-field task-detail-field--inline">
        <label class="task-detail-label">Status</label>
        <template v-if="editingField === 'status'">
          <select
            v-model="editStatus"
            class="task-detail-select"
            @change="saveField('status')"
          >
            <option
              v-for="opt in statusOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </template>
        <button
          v-else
          type="button"
          class="task-status-badge-btn"
          :class="`task-status-badge-btn--${task.status}`"
          @click="startEditing('status')"
        >
          {{ statusLabel }}
        </button>
      </div>

      <!-- Priority -->
      <div class="task-detail-field task-detail-field--inline">
        <label class="task-detail-label">Priority</label>
        <template v-if="editingField === 'priority'">
          <select
            v-model="editPriority"
            class="task-detail-select"
            @change="saveField('priority')"
          >
            <option
              v-for="opt in priorityOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </template>
        <span
          v-else
          class="task-detail-value task-detail-value--clickable"
          @click="startEditing('priority')"
        >{{ priorityLabel }}</span>
      </div>

      <!-- Due Date -->
      <div class="task-detail-field task-detail-field--inline">
        <label class="task-detail-label">Due date</label>
        <template v-if="editingField === 'dueDate'">
          <input
            v-model="editDueDate"
            type="datetime-local"
            class="task-detail-input task-detail-input--sm"
            @change="saveField('dueDate')"
            @keydown.escape="cancelEditing"
          >
        </template>
        <span
          v-else
          class="task-detail-value task-detail-value--clickable"
          @click="startEditing('dueDate')"
        >{{ formatDate(task.dueDate) }}</span>
      </div>

      <!-- Assignees -->
      <div class="task-detail-field">
        <label class="task-detail-label">Assignees</label>
        <div
          v-if="task.assignees && task.assignees.length"
          class="task-detail-assignees"
        >
          <div
            v-for="assignee in task.assignees"
            :key="assignee.id"
            class="task-detail-assignee-row"
          >
            <span class="task-assignee-avatar-sm">
              {{ (assignee.name || assignee.email || '?')[0].toUpperCase() }}
            </span>
            <span class="task-detail-assignee-name">{{ assignee.name || assignee.email }}</span>
          </div>
        </div>
        <span
          v-else
          class="task-detail-value"
        >No assignees</span>
      </div>

      <!-- Meta info -->
      <div class="task-detail-meta">
        <span>Created by {{ task.creatorName || task.creatorEmail || '—' }}</span>
        <span>{{ formatDate(task.createdAt) }}</span>
      </div>

      <TaskCommentSection
        :workspace-id="workspaceId"
        :task-id="task.id"
      />

      <!-- Delete -->
      <div class="task-detail-danger">
        <button
          type="button"
          class="task-btn-danger"
          @click="handleDelete"
        >
          <i class="pi pi-trash" />
          Delete task
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.task-detail-panel {
  flex: 0.4;
  min-width: 280px;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid var(--ui-divider);
  overflow: hidden;
}

.task-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ui-divider);
  flex-shrink: 0;

  &__title {
    font-size: 14px;
    font-weight: 700;
    color: var(--ui-text);
  }
}

.task-detail-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--gray-100);
    color: var(--ui-text);
  }
}

.task-detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-detail-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--inline {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.task-detail-field__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-detail-field__actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.task-detail-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ui-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.task-detail-edit-btn {
  border: none;
  background: transparent;
  color: #0369a1;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: #075985;
  }
}

.task-detail-value {
  font-size: 14px;
  color: var(--ui-text);
  line-height: 1.4;

  &--title {
    font-size: 16px;
    font-weight: 700;
  }

  &--clickable {
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    transition: background 0.1s;

    &:hover {
      background: var(--gray-50);
    }
  }
}

.task-detail-input,
.task-detail-textarea,
.task-detail-select {
  width: 100%;
  border: 1px solid var(--ui-divider);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 14px;
  color: var(--ui-text);
  outline: none;
  background: #fff;

  &:focus {
    border-color: var(--primary-400, #818cf8);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }
}

.task-detail-input--sm {
  width: auto;
  font-size: 13px;
  padding: 4px 8px;
}

.task-detail-textarea {
  resize: vertical;
  min-height: 50px;
}

.task-detail-select {
  cursor: pointer;
  width: auto;
  font-size: 13px;
  padding: 4px 8px;
}

.task-status-badge-btn {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: opacity 0.1s;

  &:hover {
    opacity: 0.8;
  }

  &--todo {
    background: #f1f5f9;
    color: #475569;
  }
  &--in_progress {
    background: #dbeafe;
    color: #1d4ed8;
  }
  &--done {
    background: #dcfce7;
    color: #16a34a;
  }
}

.task-detail-assignees {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-detail-assignee-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-assignee-avatar-sm {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #818cf8, #6366f1);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.task-detail-assignee-name {
  font-size: 13px;
  color: var(--ui-text);
}

.task-detail-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--ui-text-muted);
  padding-top: 8px;
  border-top: 1px solid var(--ui-divider);
}

.task-detail-danger {
  padding-top: 12px;
}

.task-btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #fecaca;
  border-radius: 7px;
  background: #fff1f2;
  color: #be123c;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover {
    background: #ffe4e6;
  }
}

.task-btn--sm {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  border-radius: 6px;
}

.task-btn--primary {
  border: none;
  background: var(--primary-600, #4f46e5);
  color: #fff;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--primary-700, #4338ca);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.task-btn--secondary {
  border: 1px solid var(--ui-divider);
  background: #fff;
  color: var(--ui-text-muted);
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: var(--gray-50);
  }
}
</style>
