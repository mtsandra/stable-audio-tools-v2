import { useState, useRef } from 'react'
import { generateEdit, saveSoundObject } from '../api.js'
import IntermediateGrid from './IntermediateGrid.jsx'
import './Generator.css'

const DEFAULTS = {
  lfe_steps: 20,
  n_avg: 10,
  src_lfe_cfg_scale: 1.0,
  tar_lfe_cfg_scale: 3.0,
  num_intermediates: 9,
  sample_center: 0.5,
  seed: -1,
}

export default function Generator({ onSoundObjectAdded }) {
  const [srcPrompt, setSrcPrompt] = useState('')
  const [tarPrompt, setTarPrompt] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [params, setParams] = useState(DEFAULTS)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const setAudio = (file) => {
    setAudioFile(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) setAudio(file)
  }

  const setParam = (key, val) => setParams(p => ({ ...p, [key]: val }))

  const handleGenerate = async () => {
    if (!audioFile) { setError('Upload a source audio file first.'); return }
    if (!srcPrompt.trim()) { setError('Enter a source prompt.'); return }
    if (!tarPrompt.trim()) { setError('Enter a target prompt.'); return }
    setError(null)
    setResult(null)
    setIsGenerating(true)
    try {
      const fd = new FormData()
      fd.append('audio', audioFile)
      fd.append('src_prompt', srcPrompt)
      fd.append('tar_prompt', tarPrompt)
      Object.entries(params).forEach(([k, v]) => fd.append(k, String(v)))
      setResult(await generateEdit(fd))
    } catch (e) {
      setError(e.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleActivate = async (audio_url, label, isFinal) => {
    const defaultName = isFinal
      ? `${tarPrompt} (final)`
      : `${tarPrompt} — ${label}`
    const name = window.prompt('Name this sound object:', defaultName)
    if (!name) return
    try {
      const obj = await saveSoundObject({
        name: name.trim(),
        prompt: tarPrompt,
        audio_url,
        generation_id: result?.generation_id,
        is_final: isFinal,
      })
      onSoundObjectAdded(obj)
    } catch (e) {
      setError(e.message)
    }
  }

  const Slider = ({ k, label, min, max, step }) => (
    <label className="param-row">
      <span className="param-label">{label}</span>
      <input
        type="range" min={min} max={max} step={step}
        value={params[k]}
        onChange={e => setParam(k, Number(e.target.value))}
      />
      <span className="param-value">{params[k]}</span>
    </label>
  )

  return (
    <div className="generator">
      {/* Source */}
      <section className="gen-section">
        <label className="section-label">Source audio</label>
        <div
          className={`drop-zone ${audioFile ? 'has-file' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          {audioFile
            ? <span className="drop-filename">{audioFile.name}</span>
            : <span>Drop audio here or click to upload</span>}
          <input
            ref={fileInputRef} type="file" accept="audio/*"
            style={{ display: 'none' }}
            onChange={e => e.target.files[0] && setAudio(e.target.files[0])}
          />
        </div>
        {previewUrl && <audio className="audio-preview" src={previewUrl} controls />}
        <input
          className="prompt-input"
          placeholder="Source prompt — describe the input audio"
          value={srcPrompt}
          onChange={e => setSrcPrompt(e.target.value)}
        />
      </section>

      {/* Target */}
      <section className="gen-section">
        <label className="section-label">Target</label>
        <input
          className="prompt-input target"
          placeholder="Target prompt — describe the desired edit"
          value={tarPrompt}
          onChange={e => setTarPrompt(e.target.value)}
        />
      </section>

      {/* Params */}
      <section className="gen-section">
        <label className="section-label">Parameters</label>
        <Slider k="lfe_steps" label="Steps" min={5} max={100} step={1} />
        <Slider k="tar_lfe_cfg_scale" label="Target CFG" min={0} max={15} step={0.5} />
        <Slider k="src_lfe_cfg_scale" label="Source CFG" min={0} max={5} step={0.1} />

        <button
          className="advanced-toggle"
          onClick={() => setShowAdvanced(v => !v)}
        >
          {showAdvanced ? '▲' : '▼'} Advanced
        </button>

        {showAdvanced && (
          <div className="advanced-panel">
            <Slider k="n_avg" label="Noise avg (n_avg)" min={1} max={20} step={1} />
            <Slider k="num_intermediates" label="Intermediates shown" min={1} max={20} step={1} />
            <Slider k="sample_center" label="Capture center (t)" min={0} max={1} step={0.05} />
            <label className="param-row">
              <span className="param-label">Seed (−1 = random)</span>
              <input
                type="number" className="seed-input"
                value={params.seed}
                onChange={e => setParam('seed', Number(e.target.value))}
              />
            </label>
          </div>
        )}
      </section>

      {error && <div className="error-msg">{error}</div>}

      <button
        className="generate-btn"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating
          ? <><span className="spinner" /> Generating…</>
          : 'Generate'}
      </button>

      {result && (
        <IntermediateGrid result={result} onActivate={handleActivate} />
      )}
    </div>
  )
}
