class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.targetSampleRate = (options?.processorOptions?.targetSampleRate) || 16000
    this._decimation = sampleRate / this.targetSampleRate
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || input.length === 0) return true

    const channelData = input[0]
    if (!channelData) return true

    // Downsample by simple decimation (adequate for speech)
    const decimation = this._decimation
    const outputLength = Math.floor(channelData.length / decimation)
    const pcmBuffer = new ArrayBuffer(outputLength * 2)
    const view = new DataView(pcmBuffer)

    for (let i = 0; i < outputLength; i++) {
      const idx = Math.floor(i * decimation)
      const sample = Math.max(-1, Math.min(1, channelData[idx]))
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(i * 2, int16, true) // little-endian
    }

    this.port.postMessage(pcmBuffer, [pcmBuffer])
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)
