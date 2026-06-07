import { useRef, useCallback, useState } from 'react';
import type { SlotData } from '../types';

export interface PlaybackInfo {
  slotId: number;
  startedAt: number;
  duration: number;
}

export function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<Map<number, AudioBufferSourceNode>>(new Map());
  const [activePlaybacks, setActivePlaybacks] = useState<Map<number, PlaybackInfo>>(new Map());

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const loadAudioFile = useCallback(async (file: File): Promise<AudioBuffer> => {
    const ctx = getAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  }, [getAudioContext]);

  const loadAudioFromUrl = useCallback(async (url: string): Promise<AudioBuffer> => {
    const ctx = getAudioContext();
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  }, [getAudioContext]);

  const playSlot = useCallback((slot: SlotData, when?: number) => {
    if (!slot.audioBuffer) return;
    
    const ctx = getAudioContext();
    
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = slot.audioBuffer;
    
    // Create gain node for volume control
    const gainNode = ctx.createGain();
    gainNode.gain.value = slot.volume;
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    const playTime = when ?? ctx.currentTime;
    
    // Calculate start offset and duration based on slot's window settings
    const startOffset = slot.startTime;
    const duration = slot.endTime !== null 
      ? slot.endTime - slot.startTime 
      : slot.audioBuffer.duration - slot.startTime;
    
    source.start(playTime, startOffset, duration);
    
    // Track active source for cleanup
    activeSourcesRef.current.set(slot.id, source);
    
    // Track playback timing for fuse visualization
    setActivePlaybacks(prev => {
      const next = new Map(prev);
      next.set(slot.id, {
        slotId: slot.id,
        startedAt: Date.now(),
        duration: duration * 1000, // convert to ms
      });
      return next;
    });
    
    source.onended = () => {
      activeSourcesRef.current.delete(slot.id);
      setActivePlaybacks(prev => {
        const next = new Map(prev);
        next.delete(slot.id);
        return next;
      });
    };
  }, [getAudioContext]);

  const stopAll = useCallback(() => {
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
    });
    activeSourcesRef.current.clear();
    setActivePlaybacks(new Map());
  }, []);

  const playClick = useCallback((isDownbeat: boolean = false) => {
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Higher pitch for downbeat (first beat of bar)
    oscillator.frequency.value = isDownbeat ? 1000 : 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }, [getAudioContext]);

  const getCurrentTime = useCallback(() => {
    return getAudioContext().currentTime;
  }, [getAudioContext]);

  return {
    loadAudioFile,
    loadAudioFromUrl,
    playSlot,
    stopAll,
    playClick,
    getCurrentTime,
    getAudioContext,
    activePlaybacks,
  };
}
