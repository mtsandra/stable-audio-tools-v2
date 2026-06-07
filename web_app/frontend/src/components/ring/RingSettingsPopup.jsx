import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const SLOT_OPTIONS = [4, 8, 12, 16, 24, 32]

export function RingSettingsPopup({ bpm, totalSlots, metronomeEnabled, position, onUpdate, onClose }) {
  const [localBpm, setLocalBpm] = useState(bpm)
  const [localSlots, setLocalSlots] = useState(totalSlots)
  const [localMetronome, setLocalMetronome] = useState(metronomeEnabled)
  const [pos, setPos] = useState(position)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const popupRef = useRef(null)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleDragStart = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }, [pos])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging])

  const handleBpmChange = useCallback((newBpm) => {
    const clamped = Math.max(20, Math.min(300, newBpm))
    setLocalBpm(clamped)
    onUpdate({ bpm: clamped, totalSlots: localSlots, metronomeEnabled: localMetronome })
  }, [localSlots, localMetronome, onUpdate])

  const handleSlotsChange = useCallback((newSlots) => {
    setLocalSlots(newSlots)
    onUpdate({ bpm: localBpm, totalSlots: newSlots, metronomeEnabled: localMetronome })
  }, [localBpm, localMetronome, onUpdate])

  const handleMetronomeToggle = useCallback(() => {
    const newVal = !localMetronome
    setLocalMetronome(newVal)
    onUpdate({ bpm: localBpm, totalSlots: localSlots, metronomeEnabled: newVal })
  }, [localBpm, localSlots, localMetronome, onUpdate])

  return createPortal(
    <div
      ref={popupRef}
      className="fixed bg-zinc-900 rounded-2xl border border-zinc-700 shadow-xl z-50"
      style={{
        left: pos.x,
        top: pos.y,
        minWidth: 160,
        pointerEvents: 'auto',
      }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 border-b border-zinc-700 rounded-t-2xl ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleDragStart}
      >
        <span className="text-[10px] text-zinc-400 font-medium select-none">Ring Settings</span>
        <button onClick={onClose} className="text-zinc-500 hover:text-white text-sm leading-none">×</button>
      </div>
      <div className="p-3">
      
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-zinc-500">BPM</span>
          <span className="text-[11px] text-white font-mono">{localBpm}</span>
        </div>
        <input
          type="range"
          min={20}
          max={300}
          value={localBpm}
          onChange={e => handleBpmChange(Number(e.target.value))}
          className="w-full accent-purple-500"
          style={{ height: 6 }}
        />
        <div className="flex gap-1 mt-1">
          {[60, 90, 120, 140].map(preset => (
            <button
              key={preset}
              onClick={() => handleBpmChange(preset)}
              className={`flex-1 px-1 py-0.5 rounded text-[8px] transition ${
                localBpm === preset
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-zinc-500">Slots</span>
          <span className="text-[11px] text-white font-mono">{localSlots}</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {SLOT_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => handleSlotsChange(n)}
              className={`px-2 py-1 rounded text-[9px] transition ${
                localSlots === n
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-700">
        <button
          onClick={handleMetronomeToggle}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[9px] transition ${
            localMetronome
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <span>Metronome</span>
          <span>{localMetronome ? '●' : '○'}</span>
        </button>
      </div>
      </div>
    </div>,
    document.body
  )
}
