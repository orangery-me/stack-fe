import { ref, readonly, markRaw } from 'vue';
import {
  Room,
  RoomEvent,
  ConnectionState,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from 'livekit-client';
import type { HuddleParticipantInfo } from '../types/huddle.types';

interface HuddleState {
  room: Room | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  participants: HuddleParticipantInfo[];
  localMicEnabled: boolean;
  localCameraEnabled: boolean;
  errorMessage: string;
}

const state = ref<HuddleState>({
  room: null,
  isConnected: false,
  connectionState: ConnectionState.Disconnected,
  participants: [],
  localMicEnabled: true,
  localCameraEnabled: true,
  errorMessage: '',
});

function participantFromRemote(p: RemoteParticipant): HuddleParticipantInfo {
  return {
    id: p.sid,
    userId: p.identity,
    displayName: p.name || p.identity,
    micEnabled: p.isMicrophoneEnabled,
    cameraEnabled: p.isCameraEnabled,
    status: 'active',
  };
}

export function useHuddle() {
  async function connect(url: string, token: string): Promise<void> {
    try {
      if (state.value.room) {
        await state.value.room.disconnect();
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      room.on(RoomEvent.ConnectionStateChanged, (newState: ConnectionState) => {
        state.value.connectionState = newState;
        state.value.isConnected = newState === ConnectionState.Connected;
      });

      room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
        state.value.participants.push(participantFromRemote(p));
      });

      room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
        state.value.participants = state.value.participants.filter(
          (existing) => existing.id !== p.sid,
        );
      });

      room.on(RoomEvent.TrackSubscribed, () => {
        state.value = { ...state.value };
      });

      room.on(RoomEvent.TrackUnsubscribed, () => {
        state.value = { ...state.value };
      });

      await room.connect(url, token);
      state.value.room = markRaw(room);

      // Sync existing participants
      room.remoteParticipants.forEach((p) => {
        state.value.participants.push(participantFromRemote(p));
      });

      state.value.localMicEnabled = room.localParticipant.isMicrophoneEnabled;
      state.value.localCameraEnabled = room.localParticipant.isCameraEnabled;
      state.value.errorMessage = '';
    } catch (err: any) {
      state.value.errorMessage = err.message || 'Failed to connect to call';
      throw err;
    }
  }

  async function disconnect(): Promise<void> {
    if (state.value.room) {
      await state.value.room.disconnect();
      state.value.room = null;
      state.value.isConnected = false;
      state.value.participants = [];
    }
  }

  function getRoom(): Room | null {
    return state.value.room;
  }

  function isConnected(): boolean {
    return state.value.isConnected;
  }

  return {
    state: readonly(state),
    connect,
    disconnect,
    getRoom,
    isConnected,
  };
}
