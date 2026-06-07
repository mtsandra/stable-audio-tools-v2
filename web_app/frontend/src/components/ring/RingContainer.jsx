import { useState, useCallback, useEffect, useRef } from 'react'
import { LooperRing } from './LooperRing'
import { useAudioEngine } from '../../hooks/useAudioEngine'

const BASE_RADIUS = 80
const RADIUS_INCREMENT = 55

export function RingContainer({ ring, ringIndex, onUpdate, onSlotEdit, onTogglePlay, zIndex }) {
  const [currentSlot, setCurrentSlot] = useState(ring.currentSlot)
  const { loadAudioFile, loadAudioFromUrl, playSlot, playClick, activePlaybacks } = useAudioEngine()
  const radius = BASE_RADIUS + ringIndex * RADIUS_INCREMENT
  const intervalRef = useRef(null)

  useEffect(() => {
    if (ring.isPlaying) {
      const intervalMs = ((60 / ring.bpm) * (32 / ring.totalSlots)) * 1000

      const tick = () => {
        setCurrentSlot(prev => {
          const next = (prev + 1) % ring.totalSlots
          if (ring.metronomeEnabled) playClick(next % 4 === 0)
          const slot = ring.slots[next]
          if (slot?.audioBuffer) playSlot(slot)
          return next
        })
      }

      if (ring.slots[0]?.audioBuffer) playSlot(ring.slots[0])
      if (ring.metronomeEnabled) playClick(true)

      intervalRef.current = window.setInterval(tick, intervalMs)
      return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setCurrentSlot(0)
    }
  }, [ring.isPlaying, ring.bpm, ring.totalSlots, ring.slots, ring.metronomeEnabled, playSlot, playClick])

  useEffect(() => {
    if (ring.isPlaying && intervalRef.current) {
      clearInterval(intervalRef.current)
      const intervalMs = ((60 / ring.bpm) * (32 / ring.totalSlots)) * 1000
      intervalRef.current = window.setInterval(() => {
        setCurrentSlot(prev => {
          const next = (prev + 1) % ring.totalSlots
          if (ring.metronomeEnabled) playClick(next % 4 === 0)
          const slot = ring.slots[next]
          if (slot?.audioBuffer) playSlot(slot)
          return next
        })
      }, intervalMs)
    }
  }, [ring.bpm, ring.totalSlots])

  const handleSlotDrop = useCallback(async (index, payload, type) => {
    try {
      let audioBuffer, name, fileName
      if (type === 'sound-object') {
        audioBuffer = await loadAudioFromUrl(payload.audio_url)
        name = payload.name
        fileName = payload.audio_url.split('/').pop() ?? payload.name
      } else {
        audioBuffer = await loadAudioFile(payload)
        fileName = payload.name
      }
      const newSlots = [...ring.slots]
      newSlots[index] = { ...newSlots[index], audioBuffer, fileName, name, startTime: 0, endTime: null, volume: 1 }
      onUpdate({ ...ring, slots: newSlots })
    } catch (err) {
      console.error('Failed to load audio:', err)
    }
  }, [ring, onUpdate, loadAudioFile, loadAudioFromUrl])

  const handleSlotEdit = useCallback((index) => onSlotEdit(ring.id, index), [ring.id, onSlotEdit])

  return (
    <LooperRing
      slots={ring.slots}
      currentSlot={currentSlot}
      isPlaying={ring.isPlaying}
      onSlotDrop={handleSlotDrop}
      onSlotEdit={handleSlotEdit}
      activePlaybacks={activePlaybacks}
      radius={radius}
      onTogglePlay={onTogglePlay}
      zIndex={zIndex}
    />
  )
}
