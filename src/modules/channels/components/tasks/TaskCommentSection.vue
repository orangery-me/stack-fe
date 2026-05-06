<script setup>
import { computed, ref } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import taskService from '@/services/task.service.js';
import { useWorkspaceStore } from '@/modules/workspaces/stores/workspace.store.js';
import { useAuthStore } from '@/modules/auth/stores/auth.store.js';
import { useToast } from '@/composables/useToast.js';

const props = defineProps({
  workspaceId: { type: String, required: true },
  taskId: { type: String, required: true },
});

const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();
const queryClient = useQueryClient();
const { success } = useToast();

const newComment = ref('');
const selectedMentions = ref([]);
const editingCommentId = ref(null);
const editingContent = ref('');

const members = computed(() => workspaceStore.members || []);
const currentUserId = computed(() => authStore.user?.id || null);
const commentsQueryKey = computed(() => ['task-comments', props.workspaceId, props.taskId]);

const { data: comments = [], isLoading } = useQuery({
  queryKey: commentsQueryKey,
  queryFn: () => taskService.getTaskComments(props.workspaceId, props.taskId),
  enabled: computed(() => !!props.workspaceId && !!props.taskId),
});

const createCommentMutation = useMutation({
  mutationFn: (payload) => taskService.createTaskComment(props.workspaceId, props.taskId, payload),
  onSuccess: async () => {
    newComment.value = '';
    selectedMentions.value = [];
    await queryClient.invalidateQueries({ queryKey: commentsQueryKey.value });
    success('Comment added');
  },
});

const updateCommentMutation = useMutation({
  mutationFn: ({ commentId, payload }) =>
    taskService.updateTaskComment(props.workspaceId, props.taskId, commentId, payload),
  onSuccess: async () => {
    editingCommentId.value = null;
    editingContent.value = '';
    await queryClient.invalidateQueries({ queryKey: commentsQueryKey.value });
    success('Comment updated');
  },
});

const deleteCommentMutation = useMutation({
  mutationFn: (commentId) => taskService.deleteTaskComment(props.workspaceId, props.taskId, commentId),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: commentsQueryKey.value });
    success('Comment deleted');
  },
});

const isSubmitting = computed(
  () =>
    createCommentMutation.isPending.value ||
    updateCommentMutation.isPending.value ||
    deleteCommentMutation.isPending.value
);

const submitComment = () => {
  const content = newComment.value.trim();
  if (!content) return;
  createCommentMutation.mutate({
    content,
    mentions: selectedMentions.value,
  });
};

const startEdit = (comment) => {
  editingCommentId.value = comment.id;
  editingContent.value = comment.content;
};

const cancelEdit = () => {
  editingCommentId.value = null;
  editingContent.value = '';
};

const saveEdit = (commentId) => {
  const content = editingContent.value.trim();
  if (!content) return;
  updateCommentMutation.mutate({
    commentId,
    payload: { content },
  });
};

const handleDelete = (commentId) => {
  if (!confirm('Delete this comment?')) return;
  deleteCommentMutation.mutate(commentId);
};

const canManageComment = (comment) => {
  return !!currentUserId.value && comment.userId === currentUserId.value;
};

const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

const selectedMentionLabel = computed(() => {
  if (!selectedMentions.value.length) return 'No mentions';
  return `${selectedMentions.value.length} mentioned`;
});
</script>

<template>
  <section class="task-comments">
    <div class="task-comments__header">
      <h4 class="task-comments__title">
        Comments
      </h4>
    </div>

    <div
      v-if="isLoading"
      class="task-comments__empty"
    >
      Loading comments...
    </div>

    <div
      v-else-if="comments.length === 0"
      class="task-comments__empty"
    >
      No comments yet.
    </div>

    <div
      v-else
      class="task-comments__list"
    >
      <article
        v-for="comment in comments"
        :key="comment.id"
        class="task-comment-item"
      >
        <header class="task-comment-item__header">
          <span class="task-comment-item__author">{{ comment.authorName || 'Unknown' }}</span>
          <span class="task-comment-item__time">{{ formatTime(comment.createdAt) }}</span>
        </header>
        <div
          v-if="editingCommentId === comment.id"
          class="task-comment-item__edit"
        >
          <textarea
            v-model="editingContent"
            class="task-comments__textarea"
            rows="2"
          />
          <div class="task-comment-item__actions">
            <button
              type="button"
              class="task-btn task-btn--sm task-btn--primary"
              :disabled="isSubmitting"
              @click="saveEdit(comment.id)"
            >
              Save
            </button>
            <button
              type="button"
              class="task-btn task-btn--sm task-btn--secondary"
              @click="cancelEdit"
            >
              Cancel
            </button>
          </div>
        </div>
        <p
          v-else
          class="task-comment-item__content"
        >
          {{ comment.deletedAt ? '[deleted]' : comment.content }}
        </p>
        <div
          v-if="!comment.deletedAt && canManageComment(comment)"
          class="task-comment-item__actions"
        >
          <button
            type="button"
            class="task-detail-edit-btn"
            @click="startEdit(comment)"
          >
            Edit
          </button>
          <button
            type="button"
            class="task-detail-edit-btn task-detail-edit-btn--danger"
            @click="handleDelete(comment.id)"
          >
            Delete
          </button>
        </div>
      </article>
    </div>

    <div class="task-comments__composer">
      <textarea
        v-model="newComment"
        class="task-comments__textarea"
        rows="3"
        placeholder="Write a comment..."
      />
      <div class="task-comments__toolbar">
        <select
          v-model="selectedMentions"
          class="task-comments__mention-select"
          multiple
        >
          <option
            v-for="member in members"
            :key="member.id"
            :value="member.id"
          >
            {{ member.name || member.email }}
          </option>
        </select>
        <span class="task-comments__mention-label">{{ selectedMentionLabel }}</span>
        <button
          type="button"
          class="task-btn task-btn--sm task-btn--primary"
          :disabled="isSubmitting || !newComment.trim()"
          @click="submitComment"
        >
          Send
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.task-comments {
  margin-top: 1rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
}

.task-comments__header {
  margin-bottom: 0.75rem;
}

.task-comments__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.task-comments__empty {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.task-comments__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 260px;
  overflow: auto;
  margin-bottom: 0.75rem;
}

.task-comment-item {
  background: #f9fafb;
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
}

.task-comment-item__header {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.task-comment-item__author {
  font-weight: 600;
  font-size: 0.85rem;
}

.task-comment-item__time {
  font-size: 0.75rem;
  color: #6b7280;
}

.task-comment-item__content {
  margin: 0;
  white-space: pre-wrap;
  font-size: 0.9rem;
}

.task-comment-item__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.task-comments__composer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-comments__textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.5rem 0.6rem;
  resize: vertical;
  font-size: 0.875rem;
}

.task-comments__toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.task-comments__mention-select {
  min-width: 180px;
  max-width: 240px;
  height: 64px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.25rem;
}

.task-comments__mention-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.task-detail-edit-btn--danger {
  color: #dc2626;
}
</style>
