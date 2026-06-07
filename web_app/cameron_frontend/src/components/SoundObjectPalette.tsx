import { useState, useEffect, useRef, useCallback } from 'react';
import type { SoundObject } from '../types';

export function SoundObjectPalette() {
  const [objects, setObjects] = useState<SoundObject[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isPaletteMoving, setIsPaletteMoving] = useState(false);
  const movingStart = useRef({ x: 0, y: 0 });

  const fetchObjects = useCallback(async () => {
    try {
      const res = await fetch('/api/sound-objects');
      const data = await res.json();
      setObjects(data);
    } catch {
      // backend not reachable yet
    }
  }, []);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsPaletteMoving(true);
    movingStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [position]);

  useEffect(() => {
    if (!isPaletteMoving) return;
    const onMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX - movingStart.current.x, y: e.clientY - movingStart.current.y });
    };
    const onUp = () => setIsPaletteMoving(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isPaletteMoving]);

  const handleItemDragStart = useCallback((e: React.DragEvent, obj: SoundObject) => {
    e.dataTransfer.setData('application/sound-object', JSON.stringify(obj));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const reversed = [...objects].reverse();

  return (
    <div
      className="fixed z-50 w-56 bg-zinc-900/95 border border-zinc-700 rounded-xl shadow-2xl backdrop-blur-sm select-none"
      style={{ left: position.x, top: position.y }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header / move handle */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b border-zinc-700 rounded-t-xl ${isPaletteMoving ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleHeaderMouseDown}
      >
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
          Sound Objects
        </span>
        <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
          <button
            onClick={fetchObjects}
            className="text-zinc-500 hover:text-zinc-200 text-xs transition-colors"
            title="Refresh"
          >
            ↺
          </button>
          <button
            onClick={() => setIsOpen(v => !v)}
            className="text-zinc-500 hover:text-zinc-200 text-xs transition-colors"
          >
            {isOpen ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="max-h-72 overflow-y-auto rounded-b-xl">
          {reversed.length === 0 ? (
            <p className="text-zinc-600 text-[11px] p-3 leading-relaxed">
              No sound objects yet.<br />Generate some in Phase 1.
            </p>
          ) : (
            <div className="flex flex-col">
              {reversed.map((obj, i) => (
                <div
                  key={obj.id}
                  className={`flex flex-col gap-1 px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-zinc-800/60 transition-colors ${i < reversed.length - 1 ? 'border-b border-zinc-800' : ''}`}
                  draggable
                  onDragStart={e => handleItemDragStart(e, obj)}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-200 text-[11px] font-medium truncate flex-1 leading-tight">
                      {obj.name}
                    </span>
                    {obj.is_final && (
                      <span className="text-teal-400 text-[8px] font-bold uppercase tracking-wide flex-shrink-0">
                        final
                      </span>
                    )}
                  </div>
                  {obj.prompt && (
                    <p className="text-zinc-500 text-[10px] truncate leading-tight">{obj.prompt}</p>
                  )}
                  <audio
                    className="w-full h-5 mt-0.5"
                    src={obj.audio_url}
                    controls
                    preload="none"
                    onMouseDown={e => e.stopPropagation()}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
