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
    id: p.identity,
    userId: p.identity,
    displayName: p.name || p.identity,
    micEnabled: p.isMicrophoneEnabled,
    cameraEnabled: p.isCameraEnabled,
    status: 'active',
  };
}

function isSystemParticipant(p: RemoteParticipant): boolean {
  return p.identity?.startsWith('subtitle-bot:') || false;
}

function upsertParticipant(p: RemoteParticipant) {
  if (isSystemParticipant(p)) return;

  const participant = participantFromRemote(p);
  const existingIndex = state.value.participants.findIndex(
    (existing) => existing.userId === p.identity,
  );

  if (existingIndex === -1) {
    state.value.participants = [...state.value.participants, participant];
    return;
  }

  state.value.participants = state.value.participants.map((existing, index) =>
    index === existingIndex ? { ...existing, ...participant } : existing,
  );
}

function removeParticipant(p: RemoteParticipant) {
  state.value.participants = state.value.participants.filter(
    (existing) => existing.userId !== p.identity,
  );
}

export function useHuddle() {
  async function connect(url: string, token: string): Promise<void> {
    try {
      if (state.value.room) {
        await state.value.room.disconnect();
      }
      state.value.participants = [];

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      room.on(RoomEvent.ConnectionStateChanged, (newState: ConnectionState) => {
        state.value.connectionState = newState;
        state.value.isConnected = newState === ConnectionState.Connected;
      });

      room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
        upsertParticipant(p);
      });

      room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
        removeParticipant(p);
      });

      const syncRemoteParticipantByIdentity = (identity: string) => {
        const remoteParticipant = room.remoteParticipants.get(identity);
        if (remoteParticipant) {
          upsertParticipant(remoteParticipant);
        }
      };

      room.on(RoomEvent.TrackMuted, (_publication, p) => {
        syncRemoteParticipantByIdentity(p.identity);
      });

      room.on(RoomEvent.TrackUnmuted, (_publication, p) => {
        syncRemoteParticipantByIdentity(p.identity);
      });

      room.on(RoomEvent.TrackPublished, (_publication: RemoteTrackPublication, p: RemoteParticipant) => {
        upsertParticipant(p);
      });

      room.on(RoomEvent.TrackUnpublished, (_publication: RemoteTrackPublication, p: RemoteParticipant) => {
        upsertParticipant(p);
      });

      room.on(RoomEvent.TrackSubscribed, (_track, _publication: RemoteTrackPublication, p: RemoteParticipant) => {
        upsertParticipant(p);
      });

      room.on(RoomEvent.TrackUnsubscribed, (_track, _publication: RemoteTrackPublication, p: RemoteParticipant) => {
        upsertParticipant(p);
      });

      await room.connect(url, token);
      state.value.room = markRaw(room);

      // Sync existing participants
      state.value.participants = [];
      room.remoteParticipants.forEach((p) => {
        upsertParticipant(p);
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
