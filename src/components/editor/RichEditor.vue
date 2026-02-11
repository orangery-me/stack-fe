<script setup lang="ts">
import { computed, watch } from "vue";
import { EditorContent, Editor } from "@tiptap/vue-3";

const props = withDefaults(
  defineProps<{
    editor: Editor;
    readOnly?: boolean;
    title?: string;
    viewers?: Array<{ userId: string; name: string; avatar: string | null }>;
  }>(),
  { readOnly: false, title: undefined, viewers: undefined }
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

const visibleViewers = computed(() => {
  if (!props.viewers || props.viewers.length === 0) return [];
  // Show max 5 avatars, rest will be shown as "+N"
  return props.viewers.slice(0, 5);
});

const remainingViewersCount = computed(() => {
  if (!props.viewers) return 0;
  return Math.max(0, props.viewers.length - 5);
});
</script>

<template>
  <div
    class="rte"
    :class="{ 'rte--readonly': readOnly }"
  >
    <div
      v-if="editor"
      class="toolbar-wrap"
    >
      <div class="toolbar-row toolbar-row--header">
        <img
          v-if="title !== undefined"
          src="/logos/stack-logo.jpg"
          class="rte-header-logo"
          alt="Stack"
        >
        <div class="rte-header-title">
          <input
            v-if="title !== undefined"
            type="text"
            class="rte-title-input"
            :value="title"
            placeholder="New page"
            @input="onTitleInput"
          >
          <!-- Dãy function: File, Insert -->
          <div class="toolbar-row toolbar-row--menu">
            <details class="dd dd-menu-item">
              <summary class="dd-btn dd-btn--menu">
                File
              </summary>
              <div class="dd-menu">
                <button
                  type="button"
                  @click="emit('download')"
                >
                  Download
                </button>
                <button
                  type="button"
                  @click="emit('moveToTrash')"
                >
                  Move to trash
                </button>
              </div>
            </details>
            <details
              class="dd dd-menu-item"
              :class="{ 'dd-disabled': readOnly }"
              :aria-disabled="readOnly ? 'true' : 'false'"
            >
              <summary class="dd-btn dd-btn--menu">
                Insert
              </summary>
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
          v-if="viewers && viewers.length > 0"
          class="rte-viewers"
        >
          <div
            v-for="viewer in visibleViewers"
            :key="viewer.userId"
            class="rte-viewer-avatar"
            :title="viewer.name"
          >
            <img
              v-if="viewer.avatar"
              :src="viewer.avatar"
              :alt="viewer.name"
              class="rte-viewer-avatar-img"
            >
            <span v-else>{{ getUserInitials(viewer.name) }}</span>
          </div>
          <div
            v-if="remainingViewersCount > 0"
            class="rte-viewer-avatar rte-viewer-avatar--more"
            :title="`${remainingViewersCount} more viewer${remainingViewersCount > 1 ? 's' : ''}`"
          >
            +{{ remainingViewersCount }}
          </div>
        </div>
        <div
          v-if="readOnly"
          class="group group-actions"
        >
          <button
            class="icon btn-pill"
            type="button"
            @click="emit('edit')"
          >
            <img
              src="../../../public/icons/edit.svg"
              class="icon-img"
              alt="Edit"
            >
            Edit
          </button>
          <button
            class="icon btn-pill"
            type="button"
            @click="emit('reload')"
          >
            <img
              src="../../../public/icons/reload.svg"
              class="icon-img"
              alt="Reload"
            >
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
            <img
              src="/icons/toolbar/back.svg"
              class="icon-img"
              alt="Undo"
            >
          </button>
          <button
            class="icon icon-btn"
            :disabled="readOnly || !editor.can().redo()"
            title="Redo"
            @click="editor.chain().focus().redo().run()"
          >
            <img
              src="/icons/toolbar/forward.svg"
              class="icon-img"
              alt="Redo"
            >
          </button>
        </div>

        <span class="sep" />

        <!-- Heading dropdown -->
        <details
          class="dd"
          :class="{ 'dd-disabled': readOnly }"
          :aria-disabled="readOnly ? 'true' : 'false'"
        >
          <summary class="dd-btn">
            {{ currentHeadingLabel }}
          </summary>
          <div class="dd-menu">
            <button
              :disabled="readOnly"
              @click="setHeading()"
            >
              Paragraph
            </button>
            <button
              :disabled="readOnly"
              @click="setHeading(1)"
            >
              Heading 1
            </button>
            <button
              :disabled="readOnly"
              @click="setHeading(2)"
            >
              Heading 2
            </button>
            <button
              :disabled="readOnly"
              @click="setHeading(3)"
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
              src="/icons/toolbar/bullet-list.svg"
              class="icon-img"
              alt="Bullet list"
            >
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('orderedList') }"
            :disabled="readOnly"
            title="Numbered list"
            @click="editor.chain().focus().toggleOrderedList().run()"
          >
            <img
              src="/icons/toolbar/number-list.svg"
              class="icon-img"
              alt="Numbered list"
            >
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('blockquote') }"
            :disabled="readOnly"
            title="Quote"
            @click="editor.chain().focus().toggleBlockquote().run()"
          >
            <img
              src="/icons/toolbar/quote.svg"
              class="icon-img"
              alt="Quote"
            >
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
            <img
              src="/icons/toolbar/bold.svg"
              class="icon-img"
              alt="Bold"
            >
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('italic') }"
            :disabled="readOnly"
            title="Italic"
            @click="editor.chain().focus().toggleItalic().run()"
          >
            <img
              src="/icons/toolbar/italic.svg"
              class="icon-img"
              alt="Italic"
            >
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('strike') }"
            :disabled="readOnly"
            title="Strikethrough"
            @click="editor.chain().focus().toggleStrike().run()"
          >
            <img
              src="/icons/toolbar/strikethrough.svg"
              class="icon-img"
              alt="Strikethrough"
            >
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('code') }"
            :disabled="readOnly"
            title="Code"
            @click="editor.chain().focus().toggleCode().run()"
          >
            <img
              src="/icons/toolbar/code.svg"
              class="icon-img"
              alt="Code"
            >
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('underline') }"
            :disabled="readOnly"
            title="Underline"
            @click="editor.chain().focus().toggleUnderline().run()"
          >
            <img
              src="/icons/toolbar/underline.svg"
              class="icon-img"
              alt="Underline"
            >
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
            <img
              src="/icons/toolbar/link.svg"
              class="icon-img"
              alt="Link"
            >
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('subscript') }"
            :disabled="readOnly"
            title="Subscript"
            @click="toggleSubscript"
          >
            <img
              src="/icons/toolbar/subscript.svg"
              class="icon-img"
              alt="Subscript"
            >
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive('superscript') }"
            :disabled="readOnly"
            title="Superscript"
            @click="toggleSuperscript"
          >
            <img
              src="/icons/toolbar/superscript.svg"
              class="icon-img"
              alt="Superscript"
            >
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
              src="/icons/toolbar/align-left.svg"
              class="icon-img"
              alt="Align left"
            >
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive({ textAlign: 'center' }) }"
            :disabled="readOnly"
            title="Align center"
            @click="setTextAlign('center')"
          >
            <img
              src="/icons/toolbar/align-center.svg"
              class="icon-img"
              alt="Align center"
            >
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive({ textAlign: 'right' }) }"
            :disabled="readOnly"
            title="Align right"
            @click="setTextAlign('right')"
          >
            <img
              src="/icons/toolbar/align-right.svg"
              class="icon-img"
              alt="Align right"
            >
          </button>
          <button
            class="icon icon-btn"
            :class="{ active: editor.isActive({ textAlign: 'justify' }) }"
            :disabled="readOnly"
            title="Justify"
            @click="setTextAlign('justify')"
          >
            <img
              src="/icons/toolbar/align-justify.svg"
              class="icon-img"
              alt="Justify"
            >
          </button>
        </div>

        <div class="spacer" />
      </div>
    </div>

    <!-- Editor -->
    <EditorContent
      :editor="editor"
      class="content"
    />
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
  border-bottom: 1px solid #e5e7eb;
  border-top: 1.5px solid #e5e7eb;
}

.toolbar-row--header .rte-title-input {
  flex: 1;
  min-width: 0;
}

.rte-header-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
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
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
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
  border-radius: 999px;
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
  padding: 6px 10px;
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
  padding: 28px 60px;
}
.content :deep(.ProseMirror) {
  outline: none;
  min-height: 240px;
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
}

.rte-viewer-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid white;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 11px;
  color: #374151;
  margin-left: -6px;
  flex-shrink: 0;
  cursor: default;
  position: relative;
  z-index: 1;
}

.rte-viewer-avatar:first-child {
  margin-left: 0;
}

.rte-viewer-avatar:hover {
  z-index: 2;
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
  font-size: 10px;
  border-color: white;
}
</style>
