import { useState, useEffect, useCallback } from 'react'
import Generator from './components/Generator.jsx'
import Library from './components/Library.jsx'
import Phase2 from './components/Phase2.jsx'
import { listSoundObjects } from './api.js'
import './App.css'

export default function App() {
  const [screen, setScreen] = useState('phase1')
  const [soundObjects, setSoundObjects] = useState([])
  const [externalSource, setExternalSource] = useState(null)

  useEffect(() => {
    listSoundObjects().then(setSoundObjects).catch(console.error)
  }, [])

  const handleAdded = useCallback((obj) => {
    setSoundObjects(prev => [...prev, obj])
  }, [])

  const handleDeleted = useCallback((id) => {
    setSoundObjects(prev => prev.filter(o => o.id !== id))
  }, [])

  const handleUpdated = useCallback((updated) => {
    setSoundObjects(prev => prev.map(o => o.id === updated.id ? updated : o))
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Sound Object Generator</h1>
        <nav className="app-nav">
          <button
            className={`nav-tab ${screen === 'phase1' ? 'active' : ''}`}
            onClick={() => setScreen('phase1')}
          >
            Phase 1 — Generate
          </button>
          <button
            className={`nav-tab ${screen === 'phase2' ? 'active' : ''}`}
            onClick={() => setScreen('phase2')}
          >
            Phase 2 — Arrange
          </button>
        </nav>
        <span className="app-subtitle">
          {soundObjects.length} sound object{soundObjects.length !== 1 ? 's' : ''}
        </span>
      </header>

      <div className="app-body">
        {screen === 'phase2' ? (
          <Phase2 soundObjects={soundObjects} />
        ) : (
          <>
            <main className="app-main">
              <Generator
                onSoundObjectAdded={handleAdded}
                externalSource={externalSource}
                onExternalSourceConsumed={() => setExternalSource(null)}
              />
            </main>
            <aside className="app-library">
              <Library
                soundObjects={soundObjects}
                onDeleted={handleDeleted}
                onUpdated={handleUpdated}
                onUseAsSource={setExternalSource}
              />
            </aside>
          </>
        )}
      </div>
    </div>
  )
}
