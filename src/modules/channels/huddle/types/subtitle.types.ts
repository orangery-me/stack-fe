export interface SubtitleSegment {
  call_id: string;
  channel_id: string;
  segment_id: string;
  speaker_name: string;
  speaker_id: string | null;
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
