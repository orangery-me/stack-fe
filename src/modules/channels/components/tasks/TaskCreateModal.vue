<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { useTaskStore } from '@/modules/channels/stores/task.store.js';
import { useChannelStore } from '@/modules/channels/stores/channel.store.js';
import { useWorkspaceStore } from '@/modules/workspaces/stores/workspace.store.js';
import { useAuthStore } from '@/modules/auth/stores/auth.store.js';
import { useToast } from '@/composables/useToast.js';
import AutoComplete from 'primevue/autocomplete';
import taskService from '@/services/task.service.js';
import { queryClient } from '@/config/queryClient.js';
import TaskAttachmentPreviewList from './TaskAttachmentPreviewList.vue';
import TaskCanvasAttachmentPicker from './TaskCanvasAttachmentPicker.vue';
import CustomSelect from '@/components/calm/CustomSelect.vue';

const props = defineProps({
  workspaceId: { type: String, required: true },
  taskListId: { type: String, required: true },
  parentTaskId: { type: String, default: null },
  parentTaskOptions: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'created']);

const taskStore = useTaskStore();
const channelStore = useChannelStore();
const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();
const { success } = useToast();

const title = ref('');
const description = ref('');
const status = ref('todo');
const priority = ref('medium');
const dueDate = ref('');
const selectedAssignees = ref([]);
const selectedReporter = ref(null);
const selectedParentTaskId = ref(props.parentTaskId || '');
const selectedFiles = ref([]);
const selectedCanvasAttachments = ref([]);
const canvasPickerOpen = ref(false);
const isSubmitting = ref(false);
const fileInputRef = ref(null);

const modalTitle = computed(() => (props.parentTaskId ? 'Create sub-task' : 'Create Task'));

const channelId = computed(() => channelStore.selectedChannel?.id || '');
const channelMembers = computed(() => (channelId.value ? channelStore.getChannelMembersById(channelId.value) : []));
const workspaceName = computed(() => {
  const detail = workspaceStore.workspaceDetail?.id === props.workspaceId ? workspaceStore.workspaceDetail : null;
  const fromList = workspaceStore.workspaces.find((workspace) => workspace.id === props.workspaceId);
  return detail?.name || fromList?.name || fromList?.workspaceName || props.workspaceId;
});
const channelName = computed(() => {
  const channel = channelStore.selectedChannel || channelStore.getChannelById(channelId.value);
  return channel?.name || channel?.metadata?.name || channel?.type || channelId.value || 'Current channel';
});
const totalPendingAttachments = computed(
  () => selectedFiles.value.length + selectedCanvasAttachments.value.length
);

const previewAttachments = computed(() => [...selectedCanvasAttachments.value, ...selectedFiles.value]);

const existingCanvasIdsForPicker = computed(() =>
  selectedCanvasAttachments.value.map((a) => a.canvasId).filter(Boolean)
);

const parentTaskChoices = computed(() => {
  return props.parentTaskOptions
    .filter((task) => task?.id && !task.parentTaskId)
    .map((task) => ({
      id: task.id,
      title: task.title || 'Untitled task',
    }));
});

const parentTaskOptionsFormatted = computed(() => {
  return [
    { value: '', label: 'No parent task' },
    ...parentTaskChoices.value.map(task => ({
      value: task.id,
      label: task.title
    }))
  ];
});

const statusOptions = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' }
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const filteredAssignees = ref([]);
const filteredReporters = ref([]);

const toMemberOption = (member) => ({
  ...member,
  display: `${member.name || member.email || 'Unknown'}${member.email ? ` (${member.email})` : ''}`,
});

const filterMembers = (query) => {
  const normalized = query.toLowerCase().trim();
  const source = normalized
    ? channelMembers.value.filter(
        (member) =>
          (member.name || '').toLowerCase().includes(normalized) ||
          (member.email || '').toLowerCase().includes(normalized)
      )
    : channelMembers.value;
  return source.map(toMemberOption);
};

const searchAssignees = (event) => {
  filteredAssignees.value = filterMembers(event.query || '');
};

const searchReporters = (event) => {
  filteredReporters.value = filterMembers(event.query || '');
};

const fillDefaultReporter = () => {
  if (selectedReporter.value || !channelMembers.value.length) return;
  const currentUser = authStore.user || {};
  const currentMember =
    channelMembers.value.find((member) => currentUser.id && member.userId === currentUser.id) ||
    channelMembers.value.find((member) => currentUser.email && member.email === currentUser.email);
  selectedReporter.value = toMemberOption(currentMember || channelMembers.value[0]);
};

const openFilePicker = () => {
  fileInputRef.value?.click?.();
};

const addFiles = (fileList) => {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const availableSlots = Math.max(0, 50 - totalPendingAttachments.value);
  const nextFiles = files.slice(0, availableSlots).map((file) => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${Math.random()}`,
    file,
    name: file.name,
    url: URL.createObjectURL(file),
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  }));
  selectedFiles.value = [...selectedFiles.value, ...nextFiles];
};

const onFileInputChange = (event) => {
  addFiles(event.target?.files);
  event.target.value = '';
};

const removeSelectedFile = (item) => {
  if (item?.type === 'canvas') {
    selectedCanvasAttachments.value = selectedCanvasAttachments.value.filter((a) => a.id !== item?.id);
    return;
  }
  if (item?.file && item?.url) URL.revokeObjectURL(item.url);
  selectedFiles.value = selectedFiles.value.filter((file) => file.id !== item?.id);
};

const onCanvasAttachedFromPicker = (attachments) => {
  const existing = new Set(selectedCanvasAttachments.value.map((a) => a.canvasId).filter(Boolean));
  let merged = [...selectedCanvasAttachments.value];
  for (const a of attachments || []) {
    if (!a?.canvasId || existing.has(a.canvasId)) continue;
    if (merged.length + selectedFiles.value.length >= 50) break;
    existing.add(a.canvasId);
    merged.push(a);
  }
  selectedCanvasAttachments.value = merged;
};

const toCreateTaskCanvasPayload = (a) => ({
  id: a.id,
  type: 'canvas',
  name: a.name,
  canvasId: a.canvasId,
  url: a.url,
  uploadedAt: a.uploadedAt,
});

const fetchModalContext = async () => {
  if (props.workspaceId && workspaceStore.workspaceDetail?.id !== props.workspaceId) {
    workspaceStore.fetchWorkspaceById(props.workspaceId).catch((e) => {
      console.error('[TaskCreateModal] Failed to fetch workspace:', e);
    });
  }
  if (channelId.value && props.workspaceId && channelMembers.value.length === 0) {
    try {
      await channelStore.fetchChannelMembers(props.workspaceId, channelId.value);
      fillDefaultReporter();
    } catch (e) {
      console.error('[TaskCreateModal] Failed to fetch channel members:', e);
    }
  }
};

onMounted(() => {
  fetchModalContext();
});

watch(channelMembers, fillDefaultReporter, { immediate: true });

watch(
  () => props.parentTaskId,
  (value) => {
    selectedParentTaskId.value = value || '';
  }
);

onUnmounted(() => {
  selectedFiles.value.forEach((item) => {
    if (item?.file && item?.url) URL.revokeObjectURL(item.url);
  });
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
      reporterWorkspaceMemberId: selectedReporter.value?.workspaceMemberId || undefined,
      parentTaskId: selectedParentTaskId.value || undefined,
    };

    if (selectedCanvasAttachments.value.length) {
      data.attachments = selectedCanvasAttachments.value.map(toCreateTaskCanvasPayload);
    }

    const createdTask = await taskStore.createTask(props.workspaceId, props.taskListId, data);
    for (const item of selectedFiles.value) {
      await taskService.uploadTaskAttachment(props.workspaceId, createdTask.id, item.file);
    }
    if (selectedFiles.value.length || selectedCanvasAttachments.value.length) {
      queryClient.invalidateQueries({ queryKey: ['tasks', props.workspaceId, props.taskListId] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks', props.workspaceId] });
    }
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
      <input
        ref="fileInputRef"
        type="file"
        class="task-create-file-input"
        multiple
        @change="onFileInputChange"
      >
      <div class="task-create-header">
        <h3>{{ modalTitle }}</h3>
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
        <!-- Workspace + Channel -->
        <div class="task-form-row">
          <div class="task-form-group task-form-group--half">
            <label class="task-form-label">Workspace</label>
            <input
              :value="workspaceName"
              type="text"
              class="task-form-input task-form-input--readonly"
              readonly
            >
          </div>
          <div class="task-form-group task-form-group--half">
            <label class="task-form-label">Channel</label>
            <input
              :value="channelName"
              type="text"
              class="task-form-input task-form-input--readonly"
              readonly
            >
          </div>
        </div>

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

        <!-- Reporter + Parent task row -->
        <div class="task-form-row">
          <div class="task-form-group task-form-group--half">
            <label class="task-form-label">Reporter</label>
            <div class="task-assignee-autocomplete">
              <AutoComplete
                v-model="selectedReporter"
                :suggestions="filteredReporters"
                option-label="display"
                dropdown
                force-selection
                fluid
                @complete="searchReporters"
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
          <div class="task-form-group task-form-group--half">
            <label class="task-form-label">Parent task</label>
            <CustomSelect
              v-model="selectedParentTaskId"
              :options="parentTaskOptionsFormatted"
              width="100%"
            />
          </div>
        </div>

        <!-- Status + Priority row -->
        <div class="task-form-row">
          <div class="task-form-group task-form-group--half">
            <label class="task-form-label">Status</label>
            <CustomSelect
              v-model="status"
              :options="statusOptions"
              width="100%"
            />
          </div>
          <div class="task-form-group task-form-group--half">
            <label class="task-form-label">Priority</label>
            <CustomSelect
              v-model="priority"
              :options="priorityOptions"
              width="100%"
            />
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

        <!-- Attachments -->
        <div class="task-form-group">
          <label class="task-form-label">Attachments</label>
          <div class="task-attach-row">
            <button
              type="button"
              class="task-attach-dropzone"
              @click="openFilePicker"
            >
              <i class="pi pi-cloud-upload" />
              <span>Choose files to upload after creating this task</span>
            </button>
            <button
              type="button"
              class="task-attach-canvas-btn"
              :disabled="isSubmitting || totalPendingAttachments >= 50"
              @click="canvasPickerOpen = true"
            >
              <img
                src="/icons/canvas/docs.svg"
                alt=""
                width="22"
                height="22"
              >
              Attach canvas
            </button>
          </div>
          <p
            v-if="totalPendingAttachments >= 50"
            class="task-form-hint"
          >
            Maximum 50 attachments per task.
          </p>
          <TaskAttachmentPreviewList
            v-if="previewAttachments.length"
            :items="previewAttachments"
            :disabled="isSubmitting"
            @remove="removeSelectedFile"
          />
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

    <TaskCanvasAttachmentPicker
      v-model:open="canvasPickerOpen"
      :workspace-id="workspaceId"
      :exclude-canvas-ids="existingCanvasIdsForPicker"
      @attach="onCanvasAttachedFromPicker"
    />
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
  width: min(760px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid var(--ui-divider);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}

.task-create-file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
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

.task-form-input--readonly {
  background: #f8fafc;
  color: #64748b;
  cursor: default;
}

.task-form-textarea {
  resize: vertical;
  min-height: 60px;
}

.task-attach-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
  flex-wrap: wrap;
}

.task-attach-dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 1;
  min-width: 200px;
  min-height: 72px;
  border: 2px dashed #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  i {
    color: #94a3b8;
    font-size: 1.4rem;
  }

  &:hover {
    border-color: var(--primary-400, #818cf8);
    background: #eef2ff;
  }
}

.task-attach-canvas-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 120px;
  padding: 10px 14px;
  border: 1px solid var(--ui-divider);
  border-radius: 10px;
  background: #fff;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  img {
    display: block;
  }

  &:hover:not(:disabled) {
    border-color: var(--primary-400, #818cf8);
    background: #eef2ff;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
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

@media (max-width: 640px) {
  .task-form-row {
    flex-direction: column;
  }
}
</style>
