<script setup>
import { ref, watch, computed } from 'vue';
import { useTaskStore } from '@/modules/channels/stores/task.store.js';
import { useToast } from '@/composables/useToast.js';
import { getMessageFromApiError } from '@/helpers/api.helper.js';
import taskService from '@/services/task.service.js';
import TaskAttachmentPreviewList from './TaskAttachmentPreviewList.vue';
import TaskCanvasAttachmentPicker from './TaskCanvasAttachmentPicker.vue';
import CustomSelect from '@/components/calm/CustomSelect.vue';
import CustomDatePicker from '@/components/calm/CustomDatePicker.vue';

const props = defineProps({
  task: { type: Object, required: true },
  workspaceId: { type: String, required: true },
  /** 'drawer' = single column; 'page' = main + sidebar like Jira */
  variant: { type: String, default: 'drawer' },
});

const emit = defineEmits(['close', 'add-subtask']);

const taskStore = useTaskStore();
const { success, error: toastError } = useToast();

const editingField = ref(null);
const editDescription = ref('');
const editStatus = ref('');
const editPriority = ref('');
const editDueDate = ref('');
const isSaving = ref(false);
const isAttachBusy = ref(false);
const dragActive = ref(false);
const fileInputRef = ref(null);
const canvasPickerOpen = ref(false);

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

const reporterLine = computed(() => {
  return (
    props.task.reporterName ||
    props.task.creatorName ||
    props.task.reporterEmail ||
    props.task.creatorEmail ||
    '—'
  );
});

const subtasksSorted = computed(() => {
  const s = props.task.subtasks;
  if (!Array.isArray(s)) return [];
  return [...s].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
});

const attachmentsList = computed(() => {
  const a = props.task.attachments;
  if (!Array.isArray(a) || !a.length) return [];
  return a.slice(0, 50);
});

const canvasIdsInTask = computed(() =>
  attachmentsList.value.map((a) => a?.canvasId).filter(Boolean)
);

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
    if (field === 'description') data.description = editDescription.value.trim();
    if (field === 'status') data.status = editStatus.value;
    if (field === 'priority') data.priority = editPriority.value;
    if (field === 'dueDate') data.dueDate = editDueDate.value || null;

    await taskStore.updateTask(props.workspaceId, props.task.id, data);
    await taskStore.fetchTaskById(props.workspaceId, props.task.id);
    editingField.value = null;
    success('Task updated');
  } catch (e) {
    console.error('[TaskDetailContent] Save failed:', e);
  } finally {
    isSaving.value = false;
  }
};

const persistAttachments = async (next) => {
  isAttachBusy.value = true;
  try {
    await taskStore.updateTask(props.workspaceId, props.task.id, {
      attachments: next.slice(0, 50),
    });
    await taskStore.fetchTaskById(props.workspaceId, props.task.id);
    success('Attachments updated');
  } catch (e) {
    console.error('[TaskDetailContent] Attachments save failed:', e);
    toastError('Could not save attachments');
  } finally {
    isAttachBusy.value = false;
  }
};

const addFilesFromFileList = async (fileList) => {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const currentCount = attachmentsList.value.length;
  const slot = Math.max(0, 50 - currentCount);
  const toUpload = files.slice(0, slot);
  if (!toUpload.length) {
    toastError('Maximum 50 attachments per task.');
    return;
  }
  isAttachBusy.value = true;
  try {
    for (const file of toUpload) {
      await taskService.uploadTaskAttachment(props.workspaceId, props.task.id, file);
    }
    await taskStore.fetchTaskById(props.workspaceId, props.task.id);
    success(toUpload.length > 1 ? 'Files uploaded' : 'File uploaded');
  } catch (e) {
    console.error('[TaskDetailContent] Upload failed:', e);
    toastError(getMessageFromApiError(e.response?.data, 'Upload failed'));
  } finally {
    isAttachBusy.value = false;
  }
};

const onFileInputChange = (e) => {
  const fl = e.target?.files;
  addFilesFromFileList(fl);
  e.target.value = '';
};

const openFilePicker = () => {
  fileInputRef.value?.click?.();
};

const openCanvasPicker = () => {
  if (attachmentsList.value.length >= 50) {
    toastError('Maximum 50 attachments per task.');
    return;
  }
  canvasPickerOpen.value = true;
};

const onCanvasAttachedFromPicker = async (picked) => {
  const current = Array.isArray(props.task.attachments) ? [...props.task.attachments] : [];
  const seenCanvas = new Set(current.map((a) => a?.canvasId).filter(Boolean));
  let merged = [...current];
  let added = 0;
  for (const a of picked || []) {
    if (!a?.canvasId || seenCanvas.has(a.canvasId)) continue;
    if (merged.length >= 50) break;
    seenCanvas.add(a.canvasId);
    merged.push({
      id: a.id,
      type: 'canvas',
      name: a.name,
      canvasId: a.canvasId,
      url: a.url,
      uploadedAt: a.uploadedAt,
    });
    added += 1;
  }
  if (!added) return;
  await persistAttachments(merged);
};

const onDrop = (e) => {
  e.preventDefault();
  dragActive.value = false;
  addFilesFromFileList(e.dataTransfer?.files);
};

const onDragOver = (e) => {
  e.preventDefault();
  dragActive.value = true;
};

const onDragLeave = () => {
  dragActive.value = false;
};

const removeAttachmentByKey = async (item, index) => {
  const current = Array.isArray(props.task.attachments) ? props.task.attachments : [];
  const next = current.filter((a, i) => {
    if (item?.id != null) return a.id !== item.id;
    return i !== index;
  });
  await persistAttachments(next);
};

const handleDelete = async () => {
  const listId = props.task.taskListId;
  if (!listId) {
    alert('Missing task list id — cannot invalidate list cache cleanly.');
    return;
  }
  if (!confirm('Are you sure you want to delete this task?')) return;
  try {
    await taskStore.deleteTask(props.workspaceId, props.task.id, listId);
    success('Task deleted');
    emit('close');
  } catch (err) {
    console.error('[TaskDetailContent] Delete failed:', err);
  }
};

const openAddSubtask = () => {
  emit('add-subtask', props.task);
};

watch(
  () => props.task?.id,
  () => {
    editingField.value = null;
  }
);
</script>

<template>
  <div
    class="task-detail-content"
    :class="{ 'task-detail-content--page': variant === 'page' }"
  >
    <input
      ref="fileInputRef"
      type="file"
      class="task-attach-file-input"
      multiple
      @change="onFileInputChange"
    >

    <!-- Drawer: single column in required order -->
    <template v-if="variant === 'drawer'">
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

      <!-- Reporter -->
      <div class="task-detail-field task-detail-field--inline">
        <label class="task-detail-label">Reporter</label>
        <span class="task-detail-value">{{ reporterLine }}</span>
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

      <!-- Attachments -->
      <div class="task-detail-field">
        <div class="task-detail-field__header">
          <label class="task-detail-label">
            Attachments
            <span
              v-if="attachmentsList.length"
              class="task-attachment-count"
            >{{ attachmentsList.length }}</span>
          </label>
        </div>
        <div
          class="task-attach-dropzone"
          :class="{ 'task-attach-dropzone--active': dragActive, 'task-attach-dropzone--busy': isAttachBusy }"
          role="button"
          tabindex="0"
          @click="openFilePicker"
          @keydown.enter.prevent="openFilePicker"
          @keydown.space.prevent="openFilePicker"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
        >
          <i class="pi pi-cloud-upload task-attach-dropzone__icon" />
          <span class="task-attach-dropzone__text">
            Drop files to attach, or
            <button
              type="button"
              class="task-attach-browse"
              @click.stop="openFilePicker"
            >
              browse
            </button>, or
            <button
              type="button"
              class="task-attach-browse"
              @click.stop="openCanvasPicker"
            >
              attach canvas
            </button>.
          </span>
        </div>
        <TaskAttachmentPreviewList
          v-if="attachmentsList.length"
          :items="attachmentsList"
          :disabled="isAttachBusy"
          @remove="removeAttachmentByKey"
        />
      </div>

      <!-- Status -->
      <div class="task-detail-field task-detail-field--inline">
        <label class="task-detail-label">Status</label>
        <template v-if="editingField === 'status'">
          <CustomSelect
            v-model="editStatus"
            :options="statusOptions"
            size="sm"
            @change="saveField('status')"
          />
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

      <!-- Due Date -->
      <div class="task-detail-field task-detail-field--inline">
        <label class="task-detail-label">Due date</label>
        <template v-if="editingField === 'dueDate'">
          <CustomDatePicker
            v-model="editDueDate"
            size="sm"
            showTime
            @hide="saveField('dueDate')"
          />
        </template>
        <span
          v-else
          class="task-detail-value task-detail-value--clickable"
          @click="startEditing('dueDate')"
        >{{ formatDate(task.dueDate) }}</span>
      </div>

      <!-- Subtasks -->
      <div
        v-if="!task.parentTaskId"
        class="task-detail-field"
      >
        <div class="task-detail-field__header">
          <label class="task-detail-label">Subtasks</label>
          <button
            type="button"
            class="task-detail-edit-btn"
            @click="openAddSubtask"
          >
            Add sub-task
          </button>
        </div>
        <ul
          v-if="subtasksSorted.length"
          class="task-subtasks-list"
        >
          <li
            v-for="st in subtasksSorted"
            :key="st.id"
          >
            <span
              class="task-subtask-status"
              :data-status="st.status"
            />
            {{ st.title }}
          </li>
        </ul>
        <span
          v-else
          class="task-detail-muted"
        >No subtasks yet</span>
      </div>

      <!-- Priority (after subtasks — optional field) -->
      <div class="task-detail-field task-detail-field--inline">
        <label class="task-detail-label">Priority</label>
        <template v-if="editingField === 'priority'">
          <CustomSelect
            v-model="editPriority"
            :options="priorityOptions"
            size="sm"
            @change="saveField('priority')"
          />
        </template>
        <span
          v-else
          class="task-detail-value task-detail-value--clickable"
          @click="startEditing('priority')"
        >{{ priorityLabel }}</span>
      </div>
    </template>

    <!-- Page: two columns -->
    <template v-else>
      <div class="task-detail-page-columns">
        <div class="task-detail-page-main">
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
                rows="6"
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
            <p
              v-else
              class="task-detail-value task-detail-value--block"
            >
              {{ task.description || 'No description' }}
            </p>
          </div>

          <div class="task-detail-field">
            <div class="task-detail-field__header">
              <label class="task-detail-label">
                Attachments
                <span
                  v-if="attachmentsList.length"
                  class="task-attachment-count"
                >{{ attachmentsList.length }}</span>
              </label>
            </div>
            <div
              class="task-attach-dropzone task-attach-dropzone--lg"
              :class="{ 'task-attach-dropzone--active': dragActive, 'task-attach-dropzone--busy': isAttachBusy }"
              role="button"
              tabindex="0"
              @click="openFilePicker"
              @keydown.enter.prevent="openFilePicker"
              @keydown.space.prevent="openFilePicker"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @drop="onDrop"
            >
              <i class="pi pi-cloud-upload task-attach-dropzone__icon" />
              <span class="task-attach-dropzone__text">
                Drop files to attach, or
                <button
                  type="button"
                  class="task-attach-browse"
                  @click.stop="openFilePicker"
                >
                  browse
                </button>, or
                <button
                  type="button"
                  class="task-attach-browse"
                  @click.stop="openCanvasPicker"
                >
                  attach canvas
                </button>.
              </span>
            </div>
            <TaskAttachmentPreviewList
              v-if="attachmentsList.length"
              :items="attachmentsList"
              :disabled="isAttachBusy"
              @remove="removeAttachmentByKey"
            />
          </div>
        </div>

        <aside class="task-detail-page-aside">
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

          <div class="task-detail-field task-detail-field--inline task-detail-field--aside">
            <label class="task-detail-label">Reporter</label>
            <span class="task-detail-value">{{ reporterLine }}</span>
          </div>

          <div class="task-detail-field task-detail-field--inline task-detail-field--aside">
            <label class="task-detail-label">Status</label>
            <template v-if="editingField === 'status'">
              <CustomSelect
                v-model="editStatus"
                :options="statusOptions"
                size="sm"
                @change="saveField('status')"
              />
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

          <div class="task-detail-field task-detail-field--inline task-detail-field--aside">
            <label class="task-detail-label">Due date</label>
            <template v-if="editingField === 'dueDate'">
              <CustomDatePicker
                v-model="editDueDate"
                size="sm"
                showTime
                @hide="saveField('dueDate')"
              />
            </template>
            <span
              v-else
              class="task-detail-value task-detail-value--clickable"
              @click="startEditing('dueDate')"
            >{{ formatDate(task.dueDate) }}</span>
          </div>

          <div
            v-if="!task.parentTaskId"
            class="task-detail-field"
          >
            <div class="task-detail-field__header">
              <label class="task-detail-label">Subtasks</label>
              <button
                type="button"
                class="task-detail-edit-btn"
                @click="openAddSubtask"
              >
                Add sub-task
              </button>
            </div>
            <ul
              v-if="subtasksSorted.length"
              class="task-subtasks-list"
            >
              <li
                v-for="st in subtasksSorted"
                :key="st.id"
              >
                <span
                  class="task-subtask-status"
                  :data-status="st.status"
                />
                {{ st.title }}
              </li>
            </ul>
            <span
              v-else
              class="task-detail-muted"
            >No subtasks yet</span>
          </div>

          <div class="task-detail-field task-detail-field--inline task-detail-field--aside">
            <label class="task-detail-label">Priority</label>
            <template v-if="editingField === 'priority'">
              <CustomSelect
                v-model="editPriority"
                :options="priorityOptions"
                size="sm"
                @change="saveField('priority')"
              />
            </template>
            <span
              v-else
              class="task-detail-value task-detail-value--clickable"
              @click="startEditing('priority')"
            >{{ priorityLabel }}</span>
          </div>
        </aside>
      </div>
    </template>

    <div class="task-detail-meta">
      <span>{{ formatDate(task.createdAt) }}</span>
    </div>

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

    <TaskCanvasAttachmentPicker
      v-model:open="canvasPickerOpen"
      :workspace-id="workspaceId"
      :exclude-canvas-ids="canvasIdsInTask"
      @attach="onCanvasAttachedFromPicker"
    />
  </div>
</template>

<style scoped lang="scss">
.task-detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-detail-content--page {
  gap: 0;
}

.task-detail-page-columns {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
  align-items: flex-start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.task-detail-page-main {
  min-width: 0;
}

.task-detail-page-aside {
  border: 1px solid var(--ui-divider);
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.task-detail-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--inline {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    .task-detail-label {
      flex-shrink: 0;
      margin: 0;
    }

    .task-detail-value {
      flex: 1;
      text-align: right;
      min-width: 0;
      word-break: break-word;
    }
  }

  &--aside.task-detail-field--inline {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;

    .task-detail-label {
      margin: 0;
    }

    .task-detail-value {
      text-align: left;
      width: 100%;
    }
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: var(--ui-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.task-attachment-count {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 5px;
  background: #e5e7eb;
  color: #374151;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
}

.task-detail-muted {
  font-size: 13px;
  color: var(--ui-text-muted);
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

  &--block {
    white-space: pre-wrap;
    margin: 0;
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

.task-attach-file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.task-attach-dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 20px 14px;
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;

  &--lg {
    padding: 32px 20px;
    min-height: 120px;
  }

  &--active {
    border-color: var(--primary-500, #6366f1);
    background: #eef2ff;
  }

  &--busy {
    opacity: 0.6;
    pointer-events: none;
  }
}

.task-attach-dropzone__icon {
  font-size: 1.75rem;
  color: #94a3b8;
}

.task-attach-dropzone__text {
  font-size: 14px;
  color: #475569;
}

.task-attach-browse {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: #2563eb;
  cursor: pointer;
  text-decoration: underline;
  font-weight: 600;
}

.task-attachment-list--files {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid var(--ui-divider);
  }
}

.task-attachment-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-attachment-link {
  color: var(--primary-600, #4f46e5);
  text-decoration: none;
  word-break: break-all;
  white-space: normal;

  &:hover {
    text-decoration: underline;
  }
}

.task-attach-remove {
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;

  &:hover {
    background: #f1f5f9;
    color: #ef4444;
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

.task-attachment-type {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--primary-600, #4f46e5);
  flex-shrink: 0;
}

.task-subtasks-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;

  li {
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.task-subtask-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #cbd5e1;

  &[data-status='done'] {
    background: #16a34a;
  }

  &[data-status='in_progress'] {
    background: #3b82f6;
  }
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
  padding-top: 4px;
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
