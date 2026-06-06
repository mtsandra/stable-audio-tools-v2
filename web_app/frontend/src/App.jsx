import { useState, useEffect, useCallback } from 'react'
import Generator from './components/Generator.jsx'
import Library from './components/Library.jsx'
import { listSoundObjects } from './api.js'
import './App.css'

export default function App() {
  const [soundObjects, setSoundObjects] = useState([])

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
        <span className="app-subtitle">Stage 1 — generate &amp; collect sound objects</span>
      </header>
      <div className="app-body">
        <main className="app-main">
          <Generator onSoundObjectAdded={handleAdded} />
        </main>
        <aside className="app-library">
          <Library
            soundObjects={soundObjects}
            onDeleted={handleDeleted}
            onUpdated={handleUpdated}
          />
        </aside>
      </div>
    </div>
  )
}
