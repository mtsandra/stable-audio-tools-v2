import { useRef, useEffect, useState, useCallback } from 'react';
import { getWaveformData, drawWaveform } from '../utils/waveform';
import type { SlotData } from '../types';

interface WaveformEditorProps {
  slot: SlotData;
  onSave: (startTime: number, endTime: number | null, volume: number) => void;
  onClose: () => void;
}

export function WaveformEditor({ slot, onSave, onClose }: WaveformEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [startPercent, setStartPercent] = useState(0);
  const [windowLength, setWindowLength] = useState(1); // in seconds
  const [volume, setVolume] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartPercent = useRef(0);

  const duration = slot.audioBuffer?.duration ?? 0;
  const minLength = 0.05; // 50ms minimum
  const endPercent = Math.min(1, startPercent + (duration > 0 ? windowLength / duration : 1));

  useEffect(() => {
    if (slot.audioBuffer) {
      const data = getWaveformData(slot.audioBuffer, 200);
      setWaveformData(data);
      
      // Initialize from slot's current values
      const start = slot.startTime / duration;
      const end = slot.endTime ? slot.endTime / duration : 1;
      setStartPercent(start);
      setWindowLength((end - start) * duration);
      setVolume(slot.volume);
    }
  }, [slot.audioBuffer, slot.startTime, slot.endTime, slot.volume, duration]);

  useEffect(() => {
    if (canvasRef.current && waveformData.length > 0) {
      drawWaveform(canvasRef.current, waveformData, {
        color: '#52525b',
        highlightColor: '#a855f7',
        startPercent,
        endPercent,
      });
    }
  }, [waveformData, startPercent, endPercent]);

  const handleWindowMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    dragStartX.current = e.clientX;
    dragStartPercent.current = startPercent;
  }, [startPercent]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartX.current;
    const deltaPercent = deltaX / rect.width;
    
    const windowPercent = windowLength / duration;
    let newStart = dragStartPercent.current + deltaPercent;
    
    // Clamp to bounds
    newStart = Math.max(0, Math.min(1 - windowPercent, newStart));
    setStartPercent(newStart);
  }, [dragging, windowLength, duration]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleLengthChange = useCallback((newLength: number) => {
    const clampedLength = Math.max(minLength, Math.min(duration, newLength));
    setWindowLength(clampedLength);
    
    // Adjust start if window would exceed duration
    const maxStart = 1 - (clampedLength / duration);
    if (startPercent > maxStart) {
      setStartPercent(Math.max(0, maxStart));
    }
  }, [duration, startPercent]);

  const handleSave = useCallback(() => {
    const startTime = startPercent * duration;
    const endTime = endPercent >= 0.99 ? null : endPercent * duration;
    onSave(startTime, endTime, volume);
  }, [startPercent, endPercent, volume, duration, onSave]);

  const handleReset = useCallback(() => {
    setStartPercent(0);
    setWindowLength(duration);
    setVolume(1);
  }, [duration]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-900 rounded-xl p-6 w-[600px] max-w-[90vw] border border-zinc-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Edit Audio Window</h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <p className="text-zinc-400 text-sm mb-2">{slot.fileName}</p>
        <p className="text-zinc-500 text-xs mb-4">
          Total: {duration.toFixed(2)}s | Window: {windowLength.toFixed(2)}s
        </p>

        <div 
          ref={containerRef}
          className="relative h-32 bg-zinc-800 rounded-lg overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas 
            ref={canvasRef} 
            width={560} 
            height={128}
            className="w-full h-full"
          />
          
          {/* Dimmed regions outside selection */}
          <div 
            className="absolute top-0 bottom-0 left-0 bg-black/50 pointer-events-none"
            style={{ width: `${startPercent * 100}%` }}
          />
          <div 
            className="absolute top-0 bottom-0 right-0 bg-black/50 pointer-events-none"
            style={{ width: `${(1 - endPercent) * 100}%` }}
          />

          {/* Draggable window region */}
          <div
            className={`absolute top-0 bottom-0 border-2 border-purple-500 cursor-grab ${dragging ? 'cursor-grabbing' : ''}`}
            style={{ 
              left: `${startPercent * 100}%`, 
              width: `${(endPercent - startPercent) * 100}%`,
            }}
            onMouseDown={handleWindowMouseDown}
          >
            <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded">
              drag to slide
            </div>
          </div>
        </div>

        {/* Length Control */}
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <span className="text-zinc-400 text-sm w-16">Length:</span>
            <input
              type="range"
              min={minLength}
              max={duration}
              step="0.01"
              value={windowLength}
              onChange={(e) => handleLengthChange(Number(e.target.value))}
              className="flex-1 accent-purple-500"
            />
            <input
              type="number"
              min={minLength}
              max={duration}
              step="0.05"
              value={windowLength.toFixed(2)}
              onChange={(e) => handleLengthChange(Number(e.target.value))}
              className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-center text-white text-sm"
            />
            <span className="text-zinc-500 text-sm">s</span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <span className="text-zinc-400 text-sm w-16">Volume:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 accent-purple-500"
            />
            <span className="text-white text-sm w-12 text-right">{Math.round(volume * 100)}%</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition"
          >
            Reset to Full
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
