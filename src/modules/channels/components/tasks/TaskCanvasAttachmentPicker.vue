<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import workspaceFilesService from '@/services/workspaceFiles.service';

const props = defineProps({
  workspaceId: { type: String, required: true },
  open: { type: Boolean, default: false },
  /** Canvas IDs already attached — hide or disable in list */
  excludeCanvasIds: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:open', 'attach']);

const router = useRouter();

const activeTab = ref('recent');
const searchQuery = ref('');
const isLoading = ref(false);
const loadError = ref('');
const recentList = ref([]);
const ownedList = ref([]);
const sharedList = ref([]);
const selectedIds = ref(new Set());

const LOCATION_ICON_MY_DOCUMENT = '/icons/canvas/my-document.svg';
const LOCATION_ICON_SHARE_WITH_ME = '/icons/canvas/share-with-me.svg';

const excludeSet = computed(() => new Set((props.excludeCanvasIds || []).filter(Boolean)));

const currentList = computed(() => {
  if (activeTab.value === 'recent') return recentList.value;
  if (activeTab.value === 'owned') return ownedList.value;
  return sharedList.value;
});

const filteredList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  let list = currentList.value.filter((doc) => doc?.id && !excludeSet.value.has(doc.id));
  if (!q) return list;
  return list.filter((doc) => {
    const title = (doc.title || '').toLowerCase();
    const ownerName = (doc.owner?.name || '').toLowerCase();
    const ownerId = (doc.ownerId || '').toLowerCase();
    return title.includes(q) || ownerName.includes(q) || ownerId.includes(q);
  });
});

const locationIconForRecentDoc = (doc) =>
  doc?.isShared ? LOCATION_ICON_SHARE_WITH_ME : LOCATION_ICON_MY_DOCUMENT;

const locationLabel = (doc) => {
  if (activeTab.value === 'owned') return 'Owned by me';
  if (activeTab.value === 'shared') return 'Shared with me';
  return doc?.isShared ? 'Shared' : 'Recent';
};

const locationIcon = (doc) => {
  if (activeTab.value === 'owned') return LOCATION_ICON_MY_DOCUMENT;
  if (activeTab.value === 'shared') return LOCATION_ICON_SHARE_WITH_ME;
  return locationIconForRecentDoc(doc);
};

const mapCanvasToAttachment = (canvas) => {
  const resolved = router.resolve({
    name: 'canvasEdit',
    params: { canvasId: canvas.id },
  });
  const url = `${window.location.origin}${resolved.href}`;
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `canvas-${canvas.id}-${Date.now()}`;
  return {
    id,
    type: 'canvas',
    name: (canvas.title || 'Untitled').slice(0, 500),
    canvasId: canvas.id,
    url,
    uploadedAt: new Date().toISOString(),
  };
};

const loadTabData = async () => {
  if (!props.workspaceId) return;
  isLoading.value = true;
  loadError.value = '';
  try {
    if (activeTab.value === 'recent') {
      recentList.value = await workspaceFilesService.getRecentCanvases(props.workspaceId);
    } else if (activeTab.value === 'owned') {
      ownedList.value = await workspaceFilesService.getMyCanvases(props.workspaceId);
    } else {
      sharedList.value = await workspaceFilesService.getSharedWithMeCanvases(props.workspaceId);
    }
  } catch {
    loadError.value = 'Failed to load canvases.';
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      selectedIds.value = new Set();
      searchQuery.value = '';
      loadTabData();
    }
  }
);

watch(activeTab, () => {
  if (props.open) loadTabData();
});

const close = () => {
  emit('update:open', false);
};

const toggleSelect = (id) => {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
};

const isSelected = (id) => selectedIds.value.has(id);

const confirmAttach = () => {
  const list = currentList.value;
  const picked = list.filter((doc) => doc?.id && selectedIds.value.has(doc.id));
  const attachments = picked.map(mapCanvasToAttachment);
  emit('attach', attachments);
  selectedIds.value = new Set();
  close();
};

const setTab = (tab) => {
  activeTab.value = tab;
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="canvas-picker-overlay"
      @click.self="close"
    >
      <div
        class="canvas-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="canvas-picker-title"
      >
        <div class="canvas-picker-header">
          <div class="canvas-picker-header-left">
            <img
              src="/icons/canvas/docs.svg"
              alt=""
              class="canvas-picker-header-icon"
              width="28"
              height="28"
            >
            <h2
              id="canvas-picker-title"
              class="canvas-picker-title"
            >
              Attach from canvas
            </h2>
          </div>
          <div class="canvas-picker-header-center">
            <i class="pi pi-search canvas-picker-search-icon" />
            <input
              v-model="searchQuery"
              type="search"
              class="canvas-picker-search"
              placeholder="Search by title or owner…"
            >
          </div>
          <button
            type="button"
            class="canvas-picker-close"
            aria-label="Close"
            @click="close"
          >
            <i class="pi pi-times" />
          </button>
        </div>

        <div class="canvas-picker-tabs">
          <button
            type="button"
            class="canvas-picker-tab"
            :class="{ active: activeTab === 'recent' }"
            @click="setTab('recent')"
          >
            Recent
          </button>
          <button
            type="button"
            class="canvas-picker-tab"
            :class="{ active: activeTab === 'owned' }"
            @click="setTab('owned')"
          >
            Owned by Me
          </button>
          <button
            type="button"
            class="canvas-picker-tab"
            :class="{ active: activeTab === 'shared' }"
            @click="setTab('shared')"
          >
            Shared With Me
          </button>
        </div>

        <div class="canvas-picker-body">
          <div
            v-if="isLoading"
            class="canvas-picker-loading"
          >
            <i class="pi pi-spin pi-spinner" />
            <span>Loading…</span>
          </div>
          <div
            v-else-if="loadError"
            class="canvas-picker-error"
          >
            {{ loadError }}
          </div>
          <div
            v-else
            class="canvas-picker-table"
          >
            <div class="canvas-picker-table-header">
              <span class="col-name">Name</span>
              <span class="col-location">Location</span>
              <span class="col-owner">Owner</span>
              <span class="col-updated">Updated</span>
            </div>
            <div class="canvas-picker-table-body">
              <button
                v-for="doc in filteredList"
                :key="doc.id"
                type="button"
                class="canvas-picker-row"
                :class="{ 'is-selected': isSelected(doc.id) }"
                @click="toggleSelect(doc.id)"
              >
                <span class="col-name">
                  <img
                    src="/icons/canvas/docs.svg"
                    alt=""
                    class="file-icon-img"
                    width="24"
                    height="24"
                  >
                  <span class="file-title">{{ doc.title || 'Untitled' }}</span>
                </span>
                <span class="col-location">
                  <img
                    :src="locationIcon(doc)"
                    alt=""
                    class="col-inline-icon"
                    width="14"
                    height="14"
                  >
                  {{ locationLabel(doc) }}
                </span>
                <span class="col-owner">
                  {{ activeTab === 'owned' ? 'You' : doc.owner?.name || doc.ownerId || '—' }}
                </span>
                <span class="col-updated">
                  {{ doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : '—' }}
                </span>
              </button>
              <div
                v-if="!filteredList.length"
                class="canvas-picker-empty"
              >
                No canvases match your search.
              </div>
            </div>
          </div>
        </div>

        <div class="canvas-picker-footer">
          <button
            type="button"
            class="files-btn"
            @click="close"
          >
            Cancel
          </button>
          <button
            type="button"
            class="files-btn files-btn-primary"
            :disabled="!selectedIds.size"
            @click="confirmAttach"
          >
            Attach{{ selectedIds.size ? ` (${selectedIds.size})` : '' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.canvas-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(15, 23, 42, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.canvas-picker-modal {
  width: min(920px, calc(100vw - 32px));
  max-height: min(720px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid var(--ui-divider);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}

.canvas-picker-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--ui-divider);
  flex-wrap: wrap;
}

.canvas-picker-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.canvas-picker-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ui-text);
}

.canvas-picker-header-center {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--ui-divider);
  border-radius: 8px;
  padding: 6px 12px;
  background: var(--gray-50, #f8fafc);
}

.canvas-picker-search-icon {
  color: var(--ui-text-muted);
  font-size: 0.9rem;
}

.canvas-picker-search {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--ui-text);
  outline: none;
  min-width: 0;

  &::placeholder {
    color: var(--ui-text-muted);
  }
}

.canvas-picker-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: var(--gray-100);
    color: var(--ui-text);
  }
}

.canvas-picker-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 20px 0;
  border-bottom: 1px solid var(--ui-divider);
  background: var(--ui-bg-page, #fafafa);
}

.canvas-picker-tab {
  border-radius: 999px;
  border: none;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  background: transparent;
  color: var(--ui-text-muted);
  margin-bottom: 8px;
  transition:
    background var(--ui-duration, 0.15s) var(--ui-ease, ease),
    color var(--ui-duration, 0.15s) var(--ui-ease, ease);

  &.active {
    background: var(--gray-100);
    color: var(--ui-text);
    font-weight: 600;
  }

  &:hover:not(.active) {
    background: var(--gray-50);
  }
}

.canvas-picker-body {
  flex: 1;
  min-height: 280px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--ui-bg-page, #fafafa);
}

.canvas-picker-loading,
.canvas-picker-error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: var(--ui-text-muted);
  font-size: 14px;
}

.canvas-picker-error {
  color: #b91c1c;
}

.canvas-picker-table {
  margin: 12px 20px 16px;
  border-radius: 8px;
  border: 1px solid var(--ui-divider);
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.canvas-picker-table-header,
.canvas-picker-row {
  display: grid;
  grid-template-columns: minmax(0, 2.6fr) minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.2fr);
  column-gap: 12px;
  align-items: center;
  padding: 10px 16px;
  font-size: 13px;
  width: 100%;
  box-sizing: border-box;
}

.canvas-picker-table-header {
  background: var(--gray-50);
  color: var(--ui-text-hint, var(--ui-text-muted));
  font-weight: 500;
}

.canvas-picker-table-body {
  max-height: 360px;
  overflow-y: auto;
}

.canvas-picker-row {
  border: none;
  border-top: 1px solid var(--ui-divider);
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition: background var(--ui-duration, 0.15s) var(--ui-ease, ease);

  &:hover {
    background: var(--gray-50);
  }

  &.is-selected {
    background: var(--primary-50);
    box-shadow: inset 0 0 0 1px var(--primary-200, #c7d2fe);
  }
}

.canvas-picker-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--ui-text-hint, var(--ui-text-muted));
  font-size: 13px;
}

.col-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.file-icon-img {
  flex-shrink: 0;
  display: block;
}

.file-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-location {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ui-text-muted);
}

.col-inline-icon {
  flex-shrink: 0;
  opacity: 0.75;
}

.col-owner,
.col-updated {
  font-size: 13px;
  color: var(--ui-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-picker-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--ui-divider);
  background: #fff;
}

.files-btn {
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 14px;
  border: 1px solid var(--ui-divider);
  background: #ffffff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background var(--ui-duration, 0.15s) var(--ui-ease, ease),
    border-color var(--ui-duration, 0.15s) var(--ui-ease, ease),
    color var(--ui-duration, 0.15s) var(--ui-ease, ease);

  &:hover:not(:disabled) {
    background: var(--gray-50);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.files-btn-primary {
  background: var(--primary-600);
  border-color: var(--primary-600);
  color: #ffffff;

  &:hover:not(:disabled) {
    background: var(--primary-500);
  }
}
</style>
