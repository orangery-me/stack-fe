<script setup>
import { ref } from 'vue';
import { useTaskStore } from '@/modules/channels/stores/task.store.js';
import { useChannelStore } from '@/modules/channels/stores/channel.store.js';
import { useToast } from '@/composables/useToast.js';

const props = defineProps({
  workspaceId: { type: String, required: true },
  taskListId: { type: String, required: true },
});

const emit = defineEmits(['close', 'created']);

const taskStore = useTaskStore();
const channelStore = useChannelStore();
const { success } = useToast();

const title = ref('');
const description = ref('');
const status = ref('todo');
const priority = ref('medium');
const dueDate = ref('');
const selectedAssignees = ref([]);
const isSubmitting = ref(false);

const channelId = channelStore.selectedChannel?.id;
const channelMembers = channelId ? channelStore.getChannelMembersById(channelId) : [];

const handleSubmit = async () => {
  if (!title.value.trim()) return;

  isSubmitting.value = true;
  try {
    const data = {
      title: title.value.trim(),
      description: description.value.trim() || undefined,
      status: status.value,
      priority: priority.value,
      dueDate: dueDate.value || undefined,
      assigneeIds: selectedAssignees.value.length
        ? selectedAssignees.value.map((m) => m.workspaceMemberId)
        : undefined,
    };

    await taskStore.createTask(props.workspaceId, props.taskListId, data);
    success('Task created successfully!');
    emit('created');
  } catch (error) {
    console.error('[TaskCreateModal] Failed to create task:', error);
  } finally {
    isSubmitting.value = false;
  }
};

const toggleAssignee = (member) => {
  const idx = selectedAssignees.value.findIndex(
    (m) => m.workspaceMemberId === member.workspaceMemberId
  );
  if (idx >= 0) {
    selectedAssignees.value.splice(idx, 1);
  } else {
    selectedAssignees.value.push(member);
  }
};

const isAssigneeSelected = (member) => {
  return selectedAssignees.value.some(
    (m) => m.workspaceMemberId === member.workspaceMemberId
  );
};
</script>

<template>
  <div
    class="task-create-overlay"
    @click.self="emit('close')"
  >
    <div class="task-create-modal">
      <div class="task-create-header">
        <h3>Create Task</h3>
        <button
          type="button"
          class="task-create-close"
          @click="emit('close')"
        >
          <i class="pi pi-times" />
        </button>
      </div>

      <form
        class="task-create-body"
        @submit.prevent="handleSubmit"
      >
        <!-- Title -->
        <div class="task-form-group">
          <label class="task-form-label">Title *</label>
          <input
            v-model="title"
            type="text"
            class="task-form-input"
            placeholder="What needs to be done?"
            maxlength="500"
            autofocus
          >
        </div>

        <!-- Description -->
        <div class="task-form-group">
          <label class="task-form-label">Description</label>
          <textarea
            v-model="description"
            class="task-form-textarea"
            placeholder="Add details..."
            rows="3"
          />
        </div>

        <!-- Status + Priority row -->
        <div class="task-form-row">
          <div class="task-form-group task-form-group--half">
            <label class="task-form-label">Status</label>
            <select
              v-model="status"
              class="task-form-select"
            >
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
          </div>
          <div class="task-form-group task-form-group--half">
            <label class="task-form-label">Priority</label>
            <select
              v-model="priority"
              class="task-form-select"
            >
              <option value="low">
                Low
              </option>
              <option value="medium">
                Medium
              </option>
              <option value="high">
                High
              </option>
              <option value="urgent">
                Urgent
              </option>
            </select>
          </div>
        </div>

        <!-- Due date -->
        <div class="task-form-group">
          <label class="task-form-label">Due date</label>
          <input
            v-model="dueDate"
            type="datetime-local"
            class="task-form-input"
          >
        </div>

        <!-- Assignees -->
        <div class="task-form-group">
          <label class="task-form-label">Assignees</label>
          <div
            v-if="channelMembers.length > 0"
            class="task-assignee-list"
          >
            <button
              v-for="member in channelMembers"
              :key="member.workspaceMemberId"
              type="button"
              class="task-assignee-chip"
              :class="{ 'task-assignee-chip--selected': isAssigneeSelected(member) }"
              @click="toggleAssignee(member)"
            >
              <span class="task-assignee-chip__avatar">
                {{ (member.name || member.email || '?')[0].toUpperCase() }}
              </span>
              <span class="task-assignee-chip__name">
                {{ member.name || member.email }}
              </span>
              <i
                v-if="isAssigneeSelected(member)"
                class="pi pi-check"
              />
            </button>
          </div>
          <span
            v-else
            class="task-form-hint"
          >No channel members loaded</span>
        </div>

        <!-- Actions -->
        <div class="task-create-actions">
          <button
            type="button"
            class="task-btn task-btn--secondary"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="task-btn task-btn--primary"
            :disabled="!title.trim() || isSubmitting"
          >
            <i
              v-if="isSubmitting"
              class="pi pi-spin pi-spinner"
            />
            Create Task
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.task-create-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-create-modal {
  width: min(520px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid var(--ui-divider);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}

.task-create-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--ui-divider);

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--ui-text);
  }
}

.task-create-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
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

.task-create-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-form-group--half {
  flex: 1;
}

.task-form-row {
  display: flex;
  gap: 12px;
}

.task-form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ui-text);
}

.task-form-input,
.task-form-textarea,
.task-form-select {
  width: 100%;
  border: 1px solid var(--ui-divider);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--ui-text);
  background: #fff;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: var(--primary-400, #818cf8);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: var(--ui-text-muted);
  }
}

.task-form-textarea {
  resize: vertical;
  min-height: 60px;
}

.task-form-select {
  cursor: pointer;
}

.task-form-hint {
  font-size: 12px;
  color: var(--ui-text-muted);
}

.task-assignee-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.task-assignee-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 4px;
  border: 1px solid var(--ui-divider);
  border-radius: 20px;
  background: #fff;
  font-size: 13px;
  color: var(--ui-text);
  cursor: pointer;
  transition: all 0.12s ease;

  &:hover {
    background: var(--gray-50);
  }

  &--selected {
    background: #eff6ff;
    border-color: var(--primary-300, #a5b4fc);
    color: var(--primary-700, #4338ca);

    i {
      font-size: 10px;
      color: var(--primary-600);
    }
  }
}

.task-assignee-chip__avatar {
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
}

.task-assignee-chip__name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--ui-divider);
}

.task-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.task-btn--secondary {
  border: 1px solid var(--ui-divider);
  background: #fff;
  color: var(--ui-text-muted);

  &:hover:not(:disabled) {
    background: var(--gray-50);
  }
}

.task-btn--primary {
  border: none;
  background: var(--primary-600, #4f46e5);
  color: #fff;

  &:hover:not(:disabled) {
    background: var(--primary-700, #4338ca);
  }
}
</style>
