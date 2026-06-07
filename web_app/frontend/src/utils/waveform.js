export function getWaveformData(audioBuffer, samples = 100) {
  const channelData = audioBuffer.getChannelData(0)
  const blockSize = Math.floor(channelData.length / samples)
  const waveform = []

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize
    let sum = 0
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j] || 0)
    }
    waveform.push(sum / blockSize)
  }

  const max = Math.max(...waveform, 0.01)
  return waveform.map(v => v / max)
}

export function drawWaveform(canvas, waveformData, options = {}) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const {
    color = '#a855f7',
    backgroundColor = 'transparent',
    startPercent = 0,
    endPercent = 1,
    highlightColor = '#c084fc',
  } = options

  const width = canvas.width
  const height = canvas.height
  const barWidth = width / waveformData.length

  ctx.clearRect(0, 0, width, height)

  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
  }

  waveformData.forEach((value, index) => {
    const x = index * barWidth
    const barHeight = value * height * 0.9
    const y = (height - barHeight) / 2
    const percent = index / waveformData.length
    const isInRange = percent >= startPercent && percent <= endPercent
    ctx.fillStyle = isInRange ? highlightColor : color
    ctx.globalAlpha = isInRange ? 1 : 0.3
    ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barHeight)
  })

  ctx.globalAlpha = 1
}
