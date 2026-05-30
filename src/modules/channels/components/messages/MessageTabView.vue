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
import { useInfiniteQuery } from "@tanstack/vue-query";
import chatService from "@/services/chat.service";
import AppLoading from "@/components/loading/AppLoading.vue";
import HuddleSystemMessage from "@/modules/channels/huddle/components/HuddleSystemMessage.vue";

const emit = defineEmits(["add-people-to-channel", "join-huddle"]);

const workspaceStore = useWorkspaceStore();
const channelStore = useChannelStore();
const chatStore = useChatStore();
const huddleStore = useHuddleStore();

const workspace = computed(() => workspaceStore.workspaceDetail);
const selectedChannel = computed(() => channelStore.selectedChannel);
const members = computed(() => workspaceStore.members);
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

const newMessage = ref("");
const messagesContainerRef = ref(null);
const initialScrolledChannelIds = new Set();

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

const handleSendMessage = () => {
  if (!selectedChannel.value || !workspace.value || !newMessage.value.trim())
    return;

  chatStore.sendMessage({
    workspaceId: workspace.value.id,
    channelId: selectedChannel.value.id,
    content: newMessage.value,
  });

  newMessage.value = "";
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
  emit("add-people-to-channel");
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
  <div class="message-tab-root">
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
            v-if="selectedChannel && messages.length === 0"
            class="message-tab-welcome"
          >
            <h1 class="message-tab-welcome-title">
              # {{ selectedChannel.name }}
            </h1>
            <p class="message-tab-welcome-message">
              <span class="message-tab-creator">
                {{ getChannelCreator(selectedChannel) || "Someone" }}
              </span>
              created this channel on
              <span class="message-tab-date">
                {{ formatDate(selectedChannel.createdAt) }} </span>. This is the very beginning of the
              <span class="message-tab-name-highlight">#{{ selectedChannel.name }}</span>
              channel.
            </p>
            <div class="message-tab-action-cards">
              <button
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
              <div class="action-card action-card--blue">
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
                class="message-item"
                :class="{
                  'message-item--system': message.messageType === 'system',
                  'message-item--pending': message.status === 'pending',
                  'message-item--failed': message.status === 'failed',
                  'message-item--grouped': message.messageType !== 'system' && !isMessageGroupStart(day.messages, messageIndex),
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
                  </div>
                  <div
                    class="message-item-content"
                    :class="{ 'message-item-content--system': message.messageType === 'system' && !isHuddleSystemMessage(message) }"
                  >
                    <HuddleSystemMessage
                      v-if="isHuddleSystemMessage(message)"
                      :message-content="message.content"
                      :metadata="message.metadata"
                      :created-at="message.createdAt"
                      @join="$emit('join-huddle')"
                    />
                    <template v-else>
                      {{ message.content }}
                    </template>
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
      v-if="selectedChannel"
      class="message-input"
    >
      <div class="message-input-inner">
        <textarea
          v-model="newMessage"
          class="message-input-textarea"
          :placeholder="`Message #${selectedChannel.name}`"
          rows="1"
          @keydown.enter.exact.prevent="handleSendMessage"
          @keydown.shift.enter.stop
        />
        <div class="message-input-toolbar">
          <div class="message-input-actions">
            <button
              class="message-input-action-btn"
              type="button"
              title="Add"
            >
              <i class="pi pi-plus" />
            </button>
            <button
              class="message-input-action-btn"
              type="button"
              title="Emoji"
            >
              <i class="pi pi-face-smile" />
            </button>
            <button
              class="message-input-action-btn"
              type="button"
              title="Mention"
            >
              <i class="pi pi-at" />
            </button>
            <button
              class="message-input-action-btn"
              type="button"
              title="Video"
            >
              <i class="pi pi-video" />
            </button>
            <button
              class="message-input-action-btn"
              type="button"
              title="Voice message"
            >
              <i class="pi pi-microphone" />
            </button>
            <button
              class="message-input-action-btn"
              type="button"
              title="Note"
            >
              <i class="pi pi-file-edit" />
            </button>
          </div>
          <button
            class="message-input-send"
            type="button"
            :disabled="!newMessage.trim()"
            @click="handleSendMessage"
          >
            <i class="pi pi-send" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./MessageTabView.scss"></style>
