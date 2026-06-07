import { useState, useRef, useCallback, useEffect } from 'react'
import { getIcon } from '../utils/icons.js'
import IconPickerModal from './IconPickerModal.jsx'
import './SoundObjectCard.css'

export default function SoundObjectCard({ obj, onDelete, onRename, onUseAsSource, onIconChange }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nameVal, setNameVal] = useState(obj.name)
  const [iconVal, setIconVal] = useState(() => obj.icon || getIcon(obj.id))
  const [pickerOpen, setPickerOpen] = useState(false)
  const audioRef = useRef(null)
  const pendingIconRef = useRef(null)

  useEffect(() => {
    // Only sync from server if we don't have a pending local change
    if (pendingIconRef.current === null) {
      setIconVal(obj.icon || getIcon(obj.id))
    } else if (obj.icon === pendingIconRef.current) {
      // Server confirmed our change, clear pending
      pendingIconRef.current = null
    }
  }, [obj.icon, obj.id])

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(obj.audio_url)
      audioRef.current.addEventListener('ended', () => setIsPlaying(false))
    }
    return audioRef.current
  }, [obj.audio_url])

  const playPromiseRef = useRef(null)

  const handleIconClick = useCallback((e) => {
    e.stopPropagation()
    const audio = getAudio()
    if (isPlaying) {
      const p = playPromiseRef.current
      if (p) {
        p.then(() => {
          audio.pause()
          audio.currentTime = 0
        }).catch(() => {})
      } else {
        audio.pause()
        audio.currentTime = 0
      }
      playPromiseRef.current = null
      setIsPlaying(false)
    } else {
      playPromiseRef.current = audio.play()
      playPromiseRef.current.catch(() => {
        playPromiseRef.current = null
      })
      setIsPlaying(true)
    }
  }, [isPlaying, getAudio])

  const handleDragStart = useCallback((e) => {
    e.dataTransfer.setData('application/sound-object', JSON.stringify({ ...obj, icon: iconVal }))
    e.dataTransfer.effectAllowed = 'copy'
  }, [obj, iconVal])

  const commitRename = () => {
    setEditing(false)
    const trimmed = nameVal.trim()
    if (trimmed && trimmed !== obj.name) {
      onRename(trimmed)
    } else {
      setNameVal(obj.name)
    }
  }

  const handleIconPicked = useCallback((icon) => {
    pendingIconRef.current = icon
    setIconVal(icon)
    setPickerOpen(false)
    onIconChange?.(icon)
  }, [onIconChange])

  return (
    <div
      className="so-chip"
      draggable
      onDragStart={handleDragStart}
      title={`${obj.name}\n${obj.prompt}`}
    >
      <button
        className={`so-chip-icon${isPlaying ? ' is-playing' : ''}`}
        onClick={handleIconClick}
        title={obj.prompt}
      >
        {iconVal}
      </button>

      {editing ? (
        <input
          className="so-chip-name-input"
          value={nameVal}
          onChange={e => setNameVal(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') { setEditing(false); setNameVal(obj.name) }
          }}
          autoFocus
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span
          className="so-chip-name"
          onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
          title="Double-click to rename"
        >
          {obj.name}
        </span>
      )}

      {obj.is_final && <span className="so-chip-final" />}

      <div className="so-chip-actions">
        <button
          className="so-chip-icon-pick"
          onClick={e => { e.stopPropagation(); setPickerOpen(true) }}
          title="Change icon"
        >✦</button>
        <button className="so-chip-use" onClick={() => onUseAsSource(obj)} title="Use as source">→</button>
        <button className="so-chip-del" onClick={onDelete} title="Delete">✕</button>
      </div>

      {pickerOpen && (
        <IconPickerModal
          initial={iconVal}
          onConfirm={handleIconPicked}
          onCancel={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
