<script setup>
import { useRouter } from 'vue-router';
import {
  ATTACHMENT_PREVIEW_TYPES,
  getAttachmentIcon,
  getAttachmentPreviewType,
  getAttachmentTypeLabel,
} from './attachment-preview.helper.js';

const router = useRouter();

defineProps({
  items: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['remove']);

const attachmentKey = (item, index) => item?.id || item?.fileId || `${item?.name || 'attachment'}-${index}`;

const getPreviewMeta = (item) => {
  const type = getAttachmentPreviewType(item);
  return {
    type,
    label: getAttachmentTypeLabel(type),
    icon: getAttachmentIcon(type),
    canInlinePreview: type === ATTACHMENT_PREVIEW_TYPES.IMAGE || type === ATTACHMENT_PREVIEW_TYPES.PDF,
  };
};

const getDisplayDate = (item) => {
  const raw = item?.uploadedAt || item?.createdAt || item?.updatedAt;
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const resolveCanvasUrl = (item) => {
  if (item?.url) return item.url;
  if (!item?.canvasId) return '';
  const resolved = router.resolve({
    name: 'canvasEdit',
    params: { canvasId: item.canvasId },
  });
  return `${window.location.origin}${resolved.href}`;
};

const openAttachment = (item) => {
  const previewType = getAttachmentPreviewType(item);
  if (previewType === ATTACHMENT_PREVIEW_TYPES.CANVAS) {
    const url = resolveCanvasUrl(item);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  if (!item?.url) return;
  window.open(item.url, '_blank', 'noopener,noreferrer');
};

const isClickable = (item) => {
  const t = getAttachmentPreviewType(item);
  if (t === ATTACHMENT_PREVIEW_TYPES.CANVAS) return !!(item?.url || item?.canvasId);
  return !!item?.url;
};

const removeAttachment = (item, index) => {
  emit('remove', item, index);
};

const onCardClick = (item) => {
  if (!isClickable(item)) return;
  openAttachment(item);
};
</script>

<template>
  <div class="task-attachment-preview-grid">
    <article
      v-for="(item, index) in items"
      :key="attachmentKey(item, index)"
      class="task-attachment-preview-card"
      :class="{ 'task-attachment-preview-card--clickable': isClickable(item) }"
      @click="onCardClick(item)"
    >
      <div class="task-attachment-preview-card__media">
        <template v-if="getPreviewMeta(item).type === ATTACHMENT_PREVIEW_TYPES.CANVAS">
          <div class="task-attachment-preview-card__canvas">
            <img
              src="/icons/canvas/docs.svg"
              alt=""
              width="56"
              height="56"
            >
            <span class="task-attachment-preview-card__canvas-label">Canvas</span>
          </div>
        </template>
        <template v-else-if="getPreviewMeta(item).type === ATTACHMENT_PREVIEW_TYPES.IMAGE && item.url">
          <img
            :src="item.url"
            :alt="item.name || 'Attachment preview'"
            loading="lazy"
          >
        </template>
        <template v-else-if="getPreviewMeta(item).type === ATTACHMENT_PREVIEW_TYPES.PDF && item.url">
          <iframe
            :src="`${item.url}#toolbar=0&navpanes=0&scrollbar=0`"
            title="PDF preview"
            loading="lazy"
          />
        </template>
        <div
          v-else
          class="task-attachment-preview-card__fallback"
        >
          <i :class="getPreviewMeta(item).icon" />
          <span>{{ getPreviewMeta(item).label }}</span>
        </div>
      </div>

      <div class="task-attachment-preview-card__body">
        <div class="task-attachment-preview-card__name">
          {{ item.name || 'Untitled attachment' }}
        </div>
        <div
          v-if="getPreviewMeta(item).type === ATTACHMENT_PREVIEW_TYPES.CANVAS && getDisplayDate(item)"
          class="task-attachment-preview-card__date"
        >
          {{ getDisplayDate(item) }}
        </div>
        <div
          v-else-if="getPreviewMeta(item).type === ATTACHMENT_PREVIEW_TYPES.CANVAS"
          class="task-attachment-preview-card__date task-attachment-preview-card__date--muted"
        >
          Open in editor
        </div>
        <div
          v-else-if="getDisplayDate(item)"
          class="task-attachment-preview-card__date"
        >
          {{ getDisplayDate(item) }}
        </div>
        <div
          v-else
          class="task-attachment-preview-card__date task-attachment-preview-card__date--muted"
        >
          {{ getPreviewMeta(item).label }}
        </div>
      </div>

      <button
        type="button"
        class="task-attachment-preview-card__remove"
        title="Remove"
        :disabled="disabled"
        @click.stop="removeAttachment(item, index)"
      >
        <i class="pi pi-times" />
      </button>
    </article>
  </div>
</template>

<style scoped lang="scss">
.task-attachment-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.task-attachment-preview-card {
  position: relative;
  overflow: hidden;
  border: 1px solid #d8dee8;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
  transition:
    border-color 0.12s ease,
    box-shadow 0.12s ease,
    transform 0.12s ease;

  &--clickable {
    cursor: pointer;
  }

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.14);
    transform: translateY(-1px);

    .task-attachment-preview-card__remove {
      opacity: 1;
    }
  }
}

.task-attachment-preview-card__media {
  height: 126px;
  overflow: hidden;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;

  img,
  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }

  img {
    object-fit: cover;
  }

  iframe {
    pointer-events: none;
    background: #fff;
  }
}

.task-attachment-preview-card__canvas {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(160deg, #eef2ff 0%, #f8fafc 55%, #e0e7ff 100%);
  color: #4338ca;

  img {
    opacity: 0.95;
  }
}

.task-attachment-preview-card__canvas-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.task-attachment-preview-card__fallback {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748b;

  i {
    font-size: 2rem;
  }

  span {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
}

.task-attachment-preview-card__body {
  padding: 10px 12px 11px;
}

.task-attachment-preview-card__name {
  display: -webkit-box;
  min-height: 40px;
  overflow: hidden;
  color: #1f2937;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.task-attachment-preview-card__date {
  margin-top: 2px;
  color: #1f2937;
  font-size: 13px;
  line-height: 1.35;

  &--muted {
    color: #64748b;
  }
}

.task-attachment-preview-card__remove {
  position: absolute;
  top: 6px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #64748b;
  cursor: pointer;
  opacity: 0;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    opacity 0.12s ease;

  &:hover:not(:disabled) {
    background: #fff1f2;
    color: #e11d48;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

@media (max-width: 640px) {
  .task-attachment-preview-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .task-attachment-preview-card__media {
    height: 104px;
  }
}
</style>
