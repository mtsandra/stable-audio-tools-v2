import { useState } from 'react'
import IconPickerModal from './IconPickerModal.jsx'
import './IntermediateGrid.css'

function AudioItem({ item, isExpanded, isFinal, onToggle, onActivate, defaultName, saved }) {
  const [phase, setPhase] = useState('idle') // 'idle' | 'naming' | 'picking' | 'saved'
  const [nameVal, setNameVal] = useState('')

  const startNaming = () => {
    setNameVal(defaultName)
    setPhase('naming')
  }

  const confirmName = () => {
    if (!nameVal.trim()) return
    setPhase('picking')
  }

  const handleIconPicked = async (icon) => {
    setPhase('saved')
    await onActivate(nameVal.trim(), icon)
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

        {saved || phase === 'saved' ? (
          <span className="saved-badge">✓ Saved</span>
        ) : phase === 'idle' ? (
          <button className="save-btn" onClick={startNaming}>
            + Save as sound object
          </button>
        ) : phase === 'naming' || phase === 'picking' ? (
          <span className="save-inline">
            <input
              className="save-name-input"
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmName()
                if (e.key === 'Escape') setPhase('idle')
              }}
              autoFocus={phase === 'naming'}
              readOnly={phase === 'picking'}
            />
            {phase === 'naming' && (
              <>
                <button className="save-confirm-btn" onClick={confirmName}>→</button>
                <button className="save-cancel-btn" onClick={() => setPhase('idle')}>✕</button>
              </>
            )}
          </span>
        ) : null}
      </div>

      {phase === 'picking' && (
        <IconPickerModal
          onConfirm={handleIconPicked}
          onCancel={() => setPhase('naming')}
        />
      )}

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

  const handleSave = async (key, audio_url, label, isFinal, name, icon) => {
    await onActivate(audio_url, label, isFinal, name, icon)
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
              onActivate={(name, icon) => handleSave(key, item.audio_url, item.label, false, name, icon)}
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
          onActivate={(name, icon) => handleSave('__final__', result.final.audio_url, 'Final', true, name, icon)}
          defaultName={tarPrompt ? `${tarPrompt} (final)` : 'Final'}
        />
      </div>
    </div>
  )
}
