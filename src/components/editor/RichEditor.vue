<script setup lang="ts">
import { computed, watch, ref, onMounted, onBeforeUnmount } from "vue";
import { EditorContent, Editor } from "@tiptap/vue-3";
import {
  FileText,
  ListTodo,
  Share2,
  Sparkles,
} from "lucide-vue-next";
import SlashCommandMenu from "@/components/editor/SlashCommandMenu.vue";
import AiWriterBar from "@/components/editor/AiWriterBar.vue";
import AiSelectionIcon from "@/components/editor/AiSelectionIcon.vue";
import type { CanvasSuggestion } from "@/services/canvas.service";
import type {
  SlashMenuState,
  AiWriterBarState,
  SelectionAiIconState,
} from "@/composables/useCanvasAiWriter";
import { useUiStore } from "@/stores/ui.store.js";

const uiStore = useUiStore();

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
    // AI Writer — optional; if provided, SlashCommandMenu + AiWriterBar are rendered
    slashMenu?: SlashMenuState | null;
    aiWriterBar?: AiWriterBarState | null;
    // Selection AI trigger
    selectionAiIcon?: SelectionAiIconState | null;
    canvasPlainText?: string;
    canvasSuggestions?: CanvasSuggestion[];
    aiActionsDisabled?: boolean;
  }>(),
  {
    readOnly: false,
    title: undefined,
    viewers: undefined,
    currentUser: null,
    saveStatus: "saved",
    slashMenu: null,
    aiWriterBar: null,
    selectionAiIcon: null,
    canvasPlainText: "",
    canvasSuggestions: () => [],
    aiActionsDisabled: false,
  },
);

const emit = defineEmits<{
  edit: [];
  reload: [];
  "update:title": [value: string];
  download: [];
  moveToTrash: [];
  // AI Writer
  "preview-start": [];
  "preview-chunk": [chunk: string];
  "preview-done": [];
  accept: [];
  reject: [];
  "ai-close": [];
  // Selection AI trigger
  "selection-icon-click": [];
  "accept-canvas-suggestion": [suggestionId: string];
  "reject-canvas-suggestion": [suggestionId: string];
  "accept-all-canvas-suggestions": [];
  "reject-all-canvas-suggestions": [];
  "ai-summary": [];
  "ai-task-generation": [];
  share: [];
}>();

function onTitleInput(e: Event) {
  const value = (e.target as HTMLInputElement).value;
  emit("update:title", value);
}

const editor = computed(() => props.editor);

const displaySaveStatus = computed<"saved" | "saving">(
  () => props.saveStatus ?? "saved",
);

watch(
  () => [props.editor, props.readOnly] as const,
  ([inst, readOnly]) => {
    if (inst) inst.setEditable(!readOnly);
  },
  { immediate: true },
);

watch(
  () => [props.editor, props.canvasSuggestions] as const,
  ([inst, suggestions]) => {
    const commands = inst?.commands as
      | {
          setCanvasAiSuggestions?: (items: CanvasSuggestion[]) => boolean;
          clearCanvasAiSuggestions?: () => boolean;
        }
      | undefined;
    if (!commands) return;

    if (suggestions?.length) {
      commands.setCanvasAiSuggestions?.(suggestions);
    } else {
      commands.clearCanvasAiSuggestions?.();
    }
  },
  { immediate: true, deep: true },
);

function handleEditorContentClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>("[data-ai-canvas-suggestion-action]");
  if (!button) return;

  const suggestionId = button.dataset.aiCanvasSuggestionId;
  const intent = button.dataset.aiCanvasSuggestionAction;
  if (!suggestionId || !intent) return;

  event.preventDefault();
  event.stopPropagation();

  if (intent === "accept") {
    emit("accept-canvas-suggestion", suggestionId);
  } else if (intent === "reject") {
    emit("reject-canvas-suggestion", suggestionId);
  }
}

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

const aiToolbarActionsDisabled = computed(() => {
  return props.aiActionsDisabled || !props.canvasPlainText?.trim();
});

const pendingCanvasAiActionCount = computed(() => {
  return (props.canvasSuggestions || []).filter((suggestion) =>
    ["pending", "applying", "failed"].includes(suggestion.status || "pending"),
  ).length;
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

  // Decide whether to open left or right.
  if (rect.left > window.innerWidth / 2) {
    // Open to the left.
    left = rect.right - popupWidth;
  } else {
    // Open to the right.
    left = rect.left;
  }

  // Clamp to keep the popup inside the viewport.
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
          <div class="rte-header-title-row">
            <input
              v-if="title !== undefined"
              type="text"
              class="rte-title-input"
              :value="title"
              placeholder="New page"
              :disabled="readOnly"
              @input="onTitleInput"
            >
            <div
              class="rte-save-status"
              :data-save-status="displaySaveStatus"
            >
              <img
                v-if="displaySaveStatus === 'saving'"
                src="/icons/toolbar2/sync.svg"
                alt=""
                class="rte-save-status__sync"
                aria-hidden="true"
              >
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
            >
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
                    >
                    <span
                      v-else
                      class="rte-viewer-popup__avatar rte-viewer-popup__avatar-initials"
                    >{{ getUserInitials(selectedViewer.name) }}</span>
                  </div>
                  <div class="rte-viewer-popup__info">
                    <div class="rte-viewer-popup__name-row">
                      <span class="rte-viewer-popup__name">{{
                        selectedViewer.name
                      }}</span>
                      <button
                        type="button"
                        class="rte-viewer-popup__add-person"
                        title="Add person"
                        aria-label="Add person"
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
                          <circle
                            cx="9"
                            cy="7"
                            r="4"
                          />
                          <line
                            x1="19"
                            y1="8"
                            x2="19"
                            y2="14"
                          />
                          <line
                            x1="22"
                            y1="11"
                            x2="16"
                            y2="11"
                          />
                        </svg>
                      </button>
                    </div>
                    <p class="rte-viewer-popup__email">
                      {{ selectedViewer.email || "—" }}
                    </p>
                    <button
                      type="button"
                      class="rte-viewer-popup__btn-mail"
                    >
                      <img
                        src="/icons/mail.svg"
                        alt=""
                        class="rte-viewer-popup__btn-icon"
                      >
                      Send email
                    </button>
                    <div class="rte-viewer-popup__actions">
                      <button
                        type="button"
                        class="rte-viewer-popup__action-btn"
                        title="Message"
                        aria-label="Message"
                      >
                        <img
                          src="/icons/message-circle-dot.svg"
                          alt=""
                          width="18"
                          height="18"
                        >
                      </button>
                      <button
                        type="button"
                        class="rte-viewer-popup__action-btn"
                        title="Video call"
                        aria-label="Video call"
                      >
                        <img
                          src="/icons/meeting.svg"
                          alt=""
                          width="18"
                          height="18"
                        >
                      </button>
                      <button
                        type="button"
                        class="rte-viewer-popup__action-btn"
                        title="Calendar"
                        aria-label="Calendar"
                      >
                        <img
                          src="/icons/calendar.svg"
                          alt=""
                          width="18"
                          height="18"
                        >
                      </button>
                    </div>
                    <a
                      href="#"
                      class="rte-viewer-popup__detail-link"
                      @click.prevent
                    >
                      Open detailed view
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
                        <line
                          x1="10"
                          y1="14"
                          x2="21"
                          y2="3"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Teleport>
        </div>
        <!-- Header actions -->
        <div class="rte-header-actions">
          <button
            type="button"
            class="rte-header-action-btn rte-header-action-btn--ai-tool"
            :disabled="aiToolbarActionsDisabled"
            title="AI Summary"
            aria-label="AI Summary"
            @click="emit('ai-summary')"
          >
            <FileText :size="18" />
          </button>
          <button
            type="button"
            class="rte-header-action-btn rte-header-action-btn--ai-tool"
            :disabled="aiToolbarActionsDisabled"
            title="AI Task Generation"
            aria-label="AI Task Generation"
            @click="emit('ai-task-generation')"
          >
            <ListTodo :size="18" />
          </button>
          <button
            type="button"
            class="rte-share-btn"
            :disabled="readOnly"
            title="Share"
            aria-label="Share"
            @click="emit('share')"
          >
            <Share2 :size="17" />
            <span class="rte-share-btn-text">Share</span>
          </button>
          <button
            type="button"
            class="rte-header-action-btn rte-header-action-btn--ai"
            :class="{ 'rte-header-action-btn--ai-active': uiStore.isAiOpen }"
            title="AI Assistant"
            aria-label="AI Assistant"
            @click="uiStore.toggleAi()"
          >
            <Sparkles :size="18" />
          </button>
        </div>
        <!-- Current user avatar (top-right) -->
        <div
          v-if="currentUser"
          class="rte-current-user"
        >
          <div
            class="rte-viewer-avatar rte-viewer-avatar--current"
            :title="currentUser.name"
          >
            <img
              v-if="currentUser.avatar"
              :src="currentUser.avatar"
              :alt="currentUser.name"
              class="rte-viewer-avatar-img"
            >
            <span v-else>{{ getUserInitials(currentUser.name) }}</span>
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
              src="/icons/toolbar2/undo.svg"
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
              src="/icons/toolbar2/redo.svg"
              class="icon-img"
              alt="Redo"
            >
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
              src="/icons/toolbar2/numbered-list.svg"
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
              src="/icons/toolbar2/quote-block.svg"
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
              src="/icons/toolbar2/bold.svg"
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
              src="/icons/toolbar2/italic.svg"
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
              src="/icons/toolbar2/strike.svg"
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
              src="/icons/toolbar2/code.svg"
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
              src="/icons/toolbar2/underline.svg"
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
              src="/icons/toolbar2/link.svg"
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
              src="/icons/toolbar2/subscript.svg"
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
              src="/icons/toolbar2/superscript.svg"
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
              src="/icons/toolbar2/align-left.svg"
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
              src="/icons/toolbar2/align-center.svg"
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
              src="/icons/toolbar2/align-right.svg"
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
              src="/icons/toolbar2/align-justify.svg"
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
      @click="handleEditorContentClick"
    />

    <div
      v-if="pendingCanvasAiActionCount > 0"
      class="rte-ai-canvas-banner"
    >
      <span>{{ pendingCanvasAiActionCount }} AI proposed change{{ pendingCanvasAiActionCount === 1 ? "" : "s" }}</span>
      <button
        type="button"
        class="rte-ai-canvas-banner__btn rte-ai-canvas-banner__btn--accept"
        @click="emit('accept-all-canvas-suggestions')"
      >
        Accept all
      </button>
      <button
        type="button"
        class="rte-ai-canvas-banner__btn rte-ai-canvas-banner__btn--reject"
        @click="emit('reject-all-canvas-suggestions')"
      >
        Reject all
      </button>
    </div>
  </div>

  <!-- Slash command popup (optional AI writer feature) -->
  <SlashCommandMenu
    v-if="slashMenu?.visible"
    :items="slashMenu.items"
    :selected-index="slashMenu.selectedIndex"
    :client-rect="slashMenu.clientRect"
    @select="slashMenu.onSelect?.($event)"
  />

  <!-- AI Writer floating bar  -->
  <AiWriterBar
    v-if="aiWriterBar?.visible"
    :anchor-rect="aiWriterBar.anchorRect"
    :canvas-content="canvasPlainText"
    @preview-start="emit('preview-start')"
    @preview-chunk="emit('preview-chunk', $event)"
    @preview-done="emit('preview-done')"
    @accept="emit('accept')"
    @reject="emit('reject')"
    @close="emit('ai-close')"
  />

  <AiSelectionIcon
    v-if="selectionAiIcon?.visible"
    :icon-rect="selectionAiIcon.iconRect"
    @click="emit('selection-icon-click')"
  />
</template>

<style scoped>
.rte {
  border: 0px solid #e5e7eb;
  /* Fixed toolbar; only the content area scrolls when long. */
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
.rte-title-input:disabled {
  color: #4b5563;
  cursor: default;
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

/* Content styling similar to prose. */
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

.rte-ai-canvas-banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 16px;
  border-top: 1px solid #dbeafe;
  background: #eff6ff;
  color: #1e3a8a;
  font-size: 13px;
  font-weight: 600;
}

.rte-ai-canvas-banner__btn {
  border: 0;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 700;
  padding: 6px 10px;
  cursor: pointer;
}

.rte-ai-canvas-banner__btn--accept {
  background: #dcfce7;
  color: #166534;
}

.rte-ai-canvas-banner__btn--accept:hover {
  background: #bbf7d0;
}

.rte-ai-canvas-banner__btn--reject {
  background: #fee2e2;
  color: #991b1b;
}

.rte-ai-canvas-banner__btn--reject:hover {
  background: #fecaca;
}

.content :deep(.ai-canvas-target-block--replace) {
  background: #fef2f2;
  box-shadow: inset 3px 0 0 #ef4444;
  text-decoration: line-through;
  text-decoration-color: #dc2626;
  text-decoration-thickness: 2px;
}

.content :deep(.ai-canvas-target-block--delete) {
  background: #fee2e2;
  box-shadow: inset 3px 0 0 #dc2626;
}

.content :deep(.ai-canvas-suggestion-widget),
.content :deep(.ai-canvas-suggestion-missing) {
  position: relative;
  margin: 4px 0 14px;
  border-radius: 8px;
  font-size: 15px;
  line-height: 1.65;
}

.content :deep(.ai-canvas-suggestion-widget--replace) {
  display: grid;
  gap: 4px;
  justify-items: end;
  margin-top: -2px;
}

.content :deep(.ai-canvas-suggestion-widget--insert) {
  border: 1px solid #86efac;
  border-left: 3px solid #16a34a;
  background: #f0fdf4;
  padding: 28px 12px 10px;
}

.content :deep(.ai-canvas-suggestion-widget--delete) {
  min-height: 34px;
}

.content :deep(.ai-canvas-diff-line) {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  border-radius: 7px;
  padding: 8px 10px;
}

.content :deep(.ai-canvas-diff-line--new) {
  width: 100%;
  border: 1px solid #bbf7d0;
  border-left: 3px solid #16a34a;
  background: #f0fdf4;
  color: #052e16;
}

.content :deep(.ai-canvas-suggestion-toolbar) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  margin-bottom: 2px;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  background: #ffffff;
  padding: 4px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
}

.content :deep(.ai-canvas-suggestion-toolbar.is-failed) {
  border-color: #fecaca;
  background: #fff7f7;
}

.content :deep(.ai-canvas-suggestion-toolbar__label) {
  padding: 0 6px;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
}

.content :deep(.ai-canvas-suggestion-toolbar__error) {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #b91c1c;
  font-size: 12px;
}

.content :deep(.ai-canvas-suggestion-btn) {
  border: 0;
  border-radius: 6px;
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.content :deep(.ai-canvas-suggestion-btn:disabled) {
  opacity: 0.55;
  cursor: wait;
}

.content :deep(.ai-canvas-suggestion-btn--accept) {
  background: #dcfce7;
  color: #166534;
}

.content :deep(.ai-canvas-suggestion-btn--accept:hover:not(:disabled)) {
  background: #bbf7d0;
}

.content :deep(.ai-canvas-suggestion-btn--reject) {
  background: #fee2e2;
  color: #991b1b;
}

.content :deep(.ai-canvas-suggestion-btn--reject:hover:not(:disabled)) {
  background: #fecaca;
}

.content :deep(.ai-canvas-suggestion-missing) {
  display: grid;
  gap: 8px;
  border: 1px solid #fde68a;
  border-left: 3px solid #ca8a04;
  background: #fffbeb;
  padding: 10px;
}

.content :deep(.ai-canvas-suggestion-missing__row) {
  display: grid;
  gap: 6px;
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
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    z-index 0.15s;
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

/* Header actions */
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

.rte-header-action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.rte-header-action-btn:disabled:hover {
  background: transparent;
}

.rte-header-action-btn--ai {
  color: #6b7280;
}

.rte-header-action-btn--ai:hover {
  background: #ede9fe;
  color: #7c3aed;
}

.rte-header-action-btn--ai-active {
  background: #ede9fe;
  color: #7c3aed;
}

.rte-header-action-btn--ai-active:hover {
  background: #ddd6fe;
}

.rte-header-action-btn--ai-tool {
  color: #1f2937;
}

.rte-header-action-btn--ai-tool:hover {
  background: #e0f2fe;
  color: #0369a1;
}

.rte-share-wrap {
  position: relative;
}

.rte-share-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
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

.rte-share-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rte-share-btn:disabled:hover {
  background: #e0f2fe;
  color: #0c4a6e;
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
  flex-shrink: 0;
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

/* AI Preview ghost text (Phase 2) */
.content :deep(.ai-preview-ghost) {
  display: block;
  color: #374151;
  font-size: 16px;
  line-height: 1.7;
  margin: 12px 0;
  padding: 10px 14px;
  border-left: 3px solid #6366f1;
  background: rgba(99, 102, 241, 0.04);
  border-radius: 0 6px 6px 0;
  white-space: pre-wrap;
  pointer-events: none;
  user-select: none;
  max-width: 720px;
  font-style: italic;
  opacity: 0.75;
}

.content :deep(.ai-preview-cursor) {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background: #6366f1;
  vertical-align: text-bottom;
  animation: ai-cursor-blink 1s step-start infinite;
}

@keyframes ai-cursor-blink {
  50% {
    opacity: 0;
  }
}

:deep(.collaboration-carets__caret) {
  display: inline-block !important;
  position: relative !important;
  border-left-width: 2px !important;
  border-left-style: solid !important;
  border-right: none !important;
  width: 0 !important;
  height: 1.2em !important;
  vertical-align: text-bottom !important;
  margin-left: -1px;
  /* animation: collab-blink 1.1s step-start infinite !important; */
}

:deep(.collaboration-carets__label) {
  display: block !important;
  position: absolute !important;
  bottom: 100% !important;
  margin-bottom: 4px !important;
  left: 0 !important;
  color: #fff !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  line-height: 1 !important;
  padding: 3px 7px !important;
  border-radius: 4px 4px 4px 0 !important;
  white-space: nowrap !important;
  pointer-events: none !important;
  opacity: 1 !important;
  z-index: 100 !important;
}

@keyframes collab-blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}
</style>
