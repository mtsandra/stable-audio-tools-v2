export interface SlotData {
  id: number;
  audioBuffer: AudioBuffer | null;
  fileName: string | null;
  name?: string;
  prompt?: string;
  startTime: number;
  endTime: number | null;
  volume: number; // 0 to 1
}

export interface SoundObject {
  id: string;
  name: string;
  prompt: string;
  audio_url: string;
  is_final: boolean;
  created_at: string;
}

export interface RingData {
  id: string;
  slots: SlotData[];
  bpm: number;
  totalSlots: number;
  isPlaying: boolean;
  currentSlot: number;
  metronomeEnabled: boolean;
}

export interface RingGroupData {
  id: string;
  rings: RingData[];
  position: { x: number; y: number };
  scale: number;
}

export interface LooperState {
  isPlaying: boolean;
  currentSlot: number;
  bpm: number;
  slots: SlotData[];
}
