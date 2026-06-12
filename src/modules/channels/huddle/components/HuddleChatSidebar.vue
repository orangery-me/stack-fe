<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useInfiniteQuery } from "@tanstack/vue-query";
import { Send, X } from "lucide-vue-next";
import AppLoading from "@/components/loading/AppLoading.vue";
import chatService from "@/services/chat.service";
import { useChatStore } from "@/modules/channels/stores/chat.store";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import HuddleSystemMessage from "./HuddleSystemMessage.vue";

const props = defineProps({
  workspaceId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  channelName: {
    type: String,
    required: true,
  },
  channelType: {
    type: String,
    default: "public",
  },
});

const emit = defineEmits(["close"]);

const chatStore = useChatStore();
const workspaceStore = useWorkspaceStore();

const members = computed(() => workspaceStore.members || []);
const isDirectMessage = computed(() => props.channelType === "dm");
const channelLabel = computed(() =>
  isDirectMessage.value ? props.channelName : `# ${props.channelName}`
);
const messagePlaceholder = computed(() =>
  isDirectMessage.value ? `Message ${props.channelName}` : `Message #${props.channelName}`
);
const newMessage = ref("");
const messagesContainerRef = ref(null);

const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading: isLoadingMessages,
} = useInfiniteQuery({
  queryKey: ["messages", computed(() => props.channelId)],
  queryFn: async ({ pageParam = 1 }) => {
    const response = await chatService.getMessages(
      props.workspaceId,
      props.channelId,
      pageParam,
    );
    const payload = response?.data ?? response ?? {};

    return {
      messages: chatStore.formatMessages(payload.messages || [], members.value, "sent"),
      hasMore: typeof payload.hasMore === "boolean" ? payload.hasMore : false,
    };
  },
  initialPageParam: 1,
  getNextPageParam: (lastPage, allPages) => {
    return lastPage.hasMore ? allPages.length + 1 : undefined;
  },
  enabled: computed(() => Boolean(props.workspaceId && props.channelId)),
});

const messages = computed(() => {
  if (!data.value) return [];
  return [...data.value.pages].reverse().flatMap((page) => page.messages || []);
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

  return Array.from(byDateKey.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([dateKey, dayMessages]) => {
      dayMessages.sort(
        (m1, m2) =>
          new Date(m1.createdAt).getTime() - new Date(m2.createdAt).getTime(),
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
});

const shouldAutoScrollToBottom = () => {
  if (!messagesContainerRef.value) return false;
  const el = messagesContainerRef.value;
  const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
  return distanceFromBottom < 80;
};

const scrollToBottom = async () => {
  await nextTick();
  requestAnimationFrame(() => {
    if (!messagesContainerRef.value) return;
    messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight;
  });
};

const handleScroll = async (event) => {
  const element = event.target;
  if (isFetchingNextPage.value || element.scrollTop >= 100 || !hasNextPage.value) {
    return;
  }

  const previousScrollHeight = element.scrollHeight;

  try {
    await fetchNextPage();
    await nextTick();
    element.scrollTop = element.scrollHeight - previousScrollHeight;
  } catch {
    // Toast is shown by the global axios interceptor.
  }
};

const handleSendMessage = () => {
  if (!newMessage.value.trim()) return;

  chatStore.sendMessage({
    workspaceId: props.workspaceId,
    channelId: props.channelId,
    content: newMessage.value,
  });

  newMessage.value = "";
};

const handleRetryMessage = (message) => {
  chatStore.retryMessage(props.channelId, message.id, props.workspaceId);
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

watch(
  () => messages.value.length,
  (newLength, oldLength) => {
    if (newLength > 0 && (oldLength === 0 || oldLength === undefined)) {
      scrollToBottom();
    } else if (shouldAutoScrollToBottom()) {
      scrollToBottom();
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await chatStore.setupSocketListeners(props.channelId, members.value);
  await chatStore.joinChannel(props.channelId);
});

onBeforeUnmount(() => {
  chatStore.cleanupChannelListeners(props.channelId);
});
</script>

<template>
  <aside class="huddle-chat-sidebar">
    <header class="huddle-chat-header">
      <div class="huddle-chat-heading">
        <h2>Chat</h2>
        <p>{{ channelLabel }}</p>
      </div>
      <button
        class="huddle-chat-close"
        type="button"
        title="Close chat"
        aria-label="Close chat"
        @click="emit('close')"
      >
        <X :size="18" />
      </button>
    </header>

    <div
      ref="messagesContainerRef"
      class="huddle-chat-messages"
      @scroll="handleScroll"
    >
      <div
        v-if="isLoadingMessages"
        class="huddle-chat-loading"
      >
        <AppLoading
          :active="true"
          variant="inline"
          size="sm"
          min-height="120px"
        />
      </div>

      <template v-else>
        <div
          v-if="messages.length === 0"
          class="huddle-chat-empty"
        >
          <h3>{{ channelLabel }}</h3>
          <p>Chưa có tin nhắn trong cuộc trò chuyện này.</p>
        </div>

        <div class="huddle-chat-loading-older">
          <AppLoading
            v-if="isFetchingNextPage"
            :active="true"
            variant="inline"
            size="sm"
            min-height="44px"
          />
        </div>

        <div
          v-for="day in messagesByDay"
          :key="day.dateKey"
          class="huddle-chat-day"
        >
          <div class="huddle-chat-day-divider">
            <span>{{ day.label }}</span>
          </div>

          <div
            v-for="(message, messageIndex) in day.messages"
            :key="message.id"
            class="huddle-message"
            :class="{
              'huddle-message--system': message.messageType === 'system',
              'huddle-message--pending': message.status === 'pending',
              'huddle-message--failed': message.status === 'failed',
              'huddle-message--grouped':
                message.messageType !== 'system' &&
                !isMessageGroupStart(day.messages, messageIndex),
            }"
          >
            <div
              v-if="message.messageType !== 'system'"
              class="huddle-message-avatar"
              :class="{
                'huddle-message-avatar--hidden':
                  !isMessageGroupStart(day.messages, messageIndex),
              }"
            >
              {{ message.authorName?.charAt(0).toUpperCase() || "U" }}
            </div>

            <div class="huddle-message-body">
              <div
                v-if="
                  message.messageType !== 'system' &&
                    isMessageGroupStart(day.messages, messageIndex)
                "
                class="huddle-message-header"
              >
                <span class="huddle-message-author">{{ message.authorName }}</span>
                <span class="huddle-message-time">{{ formatTime(message.createdAt) }}</span>
              </div>

              <div
                class="huddle-message-content"
                :class="{ 'huddle-message-content--system': message.messageType === 'system' && !isHuddleSystemMessage(message) }"
              >
                <HuddleSystemMessage
                  v-if="isHuddleSystemMessage(message)"
                  :message-content="message.content"
                  :metadata="message.metadata"
                  :created-at="message.createdAt"
                  :allow-join-action="false"
                />
                <template v-else>
                  {{ message.content }}
                </template>
              </div>

              <div
                v-if="message.status === 'failed'"
                class="huddle-message-error"
              >
                Sent failed
                <button
                  type="button"
                  @click="handleRetryMessage(message)"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <footer class="huddle-chat-input">
      <div class="huddle-chat-input-inner">
        <textarea
          v-model="newMessage"
          class="huddle-chat-textarea"
          :placeholder="messagePlaceholder"
          rows="1"
          @keydown.enter.exact.prevent="handleSendMessage"
          @keydown.shift.enter.stop
        />
        <button
          class="huddle-chat-send"
          type="button"
          :disabled="!newMessage.trim()"
          title="Send message"
          aria-label="Send message"
          @click="handleSendMessage"
        >
          <Send :size="16" />
        </button>
      </div>
    </footer>
  </aside>
</template>

<style scoped>
.huddle-chat-sidebar {
  width: min(380px, 34vw);
  min-width: 320px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--ui-bg-surface, #ffffff);
  border-left: 1px solid var(--ui-divider, #e5e7eb);
  box-shadow: -12px 0 28px rgba(15, 23, 42, 0.08);
}

.huddle-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--ui-divider, #e5e7eb);
}

.huddle-chat-heading {
  min-width: 0;
}

.huddle-chat-heading h2 {
  margin: 0;
  color: var(--ui-text, #111827);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
}

.huddle-chat-heading p {
  margin: 2px 0 0;
  color: var(--ui-text-muted, #374151);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.huddle-chat-close {
  width: 34px;
  height: 34px;
  border: 1px solid var(--ui-divider, #e5e7eb);
  border-radius: 8px;
  background: #ffffff;
  color: var(--ui-text-muted, #374151);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background var(--ui-duration-fast, 150ms) var(--ui-ease, ease-out),
    border-color var(--ui-duration-fast, 150ms) var(--ui-ease, ease-out),
    color var(--ui-duration-fast, 150ms) var(--ui-ease, ease-out);
}

.huddle-chat-close:hover {
  background: var(--gray-50, #f9fafb);
  border-color: var(--primary-500, #2563eb);
  color: var(--primary-600, #1d4ed8);
}

.huddle-chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
}

.huddle-chat-loading,
.huddle-chat-empty {
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.huddle-chat-empty h3 {
  margin: 0 0 8px;
  color: var(--ui-text, #111827);
  font-size: 16px;
  font-weight: 700;
}

.huddle-chat-empty p {
  margin: 0;
  color: var(--ui-text-muted, #374151);
  font-size: 13px;
}

.huddle-chat-loading-older {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #ffffff;
}

.huddle-chat-day {
  margin-bottom: 16px;
}

.huddle-chat-day-divider {
  display: flex;
  justify-content: center;
  margin: 8px 0 14px;
}

.huddle-chat-day-divider span {
  padding: 3px 10px;
  border: 1px solid var(--ui-divider, #e5e7eb);
  border-radius: 999px;
  background: #ffffff;
  color: var(--ui-text-hint, #6b7280);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.huddle-message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}

.huddle-message--grouped {
  margin-bottom: 6px;
}

.huddle-message--system {
  justify-content: flex-start;
  width: 100%;
}

.huddle-message--pending {
  opacity: 0.72;
}

.huddle-message-avatar {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  flex: 0 0 auto;
  background: var(--primary-100, #dbeafe);
  border: 1px solid rgba(37, 99, 235, 0.22);
  color: var(--primary-600, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.huddle-message-avatar--hidden {
  visibility: hidden;
}

.huddle-message-body {
  min-width: 0;
  flex: 1;
}

.huddle-message-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 2px;
}

.huddle-message-author {
  color: var(--ui-text, #111827);
  font-size: 13px;
  font-weight: 700;
}

.huddle-message-time {
  color: var(--ui-text-hint, #6b7280);
  font-size: 12px;
}

.huddle-message-content {
  color: var(--ui-text, #111827);
  font-size: 14px;
  line-height: 1.45;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.huddle-message-content--system {
  display: inline-flex;
  max-width: 100%;
  padding: 5px 10px;
  border: 1px solid var(--ui-divider, #e5e7eb);
  border-radius: 999px;
  background: var(--gray-50, #f9fafb);
  color: var(--ui-text-hint, #6b7280);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.huddle-message-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  color: var(--error, #dc2626);
  font-size: 12px;
}

.huddle-message-error button {
  border: none;
  background: transparent;
  color: var(--primary-600, #1d4ed8);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  padding: 0;
  text-decoration: underline;
}

.huddle-chat-input {
  padding: 12px;
  border-top: 1px solid var(--ui-divider, #e5e7eb);
  background: #ffffff;
}

.huddle-chat-input-inner {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  border: 1px solid var(--ui-divider, #e5e7eb);
  border-radius: 10px;
  padding: 8px;
  transition:
    border-color var(--ui-duration-fast, 150ms) var(--ui-ease, ease-out),
    box-shadow var(--ui-duration-fast, 150ms) var(--ui-ease, ease-out);
}

.huddle-chat-input-inner:focus-within {
  border-color: var(--primary-500, #2563eb);
  box-shadow: var(--ui-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.18));
}

.huddle-chat-textarea {
  flex: 1;
  min-height: 34px;
  max-height: 120px;
  resize: vertical;
  border: none;
  outline: none;
  background: transparent;
  color: var(--ui-text, #111827);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
}

.huddle-chat-textarea::placeholder {
  color: var(--ui-text-hint, #6b7280);
}

.huddle-chat-send {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border: none;
  border-radius: 999px;
  background: var(--primary-500, #2563eb);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--ui-duration-fast, 150ms) var(--ui-ease, ease-out);
}

.huddle-chat-send:hover:not(:disabled) {
  background: var(--primary-600, #1d4ed8);
}

.huddle-chat-send:disabled {
  background: var(--gray-200, #e5e7eb);
  color: var(--ui-text-hint, #6b7280);
  cursor: default;
}

@media (max-width: 860px) {
  .huddle-chat-sidebar {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    width: min(92vw, 380px);
    min-width: 0;
  }
}
</style>
