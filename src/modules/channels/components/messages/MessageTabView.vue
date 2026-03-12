<script setup>
import { computed, ref, nextTick, watch, onUnmounted } from "vue";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";
import { useChatStore } from "@/modules/channels/stores/chat.store";
import AppLoading from "@/components/loading/AppLoading.vue";

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
  requestAnimationFrame(() => {
    if (!messagesContainerRef.value) return;
    messagesContainerRef.value.scrollTop =
      messagesContainerRef.value.scrollHeight;
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

  if (!chatStore.hasMoreForChannel(selectedChannel.value.id)) {
    return;
  }

  isLoadingOlder.value = true;

  const previousScrollHeight = element.scrollHeight;

  try {
    await chatStore.fetchMessages(
      workspace.value.id,
      selectedChannel.value.id,
      members.value,
      { appendOlder: true }
    );

    await nextTick();

    const newScrollHeight = element.scrollHeight;
    element.scrollTop = newScrollHeight - previousScrollHeight;
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
};

const handleRetryMessage = (message) => {
  if (!selectedChannel.value || !workspace.value) return;

  chatStore.retryMessage(
    selectedChannel.value.id,
    message.id,
    workspace.value.id
  );
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

watch(
  () => messages.value.length,
  () => {
    if (shouldAutoScrollToBottom()) {
      scrollToBottom();
    }
  },
  { deep: false }
);

watch(
  () => selectedChannel.value,
  async (newChannel, oldChannel) => {
    // Cleanup listeners for old channel when switching channels
    if (oldChannel?.id && oldChannel.id !== newChannel?.id) {
      chatStore.cleanupChannelListeners(oldChannel.id);
    }

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

// Cleanup when rời hẳn khỏi ChannelDetailView
onUnmounted(() => {
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
  
          <div class="message-tab-messages">
            <div class="message-tab-messages-loading-older">
              <div
                v-if="isLoadingOlder"
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
                v-for="message in day.messages"
                :key="message.id"
                class="message-item"
                :class="{
                  'message-item--pending': message.status === 'pending',
                  'message-item--failed': message.status === 'failed',
                }"
              >
                <div class="message-item-avatar">
                  <span>
                    {{ message.authorName?.charAt(0).toUpperCase() || "U" }}
                  </span>
                </div>
                <div class="message-item-body">
                  <div class="message-item-header">
                    <span class="message-item-author">
                      {{ message.authorName }}
                    </span>
                    <span class="message-item-time">
                      {{ formatTime(message.createdAt) }}
                    </span>
                  </div>
                  <div class="message-item-content">
                    {{ message.content }}
                  </div>
                  <div
                    v-if="message.status === 'failed'"
                    class="message-item-error"
                  >
                    Gửi thất bại.
                    <button
                      class="message-item-retry"
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
        <button
          class="message-input-send"
          type="button"
          @click="handleSendMessage"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./MessageTabView.scss"></style>

