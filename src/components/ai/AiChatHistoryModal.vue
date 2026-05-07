<script setup>
import { ref, computed, watch } from "vue";
import { X, Search, MessageSquare } from "lucide-vue-next";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  sessions: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:open", "select"]);

const searchQuery = ref("");

watch(
  () => props.open,
  (opened) => {
    if (!opened) searchQuery.value = "";
  }
);

const filteredSessions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return props.sessions;
  return props.sessions.filter((s) =>
    (s.title || "New chat").toLowerCase().includes(q)
  );
});

function selectSession(session) {
  emit("select", session);
  emit("update:open", false);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="ai-history-overlay"
        @click.self="$emit('update:open', false)"
      >
        <div
          class="ai-history-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Chat history"
        >
          <div class="ai-history-header">
            <span class="ai-history-title">Chat history</span>
            <button
              type="button"
              class="ai-history-close"
              aria-label="Close"
              @click="$emit('update:open', false)"
            >
              <X :size="16" />
            </button>
          </div>

          <div class="ai-history-search">
            <Search
              :size="14"
              class="ai-history-search-icon"
            />
            <input
              v-model="searchQuery"
              type="text"
              class="ai-history-search-input"
              placeholder="Search by title..."
              autofocus
            >
          </div>

          <div class="ai-history-list">
            <div
              v-if="filteredSessions.length === 0"
              class="ai-history-empty"
            >
              <MessageSquare
                :size="28"
                class="ai-history-empty-icon"
              />
              <p>No chats found</p>
            </div>

            <button
              v-for="session in filteredSessions"
              :key="session.id"
              type="button"
              class="ai-history-item"
              @click="selectSession(session)"
            >
              <div class="ai-history-item-title">
                {{ session.title || "New chat" }}
              </div>
              <div class="ai-history-item-date">
                {{ formatDate(session.createdAt) }}
              </div>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.ai-history-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.ai-history-modal {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
  width: 480px;
  max-width: 100%;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--ui-divider, #e5e7eb);
  flex-shrink: 0;
}

.ai-history-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ui-text, #0f172a);
}

.ai-history-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--ui-text-muted, #64748b);
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(15, 23, 42, 0.06);
  }
}

.ai-history-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ui-divider, #e5e7eb);
  flex-shrink: 0;
}

.ai-history-search-icon {
  color: var(--ui-text-hint, #94a3b8);
  flex-shrink: 0;
}

.ai-history-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13.5px;
  color: var(--ui-text, #0f172a);
  background: transparent;
  font-family: inherit;

  &::placeholder {
    color: var(--ui-text-hint, #94a3b8);
  }
}

.ai-history-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.ai-history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 16px;
  color: var(--ui-text-muted, #64748b);
  font-size: 13px;
}

.ai-history-empty-icon {
  opacity: 0.4;
}

.ai-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
  gap: 12px;

  &:hover {
    background: rgba(15, 23, 42, 0.05);
  }
}

.ai-history-item-title {
  font-size: 13.5px;
  color: var(--ui-text, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.ai-history-item-date {
  font-size: 12px;
  color: var(--ui-text-hint, #94a3b8);
  flex-shrink: 0;
}

// Transition
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s ease;

  .ai-history-modal {
    transition: transform 0.18s ease, opacity 0.18s ease;
  }
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;

  .ai-history-modal {
    transform: scale(0.96);
    opacity: 0;
  }
}
</style>
