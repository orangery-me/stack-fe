import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { HuddleCallInfo } from '../types/huddle.types';
import { huddleService } from '../services/huddle.service';

export const useHuddleStore = defineStore('huddle', () => {
  const activeCall = ref<HuddleCallInfo | null>(null);
  const participantCount = ref(0);
  const currentChannelId = ref<string | null>(null);
  const hasActiveHuddle = ref(false);

  const isActive = computed(() => activeCall.value?.status === 'active');
  const isEnded = computed(() => activeCall.value?.status === 'ended');

  function setCall(call: HuddleCallInfo | null, channelId: string) {
    currentChannelId.value = channelId;
    activeCall.value = call;
    participantCount.value = call?.participantCount ?? 0;
  }

  function updateParticipantCount(count: number) {
    participantCount.value = count;
    if (activeCall.value) {
      activeCall.value = { ...activeCall.value, participantCount: count };
    }
  }

  function markEnded() {
    if (activeCall.value) {
      activeCall.value = { ...activeCall.value, status: 'ended' };
      participantCount.value = 0;
    }
  }

  function clearCall() {
    activeCall.value = null;
    participantCount.value = 0;
  }

  async function checkActiveHuddle(channelId: string) {
    try {
      const status = await huddleService.getStatus(channelId);
      hasActiveHuddle.value = status.active;
    } catch (err) {
      hasActiveHuddle.value = false;
    }
  }

  return {
    activeCall,
    participantCount,
    currentChannelId,
    hasActiveHuddle,
    isActive,
    isEnded,
    setCall,
    updateParticipantCount,
    markEnded,
    clearCall,
    checkActiveHuddle,
  };
});
