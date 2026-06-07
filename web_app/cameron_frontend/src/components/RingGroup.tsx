import { useState, useCallback, useRef, useEffect } from 'react';
import { RingContainer } from './RingContainer';
import type { RingGroupData, RingData } from '../types';

interface RingGroupProps {
  group: RingGroupData;
  onUpdate: (group: RingGroupData) => void;
  onSlotEdit: (groupId: string, ringId: string, slotIndex: number) => void;
}

export function RingGroup({ group, onUpdate, onSlotEdit }: RingGroupProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ scale: 1, x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Start dragging from anywhere on the group
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setIsSelected(true);
    dragStart.current = {
      x: e.clientX - group.position.x,
      y: e.clientY - group.position.y,
    };
  }, [group.position]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setIsSelected(true);
    resizeStart.current = {
      scale: group.scale,
      x: e.clientX,
      y: e.clientY,
    };
  }, [group.scale]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Add/remove global listeners for drag and resize
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const onMove = (e: MouseEvent) => {
      if (isDragging) {
        onUpdate({
          ...group,
          position: {
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y,
          },
        });
      } else if (isResizing) {
        const dx = e.clientX - resizeStart.current.x;
        const newScale = Math.max(0.3, Math.min(2, resizeStart.current.scale + dx * 0.005));
        onUpdate({
          ...group,
          scale: newScale,
        });
      }
    };

    const onUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, isResizing, group, onUpdate]);

  const handleUpdateRing = useCallback((updatedRing: RingData) => {
    onUpdate({
      ...group,
      rings: group.rings.map(r => r.id === updatedRing.id ? updatedRing : r),
    });
  }, [group, onUpdate]);

  const handleAddRing = useCallback(() => {
    const newRing: RingData = {
      id: crypto.randomUUID(),
      slots: Array.from({ length: 16 }, (_, i) => ({
        id: i,
        audioBuffer: null,
        fileName: null,
        startTime: 0,
        endTime: null,
        volume: 1,
      })),
      bpm: 120,
      totalSlots: 16,
      isPlaying: false,
      currentSlot: 0,
      metronomeEnabled: false,
    };
    onUpdate({
      ...group,
      rings: [...group.rings, newRing],
    });
  }, [group, onUpdate]);

  const handleSlotEdit = useCallback((ringId: string, slotIndex: number) => {
    onSlotEdit(group.id, ringId, slotIndex);
  }, [group.id, onSlotEdit]);

  const handleToggleAllRings = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const allPlaying = group.rings.every(r => r.isPlaying);
    onUpdate({
      ...group,
      rings: group.rings.map(r => ({ ...r, isPlaying: !allPlaying })),
    });
  }, [group, onUpdate]);

  const handleToggleRing = useCallback((ringId: string) => {
    onUpdate({
      ...group,
      rings: group.rings.map(r => r.id === ringId ? { ...r, isPlaying: !r.isPlaying } : r),
    });
  }, [group, onUpdate]);

  const maxRadius = 80 + (group.rings.length * 55) + 40;
  const containerSize = maxRadius * 2 + 100;
  const outerRingRadius = maxRadius + 30;

  return (
    <div
      ref={containerRef}
      className={`absolute ${isSelected ? 'z-10' : 'z-0'}`}
      style={{
        left: group.position.x,
        top: group.position.y,
        transform: `translate(-50%, -50%) scale(${group.scale})`,
      }}
      onMouseDown={handleMouseDown}
      onClick={() => setIsSelected(true)}
    >
      {/* Ring area */}
      <div 
        className="cursor-move relative flex items-center justify-center"
        style={{ width: containerSize, height: containerSize }}
      >
        {/* Outer ring click zone - start/stop all */}
        <div
          className="absolute rounded-full cursor-pointer transition-all duration-200 hover:bg-purple-500/10"
          style={{
            width: outerRingRadius * 2,
            height: outerRingRadius * 2,
            border: group.rings.some(r => r.isPlaying) 
              ? '2px solid rgba(168, 85, 247, 0.5)' 
              : '2px dashed rgba(113, 113, 122, 0.3)',
          }}
          onClick={handleToggleAllRings}
          onMouseDown={(e) => e.stopPropagation()}
          title={group.rings.some(r => r.isPlaying) ? 'Stop all rings' : 'Play all rings'}
        />

        {/* Selection border */}
        {isSelected && (
          <div 
            className="absolute border-2 border-dashed border-purple-500/50 rounded-full pointer-events-none"
            style={{
              width: containerSize,
              height: containerSize,
            }}
          />
        )}

        {/* Rings - render with z-index so inner rings are clickable */}
        {group.rings.map((ring, index) => (
          <RingContainer
            key={ring.id}
            ring={ring}
            ringIndex={index}
            onUpdate={handleUpdateRing}
            onSlotEdit={handleSlotEdit}
            onTogglePlay={() => handleToggleRing(ring.id)}
            zIndex={group.rings.length - index}
          />
        ))}

        {/* Add Ring Button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleAddRing(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute w-10 h-10 rounded-full border-2 border-dashed border-zinc-600 hover:border-purple-500 
            flex items-center justify-center text-xl text-zinc-600 hover:text-purple-500 transition-colors bg-zinc-950"
          style={{
            top: '50%',
            right: -20,
            transform: 'translateY(-50%)',
          }}
          title="Add ring to this group"
        >
          +
        </button>
      </div>

      {/* Resize handle */}
      {isSelected && (
        <div
          className="absolute w-4 h-4 bg-purple-500 rounded-full cursor-se-resize hover:bg-purple-400"
          style={{
            right: -8,
            bottom: -8,
          }}
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
}
