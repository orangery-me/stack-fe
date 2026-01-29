<script setup>
import { computed, ref, nextTick, watch, onUnmounted } from "vue";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";
import { useChatStore } from "@/modules/channels/stores/chat.store";

const workspaceStore = useWorkspaceStore();
const channelStore = useChannelStore();
const chatStore = useChatStore();

const workspace = computed(() => workspaceStore.workspaceDetail);
const selectedChannel = computed(() => channelStore.selectedChannel);
const members = computed(() => workspaceStore.members);
const isLoadingMessages = computed(() => chatStore.messagesLoading);

const messages = computed(() => {
  if (!selectedChannel.value) return [];
  return chatStore.getMessagesByChannelId(selectedChannel.value.id);
});

const messagesByDay = computed(() => {
  const byDateKey = new Map();

  for (const message of messages.value) {
    const date = new Date(message.createdAt);
    if (Number.isNaN(date.getTime())) continue;

    // Local-day key
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
      // Sort messages within a day
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
        dateKey, // date in UTC time format
        label, // date in local time format
        messages: dayMessages,
      };
    });
  console.log("Messages by day:", dayGroups);

  return dayGroups;
});

const newMessage = ref("");
const messagesContainerRef = ref(null);
const isLoadingOlder = ref(false);
const initialScrolledChannelIds = new Set();

const shouldAutoScrollToBottom = () => {
  if (!messagesContainerRef.value) return false;
  const el = messagesContainerRef.value;
  const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
  const autoScrollThreshold = 80;
  return distanceFromBottom < autoScrollThreshold;
};

const scrollToBottom = async () => {
  await nextTick();
  // Extra frame to ensure DOM (and any async layout) is painted
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
    isLoadingOlder.value ||
    element.scrollTop >= nearTop
  ) {
    return;
  }

  // If store knows there are no more messages, skip fetching
  if (!chatStore.hasMoreForChannel(selectedChannel.value.id)) {
    return;
  }

  isLoadingOlder.value = true;

  const previousScrollHeight = element.scrollHeight;
  // const previousScrollTop = element.scrollTop;

  try {
    await chatStore.fetchMessages(
      workspace.value.id,
      selectedChannel.value.id,
      members.value,
      { appendOlder: true }
    );

    await nextTick();

    const newScrollHeight = element.scrollHeight;
    // Preserve the user's current viewport position after prepending messages
    element.scrollTop = newScrollHeight - previousScrollHeight ;
  } catch (error) {
    console.error("Failed to load older messages:", error);
  } finally {
    isLoadingOlder.value = false;
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
  // Auto scroll will happen via watch on messages
};

const handleRetryMessage = (message) => {
  if (!selectedChannel.value || !workspace.value) return;

  chatStore.retryMessage(
    selectedChannel.value.id,
    message.id,
    workspace.value.id
  );
};

// Get creator name from channel
const getChannelCreator = (channel) => {
  if (!channel || !channel.createdById) return null;
  const creator = members.value.find((m) => m.id === channel.createdById);
  return creator?.name || "Unknown";
};

// Format date
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

// Watch for new messages and auto scroll (only when user is near bottom)
watch(
  () => messages.value.length,
  () => {
    if (shouldAutoScrollToBottom()) {
      scrollToBottom();
    }
  },
  { deep: false }
);

// Watch for channel changes
watch(
  () => selectedChannel.value,
  async (newChannel, oldChannel) => {
    // Cleanup old channel listeners
    if (oldChannel?.id) {
      chatStore.cleanupChannelListeners(oldChannel.id);
    }

    // Fetch messages for new channel
    if (newChannel?.id) {
      try {
        await chatStore.fetchMessages(
          workspace.value.id,
          newChannel.id,
          members.value
        );
        // Force scroll to bottom once on initial load per channel
        if (!initialScrolledChannelIds.has(newChannel.id)) {
          await scrollToBottom();
          initialScrolledChannelIds.add(newChannel.id);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    }
  },
  { immediate: true }
);

// Cleanup on unmount
onUnmounted(() => {
  if (selectedChannel.value?.id) {
    chatStore.cleanupChannelListeners(selectedChannel.value.id);
  }
});
</script>

<template>
  <div class="channel-detail-view">
    <div class="main-content-header">
      <!-- channel header -->
      <div class="channel-header">
        <div class="channel-header-left">
          <span class="channel-title">
            # {{ selectedChannel?.name || "Select a channel" }}
          </span>
          <span
            v-if="selectedChannel"
            class="channel-star"
          >
            <img
              src="/icons/star.svg"
              alt="Star channel"
              class="channel-star-icon"
            >
          </span>
        </div>
        <div class="channel-header-right">
          <button
            v-if="selectedChannel"
            class="header-button"
            title="Invite teammates"
          >
            Invite teammates
          </button>
          <button
            class="header-button"
            title="More options"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="1"
                fill="currentColor"
              />
              <circle
                cx="19"
                cy="12"
                r="1"
                fill="currentColor"
              />
              <circle
                cx="5"
                cy="12"
                r="1"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>
      <!-- list of tabs -->
      <div
        v-if="selectedChannel"
        class="channel-tabs"
      >
        <button class="channel-tab active">
          Messages
        </button>
        <button class="channel-tab">
          Add canvas
        </button>
      </div>
    </div>

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
        class="channel-content"
      >
        <!-- center vertically -->
        <div
          v-if="isLoadingMessages"
          class="d-flex justify-content-center align-items-center"
          style="height: 100vh"
        >
          <div
            class="spinner-border"
            role="status"
          >
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
        <div v-else>
          <div
            v-if="selectedChannel && messages.length === 0"
            class="channel-welcome"
          >
            <h1 class="channel-welcome-title">
              # {{ selectedChannel.name }}
            </h1>
            <p class="channel-welcome-message">
              <span class="channel-creator">
                {{ getChannelCreator(selectedChannel) || "Someone" }}
              </span>
              created this channel on
              <span class="channel-date">
                {{ formatDate(selectedChannel.createdAt) }} </span>. This is the very beginning of the
              <span class="channel-name-highlight">#{{ selectedChannel.name }}</span>
              channel.
            </p>
            <div class="channel-action-cards">
              <div class="action-card action-card--purple">
                <div class="action-card-icon">
                  <img
                    src="/icons/message-circle-dot.svg"
                    alt="Add people icon"
                  >
                </div>
                <h3 class="action-card-title">
                  Add people to channel
                </h3>
              </div>
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

          <div class="channel-messages-container">
            <div class="channel-messages-loading-older">
              <div
                v-if="isLoadingOlder"
                class="d-flex justify-content-center"
              >
                <div
                  class="spinner-border"
                  role="status"
                >
                  <span class="visually-hidden">Loading...</span>
                </div>
              </div>
            </div>
            <div
              v-for="day in messagesByDay"
              :key="day.dateKey"
            >
              <div class="channel-day-divider">
                <span>
                  {{ day.label }}
                </span>
              </div>

              <div
                v-for="message in day.messages"
                :key="message.id"
                class="channel-message"
                :class="{
                  'channel-message--pending': message.status === 'pending',
                  'channel-message--failed': message.status === 'failed',
                }"
              >
                <div class="channel-message-avatar">
                  <span>
                    {{ message.authorName?.charAt(0).toUpperCase() || "U" }}
                  </span>
                </div>
                <div class="channel-message-body">
                  <div class="channel-message-header">
                    <span class="channel-message-author">
                      {{ message.authorName }}
                    </span>
                    <span class="channel-message-time">
                      {{ formatTime(message.createdAt) }}
                    </span>
                  </div>
                  <div class="channel-message-content">
                    {{ message.content }}
                  </div>
                  <div
                    v-if="message.status === 'failed'"
                    class="channel-message-error"
                  >
                    Gửi thất bại.
                    <button
                      class="channel-message-retry"
                      @click="handleRetryMessage(message)"
                    >
                      Thử lại
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
      class="channel-message-input"
    >
      <div class="channel-message-input-inner">
        <textarea
          v-model="newMessage"
          class="channel-message-textarea"
          :placeholder="`Message #${selectedChannel.name}`"
          rows="1"
          @keydown.enter.exact.prevent="handleSendMessage"
          @keydown.shift.enter.stop
        />
        <button
          class="channel-message-send"
          type="button"
          @click="handleSendMessage"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./ChannelDetailView.scss"></style>
