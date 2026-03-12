<script setup lang="ts">
import { computed, watch, ref, onMounted, onBeforeUnmount } from "vue";
import { EditorContent, Editor } from "@tiptap/vue-3";

export type ViewerUser = {
  userId: string;
  name: string;
  avatar: string | null;
  email?: string;
  color: string;
};

const props = withDefaults(
  defineProps<{
    editor: Editor | null;
    readOnly?: boolean;
    title?: string;
    viewers?: Array<ViewerUser>;
    currentUser?: {
      userId: string;
      name: string;
      avatar: string | null;
      email?: string;
    } | null;
    saveStatus?: "saved" | "saving";
  }>(),
  {
    readOnly: false,
    title: undefined,
    viewers: undefined,
    currentUser: null,
    saveStatus: "saved",
  }
);

const emit = defineEmits<{
  edit: [];
  reload: [];
  "update:title": [value: string];
  download: [];
  moveToTrash: [];
}>();

function onTitleInput(e: Event) {
  const value = (e.target as HTMLInputElement).value;
  emit("update:title", value);
}

const editor = computed(() => props.editor);

const displaySaveStatus = computed<"saved" | "saving">(
  () => props.saveStatus ?? "saved"
);

watch(
  () => [props.editor, props.readOnly] as const,
  ([inst, readOnly]) => {
    if (inst) inst.setEditable(!readOnly);
  },
  { immediate: true }
);

const currentHeadingLabel = computed(() => {
  if (!editor.value) return "H";
  if (editor.value.isActive("heading", { level: 1 })) return "H1";
  if (editor.value.isActive("heading", { level: 2 })) return "H2";
  if (editor.value.isActive("heading", { level: 3 })) return "H3";
  return "H";
});

function setHeading(level?: 1 | 2 | 3) {
  if (!editor.value) return;
  const chain = editor.value.chain().focus();
  if (!level) chain.setParagraph().run();
  else chain.toggleHeading({ level }).run();
}

function setLink() {
  if (!editor.value) return;
  const prev = editor.value.getAttributes("link").href as string | undefined;
  const url = window.prompt("Paste link URL", prev ?? "");
  if (url === null) return;

  if (url.trim() === "") {
    editor.value.chain().focus().unsetLink().run();
    return;
  }

  editor.value
    .chain()
    .focus()
    .extendMarkRange("link")
    .setLink({ href: url.trim() })
    .run();
}

function addImageFromUrl() {
  if (!editor.value) return;
  const url = window.prompt("Image URL");
  if (!url) return;
  // TipTap extension methods (Image) – chain typed elsewhere
  (editor.value.chain().focus() as any).setImage({ src: url }).run();
}

function toggleSubscript() {
  if (!editor.value) return;
  (editor.value.chain().focus() as any).toggleSubscript().run();
}

function toggleSuperscript() {
  if (!editor.value) return;
  (editor.value.chain().focus() as any).toggleSuperscript().run();
}

function setTextAlign(align: "left" | "center" | "right" | "justify") {
  if (!editor.value) return;
  (editor.value.chain().focus() as any).setTextAlign(align).run();
}

function getUserInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

const viewersExcludingSelf = computed(() => {
  return props.viewers ?? [];
});

const visibleViewers = computed(() => {
  return viewersExcludingSelf.value.slice(0, 5);
});

const remainingViewersCount = computed(() => {
  return Math.max(0, viewersExcludingSelf.value.length - 5);
});

const selectedViewer = ref<ViewerUser | null>(null);
const viewerPopupRef = ref<HTMLElement | null>(null);
const viewerTriggerRef = ref<HTMLElement | null>(null);

const headingDetailsRef = ref<HTMLDetailsElement | null>(null);
const headingMenuOpen = ref(false);

function openViewerPopup(viewer: ViewerUser) {
  selectedViewer.value =
    selectedViewer.value?.userId === viewer.userId ? null : viewer;
}

function closeViewerPopup() {
  selectedViewer.value = null;
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node;
  if (
    selectedViewer.value &&
    viewerPopupRef.value &&
    !viewerPopupRef.value.contains(target) &&
    viewerTriggerRef.value &&
    !viewerTriggerRef.value.contains(target)
  ) {
    closeViewerPopup();
  }
  if (
    headingMenuOpen.value &&
    headingDetailsRef.value &&
    !headingDetailsRef.value.contains(target)
  ) {
    headingMenuOpen.value = false;
  }
}

const viewerPopupStyle = computed((): Record<string, string | number> => {
  if (!selectedViewer.value || !viewerTriggerRef.value) return {};

  const rect = viewerTriggerRef.value.getBoundingClientRect();
  const popupWidth = 300;
  const margin = 12;

  let left;

  // Quyết định mở trái / phải
  if (rect.left > window.innerWidth / 2) {
    // mở về bên trái
    left = rect.right - popupWidth;
  } else {
    // mở về bên phải
    left = rect.left;
  }

  // Clamp lại để không tràn viewport
  if (left + popupWidth > window.innerWidth - margin) {
    left = window.innerWidth - popupWidth - margin;
  }

  if (left < margin) {
    left = margin;
  }

  return {
    position: "fixed",
    top: `${rect.bottom + 8}px`,
    left: `${left}px`,
    zIndex: 9999,
  };
});

onMounted(() => {
  document.addEventListener("click", handleClickOutside, true);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside, true);
});
</script>

<template>
  <div class="rte" :class="{ 'rte--readonly': readOnly }">
    <div v-if="editor" class="toolbar-wrap">
      <div class="toolbar-row toolbar-row--header">
        <img
          v-if="title !== undefined"
          src="/logos/stack-logo.jpg"
          class="rte-header-logo"
          alt="Stack"
        />
        <div class="rte-header-title">
          <div class="rte-header-title-row">
            <input
              v-if="title !== undefined"
              type="text"
              class="rte-title-input"
              :value="title"
              placeholder="New page"
              @input="onTitleInput"
            />
            <div class="rte-save-status" :data-save-status="displaySaveStatus">
              <img
                v-if="displaySaveStatus === 'saving'"
                src="/icons/toolbar2/sync.svg"
                alt=""
                class="rte-save-status__sync"
                aria-hidden="true"
              />
              <svg
                v-else
                class="rte-save-status__check"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span class="rte-save-status__text">{{
                displaySaveStatus === "saving" ? "Saving..." : "Saved"
              }}</span>
            </div>
          </div>
          <!-- Dãy function: File, Insert (hàng dưới) -->
          <div class="toolbar-row toolbar-row--menu">
            <details class="dd dd-menu-item">
              <summary class="dd-btn dd-btn--menu">File</summary>
              <div class="dd-menu">
                <button type="button" @click="emit('download')">
                  Download
                </button>
                <button type="button" @click="emit('moveToTrash')">
                  Move to trash
                </button>
              </div>
            </details>
            <details
              class="dd dd-menu-item"
              :class="{ 'dd-disabled': readOnly }"
              :aria-disabled="readOnly ? 'true' : 'false'"
            >
              <summary class="dd-btn dd-btn--menu">Insert</summary>
              <div class="dd-menu">
                <button
                  type="button"
                  :disabled="readOnly"
                  @click="addImageFromUrl"
                >
                  Image (URL)
                </button>
                <button
                  type="button"
                  :disabled="readOnly"
                  @click="editor?.chain().focus().setHorizontalRule().run()"
                >
                  Divider
                </button>
                <button
                  type="button"
                  :disabled="readOnly"
                  @click="editor?.chain().focus().toggleCodeBlock().run()"
                >
                  Code block
                </button>
              </div>
            </details>
          </div>
        </div>
        <div class="spacer" />
        <!-- Viewers list -->
        <div
          v-if="viewersExcludingSelf.length > 0"
          ref="viewerTriggerRef"
          class="rte-viewers"
        >
          <div
            v-for="viewer in visibleViewers"
            :key="viewer.userId"
            class="rte-viewer-avatar"
            :class="{
              'rte-viewer-avatar--selected':
                selectedViewer?.userId === viewer.userId,
            }"
            :title="viewer.name"
            :style="{ '--viewer-color': viewer.color || 'var(--primary-500)' }"
            @click.stop="openViewerPopup(viewer)"
          >
            <img
              v-if="viewer.avatar"
              :src="viewer.avatar"
              :alt="viewer.name"
              class="rte-viewer-avatar-img"
            />
            <span v-else>{{ getUserInitials(viewer.name) }}</span>
          </div>
          <div
            v-if="remainingViewersCount > 0"
            class="rte-viewer-avatar rte-viewer-avatar--more"
            :title="`${remainingViewersCount} more viewer${
              remainingViewersCount > 1 ? 's' : ''
            }`"
          >
            +{{ remainingViewersCount }}
          </div>
          <!-- Viewer info popup -->
          <Teleport to="body">
            <div
              v-if="selectedViewer"
              ref="viewerPopupRef"
              class="rte-viewer-popup"
              :style="viewerPopupStyle"
            >
              <div class="rte-viewer-popup__card">
                <div class="rte-viewer-popup__main">
                  <div class="rte-viewer-popup__avatar-wrap">
                    <img
                      v-if="selectedViewer.avatar"
                      :src="selectedViewer.avatar"
                      :alt="selectedViewer.name"
                      class="rte-viewer-popup__avatar"
                    />
                    <span
                      v-else
                      class="rte-viewer-popup__avatar rte-viewer-popup__avatar-initials"
                      >{{ getUserInitials(selectedViewer.name) }}</span
                    >
                  </div>
                  <div class="rte-viewer-popup__info">
                    <div class="rte-viewer-popup__name-row">
                      <span class="rte-viewer-popup__name">{{
                        selectedViewer.name
                      }}</span>
                      <button
                        type="button"
                        class="rte-viewer-popup__add-person"
                        title="Thêm người"
                        aria-label="Thêm người"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" y1="8" x2="19" y2="14" />
                          <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                      </button>
                    </div>
                    <p class="rte-viewer-popup__email">
                      {{ selectedViewer.email || "—" }}
                    </p>
                    <button type="button" class="rte-viewer-popup__btn-mail">
                      <img
                        src="/icons/mail.svg"
                        alt=""
                        class="rte-viewer-popup__btn-icon"
                      />
                      Gửi thư
                    </button>
                    <div class="rte-viewer-popup__actions">
                      <button
                        type="button"
                        class="rte-viewer-popup__action-btn"
                        title="Nhắn tin"
                        aria-label="Nhắn tin"
                      >
                        <img
                          src="/icons/message-circle-dot.svg"
                          alt=""
                          width="18"
                          height="18"
                        />
                      </button>
                      <button
                        type="button"
                        class="rte-viewer-popup__action-btn"
                        title="Gọi video"
                        aria-label="Gọi video"
                      >
                        <img
                          src="/icons/meeting.svg"
                          alt=""
                          width="18"
                          height="18"
                        />
                      </button>
                      <button
                        type="button"
                        class="rte-viewer-popup__action-btn"
                        title="Lịch"
                        aria-label="Lịch"
                      >
                        <img
                          src="/icons/calendar.svg"
                          alt=""
                          width="18"
                          height="18"
                        />
                      </button>
                    </div>
                    <a
                      href="#"
                      class="rte-viewer-popup__detail-link"
                      @click.prevent
                    >
                      Mở chế độ xem chi tiết
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                        />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Teleport>
        </div>
        <!-- Header actions: History, Comment, Share, Sparkle (between viewers and current user) -->
        <div class="rte-header-actions">
          <button
            type="button"
            class="rte-header-action-btn"
            title="Lịch sử"
            aria-label="Lịch sử"
          >
            <img
              src="/icons/toolbar2/history.svg"
              alt=""
              class="rte-header-action-icon"
            />
          </button>
          <button
            type="button"
            class="rte-header-action-btn"
            title="Bình luận"
            aria-label="Bình luận"
          >
            <img
              src="/icons/toolbar2/comment.svg"
              alt=""
              class="rte-header-action-icon rte-header-action-icon--comment"
            />
          </button>
          <details class="rte-share-wrap">
            <summary class="rte-share-btn">
              <img
                src="/icons/toolbar2/share.svg"
                alt=""
                class="rte-share-btn-icon"
              />
              <span class="rte-share-btn-text">Share</span>
              <span class="rte-share-btn-sep" />
              <img
                src="/icons/arrow-down.svg"
                alt=""
                class="rte-share-btn-caret"
              />
            </summary>
            <div class="rte-share-menu">
              <button type="button">Chia sẻ với mọi người</button>
              <button type="button">Sao chép link</button>
            </div>
          </details>
          <!-- <button
            type="button"
            class="rte-header-action-btn"
            title="Sparkle"
            aria-label="Sparkle"
          >
            <img
              src="/icons/star.svg"
              alt=""
              class="rte-header-action-icon"
            >
          </button> -->
        </div>
        <!-- Current user avatar (top-right) -->
        <div v-if="currentUser" class="rte-current-user">
          <div
            class="rte-viewer-avatar rte-viewer-avatar--current"
            :title="currentUser.name"
          >
            <img
              v-if="currentUser.avatar"
              :src="currentUser.avatar"
              :alt="currentUser.name"
              class="rte-viewer-avatar-img"
            />
            <span v-else>{{ getUserInitials(currentUser.name) }}</span>
          </div>
        </div>
        <div v-if="readOnly" class="group group-actions">
          <button class="icon btn-pill" type="button" @click="emit('edit')">
            <img
              src="../../../public/icons/edit.svg"
              class="icon-img"
              alt="Edit"
            />
            Edit
          </button>
          <button class="icon btn-pill" type="button" @click="emit('reload')">
            <img
              src="../../../public/icons/reload.svg"
              class="icon-img"
              alt="Reload"
            />
            Reload
          </button>
        </div>
      </div>

      <div class="toolbar-row toolbar-row--actions">
        <div class="spacer" />
        <div class="group">
          <button
            class="icon icon-btn"
            :disabled="readOnly || !editor.can().undo()"
            title="Undo"
            @click="editor.chain().focus().undo().run()"
          >
            <img src="/icons/toolbar2/undo.svg" class="icon-img" alt="Undo" />
          </button>
          <button
            class="icon icon-btn"
            :disabled="readOnly || !editor.can().redo()"
            title="Redo"
            @click="editor.chain().focus().redo().run()"
          >
            <img src="/icons/toolbar2/redo.svg" class="icon-img" alt="Redo" />
          </button>
        </div>

        <span class="sep" />

        <!-- Heading dropdown -->
        <details
          ref="headingDetailsRef"
          class="dd"
          :class="{ 'dd-disabled': readOnly }"
          :aria-disabled="readOnly ? 'true' : 'false'"
          :open="headingMenuOpen"
          @toggle="headingMenuOpen = ($event.target as HTMLDetailsElement).open"
        >
          <summary class="dd-btn">
            {{ currentHeadingLabel }}
          </summary>
          <div class="dd-menu">
            <button
              :disabled="readOnly"
              @click="
                setHeading();
                headingMenuOpen = false;
              "
            >
              Paragraph
            </button>
            <button
              :disabled="readOnly"
              @click="
                setHeading(1);
                headingMenuOpen = false;
              "
            >
              Heading 1
            </button>
            <button
              :disabled="readOnly"
              @click="
                setHeading(2);
                headingMenuOpen = false;
              "
            >
              Heading 2
            </button>
            <button
              :disabled="readOnly"
              @click="
                setHeading(3);
                headingMenuOpen = false;
              "
            >
              Heading 3
            </button>
          </div>
        </details>

        <span class="sep" />

        <div class="group">
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('bulletList') }"
            :disabled="readOnly"
            title="Bullet list"
            @click="editor.chain().focus().toggleBulletList().run()"
          >
            <img
              src="/icons/toolbar2/bullet-list.svg"
              class="icon-img"
              alt="Bullet list"
            />
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('orderedList') }"
            :disabled="readOnly"
            title="Numbered list"
            @click="editor.chain().focus().toggleOrderedList().run()"
          >
            <img
              src="/icons/toolbar2/numbered-list.svg"
              class="icon-img"
              alt="Numbered list"
            />
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('blockquote') }"
            :disabled="readOnly"
            title="Quote"
            @click="editor.chain().focus().toggleBlockquote().run()"
          >
            <img
              src="/icons/toolbar2/quote-block.svg"
              class="icon-img"
              alt="Quote"
            />
          </button>
        </div>

        <span class="sep" />

        <div class="group">
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('bold') }"
            :disabled="readOnly"
            title="Bold"
            @click="editor.chain().focus().toggleBold().run()"
          >
            <img src="/icons/toolbar2/bold.svg" class="icon-img" alt="Bold" />
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('italic') }"
            :disabled="readOnly"
            title="Italic"
            @click="editor.chain().focus().toggleItalic().run()"
          >
            <img
              src="/icons/toolbar2/italic.svg"
              class="icon-img"
              alt="Italic"
            />
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('strike') }"
            :disabled="readOnly"
            title="Strikethrough"
            @click="editor.chain().focus().toggleStrike().run()"
          >
            <img
              src="/icons/toolbar2/strike.svg"
              class="icon-img"
              alt="Strikethrough"
            />
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('code') }"
            :disabled="readOnly"
            title="Code"
            @click="editor.chain().focus().toggleCode().run()"
          >
            <img src="/icons/toolbar2/code.svg" class="icon-img" alt="Code" />
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('underline') }"
            :disabled="readOnly"
            title="Underline"
            @click="editor.chain().focus().toggleUnderline().run()"
          >
            <img
              src="/icons/toolbar2/underline.svg"
              class="icon-img"
              alt="Underline"
            />
          </button>
        </div>

        <span class="sep" />

        <div class="group">
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('link') }"
            :disabled="readOnly"
            title="Link"
            @click="setLink"
          >
            <img src="/icons/toolbar2/link.svg" class="icon-img" alt="Link" />
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('subscript') }"
            :disabled="readOnly"
            title="Subscript"
            @click="toggleSubscript"
          >
            <img
              src="/icons/toolbar2/subscript.svg"
              class="icon-img"
              alt="Subscript"
            />
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('superscript') }"
            :disabled="readOnly"
            title="Superscript"
            @click="toggleSuperscript"
          >
            <img
              src="/icons/toolbar2/superscript.svg"
              class="icon-img"
              alt="Superscript"
            />
          </button>
        </div>

        <span class="sep" />

        <div class="group">
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive({ textAlign: 'left' }) }"
            :disabled="readOnly"
            title="Align left"
            @click="setTextAlign('left')"
          >
            <img
              src="/icons/toolbar2/align-left.svg"
              class="icon-img"
              alt="Align left"
            />
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive({ textAlign: 'center' }) }"
            :disabled="readOnly"
            title="Align center"
            @click="setTextAlign('center')"
          >
            <img
              src="/icons/toolbar2/align-center.svg"
              class="icon-img"
              alt="Align center"
            />
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive({ textAlign: 'right' }) }"
            :disabled="readOnly"
            title="Align right"
            @click="setTextAlign('right')"
          >
            <img
              src="/icons/toolbar2/align-right.svg"
              class="icon-img"
              alt="Align right"
            />
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive({ textAlign: 'justify' }) }"
            :disabled="readOnly"
            title="Justify"
            @click="setTextAlign('justify')"
          >
            <img
              src="/icons/toolbar2/align-justify.svg"
              class="icon-img"
              alt="Justify"
            />
          </button>
        </div>

        <div class="spacer" />
      </div>
    </div>

    <!-- Editor -->
    <EditorContent :editor="editor" class="content" />
  </div>
</template>

<style scoped>
.rte {
  border: 0px solid #e5e7eb;
  /* Toolbar cố định, chỉ phần nội dung scroll khi dài */
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background: white;
}

.rte--readonly {
  height: auto;
  max-height: 90vh;
}

.toolbar-wrap {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
}

.toolbar-row--header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1.5px solid #e5e7eb;
}

.rte-header-title {
  flex: 1;
  min-width: 0;
}

.rte-header-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rte-header-title-row .rte-title-input {
  flex: 1;
  min-width: 0;
}

.rte-header-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
}

.rte-save-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #374151;
  flex-shrink: 0;
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 6px;
  background: #f3f4f6;
}

.rte-save-status__sync {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.rte-save-status__check {
  flex-shrink: 0;
  color: #22c55e;
}

.rte-save-status__text {
  font-weight: 500;
}

@keyframes rte-save-spin {
  to {
    transform: rotate(360deg);
  }
}

.toolbar-row--menu {
  display: flex;
  align-items: center;
  gap: 4px;
  /* padding: 4px 12px 8px; */
  /* border-bottom: 1px solid #e5e7eb; */
}

.dd-btn--menu {
  font-size: 14px;
  color: #374151;
  padding: 4px 8px;
  border-radius: 4px;
}
.dd-btn--menu:hover {
  background: #f3f4f6;
}
.dd-menu-item .dd-menu {
  top: 100%;
  margin-top: 4px;
}

.toolbar-row--actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 20px;
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.group {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.sep {
  width: 1px;
  height: 22px;
  background: #e5e7eb;
  margin: 0 2px;
}
.spacer {
  flex: 1;
}

.icon {
  border: 0;
  background: transparent;
  border-radius: 8px;
  padding: 6px 8px;
  cursor: pointer;
  line-height: 1;
}
.icon:hover {
  background: #f3f4f6;
}
.icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.icon.active {
  background: #111827;
  color: white;
}
.icon.active .icon-img {
  filter: brightness(0) invert(1);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.icon-btn .icon-img {
  width: 14px;
  height: 14px;
}

.group-actions {
  margin-left: auto;
}
.btn-pill {
  border: 1px solid #e5e7eb;
  border-radius: 60px;
  padding: 6px 12px;
  background: #fff;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #111827;
}
.btn-pill:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}
.btn-pill .icon-img {
  width: 14px;
  height: 14px;
}

.rte-title-input {
  flex: 1;
  min-width: 0;
  max-width: 320px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0px 10px;
  font-size: 15px;
  font-weight: 600;
  background: #fff;
  color: #111827;
}
.rte-title-input::placeholder {
  color: #9ca3af;
}
.rte-title-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* Dropdown */
.dd {
  position: relative;
}
.dd > summary {
  list-style: none;
}
.dd > summary::-webkit-details-marker {
  display: none;
}
.dd-btn {
  border-radius: 10px;
  padding: 2px 10px;
  cursor: pointer;
}
.dd[open] .dd-btn {
  background: #f3f4f6;
}

.dd-disabled {
  opacity: 0.55;
}
.dd-disabled > summary {
  pointer-events: none;
  cursor: not-allowed;
}

.dd-menu {
  position: absolute;
  top: 42px;
  left: 0;
  min-width: 160px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  padding: 6px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}
.dd-menu button {
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
}
.dd-menu button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.dd-menu button:hover {
  background: #f3f4f6;
}
.dd-menu button:disabled:hover {
  background: transparent;
}

/* Content style giống “prose” */
.content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 28px clamp(16px, 5vw, 60px);
}
.content :deep(.ProseMirror) {
  outline: none;
  min-height: 240px;
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
}
.content :deep(h1) {
  font-size: 34px;
  font-weight: 700;
  margin: 20px 0 10px;
}
.content :deep(p) {
  font-size: 16px;
  line-height: 1.7;
  margin: 12px 0;
}
.content :deep(blockquote) {
  border-left: 4px solid #e5e7eb;
  padding-left: 14px;
  margin: 18px 0;
  color: #374151;
}
.content :deep(ul),
.content :deep(ol) {
  margin: 12px 0;
  padding-left: 1.5rem;
}
.content :deep(ul) {
  list-style-type: disc;
}
.content :deep(ol) {
  list-style-type: decimal;
}
.icon-img {
  width: 16px;
  height: 16px;
}

/* Viewers list (Google Docs style) */
.rte-viewers {
  display: flex;
  align-items: center;
  gap: 0;
  margin-right: 8px;
  position: relative;
}

.rte-viewer-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--viewer-color, var(--gray-300));
  background: var(--gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
  color: var(--gray-700);
  margin-left: -8px;
  flex-shrink: 0;
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: border-color 0.15s, box-shadow 0.15s, z-index 0.15s;
}

.rte-viewer-avatar:first-child {
  margin-left: 0;
}

.rte-viewer-avatar:hover {
  z-index: 2;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
}

.rte-viewer-avatar--selected {
  z-index: 3;
  border-color: var(--viewer-color, var(--primary-500));
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
}

.rte-viewer-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.rte-viewer-avatar--more {
  background: #f3f4f6;
  color: #6b7280;
  font-size: 11px;
  border-color: var(--gray-200);
  cursor: default;
}

.rte-viewer-avatar--current {
  margin-left: 0;
  cursor: default;
  border-color: #e5e7eb;
}

/* Header actions: History, Comment, Share, Sparkle */
.rte-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 12px;
  flex-shrink: 0;
}

.rte-header-action-btn {
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #374151;
  cursor: pointer;
}

.rte-header-action-btn:hover {
  background: #f3f4f6;
}

.rte-header-action-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  /* Chuẩn hóa màu/độ đậm giữa các SVG khác nhau */
  filter: brightness(0) saturate(100%);
  opacity: 0.72;
}

/* Comment icon SVG mỏng hơn → scale nhẹ + đậm hơn để đồng bộ với History/Star */
.rte-header-action-icon--comment {
  transform: scale(1.18);
  opacity: 0.82;
}

.rte-share-wrap {
  position: relative;
}

.rte-share-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px 0 12px;
  background: #e0f2fe;
  color: #0c4a6e;
  border: 0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  list-style: none;
}

.rte-share-btn::-webkit-details-marker {
  display: none;
}

.rte-share-btn:hover {
  background: #bae6fd;
  color: #075985;
}

.rte-share-btn-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  background: transparent;
}

.rte-share-btn-text {
  margin-right: 2px;
  font-weight: 500;
}

.rte-share-btn-sep {
  width: 1px;
  height: 20px;
  background: #38bdf8;
  margin: 0 4px;
  opacity: 0.7;
}

.rte-share-btn-caret {
  width: 16px;
  height: 16px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(22%) sepia(35%) saturate(1200%)
    hue-rotate(185deg);
  opacity: 0.92;
}

.rte-share-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  min-width: 180px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  padding: 6px;
  z-index: 20;
}

.rte-share-menu button {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}

.rte-share-menu button:hover {
  background: #f3f4f6;
}

/* Current user (top-right) */
.rte-current-user {
  margin-left: auto;
  margin-right: 8px;
  padding: 2px;
  flex-shrink: 0;
  border-radius: 999px;
  border: 2px solid #3b82f6;
  background: #ffffff;
}

/* Viewer info popup */
.rte-viewer-popup {
  position: fixed;
  z-index: 9999;
}

.rte-viewer-popup__card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  border: 1px solid #e5e7eb;
  width: 300px;
  padding: 12px;
}

.rte-viewer-popup__main {
  display: flex;
  gap: 10px;
}

.rte-viewer-popup__avatar-wrap {
  flex-shrink: 0;
}

.rte-viewer-popup__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.rte-viewer-popup__avatar-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  color: #374151;
  font-weight: 600;
  font-size: 18px;
}

.rte-viewer-popup__info {
  flex: 1;
  min-width: 0;
}

.rte-viewer-popup__name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.rte-viewer-popup__name {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.rte-viewer-popup__add-person {
  width: 26px;
  height: 26px;
  border: 0;
  background: transparent;
  border-radius: 50%;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rte-viewer-popup__add-person:hover {
  background: #f3f4f6;
  color: #374151;
}

.rte-viewer-popup__email {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rte-viewer-popup__btn-mail {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  justify-content: center;
  padding: 6px 12px;
  background: #3b82f6;
  color: #fff;
  border: 0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 6px;
}

.rte-viewer-popup__btn-mail:hover {
  background: #2563eb;
}

.rte-viewer-popup__btn-icon {
  width: 14px;
  height: 14px;
  filter: brightness(0) invert(1);
}

.rte-viewer-popup__actions {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.rte-viewer-popup__action-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #374151;
}

.rte-viewer-popup__action-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.rte-viewer-popup__detail-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #3b82f6;
  text-decoration: none;
}

.rte-viewer-popup__detail-link:hover {
  text-decoration: underline;
}
/* :deep(.ProseMirror-yjs-selection) {
  background: transparent !important;
} */
:deep(.ProseMirror-yjs-selection) {
  background: color-mix(in srgb, currentColor 30%, transparent);
}

:deep(.collaboration-carets__label) {
  display: none !important;
}

:deep(.collaboration-carets__caret) {
  border-left: 2px solid currentColor !important;
}
</style>
