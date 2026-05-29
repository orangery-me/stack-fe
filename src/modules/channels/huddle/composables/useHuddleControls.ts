import { ref } from 'vue';
import { huddleService } from '../services/huddle.service';
import type { Room } from 'livekit-client';

export function useHuddleControls(channelId: string) {
  const micEnabled = ref(true);
  const cameraEnabled = ref(true);
  const isUpdating = ref(false);

  async function toggleMic(room: Room | null) {
    if (!room) return;
    try {
      isUpdating.value = true;
      const newState = !micEnabled.value;
      await room.localParticipant.setMicrophoneEnabled(newState);
      micEnabled.value = newState;
      await huddleService.updateState(channelId, { micEnabled: newState });
    } catch (err) {
      console.error('Failed to toggle mic:', err);
    } finally {
      isUpdating.value = false;
    }
  }

  async function toggleCamera(room: Room | null) {
    if (!room) return;
    try {
      isUpdating.value = true;
      const newState = !cameraEnabled.value;
      await room.localParticipant.setCameraEnabled(newState);
      cameraEnabled.value = newState;
      await huddleService.updateState(channelId, { cameraEnabled: newState });
    } catch (err) {
      console.error('Failed to toggle camera:', err);
    } finally {
      isUpdating.value = false;
    }
  }

  async function requestPermissions(): Promise<{ mic: boolean; camera: boolean }> {
    let mic = false;
    let camera = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      mic = stream.getAudioTracks().length > 0;
      camera = stream.getVideoTracks().length > 0;
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      // Permission denied
    }
    return { mic, camera };
  }

  return {
    micEnabled,
    cameraEnabled,
    isUpdating,
    toggleMic,
    toggleCamera,
    requestPermissions,
  };
}
