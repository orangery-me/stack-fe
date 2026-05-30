import { computed, onMounted, onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/config/api.js';
import { useSubtitleStore } from '../stores/subtitle.store';
import type { SubtitleSegment, SubtitleStateEvent } from '../types/subtitle.types';

interface UseSubtitleOptions {
  channelId: string;
  callId: string;
}

const CLEAR_DELAY_MS = 3000;
const MAX_VISIBLE_SPEAKERS = 2;

export function useSubtitle(options: UseSubtitleOptions) {
  const store = useSubtitleStore();
  const { enabled } = storeToRefs(store);
  const socket = ref<Socket | null>(null);
  const segmentMap = ref(new Map<string, SubtitleSegment>());
  const timers = new Map<string, number>();

  const activeSegments = computed(() => {
    const latestSegmentBySpeaker = new Map<string, SubtitleSegment>();

    Array.from(segmentMap.value.values())
      .filter((segment) => segment.call_id === options.callId)
      .sort((a, b) => a.sequence - b.sequence)
      .forEach((segment) => {
        latestSegmentBySpeaker.set(getSpeakerKey(segment), segment);
      });

    return Array.from(latestSegmentBySpeaker.values())
      .sort((a, b) => a.sequence - b.sequence)
      .slice(-MAX_VISIBLE_SPEAKERS);
  });

  function getSpeakerKey(segment: SubtitleSegment) {
    return segment.speaker_id || segment.speaker_name || segment.segment_id;
  }

  function upsertSegment(segment: SubtitleSegment) {
    if (segment.call_id !== options.callId) return;

    const next = new Map(segmentMap.value);
    next.set(segment.segment_id, segment);
    segmentMap.value = next;
    scheduleClear(segment.segment_id);
  }

  function hydrateState(payload: SubtitleStateEvent) {
    if (payload.call_id !== options.callId) return;

    const next = new Map<string, SubtitleSegment>();
    payload.active_segments.forEach((segment) => next.set(segment.segment_id, segment));
    segmentMap.value = next;
    payload.active_segments.forEach((segment) => scheduleClear(segment.segment_id));
  }

  function scheduleClear(segmentId: string) {
    const existing = timers.get(segmentId);
    if (existing) {
      window.clearTimeout(existing);
    }

    const timeoutId = window.setTimeout(() => {
      const next = new Map(segmentMap.value);
      next.delete(segmentId);
      segmentMap.value = next;
      timers.delete(segmentId);
    }, CLEAR_DELAY_MS);
    timers.set(segmentId, timeoutId);
  }

  function clearAllTimers() {
    timers.forEach((timerId) => window.clearTimeout(timerId));
    timers.clear();
  }

  function connect() {
    const token = localStorage.getItem('accessToken');
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

    socket.value = io(`${baseUrl}/huddle`, {
      transports: ['websocket'],
      auth: { token },
    });

    socket.value.on('connect', () => {
      socket.value?.emit('huddle:subscribe', { channelId: options.channelId });
    });
    socket.value.on('subtitle:transcript', upsertSegment);
    socket.value.on('subtitle:state', hydrateState);
    socket.value.on('subtitle:preference_updated', (payload: { enabled: boolean }) => {
      store.setEnabled(payload.enabled);
    });
  }

  function disconnect() {
    socket.value?.emit('huddle:unsubscribe', { channelId: options.channelId });
    socket.value?.disconnect();
    socket.value = null;
    clearAllTimers();
  }

  function syncPreference(enabled: boolean) {
    socket.value?.emit('subtitle:preference', { enabled });
  }

  onMounted(connect);
  onUnmounted(disconnect);

  return {
    enabled,
    activeSegments,
    setEnabled: store.setEnabled,
    syncPreference,
  };
}
