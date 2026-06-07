import { useState, useCallback, useRef, useEffect } from 'react'
import { RingContainer } from './RingContainer'

function createSlots(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i, audioBuffer: null, fileName: null, name: null,
    startTime: 0, endTime: null, volume: 1,
  }))
}

export function RingGroup({ group, onUpdate, onSlotEdit, canvasZoom = 1 }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isSelected, setIsSelected] = useState(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, groupX: 0, groupY: 0 })
  const resizeStart = useRef({ scale: 1, x: 0 })
  const containerRef = useRef(null)

  const handleMouseDown = useCallback((e) => {
    console.log('[RingGroup] handleMouseDown', { target: e.target.tagName, className: e.target.className })
    e.preventDefault(); e.stopPropagation()
    setIsDragging(true); setIsSelected(true)
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, groupX: group.position.x, groupY: group.position.y }
  }, [group.position])

  const handleResizeStart = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    setIsResizing(true); setIsSelected(true)
    resizeStart.current = { scale: group.scale, x: e.clientX }
  }, [group.scale])

  useEffect(() => {
    if (!isDragging && !isResizing) return
    const onMove = (e) => {
      if (isDragging) {
        onUpdate({ ...group, position: {
          x: dragStart.current.groupX + (e.clientX - dragStart.current.mouseX) / canvasZoom,
          y: dragStart.current.groupY + (e.clientY - dragStart.current.mouseY) / canvasZoom,
        } })
      } else {
        const dx = e.clientX - resizeStart.current.x
        onUpdate({ ...group, scale: Math.max(0.3, Math.min(2, resizeStart.current.scale + dx * 0.005)) })
      }
    }
    const onUp = () => { setIsDragging(false); setIsResizing(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isDragging, isResizing, group, onUpdate, canvasZoom])

  const handleUpdateRing = useCallback((updatedRing) => {
    onUpdate({ ...group, rings: group.rings.map(r => r.id === updatedRing.id ? updatedRing : r) })
  }, [group, onUpdate])

  const handleAddRing = useCallback(() => {
    onUpdate({
      ...group,
      rings: [...group.rings, {
        id: crypto.randomUUID(),
        slots: createSlots(16),
        bpm: 120, totalSlots: 16, isPlaying: false, currentSlot: 0, metronomeEnabled: false,
      }],
    })
  }, [group, onUpdate])

  const handleToggleAllRings = useCallback((e) => {
    e.stopPropagation()
    const allPlaying = group.rings.every(r => r.isPlaying)
    onUpdate({ ...group, rings: group.rings.map(r => ({ ...r, isPlaying: !allPlaying })) })
  }, [group, onUpdate])

  const handleToggleRing = useCallback((ringId) => {
    onUpdate({ ...group, rings: group.rings.map(r => r.id === ringId ? { ...r, isPlaying: !r.isPlaying } : r) })
  }, [group, onUpdate])

  const maxRadius = 80 + group.rings.length * 55 + 40
  const containerSize = maxRadius * 2 + 100
  const outerRingRadius = maxRadius + 30

  return (
    <div
      ref={containerRef}
      className={`absolute ${isSelected ? 'z-10' : 'z-0'}`}
      style={{ left: group.position.x, top: group.position.y, transform: `translate(-50%, -50%) scale(${group.scale})` }}
      onMouseDown={handleMouseDown}
      onClick={() => setIsSelected(true)}
    >
      <div className="cursor-move relative flex items-center justify-center" style={{ width: containerSize, height: containerSize }}>
        <div
          className="absolute rounded-full cursor-pointer transition-all duration-200 hover:bg-purple-500/10"
          style={{
            width: outerRingRadius * 2, height: outerRingRadius * 2,
            border: group.rings.some(r => r.isPlaying)
              ? '2px solid rgba(168,85,247,0.5)'
              : '2px dashed rgba(113,113,122,0.3)',
          }}
          onClick={handleToggleAllRings}
          onMouseDown={e => e.stopPropagation()}
          title={group.rings.some(r => r.isPlaying) ? 'Stop all' : 'Play all'}
        />

        {isSelected && (
          <div
            className="absolute border-2 border-dashed border-purple-500/50 rounded-full pointer-events-none"
            style={{ width: containerSize, height: containerSize }}
          />
        )}

        {group.rings.map((ring, index) => (
          <RingContainer
            key={ring.id}
            ring={ring}
            ringIndex={index}
            onUpdate={handleUpdateRing}
            onSlotEdit={(ringId, slotIndex) => onSlotEdit(group.id, ringId, slotIndex)}
            onTogglePlay={() => handleToggleRing(ring.id)}
            zIndex={group.rings.length - index}
          />
        ))}

        <button
          onClick={e => { e.stopPropagation(); handleAddRing() }}
          onMouseDown={e => e.stopPropagation()}
          className="absolute w-10 h-10 rounded-full border-2 border-dashed border-zinc-600 hover:border-purple-500 flex items-center justify-center text-xl text-zinc-600 hover:text-purple-500 transition-colors bg-zinc-950"
          style={{ top: '50%', right: -20, transform: 'translateY(-50%)' }}
          title="Add ring"
        >+</button>
      </div>

      {isSelected && (
        <div
          className="absolute w-4 h-4 bg-purple-500 rounded-full cursor-se-resize hover:bg-purple-400"
          style={{ right: -8, bottom: -8 }}
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  )
}
