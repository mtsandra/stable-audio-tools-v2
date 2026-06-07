export async function uploadAudio(file) {
  const fd = new FormData()
  fd.append('audio', file)
  const res = await fetch('/api/upload-audio', { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Failed to upload audio')
  return res.json()
}

export async function generateEdit(formData) {
  const res = await fetch('/api/generate', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Generation failed (${res.status})`)
  }
  return res.json()
}

export async function listSoundObjects() {
  const res = await fetch('/api/sound-objects')
  if (!res.ok) throw new Error('Failed to load sound objects')
  return res.json()
}

export async function listStockObjects() {
  const res = await fetch('/api/stock-objects')
  if (!res.ok) throw new Error('Failed to load stock objects')
  return res.json()
}

export async function saveSoundObject(data) {
  const res = await fetch('/api/sound-objects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to save sound object')
  return res.json()
}

export async function updateSoundObject(id, data) {
  const res = await fetch(`/api/sound-objects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update sound object')
  return res.json()
}

export async function deleteSoundObject(id) {
  const res = await fetch(`/api/sound-objects/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete sound object')
  return res.json()
}
