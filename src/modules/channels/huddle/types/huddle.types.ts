export interface HuddleCallInfo {
  id: string;
  channelId: string;
  status: 'active' | 'ended';
  participantCount: number;
  startedAt: string;
  createdBy: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface HuddleParticipantInfo {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  micEnabled: boolean;
  cameraEnabled: boolean;
  status: 'active' | 'left' | 'disconnected';
}

export interface HuddleJoinResponse {
  callId: string;
  livekitRoomName: string;
  livekitToken: string;
  livekitUrl: string;
  participantCount: number;
}

export interface HuddleStatusResponse {
  active: boolean;
  call: HuddleCallInfo | null;
}

export interface HuddleStateUpdate {
  micEnabled?: boolean;
  cameraEnabled?: boolean;
}

export type HuddleEventType =
  | 'huddle:started'
  | 'huddle:participant_joined'
  | 'huddle:participant_left'
  | 'huddle:participant_state_changed'
  | 'huddle:ended'
  | 'huddle:device_conflict'
  | 'huddle:device_disconnected';
