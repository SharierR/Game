// Arcane Nexus Sound Synthesizer (Web Audio API)
// Provides procedural sound effects without requiring external audio files.

class SoundSystem {
  constructor() {
    this.ctx = null
    this.muted = false
    this.volume = 0.35
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  toggleMute() {
    this.muted = !this.muted
    return this.muted
  }

  playTone(freq, type, duration, endFreq = null, gainMult = 1) {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), this.ctx.currentTime + duration)
      }

      const now = this.ctx.currentTime
      gain.gain.setValueAtTime(this.volume * gainMult, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + duration)
    } catch (e) {
      console.warn("Audio error:", e)
    }
  }

  playNoise(duration, gainMult = 1, filterFreq = 1000) {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration)
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }

      const noise = this.ctx.createBufferSource()
      noise.buffer = buffer

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime)
      filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration)

      const gain = this.ctx.createGain()
      gain.gain.setValueAtTime(this.volume * gainMult, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(this.ctx.destination)

      noise.start()
    } catch (e) {
      console.warn("Audio error:", e)
    }
  }

  playFireball() {
    this.playTone(380, 'sine', 0.28, 80, 0.9)
    this.playNoise(0.35, 0.7, 700)
  }

  playBallista() {
    this.playTone(550, 'triangle', 0.18, 120, 1.1)
    this.playNoise(0.12, 0.5, 2400)
  }

  playFrostBeam() {
    this.playTone(720, 'sine', 0.2, 440, 0.4)
  }

  playLightning() {
    this.playTone(850, 'sawtooth', 0.22, 110, 0.8)
    this.playNoise(0.2, 0.6, 3200)
  }

  playVoidStrike() {
    this.playTone(180, 'sawtooth', 0.35, 45, 0.9)
    this.playNoise(0.25, 0.4, 450)
  }

  playHit(isCrit = false) {
    if (isCrit) {
      this.playTone(600, 'square', 0.15, 200, 0.8)
      this.playNoise(0.18, 0.8, 1600)
    } else {
      this.playTone(220, 'triangle', 0.1, 70, 0.5)
    }
  }

  playGold() {
    this.playTone(880, 'sine', 0.08, null, 0.6)
    setTimeout(() => {
      this.playTone(1320, 'sine', 0.15, null, 0.7)
    }, 60)
  }

  playLevelUp() {
    const notes = [440, 554, 659, 880]
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.22, null, 0.8), i * 80)
    })
  }

  playNexusDamage() {
    this.playTone(150, 'sawtooth', 0.6, 40, 1.4)
    this.playNoise(0.5, 1.2, 500)
  }

  playBossRoar() {
    this.playTone(90, 'sawtooth', 0.8, 35, 1.3)
    this.playNoise(0.9, 1.1, 350)
  }

  playDraftOpen() {
    const notes = [330, 415, 493, 659]
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.3, null, 0.7), i * 90)
    })
  }
}

window.soundSystem = new SoundSystem()
