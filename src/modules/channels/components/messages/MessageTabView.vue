<script>
// Cache scroll position per channel to restore when switching tabs
const channelScrollPositions = new Map();
</script>
<script setup>
import { computed, ref, nextTick, watch, onBeforeUnmount } from "vue";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";
import { useChatStore } from "@/modules/channels/stores/chat.store";
import { useHuddleStore } from "@/modules/channels/huddle/stores/huddle.store";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useInfiniteQuery } from "@tanstack/vue-query";
import DOMPurify from "dompurify";
import { marked } from "marked";
import chatService from "@/services/chat.service";
import AppLoading from "@/components/loading/AppLoading.vue";
import HuddleSystemMessage from "@/modules/channels/huddle/components/HuddleSystemMessage.vue";
import TaskCanvasAttachmentPicker from "@/modules/channels/components/tasks/TaskCanvasAttachmentPicker.vue";
import EmojiPicker from "vue3-emoji-picker";
import "vue3-emoji-picker/css";
import { useRouter } from "vue-router";
import { AlertTriangle, Bookmark, BookmarkX, ExternalLink, FileText, Info, Trash2, UserMinus, UserPlus, X } from "lucide-vue-next";

const emit = defineEmits(["add-people-to-channel", "join-huddle"]);

const props = defineProps({
  canInvite: { type: Boolean, default: true },
  canPost: { type: Boolean, default: true },
  canPinMessage: { type: Boolean, default: false },
  canDeleteMessage: { type: Boolean, default: false },
});

const workspaceStore = useWorkspaceStore();
const channelStore = useChannelStore();
const chatStore = useChatStore();
const huddleStore = useHuddleStore();
const authStore = useAuthStore();
const router = useRouter();

const workspace = computed(() => workspaceStore.workspaceDetail);
const selectedChannel = computed(() => channelStore.selectedChannel);
const members = computed(() => workspaceStore.members);
const getUserIdFromAccessToken = () => {
  const token = authStore.accessToken;
  if (!token) return "";
  try {
    const base64Url = token.split(".")[1] || "";
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return payload?.sub || "";
  } catch {
    return "";
  }
};
const currentUserId = computed(() => authStore.user?.id || getUserIdFromAccessToken());
const channelMembers = computed(() => {
  const channelId = selectedChannel.value?.id;
  if (!channelId) return [];
  return channelStore.getChannelMembersById(channelId);
});
const isDirectMessage = computed(() => selectedChannel.value?.type === "dm");
const directMessagePartner = computed(() => {
  if (!isDirectMessage.value) return null;
  const otherMember = channelMembers.value.find(
    (member) => member.userId && member.userId !== currentUserId.value
  );
  if (otherMember) return otherMember;
  return channelMembers.value.find((member) => member.userId === currentUserId.value) || null;
});
const channelDisplayName = computed(() => {
  if (!selectedChannel.value) return "";
  if (isDirectMessage.value) {
    return (
      directMessagePartner.value?.name ||
      directMessagePartner.value?.email ||
      selectedChannel.value.name ||
      "Direct message"
    );
  }
  return selectedChannel.value.name || "Unnamed channel";
});
const messageInputPlaceholder = computed(() => {
  if (!props.canPost) return "Only managers can post in this channel.";
  if (!selectedChannel.value) return "Message";
  return isDirectMessage.value
    ? `Message ${channelDisplayName.value}`
    : `Message #${channelDisplayName.value}`;
});
const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: isLoadingMessages } = useInfiniteQuery({
  queryKey: ['messages', computed(() => selectedChannel.value?.id)],
  queryFn: async ({ pageParam = 1 }) => {
    const response = await chatService.getMessages(workspace.value.id, selectedChannel.value.id, pageParam);
    const payload = response?.data ?? response ?? {};
    return {
      messages: chatStore.formatMessages(payload.messages || [], members.value, "sent"),
      hasMore: typeof payload.hasMore === "boolean" ? payload.hasMore : false
    };
  },
  initialPageParam: 1,
  getNextPageParam: (lastPage, allPages) => {
    return lastPage.hasMore ? allPages.length + 1 : undefined;
  },
  enabled: computed(() => !!workspace.value?.id && !!selectedChannel.value?.id)
});

const messages = computed(() => {
  if (!data.value) return [];
  // Reverse pages so older pages (loaded later) come first, then flatten
  return [...data.value.pages].reverse().flatMap(page => page.messages || []);
});

const messagesByDay = computed(() => {
  const byDateKey = new Map();

  for (const message of messages.value) {
    const date = new Date(message.createdAt);
    if (Number.isNaN(date.getTime())) continue;

    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const dateKey = `${yyyy}-${mm}-${dd}`;

    if (!byDateKey.has(dateKey)) byDateKey.set(dateKey, []);
    byDateKey.get(dateKey).push(message);
  }

  const dayGroups = Array.from(byDateKey.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([dateKey, dayMessages]) => {
      dayMessages.sort(
        (m1, m2) =>
          new Date(m1.createdAt).getTime() - new Date(m2.createdAt).getTime()
      );

      const firstDate = new Date(dayMessages[0]?.createdAt);
      const label = firstDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      return {
        dateKey,
        label,
        messages: dayMessages,
      };
    });

  return dayGroups;
});

const pinnedMessages = computed(() =>
  messages.value
    .filter((message) => message.isPinned && message.status === "sent")
    .sort((a, b) => {
      const pinnedA = new Date(a.pinnedAt || a.createdAt).getTime();
      const pinnedB = new Date(b.pinnedAt || b.createdAt).getTime();
      return pinnedB - pinnedA;
    })
);

const newMessage = ref("");
const textareaRef = ref(null);
const messagesContainerRef = ref(null);
const genericFileInputRef = ref(null);
const videoFileInputRef = ref(null);
const audioFileInputRef = ref(null);
const pendingAttachments = ref([]);
const pendingMentions = ref([]);
const isUploadingAttachment = ref(false);
const isEmojiPickerOpen = ref(false);
const isMentionPickerOpen = ref(false);
const mentionQuery = ref("");
const mentionStartIndex = ref(-1);
const canvasPickerOpen = ref(false);
const initialScrolledChannelIds = new Set();
const messageMenu = ref({
  open: false,
  message: null,
  x: 0,
  y: 0,
});
const deleteConfirmation = ref({
  open: false,
  message: null,
});
const isDeletingMessage = ref(false);
const messageElementRefs = new Map();
const highlightedMessageId = ref("");

const filteredMentionMembers = computed(() => {
  const query = mentionQuery.value.trim().toLowerCase();
  return channelMembers.value
    .filter((member) => member.userId)
    .filter((member) => {
      if (!query) return true;
      return `${member.name || ""} ${member.email || ""}`.toLowerCase().includes(query);
    })
    .slice(0, 8);
});

const canSendMessage = computed(() =>
  props.canPost && (newMessage.value.trim().length > 0 || pendingAttachments.value.length > 0) && !isUploadingAttachment.value
);

const shouldAutoScrollToBottom = () => {
  if (!messagesContainerRef.value) return false;
  const el = messagesContainerRef.value;
  const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
  const autoScrollThreshold = 80;
  return distanceFromBottom < autoScrollThreshold;
};

const restoreScrollPosition = async () => {
  await nextTick();
  requestAnimationFrame(() => {
    if (!messagesContainerRef.value || !selectedChannel.value?.id) return;
    const savedScroll = channelScrollPositions.get(selectedChannel.value.id);
    if (savedScroll !== undefined) {
      messagesContainerRef.value.scrollTop = savedScroll;
    }
  });
};

const scrollToBottom = async () => {
  await nextTick();
  requestAnimationFrame(() => {
    if (!messagesContainerRef.value) return;
    messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight;
  });
};

const handleScroll = async (event) => {
  closeMessageMenu();
  const element = event.target;
  const nearTop = 100;
  if (
    !selectedChannel.value ||
    !workspace.value ||
    isFetchingNextPage.value ||
    element.scrollTop >= nearTop
  ) {
    return;
  }

  if (!hasNextPage.value) {
    return;
  }

  const previousScrollHeight = element.scrollHeight;

  try {
    await fetchNextPage();

    await nextTick();

    const newScrollHeight = element.scrollHeight;
    element.scrollTop = newScrollHeight - previousScrollHeight;
  } catch {
    // Toast is shown by the global axios interceptor
  }
};

const clearComposer = () => {
  newMessage.value = "";
  pendingAttachments.value = [];
  pendingMentions.value = [];
  isEmojiPickerOpen.value = false;
  isMentionPickerOpen.value = false;
};

const mentionLabel = (mention) => mention.name || mention.email || mention.userId;

marked.setOptions({
  breaks: true,
  gfm: true,
});

const filterMentionsForContent = () => {
  const content = newMessage.value;
  return pendingMentions.value.filter((mention) => content.includes(`@${mentionLabel(mention)}`));
};

const handleSendMessage = async () => {
  if (!props.canPost) return;
  if (!selectedChannel.value || !workspace.value || !canSendMessage.value)
    return;

  const attachments = pendingAttachments.value.map((item) => ({ ...item }));
  const mentions = filterMentionsForContent();
  const metadata = {
    ...(attachments.length ? { attachments } : {}),
    ...(mentions.length ? { mentions } : {}),
  };

  chatStore.sendMessage({
    workspaceId: workspace.value.id,
    channelId: selectedChannel.value.id,
    content: newMessage.value,
    messageType: attachments.length ? "file" : "text",
    metadata: Object.keys(metadata).length ? metadata : undefined,
  });

  clearComposer();
};

const handleRetryMessage = (message) => {
  if (!selectedChannel.value || !workspace.value) return;

  chatStore.retryMessage(
    selectedChannel.value.id,
    message.id,
    workspace.value.id
  );
};

const handleAddPeopleToChannel = () => {
  if (!props.canInvite) return;
  emit("add-people-to-channel");
};

const togglePinMessage = async (message) => {
  if (!props.canPinMessage || !workspace.value?.id || !selectedChannel.value?.id || !message?.id) return;
  if (message.isPinned) {
    await chatStore.unpinMessage(workspace.value.id, selectedChannel.value.id, message.id);
  } else {
    await chatStore.pinMessage(workspace.value.id, selectedChannel.value.id, message.id);
  }
};

const canActOnMessage = (message) =>
  message?.messageType !== "system" && message?.status !== "pending" && message?.status !== "failed";

const getMessageActions = (message) => {
  if (!canActOnMessage(message)) return [];
  const actions = [];
  if (props.canDeleteMessage) {
    actions.push({ key: "delete", label: "Delete message" });
  }
  if (props.canPinMessage) {
    actions.push({
      key: message.isPinned ? "unpin" : "pin",
      label: message.isPinned ? "Unpin message" : "Pin message",
    });
  }
  return actions;
};

const openMessageMenu = (message, event) => {
  if (event?.button !== 0) return;
  const actions = getMessageActions(message);
  if (!actions.length) return;
  messageMenu.value = {
    open: true,
    message,
    x: Math.min(event.clientX, window.innerWidth - 190),
    y: Math.min(event.clientY, window.innerHeight - 120),
  };
};

const closeMessageMenu = () => {
  if (!messageMenu.value.open) return;
  messageMenu.value = {
    open: false,
    message: null,
    x: 0,
    y: 0,
  };
};

const openDeleteConfirmation = (message) => {
  if (!message) return;
  deleteConfirmation.value = {
    open: true,
    message,
  };
};

const closeDeleteConfirmation = () => {
  if (isDeletingMessage.value) return;
  deleteConfirmation.value = {
    open: false,
    message: null,
  };
};

const confirmDeleteMessage = async () => {
  const message = deleteConfirmation.value.message;
  if (!message || !workspace.value?.id || !selectedChannel.value?.id) return;

  isDeletingMessage.value = true;
  try {
    await chatStore.deleteMessage(workspace.value.id, selectedChannel.value.id, message.id);
    deleteConfirmation.value = {
      open: false,
      message: null,
    };
  } finally {
    isDeletingMessage.value = false;
  }
};

const runMessageAction = async (actionKey) => {
  const message = messageMenu.value.message;
  closeMessageMenu();
  if (!message || !workspace.value?.id || !selectedChannel.value?.id) return;

  if (actionKey === "delete") {
    openDeleteConfirmation(message);
    return;
  }

  if (actionKey === "pin" || actionKey === "unpin") {
    await togglePinMessage(message);
  }
};

const setMessageElement = (messageId, el) => {
  if (el) {
    messageElementRefs.set(messageId, el);
  } else {
    messageElementRefs.delete(messageId);
  }
};

const jumpToMessage = async (messageId) => {
  await nextTick();
  const target =
    messageElementRefs.get(messageId) ||
    messagesContainerRef.value?.querySelector?.(`[data-message-id="${messageId}"]`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  highlightedMessageId.value = messageId;
  window.setTimeout(() => {
    if (highlightedMessageId.value === messageId) highlightedMessageId.value = "";
  }, 1400);
};

const uploadSelectedFiles = async (fileList, kind = "file") => {
  if (!props.canPost || !workspace.value?.id || !selectedChannel.value?.id) return;
  const files = Array.from(fileList || []);
  if (!files.length) return;
  isUploadingAttachment.value = true;
  try {
    for (const file of files) {
      const uploaded = await chatService.uploadAttachment(workspace.value.id, selectedChannel.value.id, file, kind);
      pendingAttachments.value.push(uploaded);
    }
  } finally {
    isUploadingAttachment.value = false;
  }
};

const onFileInputChange = async (event, kind) => {
  await uploadSelectedFiles(event.target?.files, kind);
  event.target.value = "";
};

const openGenericFilePicker = () => {
  if (!props.canPost) return;
  genericFileInputRef.value?.click?.();
};

const openVideoFilePicker = () => {
  if (!props.canPost) return;
  videoFileInputRef.value?.click?.();
};

const openAudioFilePicker = () => {
  if (!props.canPost) return;
  audioFileInputRef.value?.click?.();
};

const openCanvasPicker = () => {
  if (!props.canPost || !workspace.value?.id) return;
  canvasPickerOpen.value = true;
};

const onCanvasAttached = (attachments) => {
  pendingAttachments.value.push(...(attachments || []));
};

const removePendingAttachment = (attachment) => {
  pendingAttachments.value = pendingAttachments.value.filter((item) => item.id !== attachment.id);
};

const insertAtCursor = async (text) => {
  const el = textareaRef.value;
  if (!el) {
    newMessage.value += text;
    return;
  }
  const start = el.selectionStart ?? newMessage.value.length;
  const end = el.selectionEnd ?? start;
  newMessage.value = `${newMessage.value.slice(0, start)}${text}${newMessage.value.slice(end)}`;
  await nextTick();
  el.focus();
  el.selectionStart = el.selectionEnd = start + text.length;
};

const insertEmoji = async (emoji) => {
  await insertAtCursor(emoji?.i || emoji);
  isEmojiPickerOpen.value = false;
};

const updateMentionState = () => {
  const el = textareaRef.value;
  if (!el || !props.canPost) return;
  const caret = el.selectionStart ?? newMessage.value.length;
  const beforeCaret = newMessage.value.slice(0, caret);
  const match = beforeCaret.match(/(^|\s)@([^\s@]*)$/);
  if (!match) {
    isMentionPickerOpen.value = false;
    mentionQuery.value = "";
    mentionStartIndex.value = -1;
    return;
  }
  isMentionPickerOpen.value = true;
  mentionQuery.value = match[2] || "";
  mentionStartIndex.value = caret - mentionQuery.value.length - 1;
};

const openMentionPicker = async () => {
  if (!props.canPost) return;
  await insertAtCursor("@");
  updateMentionState();
};

const selectMention = async (member) => {
  const el = textareaRef.value;
  const label = member.name || member.email || "Unknown";
  const start = mentionStartIndex.value >= 0 ? mentionStartIndex.value : newMessage.value.length;
  const end = el?.selectionStart ?? newMessage.value.length;
  newMessage.value = `${newMessage.value.slice(0, start)}@${label} ${newMessage.value.slice(end)}`;
  pendingMentions.value = [
    ...pendingMentions.value.filter((mention) => mention.userId !== member.userId),
    {
      userId: member.userId,
      workspaceMemberId: member.workspaceMemberId,
      name: member.name,
      email: member.email,
    },
  ];
  isMentionPickerOpen.value = false;
  await nextTick();
  textareaRef.value?.focus?.();
  updateMentionState();
};

const attachmentType = (item) => {
  if (item?.type === "canvas" || item?.canvasId) return "canvas";
  if (item?.type === "video" || String(item?.mimeType || "").startsWith("video/")) return "video";
  if (item?.type === "audio" || String(item?.mimeType || "").startsWith("audio/")) return "audio";
  if (item?.type === "image" || String(item?.mimeType || "").startsWith("image/")) return "image";
  return "file";
};

const getMessageAttachments = (message) => message?.metadata?.attachments || [];

const openAttachment = (attachment) => {
  if (attachment?.url) window.open(attachment.url, "_blank", "noopener,noreferrer");
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderMessageMarkdown = (message) => {
  const raw = String(message?.content || "");
  const parsed = marked.parse(raw, { async: false, breaks: true, gfm: true });
  let html = DOMPurify.sanitize(parsed, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "del",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "a",
      "span",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel", "class"],
  });

  const mentions = Array.isArray(message?.metadata?.mentions) ? message.metadata.mentions : [];
  for (const mention of mentions) {
    const label = mentionLabel(mention);
    if (!label) continue;
    const token = `@${label}`;
    const escapedToken = escapeHtml(token);
    const safeMention = `<span class="message-mention-token">${escapedToken}</span>`;
    html = html.replace(new RegExp(escapeRegExp(escapedToken), "g"), safeMention);
  }
  return html;
};

const getChannelCreator = (channel) => {
  if (!channel || !channel.createdById) return null;
  const creator = members.value.find((m) => m.id === channel.createdById);
  return creator?.name || "Unknown";
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const options = { month: "long", day: "numeric", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isHuddleSystemMessage = (message) => {
  const event = message?.metadata?.huddle?.event;
  return (
    message?.messageType === "system" &&
    (event === "started" ||
      event === "ended" ||
      message.content === "Huddle started" ||
      message.content === "Huddle ended")
  );
};

const isCanvasShareSystemMessage = (message) =>
  message?.messageType === "system" && Boolean(message?.metadata?.canvasShare?.targetUrl);

const openCanvasShareMessage = (message) => {
  const targetUrl = message?.metadata?.canvasShare?.targetUrl;
  if (targetUrl) router.push(targetUrl);
};

const getCanvasShareTitle = (message) =>
  message?.metadata?.canvasShare?.title || "Shared canvas";

const getCanvasShareRoleLabel = (message) =>
  message?.metadata?.canvasShare?.role === "editor" ? "Write access" : "Read access";

const getCanvasShareActorName = (message) => {
  const content = String(message?.content || "");
  const marker = " has shared ";
  const markerIndex = content.indexOf(marker);
  if (markerIndex > 0) return content.slice(0, markerIndex);
  return message?.authorName || "Someone";
};

const getGenericSystemKind = (message) => {
  const content = String(message?.content || "").toLowerCase();
  if (content.includes(" added ") && content.includes(" to this channel")) return "member-added";
  if (content.includes(" removed ") && content.includes(" from this channel")) return "member-removed";
  return "info";
};

const getGenericSystemTitle = (message) => {
  const kind = getGenericSystemKind(message);
  if (kind === "member-added") return "Member added";
  if (kind === "member-removed") return "Member removed";
  return "Channel update";
};

const normalizeAuthorName = (message) =>
  String(message?.authorName || "")
    .trim()
    .toLowerCase();

const isSameSender = (currentMessage, previousMessage) => {
  const currentSenderId = String(currentMessage?.senderId || "").trim();
  const previousSenderId = String(previousMessage?.senderId || "").trim();

  if (currentSenderId && previousSenderId) {
    return currentSenderId === previousSenderId;
  }

  const currentAuthorName = normalizeAuthorName(currentMessage);
  const previousAuthorName = normalizeAuthorName(previousMessage);

  return Boolean(currentAuthorName) && currentAuthorName === previousAuthorName;
};

const isMessageGroupStart = (dayMessages, index) => {
  const currentMessage = dayMessages[index];
  if (!currentMessage || currentMessage.messageType === "system") return true;
  if (index === 0) return true;

  const previousMessage = dayMessages[index - 1];
  if (!previousMessage || previousMessage.messageType === "system") return true;
  return !isSameSender(currentMessage, previousMessage);
};

watch(
  () => messages.value.length,
  (newLength, oldLength) => {
    // If it's the first time we load messages for this channel, force scroll to bottom
    if (selectedChannel.value?.id && !initialScrolledChannelIds.has(selectedChannel.value.id)) {
      scrollToBottom();
      initialScrolledChannelIds.add(selectedChannel.value.id);
    } else if (newLength > 0 && (oldLength === 0 || oldLength === undefined)) {
      // Data loaded from cache on remount, restore saved scroll position
      restoreScrollPosition();
    } else if (shouldAutoScrollToBottom()) {
      scrollToBottom();
    }
  },
  { immediate: true }
);

watch(
  () => selectedChannel.value?.id,
  async (newChannelId, oldChannelId) => {
    // Save scroll position for the old channel
    if (oldChannelId && messagesContainerRef.value) {
      channelScrollPositions.set(oldChannelId, messagesContainerRef.value.scrollTop);
    }

    // Cleanup listeners for old channel when switching channels
    if (oldChannelId && oldChannelId !== newChannelId) {
      chatStore.cleanupChannelListeners(oldChannelId);
    }

    if (newChannelId && newChannelId !== oldChannelId) {
      if (workspace.value?.id) {
        channelStore.fetchChannelMembers(workspace.value.id, newChannelId).catch(() => {});
      }
      chatStore.setupSocketListeners(newChannelId, members.value);
      chatStore.joinChannel(newChannelId);
      huddleStore.checkActiveHuddle(newChannelId);
    }
  },
  { immediate: true }
);

// Cleanup when rời hẳn khỏi ChannelDetailView
onBeforeUnmount(() => {
  if (selectedChannel.value?.id && messagesContainerRef.value) {
    channelScrollPositions.set(selectedChannel.value.id, messagesContainerRef.value.scrollTop);
  }
  
  if (selectedChannel.value?.id) {
    chatStore.cleanupChannelListeners(selectedChannel.value.id);
  }
});
</script>

<template>
  <div
    class="message-tab-root"
    @click="closeMessageMenu"
  >
    <div
      ref="messagesContainerRef"
      class="main-content-body"
      @scroll="handleScroll"
    >
      <div
        v-if="!selectedChannel"
        class="content-placeholder"
      >
        <p class="placeholder-text">
          Workspace: {{ workspace?.name }}
        </p>
        <p class="placeholder-description">
          Select a channel from the sidebar to start chatting.
        </p>
      </div>
      <div
        v-else
        class="message-tab-content"
      >
        <div
          v-if="isLoadingMessages"
          class="d-flex justify-content-center align-items-center"
          style="height: 100vh"
        >
          <AppLoading
            :active="true"
            variant="inline"
            min-height="220px"
          />
        </div>
        <div v-else>
          <div
            v-if="pinnedMessages.length"
            class="message-pinned-rail"
          >
            <button
              v-for="message in pinnedMessages"
              :key="`pinned-${message.id}`"
              type="button"
              class="message-pinned-rail__item"
              @click="jumpToMessage(message.id)"
            >
              <Bookmark :size="14" />
              <span class="message-pinned-rail__author">{{ message.authorName }}</span>
              <span class="message-pinned-rail__text">{{ chatStore.truncateContent(message.content, 90) || "Attachment" }}</span>
            </button>
          </div>

          <div
            v-if="selectedChannel && messages.length === 0"
            class="message-tab-welcome"
          >
            <h1 class="message-tab-welcome-title">
              {{ isDirectMessage ? channelDisplayName : `# ${channelDisplayName}` }}
            </h1>
            <p
              v-if="isDirectMessage"
              class="message-tab-welcome-message"
            >
              This is the beginning of your direct conversation with
              <span class="message-tab-name-highlight">{{ channelDisplayName }}</span>.
            </p>
            <p
              v-else
              class="message-tab-welcome-message"
            >
              <span class="message-tab-creator">
                {{ getChannelCreator(selectedChannel) || "Someone" }}
              </span>
              created this channel on
              <span class="message-tab-date">
                {{ formatDate(selectedChannel.createdAt) }} </span>. This is the very beginning of the
              <span class="message-tab-name-highlight">#{{ channelDisplayName }}</span>
              channel.
            </p>
            <div class="message-tab-action-cards">
              <button
                v-if="!isDirectMessage && canInvite"
                class="action-card action-card--purple"
                type="button"
                @click="handleAddPeopleToChannel"
              >
                <div class="action-card-icon">
                  <img
                    src="/icons/message-circle-dot.svg"
                    alt="Add people icon"
                  >
                </div>
                <h3 class="action-card-title">
                  Add people to channel
                </h3>
              </button>
              <button
                v-else
                class="action-card action-card--purple"
                type="button"
                @click="$emit('join-huddle')"
              >
                <div class="action-card-icon">
                  <img
                    src="/icons/message-circle-dot.svg"
                    alt="Start call icon"
                  >
                </div>
                <h3 class="action-card-title">
                  Start a call
                </h3>
              </button>
              <div
                v-if="!isDirectMessage"
                class="action-card action-card--blue"
              >
                <div class="action-card-icon">
                  <img
                    src="/icons/file.svg"
                    alt="Channel description icon"
                  >
                </div>
                <h3 class="action-card-title">
                  Add channel description
                </h3>
              </div>
            </div>
          </div>

          <div class="message-tab-messages">
            <div class="message-tab-messages-loading-older">
              <div
                v-if="isFetchingNextPage"
                class="d-flex justify-content-center"
              >
                <AppLoading
                  :active="true"
                  variant="inline"
                  size="sm"
                  min-height="64px"
                />
              </div>
            </div>
            <div
              v-for="day in messagesByDay"
              :key="day.dateKey"
            >
              <div class="message-tab-day-divider">
                <span>
                  {{ day.label }}
                </span>
              </div>

              <div
                v-for="(message, messageIndex) in day.messages"
                :key="message.id"
                :ref="(el) => setMessageElement(message.id, el)"
                :data-message-id="message.id"
                class="message-item"
                :class="{
                  'message-item--system': message.messageType === 'system',
                  'message-item--pending': message.status === 'pending',
                  'message-item--failed': message.status === 'failed',
                  'message-item--grouped': message.messageType !== 'system' && !isMessageGroupStart(day.messages, messageIndex),
                  'message-item--highlighted': highlightedMessageId === message.id,
                }"
              >
                <div
                  v-if="message.messageType !== 'system'"
                  class="message-item-avatar"
                  :class="{ 'message-item-avatar--hidden': !isMessageGroupStart(day.messages, messageIndex) }"
                >
                  <span>
                    {{ message.authorName?.charAt(0).toUpperCase() || "U" }}
                  </span>
                </div>
                <div class="message-item-body">
                  <div
                    v-if="message.messageType !== 'system' && isMessageGroupStart(day.messages, messageIndex)"
                    class="message-item-header"
                  >
                    <span class="message-item-author">
                      {{ message.authorName }}
                    </span>
                    <span class="message-item-time">
                      {{ formatTime(message.createdAt) }}
                    </span>
                    <span
                      v-if="message.isPinned"
                      class="message-item-pinned"
                      title="Pinned message"
                    >
                      <i class="pi pi-bookmark-fill" />
                      Pinned
                    </span>
                  </div>
                  <div
                    class="message-item-content"
                    :class="{ 'message-item-content--clickable': getMessageActions(message).length }"
                    @click.stop="openMessageMenu(message, $event)"
                  >
                    <HuddleSystemMessage
                      v-if="isHuddleSystemMessage(message)"
                      :message-content="message.content"
                      :metadata="message.metadata"
                      :created-at="message.createdAt"
                      @join="$emit('join-huddle')"
                    />
                    <div
                      v-else-if="isCanvasShareSystemMessage(message)"
                      class="canvas-share-system"
                    >
                      <div class="canvas-share-system__icon">
                        <FileText :size="17" />
                      </div>
                      <div class="canvas-share-system__body">
                        <div class="canvas-share-system__title-row">
                          <strong>{{ getCanvasShareActorName(message) }} shared a canvas</strong>
                          <span class="canvas-share-system__time">{{ formatTime(message.createdAt) }}</span>
                        </div>
                        <div class="canvas-share-system__detail">
                          "{{ getCanvasShareTitle(message) }}" was shared with this channel.
                        </div>
                      </div>
                      <button
                        type="button"
                        class="canvas-share-system__action"
                        @click="openCanvasShareMessage(message)"
                      >
                        <ExternalLink :size="13" />
                        Open canvas
                      </button>
                      <span class="canvas-share-system__role">{{ getCanvasShareRoleLabel(message) }}</span>
                    </div>
                    <div
                      v-else-if="message.messageType === 'system'"
                      class="channel-system-card"
                    >
                      <div class="channel-system-card__icon">
                        <UserPlus
                          v-if="getGenericSystemKind(message) === 'member-added'"
                          :size="17"
                        />
                        <UserMinus
                          v-else-if="getGenericSystemKind(message) === 'member-removed'"
                          :size="17"
                        />
                        <Info
                          v-else
                          :size="17"
                        />
                      </div>
                      <div class="channel-system-card__body">
                        <div class="channel-system-card__title-row">
                          <strong>{{ getGenericSystemTitle(message) }}</strong>
                          <span class="channel-system-card__time">{{ formatTime(message.createdAt) }}</span>
                        </div>
                        <div class="channel-system-card__detail">
                          {{ message.content }}
                        </div>
                      </div>
                    </div>
                    <div
                      v-else
                      class="message-markdown"
                      v-html="renderMessageMarkdown(message)"
                    />
                  </div>
                  <div
                    v-if="getMessageAttachments(message).length"
                    class="message-attachments"
                  >
                    <article
                      v-for="attachment in getMessageAttachments(message)"
                      :key="attachment.id || attachment.fileId || attachment.canvasId || attachment.name"
                      class="message-attachment"
                      :class="`message-attachment--${attachmentType(attachment)}`"
                    >
                      <template v-if="attachmentType(attachment) === 'image' && attachment.url">
                        <img
                          :src="attachment.url"
                          :alt="attachment.name || 'Image attachment'"
                          class="message-attachment__image"
                        >
                      </template>
                      <template v-else-if="attachmentType(attachment) === 'video' && attachment.url">
                        <video
                          :src="attachment.url"
                          class="message-attachment__video"
                          controls
                        />
                      </template>
                      <template v-else-if="attachmentType(attachment) === 'audio' && attachment.url">
                        <audio
                          :src="attachment.url"
                          class="message-attachment__audio"
                          controls
                        />
                      </template>
                      <template v-else>
                        <div class="message-attachment__file-icon">
                          <img
                            v-if="attachmentType(attachment) === 'canvas'"
                            src="/icons/canvas/docs.svg"
                            alt=""
                          >
                          <i
                            v-else
                            class="pi pi-file"
                          />
                        </div>
                      </template>
                      <div class="message-attachment__body">
                        <div class="message-attachment__name">
                          {{ attachment.name || 'Attachment' }}
                        </div>
                        <div class="message-attachment__meta">
                          {{ attachmentType(attachment) === 'canvas' ? 'Canvas' : attachment.mimeType || 'File' }}
                        </div>
                      </div>
                      <button
                        v-if="attachment.url"
                        type="button"
                        class="message-attachment__open"
                        @click="openAttachment(attachment)"
                      >
                        <ExternalLink :size="13" />
                      </button>
                    </article>
                  </div>
                  <div
                    v-if="message.status === 'failed'"
                    class="message-item-error"
                  >
                    Sent failed
                    <button
                      class="message-item-retry"
                      @click="handleRetryMessage(message)"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="messageMenu.open"
      class="message-action-menu"
      :style="{ left: `${messageMenu.x}px`, top: `${messageMenu.y}px` }"
      @click.stop
    >
      <button
        v-for="action in getMessageActions(messageMenu.message)"
        :key="action.key"
        type="button"
        class="message-action-menu__item"
        :class="{ 'message-action-menu__item--danger': action.key === 'delete' }"
        @click="runMessageAction(action.key)"
      >
        <Trash2
          v-if="action.key === 'delete'"
          :size="14"
        />
        <Bookmark
          v-else-if="action.key === 'pin'"
          :size="14"
        />
        <BookmarkX
          v-else
          :size="14"
        />
        <span>{{ action.label }}</span>
      </button>
    </div>

    <div
      v-if="deleteConfirmation.open"
      class="message-delete-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-delete-confirm-title"
      @click.self="closeDeleteConfirmation"
    >
      <div class="message-delete-confirm__dialog">
        <div class="message-delete-confirm__header">
          <div class="message-delete-confirm__icon">
            <AlertTriangle :size="18" />
          </div>
          <div class="message-delete-confirm__title-wrap">
            <h3 id="message-delete-confirm-title">
              Delete message?
            </h3>
            <p>This removes the message from this channel for everyone.</p>
          </div>
          <button
            type="button"
            class="message-delete-confirm__close"
            :disabled="isDeletingMessage"
            @click="closeDeleteConfirmation"
          >
            <X :size="16" />
          </button>
        </div>

        <div class="message-delete-confirm__preview">
          <span class="message-delete-confirm__author">
            {{ deleteConfirmation.message?.authorName || "Unknown" }}
          </span>
          <span class="message-delete-confirm__text">
            {{ chatStore.truncateContent(deleteConfirmation.message?.content, 160) || "Attachment" }}
          </span>
        </div>

        <div class="message-delete-confirm__actions">
          <button
            type="button"
            class="message-delete-confirm__cancel"
            :disabled="isDeletingMessage"
            @click="closeDeleteConfirmation"
          >
            Cancel
          </button>
          <button
            type="button"
            class="message-delete-confirm__delete"
            :disabled="isDeletingMessage"
            @click="confirmDeleteMessage"
          >
            <i
              v-if="isDeletingMessage"
              class="pi pi-spin pi-spinner"
            />
            <Trash2
              v-else
              :size="14"
            />
            Delete
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="selectedChannel"
      class="message-input"
    >
      <div class="message-input-inner">
        <input
          ref="genericFileInputRef"
          type="file"
          class="message-hidden-input"
          multiple
          @change="onFileInputChange($event, 'file')"
        >
        <input
          ref="videoFileInputRef"
          type="file"
          class="message-hidden-input"
          accept="video/*"
          multiple
          @change="onFileInputChange($event, 'video')"
        >
        <input
          ref="audioFileInputRef"
          type="file"
          class="message-hidden-input"
          accept="audio/*"
          multiple
          @change="onFileInputChange($event, 'audio')"
        >
        <div
          v-if="pendingAttachments.length"
          class="message-pending-attachments"
        >
          <article
            v-for="attachment in pendingAttachments"
            :key="attachment.id"
            class="message-pending-attachment"
          >
            <span>{{ attachment.name }}</span>
            <button
              type="button"
              @click="removePendingAttachment(attachment)"
            >
              <i class="pi pi-times" />
            </button>
          </article>
        </div>
        <div class="message-input-editor">
          <textarea
            ref="textareaRef"
            v-model="newMessage"
            class="message-input-textarea"
            :placeholder="messageInputPlaceholder"
            :readonly="!canPost"
            :disabled="!canPost"
            spellcheck="false"
            rows="1"
            @input="updateMentionState"
            @click="updateMentionState"
            @keyup="updateMentionState"
            @keydown.enter.exact.prevent="handleSendMessage"
            @keydown.shift.enter.stop
          />
          <div
            v-if="isEmojiPickerOpen"
            class="message-composer-popover message-emoji-popover"
          >
            <EmojiPicker
              :native="true"
              :display-recent="true"
              :hide-search="false"
              theme="light"
              @select="insertEmoji"
            />
          </div>
          <div
            v-if="isMentionPickerOpen && filteredMentionMembers.length"
            class="message-composer-popover message-mention-popover"
          >
            <button
              v-for="member in filteredMentionMembers"
              :key="member.userId"
              type="button"
              class="message-mention-option"
              @click="selectMention(member)"
            >
              <span class="message-mention-option__avatar">
                {{ (member.name || member.email || '?')[0].toUpperCase() }}
              </span>
              <span>{{ member.name || member.email }}</span>
            </button>
          </div>
        </div>
        <div
          v-if="canPost"
          class="message-input-toolbar"
        >
          <div class="message-input-actions">
            <button
              class="message-input-action-btn"
              type="button"
              title="Add"
              :disabled="!canPost || isUploadingAttachment"
              @click="openGenericFilePicker"
            >
              <i class="pi pi-plus" />
            </button>
            <button
              class="message-input-action-btn"
              type="button"
              title="Emoji"
              :disabled="!canPost"
              @click="isEmojiPickerOpen = !isEmojiPickerOpen"
            >
              <i class="pi pi-face-smile" />
            </button>
            <button
              class="message-input-action-btn"
              type="button"
              title="Mention"
              :disabled="!canPost"
              @click="openMentionPicker"
            >
              <i class="pi pi-at" />
            </button>
            <button
              class="message-input-action-btn"
              type="button"
              title="Video"
              :disabled="!canPost || isUploadingAttachment"
              @click="openVideoFilePicker"
            >
              <i class="pi pi-video" />
            </button>
            <button
              class="message-input-action-btn"
              type="button"
              title="Voice message"
              :disabled="!canPost || isUploadingAttachment"
              @click="openAudioFilePicker"
            >
              <i class="pi pi-microphone" />
            </button>
            <button
              class="message-input-action-btn"
              type="button"
              title="Note"
              :disabled="!canPost"
              @click="openCanvasPicker"
            >
              <i class="pi pi-file-edit" />
            </button>
          </div>
          <button
            class="message-input-send"
            type="button"
            :disabled="!canSendMessage"
            @click="handleSendMessage"
          >
            <i :class="isUploadingAttachment ? 'pi pi-spin pi-spinner' : 'pi pi-send'" />
          </button>
        </div>
      </div>
    </div>
    <TaskCanvasAttachmentPicker
      v-model:open="canvasPickerOpen"
      :workspace-id="workspace?.id || ''"
      :exclude-canvas-ids="pendingAttachments.map((item) => item.canvasId).filter(Boolean)"
      @attach="onCanvasAttached"
    />
  </div>
</template>

<style scoped lang="scss" src="./MessageTabView.scss"></style>
