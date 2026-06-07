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

function createRingGroup(x, y) {
  return {
    id: crypto.randomUUID(),
    rings: [{
      id: crypto.randomUUID(),
      slots: createSlots(16),
      bpm: 120, totalSlots: 16, isPlaying: false, currentSlot: 0, metronomeEnabled: false,
    }],
    position: { x, y },
    scale: 1,
  }
}

export default function Phase2({ soundObjects }) {
  const [groups, setGroups] = useState(() => [createRingGroup(0, 0)])
  const [editingSlot, setEditingSlot] = useState(null)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })
  const canvasRef = useRef(null)

  const handleUpdateGroup = useCallback((updated) => {
    setGroups(prev => prev.map(g => g.id === updated.id ? updated : g))
  }, [])

  const handleAddGroup = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2 - canvasOffset.x) / canvasZoom
    const y = (e.clientY - rect.top - rect.height / 2 - canvasOffset.y) / canvasZoom
    setGroups(prev => [...prev, createRingGroup(x, y)])
  }, [canvasOffset, canvasZoom])

  const handleSlotEdit = useCallback((groupId, ringId, slotIndex) => {
    setEditingSlot({ groupId, ringId, slotIndex })
  }, [])

  const handleEditorSave = useCallback((startTime, endTime, volume) => {
    if (!editingSlot) return
    setGroups(prev => prev.map(group => {
      if (group.id !== editingSlot.groupId) return group
      return {
        ...group,
        rings: group.rings.map(ring => {
          if (ring.id !== editingSlot.ringId) return ring
          const newSlots = [...ring.slots]
          newSlots[editingSlot.slotIndex] = { ...newSlots[editingSlot.slotIndex], startTime, endTime, volume }
          return { ...ring, slots: newSlots }
        }),
      }
    }))
    setEditingSlot(null)
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
    if (!isPanning) return
    const onMove = (e) => setCanvasOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
    const onUp = () => setIsPanning(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isPanning])

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
      className="w-full h-full bg-zinc-950 overflow-hidden relative"
      onWheel={handleWheel}
    >
      <div
        className={`canvas-bg absolute inset-0 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
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
        {groups.map(group => (
          <div key={group.id} style={{ pointerEvents: 'auto' }}>
            <RingGroup group={group} onUpdate={handleUpdateGroup} onSlotEdit={handleSlotEdit} />
          </div>
        ))}
      </div>

      <SoundObjectPalette soundObjects={soundObjects} />

      <div className="absolute bottom-4 left-4 text-zinc-600 text-sm pointer-events-none">
        Double-click to add clock · Drag to move · Scroll to zoom
      </div>

      <div className="absolute top-4 right-4 px-4 py-2 bg-zinc-900/80 border border-zinc-700 rounded-lg text-zinc-300 text-sm">
        {Math.round(canvasZoom * 100)}% · {groups.length} clock{groups.length !== 1 ? 's' : ''}
      </div>

      {editingSlot && editingSlotData?.audioBuffer && (
        <WaveformEditor
          slot={editingSlotData}
          onSave={handleEditorSave}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </div>
  )
}
