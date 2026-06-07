import { useState, useCallback, useEffect, useRef } from 'react';
import { RingGroup } from './components/RingGroup';
import { WaveformEditor } from './components/WaveformEditor';
import { SoundObjectPalette } from './components/SoundObjectPalette';
import type { RingGroupData, RingData, SlotData } from './types';

const DEFAULT_SLOTS = 16;

function createSlots(count: number): SlotData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    audioBuffer: null,
    fileName: null,
    startTime: 0,
    endTime: null,
    volume: 1,
  }));
}

function createRing(): RingData {
  return {
    id: crypto.randomUUID(),
    slots: createSlots(DEFAULT_SLOTS),
    bpm: 120,
    totalSlots: DEFAULT_SLOTS,
    isPlaying: false,
    currentSlot: 0,
    metronomeEnabled: false,
  };
}

function createRingGroup(x: number, y: number): RingGroupData {
  return {
    id: crypto.randomUUID(),
    rings: [createRing()],
    position: { x, y },
    scale: 1,
  };
}

function App() {
  const [groups, setGroups] = useState<RingGroupData[]>(() => [
    createRingGroup(0, 0),
  ]);
  const [editingSlot, setEditingSlot] = useState<{ groupId: string; ringId: string; slotIndex: number } | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleUpdateGroup = useCallback((updatedGroup: RingGroupData) => {
    setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
  }, []);

  const handleAddGroup = useCallback((e: React.MouseEvent) => {
    // Calculate position relative to canvas center, accounting for zoom and offset
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert screen coords to canvas coords
    const x = (clickX - centerX - canvasOffset.x) / canvasZoom;
    const y = (clickY - centerY - canvasOffset.y) / canvasZoom;
    
    setGroups(prev => [...prev, createRingGroup(x, y)]);
  }, [canvasOffset, canvasZoom]);

  const handleSlotEdit = useCallback((groupId: string, ringId: string, slotIndex: number) => {
    setEditingSlot({ groupId, ringId, slotIndex });
  }, []);

  const handleEditorSave = useCallback((startTime: number, endTime: number | null, volume: number) => {
    if (!editingSlot) return;
    
    setGroups(prev => prev.map(group => {
      if (group.id !== editingSlot.groupId) return group;
      
      return {
        ...group,
        rings: group.rings.map(ring => {
          if (ring.id !== editingSlot.ringId) return ring;
          
          const newSlots = [...ring.slots];
          newSlots[editingSlot.slotIndex] = {
            ...newSlots[editingSlot.slotIndex],
            startTime,
            endTime,
            volume,
          };
          return { ...ring, slots: newSlots };
        }),
      };
    }));
    
    setEditingSlot(null);
  }, [editingSlot]);

  const handleEditorClose = useCallback(() => {
    setEditingSlot(null);
  }, []);

  // Find editing slot data
  const editingGroup = editingSlot ? groups.find(g => g.id === editingSlot.groupId) : null;
  const editingRing = editingGroup?.rings.find(r => r.id === editingSlot?.ringId);
  const editingSlotData = editingRing?.slots[editingSlot?.slotIndex ?? -1];

  // Prevent browser from opening dropped files
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle zoom with scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.97 : 1.03;
    setCanvasZoom(prev => Math.max(0.2, Math.min(3, prev * delta)));
  }, []);

  // Handle canvas panning
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start panning if clicking directly on the canvas background
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsPanning(true);
      panStart.current = {
        x: e.clientX - canvasOffset.x,
        y: e.clientY - canvasOffset.y,
      };
    }
  }, [canvasOffset]);

  // Panning mouse move/up handlers
  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      setCanvasOffset({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning]);

  // Prevent default scroll behavior
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventScroll = (e: WheelEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('wheel', preventScroll, { passive: false });
    return () => canvas.removeEventListener('wheel', preventScroll);
  }, []);

  return (
    <div 
      ref={canvasRef}
      className="w-screen h-screen bg-zinc-950 overflow-hidden relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onWheel={handleWheel}
    >
      {/* Pannable background - covers entire screen */}
      <div 
        className={`canvas-bg absolute inset-0 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleCanvasMouseDown}
        onDoubleClick={handleAddGroup}
      />
      
      {/* Zoomable and pannable canvas container */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom})`,
          pointerEvents: 'none',
        }}
      >
        {/* Canvas for ring groups */}
        {groups.map(group => (
          <div key={group.id} style={{ pointerEvents: 'auto' }}>
            <RingGroup
              group={group}
              onUpdate={handleUpdateGroup}
              onSlotEdit={handleSlotEdit}
            />
          </div>
        ))}
      </div>

      {/* Instructions - fixed position */}
      <div className="absolute bottom-4 left-4 text-zinc-600 text-sm pointer-events-none">
        Double-click to add • Drag to move • Scroll to zoom
      </div>

      {/* Zoom indicator - fixed position */}
      <div className="absolute top-4 right-4 px-4 py-2 bg-zinc-900/80 border border-zinc-700 rounded-lg text-zinc-300 text-sm">
        {Math.round(canvasZoom * 100)}% • {groups.length} group{groups.length !== 1 ? 's' : ''}
      </div>

      <SoundObjectPalette />

      {editingSlot && editingSlotData?.audioBuffer && (
        <WaveformEditor
          slot={editingSlotData}
          onSave={handleEditorSave}
          onClose={handleEditorClose}
        />
      )}
    </div>
  );
}

export default App;
