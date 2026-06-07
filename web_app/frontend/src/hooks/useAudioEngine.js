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

  const convolverBufferRef = useRef(null)

  const createReverbImpulse = useCallback((ctx, dur = 2, decay = 2) => {
    const rate = ctx.sampleRate
    const length = rate * dur
    const impulse = ctx.createBuffer(2, length, rate)
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
      }
    }
    return impulse
  }, [])

  const createSaturationCurve = useCallback((amount) => {
    const k = amount * 100
    const samples = 44100
    const curve = new Float32Array(samples)
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x))
    }
    return curve
  }, [])

  const playSlot = useCallback((slot, when) => {
    if (!slot.audioBuffer) return

    const ctx = getAudioContext()
    if (ctx.state === 'suspended') ctx.resume()

    const source = ctx.createBufferSource()
    source.buffer = slot.audioBuffer

    const masterGain = ctx.createGain()
    masterGain.gain.value = slot.volume

    let lastNode = source
    const effects = slot.effects

    // Apply effects if they exist
    if (effects) {
      // Delay effect
      if (effects.delay?.wet > 0) {
        const delayNode = ctx.createDelay(5)
        delayNode.delayTime.value = effects.delay.time ?? 0.3
        const delayFeedback = ctx.createGain()
        delayFeedback.gain.value = effects.delay.feedback ?? 0.4
        const delayWet = ctx.createGain()
        delayWet.gain.value = effects.delay.wet
        const delayDry = ctx.createGain()
        delayDry.gain.value = 1 - effects.delay.wet

        lastNode.connect(delayDry)
        lastNode.connect(delayNode)
        delayNode.connect(delayFeedback)
        delayFeedback.connect(delayNode)
        delayNode.connect(delayWet)

        const delayMerge = ctx.createGain()
        delayDry.connect(delayMerge)
        delayWet.connect(delayMerge)
        lastNode = delayMerge
      }

      // Reverb effect
      if (effects.reverb?.wet > 0) {
        const convolver = ctx.createConvolver()
        if (!convolverBufferRef.current) {
          convolverBufferRef.current = createReverbImpulse(ctx)
        }
        convolver.buffer = convolverBufferRef.current
        const reverbWet = ctx.createGain()
        reverbWet.gain.value = effects.reverb.wet
        const reverbDry = ctx.createGain()
        reverbDry.gain.value = 1 - effects.reverb.wet

        lastNode.connect(reverbDry)
        lastNode.connect(convolver)
        convolver.connect(reverbWet)

        const reverbMerge = ctx.createGain()
        reverbDry.connect(reverbMerge)
        reverbWet.connect(reverbMerge)
        lastNode = reverbMerge
      }

      // Saturation effect
      if (effects.saturation?.wet > 0) {
        const waveshaper = ctx.createWaveShaper()
        waveshaper.curve = createSaturationCurve(effects.saturation.amount ?? 0.5)
        waveshaper.oversample = '4x'
        const satWet = ctx.createGain()
        satWet.gain.value = effects.saturation.wet
        const satDry = ctx.createGain()
        satDry.gain.value = 1 - effects.saturation.wet

        lastNode.connect(satDry)
        lastNode.connect(waveshaper)
        waveshaper.connect(satWet)

        const satMerge = ctx.createGain()
        satDry.connect(satMerge)
        satWet.connect(satMerge)
        lastNode = satMerge
      }
    }

    lastNode.connect(masterGain)
    masterGain.connect(ctx.destination)

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
  }, [getAudioContext, createReverbImpulse, createSaturationCurve])

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
