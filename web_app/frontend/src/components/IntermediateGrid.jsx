import { useState } from 'react'
import './IntermediateGrid.css'

function AudioItem({ item, isExpanded, isFinal, onToggle, onActivate }) {
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
        <button className="save-btn" onClick={onActivate}>
          + Save as sound object
        </button>
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

export default function IntermediateGrid({ result, onActivate }) {
  const [expanded, setExpanded] = useState(new Set(['__final__']))

  const toggle = (key) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
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
              onToggle={() => toggle(key)}
              onActivate={() => onActivate(item.audio_url, item.label, false)}
            />
          )
        })}

        <AudioItem
          item={result.final}
          isExpanded={expanded.has('__final__')}
          isFinal={true}
          onToggle={() => toggle('__final__')}
          onActivate={() => onActivate(result.final.audio_url, 'Final', true)}
        />
      </div>
    </div>
  )
}
