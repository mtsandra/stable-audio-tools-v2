import { useRef, useCallback, useEffect } from 'react';

interface UseClockTickOptions {
  bpm: number;
  totalSlots: number;
  onTick: (slotIndex: number) => void;
  isPlaying: boolean;
}

export function useClockTick({ bpm, totalSlots, onTick, isPlaying }: UseClockTickOptions) {
  const currentSlotRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(0);

  // Calculate interval based on BPM and total slots
  // Base: 32 slots = 8 bars = 32 beats (at 4/4)
  // Interval = (60 / BPM) * (32 / totalSlots)
  const getIntervalMs = useCallback((currentBpm: number, slotCount: number) => {
    return ((60 / currentBpm) * (32 / slotCount)) * 1000;
  }, []);

  const tick = useCallback(() => {
    onTick(currentSlotRef.current);
    currentSlotRef.current = (currentSlotRef.current + 1) % totalSlots;
  }, [onTick, totalSlots]);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    
    currentSlotRef.current = 0;
    lastTickTimeRef.current = performance.now();
    
    // Immediate first tick
    tick();
    
    // Use setInterval for subsequent ticks
    const intervalMs = getIntervalMs(bpm, totalSlots);
    intervalRef.current = window.setInterval(() => {
      tick();
    }, intervalMs);
  }, [bpm, totalSlots, getIntervalMs, tick]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    currentSlotRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    currentSlotRef.current = 0;
  }, []);

  // Handle play/stop
  useEffect(() => {
    if (isPlaying) {
      start();
    } else {
      stop();
    }
    return () => stop();
  }, [isPlaying, start, stop]);

  // Handle BPM or slot count changes while playing
  useEffect(() => {
    if (isPlaying && intervalRef.current) {
      clearInterval(intervalRef.current);
      const intervalMs = getIntervalMs(bpm, totalSlots);
      intervalRef.current = window.setInterval(() => {
        tick();
      }, intervalMs);
    }
  }, [bpm, totalSlots, isPlaying, getIntervalMs, tick]);

  return {
    currentSlot: currentSlotRef.current,
    reset,
  };
}
