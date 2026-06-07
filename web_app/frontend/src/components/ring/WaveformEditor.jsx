import { useRef, useEffect, useState, useCallback } from 'react'
import { getWaveformData, drawWaveform } from '../../utils/waveform'

export function WaveformEditor({ slot, onSave, onClose, position, onPositionChange, slotDuration = 0.5 }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const modalRef = useRef(null)
  const [waveformData, setWaveformData] = useState([])
  const [startPercent, setStartPercent] = useState(0)
  const [windowLength, setWindowLength] = useState(1)
  const [volume, setVolume] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [effects, setEffects] = useState({
    delay: { wet: 0, time: 0.3, feedback: 0.4 },
    reverb: { wet: 0 },
    saturation: { wet: 0, amount: 0.5 },
  })
  const dragStartX = useRef(0)
  const dragStartPercent = useRef(0)
  const audioCtxRef = useRef(null)
  const sourceRef = useRef(null)
  const gainRef = useRef(null)
  const convolverBufferRef = useRef(null)

  const modalPos = position ?? { x: 0, y: 0 }
  const setModalPos = onPositionChange ?? (() => {})
  const [modalDragging, setModalDragging] = useState(false)
  const modalDragStart = useRef({ x: 0, y: 0 })

  const duration = slot.audioBuffer?.duration ?? 0
  const minLength = 0.05
  const endPercent = Math.min(1, startPercent + (duration > 0 ? windowLength / duration : 1))

  useEffect(() => {
    if (slot.audioBuffer) {
      setWaveformData(getWaveformData(slot.audioBuffer, 200))
      const start = slot.startTime / duration
      const end = slot.endTime ? slot.endTime / duration : 1
      setStartPercent(start)
      setWindowLength((end - start) * duration)
      setVolume(slot.volume)
      if (slot.effects) {
        setEffects(slot.effects)
      }
    }
  }, [slot.audioBuffer])

  useEffect(() => {
    if (canvasRef.current && waveformData.length > 0) {
      drawWaveform(canvasRef.current, waveformData, {
        color: '#52525b', highlightColor: '#a855f7', startPercent, endPercent,
      })
    }
  }, [waveformData, startPercent, endPercent])

  const handleWindowMouseDown = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    setDragging(true)
    dragStartX.current = e.clientX
    dragStartPercent.current = startPercent
  }, [startPercent])

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const deltaPercent = (e.clientX - dragStartX.current) / rect.width
    const windowPercent = windowLength / duration
    const newStart = Math.max(0, Math.min(1 - windowPercent, dragStartPercent.current + deltaPercent))
    setStartPercent(newStart)
  }, [dragging, windowLength, duration])

  const handleLengthChange = useCallback((newLength) => {
    const clamped = Math.max(minLength, Math.min(duration, newLength))
    setWindowLength(clamped)
    const maxStart = 1 - clamped / duration
    if (startPercent > maxStart) setStartPercent(Math.max(0, maxStart))
  }, [duration, startPercent])

  const handleSave = useCallback(() => {
    onSave(startPercent * duration, endPercent >= 0.99 ? null : endPercent * duration, volume, effects)
  }, [startPercent, endPercent, volume, duration, effects, onSave])

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.stop()
      sourceRef.current = null
    }
    setIsPlaying(false)
  }, [])

  const createReverbImpulse = useCallback((ctx, duration = 2, decay = 2) => {
    const rate = ctx.sampleRate
    const length = rate * duration
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

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      stopPlayback()
      return
    }
    if (!slot.audioBuffer) return

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current

    const source = ctx.createBufferSource()
    source.buffer = slot.audioBuffer

    // Dry/wet mixing setup
    const dryGain = ctx.createGain()
    const masterGain = ctx.createGain()
    masterGain.gain.value = volume
    gainRef.current = masterGain

    let lastNode = source

    // Delay effect
    if (effects.delay.wet > 0) {
      const delayNode = ctx.createDelay(5)
      delayNode.delayTime.value = effects.delay.time
      const delayFeedback = ctx.createGain()
      delayFeedback.gain.value = effects.delay.feedback
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
    if (effects.reverb.wet > 0) {
      const convolver = ctx.createConvolver()
      if (!convolverBufferRef.current) {
        convolverBufferRef.current = createReverbImpulse(ctx)
      }
      convolver.buffer = convolverBufferRef.current
      const reverbWet = ctx.createGain()
      reverbWet.gain.value = effects.reverb.wet
      const reverbDry = ctx.createGain()
      reverbDry.gain.value = 1 - effects.reverb.wet

      const prevNode = lastNode
      lastNode.connect(reverbDry)
      lastNode.connect(convolver)
      convolver.connect(reverbWet)

      const reverbMerge = ctx.createGain()
      reverbDry.connect(reverbMerge)
      reverbWet.connect(reverbMerge)
      lastNode = reverbMerge
    }

    // Saturation effect
    if (effects.saturation.wet > 0) {
      const waveshaper = ctx.createWaveShaper()
      waveshaper.curve = createSaturationCurve(effects.saturation.amount)
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

    lastNode.connect(masterGain)
    masterGain.connect(ctx.destination)

    const startTime = startPercent * duration
    const playDuration = windowLength

    source.start(0, startTime, playDuration)
    source.onended = () => setIsPlaying(false)
    sourceRef.current = source
    setIsPlaying(true)
  }, [isPlaying, slot.audioBuffer, startPercent, duration, windowLength, volume, effects, stopPlayback, createReverbImpulse, createSaturationCurve])

  useEffect(() => {
    return () => stopPlayback()
  }, [stopPlayback])

  const handleModalDragStart = useCallback((e) => {
    e.preventDefault()
    setModalDragging(true)
    modalDragStart.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }
  }, [modalPos])

  useEffect(() => {
    if (!modalDragging) return
    const onMove = (e) => {
      setModalPos({ x: e.clientX - modalDragStart.current.x, y: e.clientY - modalDragStart.current.y })
    }
    const onUp = () => setModalDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [modalDragging])

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div
        ref={modalRef}
        className="bg-zinc-900 rounded-3xl border border-zinc-700 flex flex-col"
        style={{
          width: 180,
          transform: `translate(${modalPos.x}px, ${modalPos.y}px)`,
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className={`flex justify-between items-center p-2 border-b border-zinc-700 rounded-t-3xl ${modalDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleModalDragStart}
        >
          <h2 className="text-[8px] font-bold text-white select-none">Edit</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-sm">×</button>
        </div>
        <div className="flex-1 overflow-hidden p-2">

        <p className="text-zinc-400 text-[10px] mb-0.5 truncate">{slot.name ?? slot.fileName}</p>
        <p className="text-zinc-500 text-[8px] mb-2">
          {duration.toFixed(1)}s · {windowLength.toFixed(1)}s
        </p>

        <div
          ref={containerRef}
          className="relative h-12 bg-zinc-800 rounded-xl overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
        >
          <canvas ref={canvasRef} width={560} height={128} className="w-full h-full" />
          <div className="absolute top-0 bottom-0 left-0 bg-black/50 pointer-events-none" style={{ width: `${startPercent * 100}%` }} />
          <div className="absolute top-0 bottom-0 right-0 bg-black/50 pointer-events-none" style={{ width: `${(1 - endPercent) * 100}%` }} />
          <div
            className={`absolute top-0 bottom-0 border-2 border-purple-500 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{ left: `${startPercent * 100}%`, width: `${(endPercent - startPercent) * 100}%` }}
            onMouseDown={handleWindowMouseDown}
          >
            <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded">
              drag to slide
            </div>
          </div>
        </div>

        <div className="mt-2">
          <div className="flex items-center gap-1 text-[7px] text-zinc-400 mb-0.5">Start</div>
          <input type="range" min={0} max={Math.max(0, 1 - windowLength / duration)} step="0.01"
            value={startPercent} onChange={e => setStartPercent(Number(e.target.value))}
            className="w-full accent-purple-500" style={{height: 8}} />
          <div className="text-white text-[7px] text-right">{(startPercent * duration).toFixed(1)}s</div>
        </div>

        <div className="mt-1">
          <div className="flex items-center gap-1 text-[7px] text-zinc-400 mb-0.5">Len</div>
          <input type="range" min={minLength} max={duration} step="0.01"
            value={windowLength} onChange={e => handleLengthChange(Number(e.target.value))}
            className="w-full accent-purple-500" style={{height: 8}} />
          <div className="text-white text-[7px] text-right">{windowLength.toFixed(1)}s</div>
        </div>

        <div className="mt-1">
          <div className="flex items-center gap-1 text-[7px] text-zinc-400 mb-0.5">Vol</div>
          <input type="range" min="0" max="1" step="0.01"
            value={volume} onChange={e => setVolume(Number(e.target.value))}
            className="w-full accent-purple-500" style={{height: 8}} />
          <div className="text-white text-[7px] text-right">{Math.round(volume * 100)}%</div>
        </div>

        <div className="mt-2 border-t border-zinc-700 pt-2">
          <div className="text-[7px] text-zinc-400 mb-1">Effects</div>
          <div className="mt-1">
            <div className="flex items-center gap-1 text-[7px] text-zinc-400 mb-0.5">Delay</div>
            <input type="range" min="0" max="1" step="0.05"
              value={effects.delay.wet}
              onChange={e => setEffects(p => ({ ...p, delay: { ...p.delay, wet: Number(e.target.value) } }))}
              className="w-full accent-purple-500" style={{height: 8}} />
            <div className="text-white text-[7px] text-right">{Math.round(effects.delay.wet * 100)}%</div>
          </div>
          <div className="mt-1">
            <div className="flex items-center gap-1 text-[7px] text-zinc-400 mb-0.5">Reverb</div>
            <input type="range" min="0" max="1" step="0.05"
              value={effects.reverb.wet}
              onChange={e => setEffects(p => ({ ...p, reverb: { ...p.reverb, wet: Number(e.target.value) } }))}
              className="w-full accent-purple-500" style={{height: 8}} />
            <div className="text-white text-[7px] text-right">{Math.round(effects.reverb.wet * 100)}%</div>
          </div>
          <div className="mt-1">
            <div className="flex items-center gap-1 text-[7px] text-zinc-400 mb-0.5">Saturation</div>
            <input type="range" min="0" max="1" step="0.05"
              value={effects.saturation.wet}
              onChange={e => setEffects(p => ({ ...p, saturation: { ...p.saturation, wet: Number(e.target.value) } }))}
              className="w-full accent-purple-500" style={{height: 8}} />
            <div className="text-white text-[7px] text-right">{Math.round(effects.saturation.wet * 100)}%</div>
          </div>
        </div>

        <div className="mt-2 border-t border-zinc-700 pt-2">
          <div className="text-[7px] text-zinc-400 mb-1">Clamp to Slots</div>
          <div className="flex gap-1 flex-wrap">
            {[1, 2, 3, 4].map(n => {
              const clampLen = slotDuration * n
              const canClamp = duration >= clampLen
              return (
                <button
                  key={n}
                  onClick={() => canClamp && setWindowLength(clampLen)}
                  disabled={!canClamp}
                  className={`px-2 py-0.5 rounded-full text-[7px] transition ${
                    canClamp
                      ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {n} slot{n > 1 ? 's' : ''}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end gap-1 mt-3">
          <button onClick={handlePlay}
            className={`px-2 py-1 ${isPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} text-white rounded-full transition text-[8px]`}>
            {isPlaying ? '■' : '▶'}
          </button>
          <button onClick={() => { setStartPercent(0); setWindowLength(duration); setVolume(1) }}
            className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full transition text-[8px]">
            Reset
          </button>
          <button onClick={onClose} className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full transition text-[8px]">
            Cancel
          </button>
          <button onClick={handleSave} className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-full transition text-[8px]">
            Save
          </button>
        </div>
        </div>

      </div>
    </div>
  )
}
