import { useState, useEffect, useRef, useCallback } from 'react'
import { getIcon } from '../../utils/icons.js'

export function SoundObjectPalette({ soundObjects, stockObjects = [] }) {
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('stock') // 'stock' or 'user'
  const [position, setPosition] = useState(() => ({
    x: Math.max(window.innerWidth - 240, 16),
    y: Math.floor(window.innerHeight * 0.35),
  }))
  const [isMoving, setIsMoving] = useState(false)
  const [hoveredObj, setHoveredObj] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [playingId, setPlayingId] = useState(null)
  const moveStart = useRef({ x: 0, y: 0 })
  const audioRef = useRef(null)

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

  useEffect(() => {
    return () => { audioRef.current?.pause() }
  }, [])

  const handleItemDragStart = useCallback((e, obj) => {
    e.dataTransfer.setData('application/sound-object', JSON.stringify(obj))
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const handleIconClick = useCallback((e, obj) => {
    e.stopPropagation()
    if (playingId === obj.id) {
      audioRef.current?.pause()
      if (audioRef.current) audioRef.current.currentTime = 0
      setPlayingId(null)
    } else {
      audioRef.current?.pause()
      const audio = new Audio(obj.audio_url)
      audio.addEventListener('ended', () => setPlayingId(null))
      audio.play()
      audioRef.current = audio
      setPlayingId(obj.id)
    }
  }, [playingId])

  const handleMouseEnter = useCallback((e, obj) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredObj(obj)
    setTooltipPos({ x: rect.right + 10, y: rect.top + rect.height / 2 })
  }, [])

  const renderGrid = (objects, emptyMessage) => {
    if (objects.length === 0) {
      return (
        <p className="text-zinc-600 text-[11px] p-3 leading-relaxed">
          {emptyMessage}
        </p>
      )
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 8 }}>
        {objects.map(obj => {
          const isPlaying = playingId === obj.id
          return (
            <div
              key={obj.id}
              draggable
              onDragStart={e => handleItemDragStart(e, obj)}
              onMouseEnter={e => handleMouseEnter(e, obj)}
              onMouseLeave={() => setHoveredObj(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 10,
                borderRadius: 8,
                cursor: 'grab',
                position: 'relative',
                background: isPlaying ? 'rgba(124,106,247,0.15)' : 'transparent',
                transition: 'background 0.15s',
              }}
              className="hover:bg-zinc-800"
            >
              <button
                onClick={e => handleIconClick(e, obj)}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  fontSize: 30,
                  lineHeight: 1,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#e4e4e4',
                  padding: 0,
                  display: 'block',
                  filter: isPlaying ? 'drop-shadow(0 0 8px rgba(124,106,247,1))' : 'none',
                  animation: isPlaying ? 'icon-pulse 1s ease-in-out infinite' : 'none',
                  transition: 'filter 0.15s, transform 0.1s',
                }}
              >
                {obj.icon || getIcon(obj.id)}
              </button>
              {obj.is_final && (
                <span style={{
                  position: 'absolute', top: 3, right: 3,
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#4ecdc4', opacity: 0.8,
                }} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div
        className="fixed z-50 w-52 bg-zinc-900/95 border border-zinc-700 rounded-xl shadow-2xl backdrop-blur-sm select-none"
        style={{ left: position.x, top: position.y }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between px-3 py-2 border-b border-zinc-700 rounded-t-xl ${isMoving ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleHeaderMouseDown}
        >
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Sounds</span>
          <div onMouseDown={e => e.stopPropagation()}>
            <button onClick={() => setIsOpen(v => !v)} className="text-zinc-500 hover:text-zinc-200 text-xs transition-colors">
              {isOpen ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {isOpen && (
          <>
            <div className="flex border-b border-zinc-700" onMouseDown={e => e.stopPropagation()}>
              <button
                onClick={() => setActiveTab('stock')}
                className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${
                  activeTab === 'stock'
                    ? 'text-yellow-400 border-b-2 border-yellow-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                📦 Stock ({stockObjects.length})
              </button>
              <button
                onClick={() => setActiveTab('user')}
                className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${
                  activeTab === 'user'
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                🎨 My Sounds ({soundObjects.length})
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-b-xl">
              {activeTab === 'stock'
                ? renderGrid(stockObjects, 'No stock sounds available.')
                : renderGrid([...soundObjects].reverse(), 'No sounds yet.\nGenerate some in Play-Doh.')
              }
            </div>
          </>
        )}
      </div>

      {hoveredObj && (
        <div
          className="fixed z-[60] pointer-events-none"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translateY(-50%)' }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #2a1f5e 0%, #1a1035 100%)',
            border: '1px solid rgba(124, 106, 247, 0.55)',
            borderRadius: 8,
            padding: '6px 10px',
            boxShadow: '0 4px 24px rgba(124, 106, 247, 0.25), 0 2px 8px rgba(0,0,0,0.6)',
          }}>
            <p style={{ color: '#e8e4ff', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', margin: 0 }}>{hoveredObj.name}</p>
            {hoveredObj.prompt && (
              <p style={{ color: '#a89fd8', fontSize: 10, whiteSpace: 'nowrap', margin: '2px 0 0' }}>{hoveredObj.prompt}</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
