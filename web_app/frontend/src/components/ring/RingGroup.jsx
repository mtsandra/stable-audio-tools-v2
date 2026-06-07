import { useState, useCallback, useRef, useEffect } from 'react'
import { RingContainer } from './RingContainer'
import { RingSettingsPopup } from './RingSettingsPopup'

function createSlots(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i, audioBuffer: null, fileName: null, name: null,
    startTime: 0, endTime: null, volume: 1,
  }))
}

export function RingGroup({ group, onUpdate, onSlotEdit, canvasZoom = 1, onConnectionStart, onConnectionEnd, isConnecting, connections = [] }) {
  const isFollower = connections.some(c => c.from === group.id)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isSelected, setIsSelected] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsPos, setSettingsPos] = useState({ x: 0, y: 0 })
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
    onUpdate({ ...group, rings: group.rings.map(r => ({ ...r, isPlaying: !allPlaying, currentSlot: 0 })) }, true)
  }, [group, onUpdate])

  const handleConnectorMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    // Only non-leaders can start a connection
    if (!group.isLeader) {
      onConnectionStart?.(group.id, group.position)
    }
  }, [group.id, group.position, group.isLeader, onConnectionStart])

  const handleConnectorMouseUp = useCallback((e) => {
    e.stopPropagation()
    // Only leaders can receive connections
    if (isConnecting && group.isLeader) {
      onConnectionEnd?.(group.id)
    }
  }, [group.id, group.isLeader, isConnecting, onConnectionEnd])

  const handleToggleLeader = useCallback((e) => {
    e.stopPropagation()
    // Can't become leader if already following someone
    if (isFollower) return
    onUpdate({ ...group, isLeader: !group.isLeader })
  }, [group, isFollower, onUpdate])

  const handleToggleRing = useCallback((ringId) => {
    onUpdate({ ...group, rings: group.rings.map(r => r.id === ringId ? { ...r, isPlaying: !r.isPlaying } : r) })
  }, [group, onUpdate])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setSettingsPos({ x: e.clientX, y: e.clientY })
    setSettingsOpen(true)
  }, [])

  const handleGroupSettingsChange = useCallback(({ bpm, totalSlots, metronomeEnabled }) => {
    onUpdate({
      ...group,
      rings: group.rings.map(ring => {
        const newSlots = ring.slots.length !== totalSlots
          ? Array.from({ length: totalSlots }, (_, i) => ring.slots[i] || {
              id: i, audioBuffer: null, fileName: null, name: null,
              startTime: 0, endTime: null, volume: 1,
            })
          : ring.slots
        return { ...ring, bpm, totalSlots, metronomeEnabled, slots: newSlots }
      })
    })
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
      onDoubleClick={e => e.stopPropagation()}
    >
      <div className="cursor-move relative flex items-center justify-center" style={{ width: containerSize, height: containerSize }}>
        <div
          className="absolute rounded-full cursor-pointer transition-all duration-200 hover:bg-purple-500/10"
          style={{
            width: outerRingRadius * 2, height: outerRingRadius * 2,
            border: group.isLeader
              ? '3px solid rgba(250,204,21,0.6)'
              : group.rings.some(r => r.isPlaying)
                ? '2px solid rgba(168,85,247,0.5)'
                : '2px dashed rgba(113,113,122,0.3)',
          }}
          onClick={handleToggleAllRings}
          onContextMenu={handleContextMenu}
          onMouseDown={e => e.stopPropagation()}
          title="Click: play/stop all · Right-click: settings"
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

      <div
        className="absolute w-8 h-8 bg-zinc-800 hover:bg-purple-600 rounded-lg cursor-se-resize flex items-center justify-center shadow-lg border border-zinc-600 hover:border-purple-500 transition-colors"
        style={{ right: -16, bottom: -16 }}
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
          <path d="M21 21L12 12M21 21H15M21 21V15" />
          <path d="M3 3L12 12M3 3H9M3 3V9" />
        </svg>
      </div>

      {/* Leader toggle button */}
      <button
        onClick={handleToggleLeader}
        className={`absolute w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 transition-all ${
          group.isLeader
            ? 'bg-yellow-500 border-yellow-300 cursor-pointer'
            : isFollower
              ? 'bg-zinc-700 border-zinc-600 cursor-not-allowed opacity-50'
              : 'bg-zinc-800 border-zinc-600 hover:bg-yellow-600 hover:border-yellow-400 cursor-pointer'
        }`}
        style={{ left: '50%', top: -16, transform: 'translateX(-50%)' }}
        title={group.isLeader ? 'Leader (click to remove)' : isFollower ? 'Connected to leader' : 'Click to make leader'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={group.isLeader ? 'text-yellow-900' : 'text-zinc-400'}>
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      </button>

      {/* Connection handle - only for non-leaders */}
      {!group.isLeader && (
        <div
          className={`absolute w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 transition-all cursor-crosshair ${
            isConnecting 
              ? 'bg-purple-500 border-purple-300 scale-125' 
              : isFollower
                ? 'bg-green-600 border-green-400'
                : 'bg-zinc-800 border-zinc-600 hover:bg-purple-600 hover:border-purple-400'
          }`}
          style={{ left: -16, top: '50%', transform: 'translateY(-50%)' }}
          onMouseDown={handleConnectorMouseDown}
          title={isFollower ? 'Connected to leader' : 'Drag to connect to a leader'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-300">
            {isFollower ? (
              <path d="M5 12h14M12 5l7 7-7 7" />
            ) : (
              <><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></>
            )}
          </svg>
        </div>
      )}

      {/* Leader receives connections */}
      {group.isLeader && (
        <div
          className={`absolute w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 transition-all ${
            isConnecting 
              ? 'bg-yellow-500 border-yellow-300 scale-125 cursor-pointer' 
              : 'bg-yellow-600 border-yellow-400'
          }`}
          style={{ left: -16, top: '50%', transform: 'translateY(-50%)' }}
          onMouseUp={handleConnectorMouseUp}
          title="Drop connection here"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-900">
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        </div>
      )}

      {settingsOpen && (
        <RingSettingsPopup
          bpm={group.rings[0]?.bpm ?? 120}
          totalSlots={group.rings[0]?.totalSlots ?? 16}
          metronomeEnabled={group.rings[0]?.metronomeEnabled ?? false}
          position={settingsPos}
          onUpdate={handleGroupSettingsChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
