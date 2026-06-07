import { useState, useCallback, useRef } from 'react'
import { Slot } from './Slot'

const DEFAULT_RADIUS = 180
const SLOT_SIZE = 28

export function LooperRing({ slots, currentSlot, isPlaying, onSlotDrop, onSlotEdit, activePlaybacks, radius = DEFAULT_RADIUS, onTogglePlay, zIndex }) {
  console.log('[LooperRing] render', { slotsCount: slots.length, isPlaying, radius })
  const [dragOverSlot, setDragOverSlot] = useState(null)
  const [isHovered, setIsHovered] = useState(false)
  const containerRef = useRef(null)

  const getSlotFromPosition = useCallback((clientX, clientY) => {
    if (!containerRef.current) return 0
    const rect = containerRef.current.getBoundingClientRect()
    const dx = clientX - (rect.left + rect.width / 2)
    const dy = clientY - (rect.top + rect.height / 2)
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI)
    if (angle < 0) angle += 360
    return Math.round(angle / (360 / slots.length)) % slots.length
  }, [slots.length])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverSlot(getSlotFromPosition(e.clientX, e.clientY))
  }, [getSlotFromPosition])

  const handleDragLeave = useCallback(() => setDragOverSlot(null), [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const slotIndex = getSlotFromPosition(e.clientX, e.clientY)
    const soundObjectData = e.dataTransfer.getData('application/sound-object')
    if (soundObjectData) {
      try { onSlotDrop(slotIndex, JSON.parse(soundObjectData), 'sound-object') } catch {}
    } else if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].type.startsWith('audio/')) {
      onSlotDrop(slotIndex, e.dataTransfer.files[0], 'file')
    }
    setDragOverSlot(null)
  }, [getSlotFromPosition, onSlotDrop])

  const ringSize = radius * 2 + SLOT_SIZE + 40

  return (
    <div
      ref={containerRef}
      className="absolute rounded-full flex items-center justify-center"
      style={{ width: ringSize, height: ringSize, pointerEvents: 'none', zIndex }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <svg
        className="absolute"
        style={{
          width: radius * 2 + 20, height: radius * 2 + 20,
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none', overflow: 'visible',
        }}
      >
        <circle
          cx={radius + 10} cy={radius + 10} r={radius}
          fill="none"
          stroke={isPlaying ? 'rgba(168,85,247,0.6)' : isHovered ? 'rgba(168,85,247,0.4)' : 'rgba(63,63,70,0.5)'}
          strokeWidth={isHovered ? 12 : 8}
          className="cursor-pointer"
          style={{
            filter: isHovered ? 'drop-shadow(0 0 8px rgba(168,85,247,0.4))' : 'none',
            transition: 'all 0.2s ease',
            pointerEvents: 'stroke',
          }}
          onClick={(e) => {
              console.log('[LooperRing] ring circle clicked - toggling play', { isPlaying })
              onTogglePlay()
            }}
          onMouseDown={e => e.stopPropagation()}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        />
      </svg>

      {slots.map((slot, index) => (
        <Slot
          key={slot.id}
          slot={slot}
          index={index}
          isActive={isPlaying && currentSlot === index}
          onDrop={onSlotDrop}
          onEdit={onSlotEdit}
          angle={(360 / slots.length) * index}
          radius={radius}
          playbackInfo={activePlaybacks.get(slot.id)}
          size={SLOT_SIZE}
          isDragTarget={dragOverSlot === index}
        />
      ))}

      {isPlaying && (
        <div
          className="absolute w-2 h-2 bg-purple-400 rounded-full shadow-lg left-1/2 top-1/2 pointer-events-none"
          style={{
            boxShadow: '0 0 8px rgba(192,132,252,0.8)',
            transform: `translate(-50%, -50%) rotate(${(360 / slots.length) * currentSlot}deg) translateY(-${radius + 35}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}

      </div>
  )
}
