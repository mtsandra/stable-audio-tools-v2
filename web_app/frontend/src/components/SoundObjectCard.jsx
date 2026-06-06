import { useState } from 'react'
import './SoundObjectCard.css'

export default function SoundObjectCard({ obj, onDelete, onRename, onUseAsSource }) {
  const [editing, setEditing] = useState(false)
  const [nameVal, setNameVal] = useState(obj.name)

  const commit = () => {
    setEditing(false)
    const trimmed = nameVal.trim()
    if (trimmed && trimmed !== obj.name) {
      onRename(trimmed)
    } else {
      setNameVal(obj.name)
    }
  }

  return (
    <div className="so-card">
      <div className="so-header">
        {editing ? (
          <input
            className="so-name-input"
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') { setEditing(false); setNameVal(obj.name) }
            }}
            autoFocus
          />
        ) : (
          <span
            className="so-name"
            onClick={() => setEditing(true)}
            title="Click to rename"
          >
            {obj.name}
          </span>
        )}
        <button className="so-delete" onClick={onDelete} title="Delete">✕</button>
      </div>

      <p className="so-prompt" title={obj.prompt}>{obj.prompt}</p>

      <audio className="so-audio" src={obj.audio_url} controls preload="none" />

      <div className="so-footer">
        {obj.is_final && <span className="so-badge final">final</span>}
        <button className="so-use-btn" onClick={() => onUseAsSource(obj)} title="Use as source audio">
          → Use as source
        </button>
      </div>
    </div>
  )
}
