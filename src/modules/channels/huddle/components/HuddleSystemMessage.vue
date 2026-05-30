<template>
  <div class="huddle-system-msg" :class="statusClass">
    <span class="huddle-icon" aria-hidden="true">
      <PhoneOff v-if="isEndedMessage" :size="16" />
      <Headphones v-else :size="16" />
    </span>
    <span class="huddle-text">
      <span class="huddle-title-row">
        <strong>{{ titleText }}</strong>
        <span v-if="showLiveBadge" class="huddle-live-badge">LIVE</span>
        <span class="huddle-time">{{ displayTime }}</span>
      </span>
      <span class="huddle-detail">{{ detailText }}</span>
    </span>
    <button
      v-if="showJoinButton"
      class="join-btn"
      type="button"
      @click="$emit('join')"
    >
      Join now
    </button>
    <button
      v-if="showTranscriptButton"
      class="transcript-btn"
      type="button"
      :disabled="isOpeningTranscript || !callId"
      :title="callId ? 'Review meeting transcript' : 'Transcript is not available'"
      @click="handleReviewTranscript"
    >
      <FileText :size="13" />
      {{ isOpeningTranscript ? 'Opening...' : 'Review meeting transcript' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { FileText, Headphones, PhoneOff } from 'lucide-vue-next';
import { useHuddleStore } from '../stores/huddle.store';
import { huddleService } from '../services/huddle.service';

const store = useHuddleStore();
const router = useRouter();
const isOpeningTranscript = ref(false);

defineEmits<{
  (e: 'join'): void;
}>();

const props = defineProps<{
  messageContent: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  allowJoinAction?: boolean;
}>();

const huddleMetadata = computed(() => props.metadata?.huddle || {});
const callId = computed(() => huddleMetadata.value.callId || '');
const huddleEvent = computed(() => huddleMetadata.value.event || (props.messageContent === 'Huddle ended' ? 'ended' : 'started'));
const isEndedMessage = computed(() => huddleEvent.value === 'ended');
const isStartMessage = computed(() => huddleEvent.value === 'started');

function formatTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

const startedAt = computed(() => huddleMetadata.value.startedAt || props.createdAt);
const endedAt = computed(() => huddleMetadata.value.endedAt || props.createdAt);
const displayTime = computed(() => formatTime(isEndedMessage.value ? endedAt.value : startedAt.value));
const participantCount = computed(() => {
  if (isStartMessage.value && store.hasActiveHuddle) {
    return store.participantCount || huddleMetadata.value.participantCount || 1;
  }
  return huddleMetadata.value.participantCount || 1;
});

const participantLabel = computed(() => (participantCount.value === 1 ? 'participant' : 'participants'));

const titleText = computed(() => (isEndedMessage.value ? 'Huddle ended' : 'Huddle started'));
const showLiveBadge = computed(() => isStartMessage.value && store.hasActiveHuddle);
const hasTranscript = computed(() => huddleMetadata.value.transcriptEnabled === true || Boolean(huddleMetadata.value.transcriptId));
const detailText = computed(() => {
  if (isEndedMessage.value) {
    return hasTranscript.value
      ? `Ended at ${displayTime.value || 'the recorded time'}. Transcript is ready for review.`
      : `Ended at ${displayTime.value || 'the recorded time'}.`;
  }
  return `Started at ${displayTime.value || 'the recorded time'} with ${participantCount.value} ${participantLabel.value} in the huddle.`;
});

const statusClass = computed(() => ({
  'system-msg--active': !isEndedMessage.value,
  'system-msg--ended': isEndedMessage.value,
}));

const showJoinButton = computed(() => props.allowJoinAction !== false && isStartMessage.value && store.hasActiveHuddle && !store.isCurrentUserParticipant);
const showTranscriptButton = computed(() => isEndedMessage.value && hasTranscript.value);

async function handleReviewTranscript() {
  if (!callId.value || isOpeningTranscript.value) return;
  isOpeningTranscript.value = true;
  try {
    const result = await huddleService.createTranscriptReviewCanvas(callId.value);
    if (result?.canvas_id) {
      await router.push({ name: 'canvasEdit', params: { canvasId: result.canvas_id } });
    }
  } finally {
    isOpeningTranscript.value = false;
  }
}
</script>

<style scoped>
.huddle-system-msg {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  margin: 6px 0;
  font-size: 13px;
  line-height: 1.35;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}
.system-msg--active {
  background: #dcfce7;
  border: 1px solid #86efac;
  color: #14532d;
}
.system-msg--ended {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
}
.huddle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border-radius: 8px;
  background: #059669;
  color: #fff;
}
.system-msg--ended .huddle-icon {
  background: #2563eb;
}
.huddle-text {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}
.huddle-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.huddle-live-badge {
  border-radius: 999px;
  background: #047857;
  color: #fff;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
}
.huddle-time {
  color: rgba(15, 23, 42, 0.62);
  font-size: 12px;
  white-space: nowrap;
}
.huddle-detail {
  color: rgba(15, 23, 42, 0.76);
  font-size: 13px;
  overflow-wrap: anywhere;
}
.join-btn,
.transcript-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex: 0 0 auto;
  min-height: 30px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.join-btn {
  padding: 6px 12px;
  background: #059669;
  color: #fff;
}
.join-btn:hover {
  background: #047857;
}
.transcript-btn {
  padding: 6px 10px;
  background: #1d4ed8;
  color: #fff;
}
.transcript-btn:hover {
  background: #1e40af;
}
.transcript-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
.join-btn:active,
.transcript-btn:active {
  transform: translateY(1px);
}

@media (max-width: 640px) {
  .huddle-system-msg {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .huddle-text {
    flex-basis: calc(100% - 48px);
  }

  .join-btn,
  .transcript-btn {
    margin-left: 48px;
  }
}
</style>
