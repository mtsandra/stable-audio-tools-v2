import { useState } from 'react'
import './IntermediateGrid.css'

function AudioItem({ item, isExpanded, isFinal, onToggle, onActivate, defaultName, saved }) {
  const [saving, setSaving] = useState(false)
  const [nameVal, setNameVal] = useState('')

  const startSave = () => {
    setNameVal(defaultName)
    setSaving(true)
  }

  const confirmSave = async () => {
    if (!nameVal.trim()) return
    setSaving(false)
    await onActivate(nameVal.trim())
  }

  return (
    <div className={`audio-item ${isExpanded ? 'expanded' : ''} ${isFinal ? 'is-final' : ''}`}>
      <div className="audio-item-row">
        <button
          className={`expand-btn ${isExpanded ? 'open' : ''}`}
          onClick={onToggle}
          disabled={isFinal}
          title={isExpanded ? 'Collapse' : 'Expand to preview'}
        >
          {isExpanded ? '▾' : '▸'}
        </button>
        <span className={`item-label ${isFinal ? 'final-label' : ''}`}>
          {item.label}
        </span>

        {saved ? (
          <span className="saved-badge">✓ Saved</span>
        ) : !saving ? (
          <button className="save-btn" onClick={startSave}>
            + Save as sound object
          </button>
        ) : (
          <span className="save-inline">
            <input
              className="save-name-input"
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmSave()
                if (e.key === 'Escape') setSaving(false)
              }}
              autoFocus
            />
            <button className="save-confirm-btn" onClick={confirmSave}>Save</button>
            <button className="save-cancel-btn" onClick={() => setSaving(false)}>✕</button>
          </span>
        )}
      </div>
      {isExpanded && (
        <audio
          className="item-audio"
          src={item.audio_url}
          controls
          preload="metadata"
        />
      )}
    </div>
  )
}

export default function IntermediateGrid({ result, tarPrompt, onActivate }) {
  const [expanded, setExpanded] = useState(new Set(['__final__']))
  const [savedKeys, setSavedKeys] = useState(new Set())

  const toggle = (key) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleSave = async (key, audio_url, label, isFinal, name) => {
    await onActivate(audio_url, label, isFinal, name)
    setSavedKeys(prev => new Set([...prev, key]))
  }

  return (
    <div className="intermediate-grid">
      <div className="grid-header">
        <span className="grid-title">Results</span>
        <span className="grid-hint">
          {result.intermediates.length} intermediate{result.intermediates.length !== 1 ? 's' : ''} · click ▸ to preview · + Save to collect
        </span>
      </div>

      <div className="grid-list">
        {result.intermediates.map((item, idx) => {
          const key = `inter-${idx}`
          return (
            <AudioItem
              key={key}
              item={item}
              isExpanded={expanded.has(key)}
              isFinal={false}
              saved={savedKeys.has(key)}
              onToggle={() => toggle(key)}
              onActivate={(name) => handleSave(key, item.audio_url, item.label, false, name)}
              defaultName={`${tarPrompt ? tarPrompt + ' — ' : ''}${item.label}`}
            />
          )
        })}

        <AudioItem
          item={result.final}
          isExpanded={expanded.has('__final__')}
          isFinal={true}
          saved={savedKeys.has('__final__')}
          onToggle={() => toggle('__final__')}
          onActivate={(name) => handleSave('__final__', result.final.audio_url, 'Final', true, name)}
          defaultName={tarPrompt ? `${tarPrompt} (final)` : 'Final'}
        />
      </div>
    </div>
  )
}
