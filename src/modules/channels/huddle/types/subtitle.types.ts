export interface SubtitleSegment {
  call_id: string;
  channel_id: string;
  segment_id: string;
  speaker_name: string;
  speaker_id: string | null;
  source_participant_identity: string | null;
  text: string;
  is_final: boolean;
  start_ms: number;
  end_ms: number | null;
  sequence: number;
  timestamp: string;
}

export interface SubtitleStateEvent {
  call_id: string;
  channel_id: string;
  active_segments: SubtitleSegment[];
}

export interface SubtitlePreference {
  enabled: boolean;
}

export interface TranscriptRecordingStatus {
  call_id: string;
  transcript_id: string | null;
  status: 'recording' | 'completed' | 'failed' | null;
  recording: boolean;
  segment_count: number;
  review_canvas_id: string | null;
}

export interface TranscriptRecordingStartedEvent {
  call_id: string;
  transcript_id: string;
  status: 'recording';
  started_at: string;
}

export interface TranscriptSavedEvent {
  call_id: string;
  transcript_id: string;
  segment_count: number;
  duration_seconds: number;
}
