import { useRef, useCallback, useState } from 'react'

export function useAudioEngine() {
  const audioContextRef = useRef(null)
  const activeSourcesRef = useRef(new Map())
  const [activePlaybacks, setActivePlaybacks] = useState(new Map())

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    return audioContextRef.current
  }, [])

  const loadAudioFile = useCallback(async (file) => {
    const ctx = getAudioContext()
    const arrayBuffer = await file.arrayBuffer()
    return await ctx.decodeAudioData(arrayBuffer)
  }, [getAudioContext])

  const loadAudioFromUrl = useCallback(async (url) => {
    const ctx = getAudioContext()
    const res = await fetch(url)
    const arrayBuffer = await res.arrayBuffer()
    return await ctx.decodeAudioData(arrayBuffer)
  }, [getAudioContext])

  const playSlot = useCallback((slot, when) => {
    if (!slot.audioBuffer) return

    const ctx = getAudioContext()
    if (ctx.state === 'suspended') ctx.resume()

    const source = ctx.createBufferSource()
    source.buffer = slot.audioBuffer

    const gainNode = ctx.createGain()
    gainNode.gain.value = slot.volume
    source.connect(gainNode)
    gainNode.connect(ctx.destination)

    const playTime = when ?? ctx.currentTime
    const startOffset = slot.startTime
    const duration = slot.endTime !== null
      ? slot.endTime - slot.startTime
      : slot.audioBuffer.duration - slot.startTime

    source.start(playTime, startOffset, duration)
    activeSourcesRef.current.set(slot.id, source)

    setActivePlaybacks(prev => {
      const next = new Map(prev)
      next.set(slot.id, { slotId: slot.id, startedAt: Date.now(), duration: duration * 1000 })
      return next
    })

    source.onended = () => {
      activeSourcesRef.current.delete(slot.id)
      setActivePlaybacks(prev => {
        const next = new Map(prev)
        next.delete(slot.id)
        return next
      })
    }
  }, [getAudioContext])

  const stopAll = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop() } catch {}
    })
    activeSourcesRef.current.clear()
    setActivePlaybacks(new Map())
  }, [])

  const playClick = useCallback((isDownbeat = false) => {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') ctx.resume()

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.frequency.value = isDownbeat ? 1000 : 800
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.05)
  }, [getAudioContext])

  const getCurrentTime = useCallback(() => {
    return getAudioContext().currentTime
  }, [getAudioContext])

  return { loadAudioFile, loadAudioFromUrl, playSlot, stopAll, playClick, getCurrentTime, getAudioContext, activePlaybacks }
}
