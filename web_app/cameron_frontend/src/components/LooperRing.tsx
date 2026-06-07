import { useState, useCallback, useRef } from 'react';
import { Slot } from './Slot';
import type { SlotData, SoundObject } from '../types';
import type { PlaybackInfo } from '../hooks/useAudioEngine';

interface LooperRingProps {
  slots: SlotData[];
  currentSlot: number;
  isPlaying: boolean;
  onSlotDrop: (index: number, file: File) => void;
  onSlotDropSoundObject?: (index: number, obj: SoundObject) => void;
  onSlotEdit: (index: number) => void;
  activePlaybacks: Map<number, PlaybackInfo>;
  radius?: number;
  onTogglePlay?: () => void;
  zIndex?: number;
}

const DEFAULT_RADIUS = 180;

const SLOT_SIZE = 28;

export function LooperRing({ slots, currentSlot, isPlaying, onSlotDrop, onSlotDropSoundObject, onSlotEdit, activePlaybacks, radius = DEFAULT_RADIUS, onTogglePlay, zIndex }: LooperRingProps) {
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate which slot index based on angle from center
  const getSlotFromPosition = useCallback((clientX: number, clientY: number): number => {
    if (!containerRef.current) return 0;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    // Calculate angle in degrees (0 at top, clockwise)
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    
    // Find nearest slot
    const slotAngle = 360 / slots.length;
    const slotIndex = Math.round(angle / slotAngle) % slots.length;
    
    return slotIndex;
  }, [slots.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const slotIndex = getSlotFromPosition(e.clientX, e.clientY);
    setDragOverSlot(slotIndex);
  }, [getSlotFromPosition]);

  const handleDragLeave = useCallback(() => {
    setDragOverSlot(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const slotIndex = getSlotFromPosition(e.clientX, e.clientY);

    const soundObjectData = e.dataTransfer.getData('application/sound-object');
    if (soundObjectData) {
      try {
        const obj: SoundObject = JSON.parse(soundObjectData);
        onSlotDropSoundObject?.(slotIndex, obj);
      } catch {
        console.error('Failed to parse sound object drag data');
      }
    } else {
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('audio/')) {
        onSlotDrop(slotIndex, files[0]);
      }
    }

    setDragOverSlot(null);
  }, [getSlotFromPosition, onSlotDrop, onSlotDropSoundObject]);

  const ringSize = radius * 2 + SLOT_SIZE + 40;

  const handleRingClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePlay?.();
  }, [onTogglePlay]);

  return (
    <div
      ref={containerRef}
      className="absolute rounded-full flex items-center justify-center"
      style={{
        width: ringSize,
        height: ringSize,
        pointerEvents: 'none',
        zIndex,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Clickable ring track - using SVG for donut shape so inner rings are clickable */}
      <svg
        className="absolute"
        style={{
          width: radius * 2 + 20,
          height: radius * 2 + 20,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        <title>{isPlaying ? 'Click to stop' : 'Click to play'}</title>
        <circle
          cx={radius + 10}
          cy={radius + 10}
          r={radius}
          fill="none"
          stroke={isPlaying 
            ? 'rgba(168, 85, 247, 0.6)' 
            : isHovered 
              ? 'rgba(168, 85, 247, 0.4)' 
              : 'rgba(63, 63, 70, 0.5)'}
          strokeWidth={isHovered ? 12 : 8}
          className="cursor-pointer"
          style={{
            filter: isHovered ? 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.4))' : 'none',
            transition: 'all 0.2s ease',
            pointerEvents: 'stroke',
          }}
          onClick={handleRingClick}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        />
      </svg>

      {/* Slots - re-enable pointer events */}
      {slots.map((slot, index) => {
        const angle = (360 / slots.length) * index;
        const isDragTarget = dragOverSlot === index;
        return (
          <Slot
            key={slot.id}
            slot={slot}
            index={index}
            isActive={isPlaying && currentSlot === index}
            onDrop={onSlotDrop}
            onEdit={onSlotEdit}
            angle={angle}
            radius={radius}
            playbackInfo={activePlaybacks.get(slot.id)}
            size={SLOT_SIZE}
            isDragTarget={isDragTarget}
          />
        );
      })}

      {/* Playhead indicator */}
      {isPlaying && (
        <div
          className="absolute w-2 h-2 bg-purple-400 rounded-full shadow-lg shadow-purple-400/80 left-1/2 top-1/2 pointer-events-none"
          style={{
            transform: `translate(-50%, -50%) rotate(${(360 / slots.length) * currentSlot}deg) translateY(-${radius + 35}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  );
}
