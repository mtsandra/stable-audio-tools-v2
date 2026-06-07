import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ICON_CATEGORIES } from '../utils/icons.js'
import './IconPickerModal.css'

function findCategory(icon) {
  if (!icon) return 0
  const idx = ICON_CATEGORIES.findIndex(c => c.icons.includes(icon))
  return idx >= 0 ? idx : 0
}

export default function IconPickerModal({ initial = null, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(initial)
  const [tab, setTab] = useState(() => findCategory(initial))

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const icons = ICON_CATEGORIES[tab].icons

  return createPortal(
    <div className="icon-modal-backdrop" onMouseDown={onCancel}>
      <div className="icon-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="icon-modal-header">
          <p className="icon-modal-title">Choose an icon</p>
          {selected && <span className="icon-modal-preview">{selected}</span>}
        </div>

        <div className="icon-modal-tabs">
          {ICON_CATEGORIES.map((cat, i) => (
            <button
              key={i}
              className={`icon-modal-tab${tab === i ? ' active' : ''}`}
              onClick={() => setTab(i)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="icon-modal-grid">
          {icons.map((ic, i) => (
            <button
              key={i}
              className={`icon-modal-btn${ic === selected ? ' selected' : ''}`}
              onClick={() => setSelected(ic)}
            >
              {ic}
            </button>
          ))}
        </div>

        <div className="icon-modal-footer">
          <button className="icon-modal-cancel" onClick={onCancel}>Cancel</button>
          <button
            className="icon-modal-confirm"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
          >
            {selected ? `Save with ${selected}` : 'Pick one above'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
