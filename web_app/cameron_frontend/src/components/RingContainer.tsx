import { useState, useCallback, useEffect, useRef } from 'react';
import { LooperRing } from './LooperRing';
import { useAudioEngine } from '../hooks/useAudioEngine';
import type { RingData, SoundObject } from '../types';

interface RingContainerProps {
  ring: RingData;
  ringIndex: number;
  onUpdate: (ring: RingData) => void;
  onSlotEdit: (ringId: string, slotIndex: number) => void;
  onTogglePlay?: () => void;
  zIndex?: number;
}

const BASE_RADIUS = 80;
const RADIUS_INCREMENT = 55;

export function RingContainer({ ring, ringIndex, onUpdate, onSlotEdit, onTogglePlay, zIndex }: RingContainerProps) {
  const [currentSlot, setCurrentSlot] = useState(ring.currentSlot);
  const { loadAudioFile, loadAudioFromUrl, playSlot, playClick, activePlaybacks } = useAudioEngine();
  
  const radius = BASE_RADIUS + (ringIndex * RADIUS_INCREMENT);
  const intervalRef = useRef<number | null>(null);

  // Clock tick logic
  useEffect(() => {
    if (ring.isPlaying) {
      const intervalMs = ((60 / ring.bpm) * (32 / ring.totalSlots)) * 1000;
      
      const tick = () => {
        setCurrentSlot(prev => {
          const next = (prev + 1) % ring.totalSlots;
          
          if (ring.metronomeEnabled) {
            playClick(next % 4 === 0);
          }
          
          const slot = ring.slots[next];
          if (slot?.audioBuffer) {
            playSlot(slot);
          }
          
          return next;
        });
      };
      
      // Play first slot immediately
      if (ring.slots[0]?.audioBuffer) {
        playSlot(ring.slots[0]);
      }
      if (ring.metronomeEnabled) {
        playClick(true);
      }
      
      intervalRef.current = window.setInterval(tick, intervalMs);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentSlot(0);
    }
  }, [ring.isPlaying, ring.bpm, ring.totalSlots, ring.slots, ring.metronomeEnabled, playSlot, playClick]);

  // Restart clock when BPM or slot count changes while playing
  useEffect(() => {
    if (ring.isPlaying && intervalRef.current) {
      clearInterval(intervalRef.current);
      const intervalMs = ((60 / ring.bpm) * (32 / ring.totalSlots)) * 1000;
      intervalRef.current = window.setInterval(() => {
        setCurrentSlot(prev => {
          const next = (prev + 1) % ring.totalSlots;
          if (ring.metronomeEnabled) {
            playClick(next % 4 === 0);
          }
          const slot = ring.slots[next];
          if (slot?.audioBuffer) {
            playSlot(slot);
          }
          return next;
        });
      }, intervalMs);
    }
  }, [ring.bpm, ring.totalSlots]);

  const handleSlotDrop = useCallback(async (index: number, file: File) => {
    try {
      const audioBuffer = await loadAudioFile(file);
      const newSlots = [...ring.slots];
      newSlots[index] = {
        ...newSlots[index],
        audioBuffer,
        fileName: file.name,
        startTime: 0,
        endTime: null,
        volume: 1,
      };
      onUpdate({ ...ring, slots: newSlots });
    } catch (error) {
      console.error('Failed to load audio file:', error);
    }
  }, [ring, onUpdate, loadAudioFile]);

  const handleSlotDropSoundObject = useCallback(async (index: number, obj: SoundObject) => {
    try {
      const audioBuffer = await loadAudioFromUrl(obj.audio_url);
      const newSlots = [...ring.slots];
      newSlots[index] = {
        ...newSlots[index],
        audioBuffer,
        fileName: obj.audio_url.split('/').pop() ?? obj.name,
        name: obj.name,
        prompt: obj.prompt,
        startTime: 0,
        endTime: null,
        volume: 1,
      };
      onUpdate({ ...ring, slots: newSlots });
    } catch (error) {
      console.error('Failed to load sound object:', error);
    }
  }, [ring, onUpdate, loadAudioFromUrl]);

  const handleSlotEditClick = useCallback((index: number) => {
    onSlotEdit(ring.id, index);
  }, [ring.id, onSlotEdit]);

  return (
    <LooperRing
      slots={ring.slots}
      currentSlot={currentSlot}
      isPlaying={ring.isPlaying}
      onSlotDrop={handleSlotDrop}
      onSlotDropSoundObject={handleSlotDropSoundObject}
      onSlotEdit={handleSlotEditClick}
      activePlaybacks={activePlaybacks}
      radius={radius}
      onTogglePlay={onTogglePlay}
      zIndex={zIndex}
    />
  );
}
