import { useCallback, useRef, useEffect, useState } from 'react';
import { getWaveformData, drawWaveform } from '../utils/waveform';
import type { SlotData } from '../types';
import type { PlaybackInfo } from '../hooks/useAudioEngine';

interface SlotProps {
  slot: SlotData;
  index: number;
  isActive: boolean;
  onDrop: (index: number, file: File) => void;
  onEdit: (index: number) => void;
  angle: number;
  radius: number;
  playbackInfo?: PlaybackInfo;
  size: number;
  isDragTarget?: boolean;
}

export function Slot({ slot, index, isActive, onDrop, onEdit, angle, radius, playbackInfo, size, isDragTarget = false }: SlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [fuseProgress, setFuseProgress] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Animate fuse progress
  useEffect(() => {
    if (playbackInfo) {
      const updateFuse = () => {
        const elapsed = Date.now() - playbackInfo.startedAt;
        const progress = Math.min(1, elapsed / playbackInfo.duration);
        setFuseProgress(progress);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(updateFuse);
        }
      };
      updateFuse();
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } else {
      setFuseProgress(0);
    }
  }, [playbackInfo]);

  useEffect(() => {
    if (slot.audioBuffer) {
      const data = getWaveformData(slot.audioBuffer, 24);
      setWaveformData(data);
    } else {
      setWaveformData([]);
    }
  }, [slot.audioBuffer]);

  useEffect(() => {
    if (canvasRef.current && waveformData.length > 0 && slot.audioBuffer) {
      const duration = slot.audioBuffer.duration;
      const startPercent = slot.startTime / duration;
      const endPercent = slot.endTime ? slot.endTime / duration : 1;
      
      drawWaveform(canvasRef.current, waveformData, {
        color: isActive ? '#c084fc' : '#71717a',
        highlightColor: isActive ? '#e9d5ff' : '#a855f7',
        startPercent,
        endPercent,
      });
    }
  }, [waveformData, isActive, slot.audioBuffer, slot.startTime, slot.endTime]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('audio/')) {
        onDrop(index, file);
      }
    }
  }, [index, onDrop]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (slot.audioBuffer) {
      e.stopPropagation();
      onEdit(index);
    }
  }, [slot.audioBuffer, index, onEdit]);

  // Position slot in a circle
  const x = Math.sin((angle * Math.PI) / 180) * radius;
  const y = -Math.cos((angle * Math.PI) / 180) * radius;

  // For empty slots, render a tick mark or highlight when drag target
  if (!slot.audioBuffer) {
    // Show highlight circle when this slot is a drag target
    if (isDragTarget) {
      return (
        <div
          className="absolute rounded-full transition-all duration-100 pointer-events-none"
          style={{
            width: size,
            height: size,
            transform: `translate(${x}px, ${y}px)`,
            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
            border: '2px solid #c084fc',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.8)',
            opacity: 0.9,
          }}
        />
      );
    }
    
    return (
      <div
        className="absolute cursor-pointer hover:opacity-100 transition-opacity"
        style={{
          width: 2,
          height: 12,
          transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`,
          background: isActive 
            ? 'linear-gradient(to bottom, #a855f7, #7c3aed)'
            : 'linear-gradient(to bottom, #52525b, #3f3f46)',
          opacity: isActive ? 1 : 0.6,
          borderRadius: 1,
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        title="Drop audio file"
      />
    );
  }

  // For filled slots, render circle with waveform
  return (
    <div
      className={`
        absolute rounded-full flex items-center justify-center
        cursor-pointer transition-all duration-100
        overflow-hidden
        ${isActive 
          ? 'scale-125 shadow-[0_0_25px_rgba(168,85,247,0.9)]' 
          : 'hover:scale-110'
        }
      `}
      style={{
        width: size,
        height: size,
        transform: `translate(${x}px, ${y}px)`,
        background: isActive
          ? 'linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #7c3aed 100%)'
          : 'linear-gradient(135deg, #3f3f46 0%, #27272a 50%, #18181b 100%)',
        border: isActive 
          ? '2px solid #e9d5ff'
          : '1px solid #52525b',
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      title={`${slot.fileName} - Click to edit`}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={48} 
          height={48}
          className="absolute inset-0 w-full h-full rounded-full opacity-70"
        />
        {/* Burning fuse - circular progress showing remaining time */}
        {playbackInfo && fuseProgress < 1 && (
          <svg 
            className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
            viewBox="0 0 56 56"
          >
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="3"
              strokeDasharray={`${(1 - fuseProgress) * 151} 151`}
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
