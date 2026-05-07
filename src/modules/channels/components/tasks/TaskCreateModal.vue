<script setup>
import { ref, onMounted, computed } from 'vue';
import { useTaskStore } from '@/modules/channels/stores/task.store.js';
import { useChannelStore } from '@/modules/channels/stores/channel.store.js';
import { useToast } from '@/composables/useToast.js';
import AutoComplete from 'primevue/autocomplete';

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
const channelMembers = computed(() => channelId ? channelStore.getChannelMembersById(channelId) : []);

const filteredAssignees = ref([]);

const searchAssignees = (event) => {
  const query = event.query.toLowerCase().trim();
  if (!query) {
    filteredAssignees.value = channelMembers.value.map(member => ({
      ...member,
      display: `${member.name || member.email} (${member.email})`
    }));
    return;
  }

  filteredAssignees.value = channelMembers.value
    .filter(member =>
      (member.name || '').toLowerCase().includes(query) ||
      (member.email || '').toLowerCase().includes(query)
    )
    .map(member => ({
      ...member,
      display: `${member.name || member.email} (${member.email})`
    }));
};

onMounted(async () => {
  if (channelId && props.workspaceId && channelMembers.value.length === 0) {
    try {
      await channelStore.fetchChannelMembers(props.workspaceId, channelId);
    } catch (e) {
      console.error('[TaskCreateModal] Failed to fetch channel members:', e);
    }
  }
});

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
          <div class="task-assignee-autocomplete">
            <AutoComplete
              v-model="selectedAssignees"
              :suggestions="filteredAssignees"
              option-label="display"
              multiple
              fluid
              @complete="searchAssignees"
            >
              <template #option="{ option }">
                <div class="task-assignee-option">
                  <span class="task-assignee-option__avatar">
                    {{ (option.name || option.email || '?')[0].toUpperCase() }}
                  </span>
                  <span class="task-assignee-option__name">
                    {{ option.name || option.email }}
                  </span>
                </div>
              </template>
            </AutoComplete>
          </div>
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

.task-assignee-autocomplete {
  :deep(.p-autocomplete-multiple-container) {
    width: 100%;
    padding: 4px 10px;
    border: 1px solid var(--ui-divider);
    border-radius: 8px;
    background: #fff;
    min-height: 38px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:not(.p-disabled):hover {
      border-color: var(--ui-divider);
    }

    &.p-focus {
      border-color: var(--primary-400, #818cf8);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
  }

  :deep(input.p-autocomplete-input) {
    font-size: 14px !important;
    font-family: inherit !important;
    color: var(--ui-text);
    padding: 4px 0 !important;
    margin: 0 !important;
    border: none;
    outline: none;
    background: transparent;
    box-shadow: none !important;

    &::placeholder {
      color: var(--ui-text-muted) !important;
      font-size: 13px !important;
    }
  }

  :deep(.p-autocomplete-token) {
    background: var(--gray-100, #f1f5f9);
    border-radius: 16px;
    padding: 2px 8px 2px 4px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
  }
}

.task-assignee-option {
  display: flex;
  align-items: center;
  gap: 10px;

  &__avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--primary-100, #e0e7ff);
    color: var(--primary-700, #4338ca);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
  }

  &__name {
    font-size: 13px;
    color: var(--ui-text);
  }
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
