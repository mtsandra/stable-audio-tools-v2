import { useState, useEffect, useRef, useCallback } from 'react'

export function SoundObjectPalette({ soundObjects }) {
  const [isOpen, setIsOpen] = useState(true)
  const [position, setPosition] = useState({ x: 16, y: 16 })
  const [isMoving, setIsMoving] = useState(false)
  const moveStart = useRef({ x: 0, y: 0 })

  const handleHeaderMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsMoving(true)
    moveStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }, [position])

  useEffect(() => {
    if (!isMoving) return
    const onMove = (e) => setPosition({ x: e.clientX - moveStart.current.x, y: e.clientY - moveStart.current.y })
    const onUp = () => setIsMoving(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isMoving])

  const handleItemDragStart = useCallback((e, obj) => {
    e.dataTransfer.setData('application/sound-object', JSON.stringify(obj))
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const reversed = [...soundObjects].reverse()

  return (
    <div
      className="fixed z-50 w-56 bg-zinc-900/95 border border-zinc-700 rounded-xl shadow-2xl backdrop-blur-sm select-none"
      style={{ left: position.x, top: position.y }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 border-b border-zinc-700 rounded-t-xl ${isMoving ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleHeaderMouseDown}
      >
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Sound Objects</span>
        <div onMouseDown={e => e.stopPropagation()}>
          <button onClick={() => setIsOpen(v => !v)} className="text-zinc-500 hover:text-zinc-200 text-xs transition-colors">
            {isOpen ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="max-h-72 overflow-y-auto rounded-b-xl">
          {reversed.length === 0 ? (
            <p className="text-zinc-600 text-[11px] p-3 leading-relaxed">
              No sound objects yet.<br />Generate some in Phase 1.
            </p>
          ) : (
            <div className="flex flex-col">
              {reversed.map((obj, i) => (
                <div
                  key={obj.id}
                  className={`flex flex-col gap-1 px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-zinc-800/60 transition-colors ${i < reversed.length - 1 ? 'border-b border-zinc-800' : ''}`}
                  draggable
                  onDragStart={e => handleItemDragStart(e, obj)}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-200 text-[11px] font-medium truncate flex-1">{obj.name}</span>
                    {obj.is_final && <span className="text-teal-400 text-[8px] font-bold uppercase tracking-wide flex-shrink-0">final</span>}
                  </div>
                  {obj.prompt && <p className="text-zinc-500 text-[10px] truncate">{obj.prompt}</p>}
                  <audio
                    className="w-full h-5 mt-0.5"
                    src={obj.audio_url}
                    controls
                    preload="none"
                    onMouseDown={e => e.stopPropagation()}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
