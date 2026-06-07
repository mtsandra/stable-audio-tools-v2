import { useState, useCallback, useRef, useEffect } from 'react'
import { RingGroup } from './ring/RingGroup'
import { WaveformEditor } from './ring/WaveformEditor'
import { SoundObjectPalette } from './ring/SoundObjectPalette'
import '../phase2.css'

function createSlots(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i, audioBuffer: null, fileName: null, name: null,
    startTime: 0, endTime: null, volume: 1,
  }))
}

const SPAWN_OFFSETS = [
  { x: 0, y: 0 },
  { x: 340, y: -60 },
  { x: -300, y: 200 },
  { x: 260, y: 260 },
  { x: -340, y: -200 },
]

function createRingGroup(x, y, index = 0) {
  const off = SPAWN_OFFSETS[index % SPAWN_OFFSETS.length]
  return {
    id: crypto.randomUUID(),
    rings: [{
      id: crypto.randomUUID(),
      slots: createSlots(16),
      bpm: 120, totalSlots: 16, isPlaying: false, currentSlot: 0, metronomeEnabled: false,
    }],
    position: { x: x + off.x, y: y + off.y },
    scale: 1,
    isLeader: false,
  }
}

export default function Phase2({ soundObjects, stockObjects = [] }) {
  const [groups, setGroups] = useState(() => [createRingGroup(0, 0)])
  const [connections, setConnections] = useState([]) // Array of { from: groupId, to: groupId }
  const [draggingConnection, setDraggingConnection] = useState(null) // { fromId, startPos, currentPos }
  const [editingSlot, setEditingSlot] = useState(null)
  const [editorPos, setEditorPos] = useState({ x: 0, y: 0 })
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })
  const canvasRef = useRef(null)

  const handleUpdateGroup = useCallback((updated, syncPlay = false) => {
    setGroups(prev => {
      let newGroups = prev.map(g => g.id === updated.id ? updated : g)
      
      // If a ring started/stopped playing, sync all connected groups
      if (syncPlay) {
        const connectedIds = new Set()
        const findConnected = (id) => {
          if (connectedIds.has(id)) return
          connectedIds.add(id)
          connections.forEach(c => {
            if (c.from === id) findConnected(c.to)
            if (c.to === id) findConnected(c.from)
          })
        }
        findConnected(updated.id)
        
        const isPlaying = updated.rings.some(r => r.isPlaying)
        return newGroups.map(g => 
          connectedIds.has(g.id) 
            ? { ...g, rings: g.rings.map(r => ({ ...r, isPlaying, currentSlot: 0 })) }
            : g
        )
      }
      return newGroups
    })
  }, [connections])

  const handleAddGroup = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2 - canvasOffset.x) / canvasZoom
    const y = (e.clientY - rect.top - rect.height / 2 - canvasOffset.y) / canvasZoom
    setGroups(prev => [...prev, createRingGroup(x, y, prev.length)])
  }, [canvasOffset, canvasZoom])

  const handleConnectionStart = useCallback((groupId, pos) => {
    setDraggingConnection({ fromId: groupId, startPos: pos, currentPos: pos })
  }, [])

  const handleConnectionMove = useCallback((e) => {
    if (!draggingConnection) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setDraggingConnection(prev => ({
      ...prev,
      currentPos: {
        x: (e.clientX - rect.left - rect.width / 2 - canvasOffset.x) / canvasZoom,
        y: (e.clientY - rect.top - rect.height / 2 - canvasOffset.y) / canvasZoom
      }
    }))
  }, [draggingConnection, canvasOffset, canvasZoom])

  const handleConnectionEnd = useCallback((targetGroupId) => {
    if (!draggingConnection) return
    if (targetGroupId && targetGroupId !== draggingConnection.fromId) {
      const targetGroup = groups.find(g => g.id === targetGroupId)
      const fromGroup = groups.find(g => g.id === draggingConnection.fromId)
      
      // Only allow connecting TO a leader, and FROM a non-leader
      if (!targetGroup?.isLeader || fromGroup?.isLeader) {
        setDraggingConnection(null)
        return
      }
      
      // Check if connection already exists
      const exists = connections.some(c => 
        (c.from === draggingConnection.fromId && c.to === targetGroupId) ||
        (c.to === draggingConnection.fromId && c.from === targetGroupId)
      )
      if (!exists) {
        setConnections(prev => [...prev, { from: draggingConnection.fromId, to: targetGroupId }])
      }
    }
    setDraggingConnection(null)
  }, [draggingConnection, connections, groups])

  const handleRemoveConnection = useCallback((fromId, toId) => {
    setConnections(prev => prev.filter(c => 
      !((c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId))
    ))
  }, [])

  const handleSlotEdit = useCallback((groupId, ringId, slotIndex) => {
    console.log('[Phase2] handleSlotEdit', { groupId, ringId, slotIndex })
    setEditingSlot({ groupId, ringId, slotIndex })
  }, [])

  const handleEditorSave = useCallback((startTime, endTime, volume, effects) => {
    if (!editingSlot) return
    setGroups(prev => prev.map(group => {
      if (group.id !== editingSlot.groupId) return group
      return {
        ...group,
        rings: group.rings.map(ring => {
          if (ring.id !== editingSlot.ringId) return ring
          const newSlots = [...ring.slots]
          newSlots[editingSlot.slotIndex] = { ...newSlots[editingSlot.slotIndex], startTime, endTime, volume, effects }
          return { ...ring, slots: newSlots }
        }),
      }
    }))
  }, [editingSlot])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.97 : 1.03
    setCanvasZoom(prev => Math.max(0.2, Math.min(3, prev * delta)))
  }, [])

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target === e.currentTarget || e.target.classList.contains('canvas-bg')) {
      setIsPanning(true)
      panStart.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y }
    }
  }, [canvasOffset])

  useEffect(() => {
    if (!isPanning && !draggingConnection) return
    const onMove = (e) => {
      if (isPanning) setCanvasOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
      if (draggingConnection) handleConnectionMove(e)
    }
    const onUp = () => {
      setIsPanning(false)
      if (draggingConnection) handleConnectionEnd(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isPanning, draggingConnection, handleConnectionMove, handleConnectionEnd])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const prevent = (e) => e.preventDefault()
    canvas.addEventListener('wheel', prevent, { passive: false })
    return () => canvas.removeEventListener('wheel', prevent)
  }, [])

  const editingGroup = editingSlot ? groups.find(g => g.id === editingSlot.groupId) : null
  const editingRing = editingGroup?.rings.find(r => r.id === editingSlot?.ringId)
  const editingSlotData = editingRing?.slots[editingSlot?.slotIndex ?? -1]

  return (
    <div
      ref={canvasRef}
      className="bg-zinc-950 overflow-hidden relative"
      style={{ flex: '1 1 0', minHeight: 0, minWidth: 0 }}
      onWheel={handleWheel}
      onDoubleClick={handleAddGroup}
    >
      <div
        className={`canvas-bg absolute inset-0 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ zIndex: 0 }}
        onMouseDown={handleCanvasMouseDown}
        onDoubleClick={handleAddGroup}
      />

      <div
        className="absolute"
        style={{
          left: '50%', top: '50%',
          transform: `translate(-50%, -50%) translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom})`,
          pointerEvents: 'none',
        }}
      >
        {/* Connection lines */}
        <svg className="absolute" style={{ overflow: 'visible', pointerEvents: 'none', left: 0, top: 0 }}>
          {connections.map((conn, i) => {
            const fromGroup = groups.find(g => g.id === conn.from)
            const toGroup = groups.find(g => g.id === conn.to)
            if (!fromGroup || !toGroup) return null
            return (
              <g key={i} style={{ pointerEvents: 'auto' }}>
                <line
                  x1={fromGroup.position.x} y1={fromGroup.position.y}
                  x2={toGroup.position.x} y2={toGroup.position.y}
                  stroke="rgba(168,85,247,0.6)" strokeWidth={3} strokeDasharray="8,4"
                />
                <line
                  x1={fromGroup.position.x} y1={fromGroup.position.y}
                  x2={toGroup.position.x} y2={toGroup.position.y}
                  stroke="transparent" strokeWidth={12} className="cursor-pointer"
                  onClick={() => handleRemoveConnection(conn.from, conn.to)}
                />
              </g>
            )
          })}
          {draggingConnection && (
            <line
              x1={groups.find(g => g.id === draggingConnection.fromId)?.position.x ?? 0}
              y1={groups.find(g => g.id === draggingConnection.fromId)?.position.y ?? 0}
              x2={draggingConnection.currentPos.x} y2={draggingConnection.currentPos.y}
              stroke="rgba(168,85,247,0.8)" strokeWidth={2} strokeDasharray="4,4"
            />
          )}
        </svg>

        {groups.map(group => (
          <div key={group.id} style={{ pointerEvents: 'auto' }}>
            <RingGroup
              group={group}
              onUpdate={handleUpdateGroup}
              onSlotEdit={handleSlotEdit}
              canvasZoom={canvasZoom}
              onConnectionStart={handleConnectionStart}
              onConnectionEnd={handleConnectionEnd}
              isConnecting={!!draggingConnection}
              connections={connections}
            />
          </div>
        ))}
      </div>

      <SoundObjectPalette soundObjects={soundObjects} stockObjects={stockObjects} />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-zinc-600 text-xs pointer-events-none whitespace-nowrap">
        Double-click to add · ⭐ Star = leader · Link groups to sync play/stop
      </div>


      {editingSlot && editingSlotData?.audioBuffer && (
        <WaveformEditor
          slot={editingSlotData}
          onSave={handleEditorSave}
          onClose={() => setEditingSlot(null)}
          position={editorPos}
          onPositionChange={setEditorPos}
          slotDuration={(60 / editingRing.bpm) * (32 / editingRing.totalSlots)}
        />
      )}
    </div>
  )
}
