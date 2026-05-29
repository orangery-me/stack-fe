import { onMounted, onUnmounted } from 'vue';
import { useHuddleStore } from '../stores/huddle.store';

type HuddleEventHandler = (data: any) => void;

const handlers = new Map<string, HuddleEventHandler[]>();

function on(event: string, handler: HuddleEventHandler) {
  if (!handlers.has(event)) {
    handlers.set(event, []);
  }
  handlers.get(event)!.push(handler);
}

function off(event: string, handler: HuddleEventHandler) {
  const list = handlers.get(event);
  if (list) {
    const idx = list.indexOf(handler);
    if (idx > -1) list.splice(idx, 1);
  }
}

function emit(event: string, data: any) {
  const list = handlers.get(event);
  if (list) {
    list.forEach((h) => h(data));
  }
}

export function useHuddleSignaling(socket: any | null) {
  const store = useHuddleStore();

  function onHuddleStarted(data: any) {
    store.setCall(
      {
        id: data.call_id,
        channelId: data.channel_id,
        status: 'active',
        participantCount: data.participant_count,
        startedAt: data.started_at,
        createdBy: data.created_by,
      },
      data.channel_id,
    );
  }

  function onParticipantJoined(data: any) {
    store.updateParticipantCount(data.participant_count);
  }

  function onParticipantLeft(data: any) {
    store.updateParticipantCount(data.participant_count);
  }

  function onHuddleEnded(data: any) {
    store.markEnded();
  }

  function onDeviceConflict(data: any) {
    emit('device_conflict', data);
  }

  function onDeviceDisconnected(data: any) {
    emit('device_disconnected', data);
  }

  onMounted(() => {
    if (!socket) return;

    socket.on('huddle:started', onHuddleStarted);
    socket.on('huddle:participant_joined', onParticipantJoined);
    socket.on('huddle:participant_left', onParticipantLeft);
    socket.on('huddle:ended', onHuddleEnded);
    socket.on('huddle:device_conflict', onDeviceConflict);
    socket.on('huddle:device_disconnected', onDeviceDisconnected);
  });

  onUnmounted(() => {
    if (!socket) return;

    socket.off('huddle:started', onHuddleStarted);
    socket.off('huddle:participant_joined', onParticipantJoined);
    socket.off('huddle:participant_left', onParticipantLeft);
    socket.off('huddle:ended', onHuddleEnded);
    socket.off('huddle:device_conflict', onDeviceConflict);
    socket.off('huddle:device_disconnected', onDeviceDisconnected);
  });

  return { on, off, emit };
}
