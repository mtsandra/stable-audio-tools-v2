import { deleteSoundObject, updateSoundObject } from '../api.js'
import SoundObjectCard from './SoundObjectCard.jsx'
import './Library.css'

export default function Library({ soundObjects, onDeleted, onUpdated, onUseAsSource }) {
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this sound object?')) return
    try {
      await deleteSoundObject(id)
      onDeleted(id)
    } catch (e) {
      alert(e.message)
    }
  }

  const handleRename = async (id, name) => {
    try {
      const updated = await updateSoundObject(id, { name })
      onUpdated(updated)
    } catch (e) {
      alert(e.message)
    }
  }

  const reversed = [...soundObjects].reverse()

  return (
    <div className="library">
      <div className="library-header">
        <span className="library-title">Sound Objects</span>
        <span className="library-count">{soundObjects.length}</span>
      </div>

      {reversed.length === 0 ? (
        <p className="library-empty">
          No sound objects yet.<br />Generate some and click + Save.
        </p>
      ) : (
        <div className="library-list">
          {reversed.map(obj => (
            <SoundObjectCard
              key={obj.id}
              obj={obj}
              onDelete={() => handleDelete(obj.id)}
              onRename={name => handleRename(obj.id, name)}
              onUseAsSource={onUseAsSource}
            />
          ))}
        </div>
      )}
    </div>
  )
}
