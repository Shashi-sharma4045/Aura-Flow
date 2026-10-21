// src/utils/audioEngine.ts
// Procedural Web Audio API soundscape generator and chime synthesizer

export type SoundType = 'rain' | 'waves' | 'forest' | 'cafe' | 'binaural';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentSourceNodes: { stop: () => void }[] = [];
  private currentSound: SoundType | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.65; // 0 to 1

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Create a 5-second loopable white/pink noise buffer
  private createNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('Context not initialized');
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink/Brownian filter
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain boost
    }
    return buffer;
  }

  // 🌧️ RAIN SOUNDSCAPE
  private startRain() {
    if (!this.ctx || !this.masterGain) return;
    const noiseBuffer = this.createNoiseBuffer();

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Highpass filter to eliminate mud
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(400, this.ctx.currentTime);

    // Bandpass filter centered at 1200Hz
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1100, this.ctx.currentTime);
    bp.Q.setValueAtTime(0.7, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.5, this.ctx.currentTime);

    noiseSource.connect(hp);
    hp.connect(bp);
    bp.connect(gainNode);
    gainNode.connect(this.masterGain);

    noiseSource.start();
    this.currentSourceNodes.push({
      stop: () => {
        try {
          noiseSource.stop();
          noiseSource.disconnect();
        } catch {}
      },
    });
  }

  // 🌊 OCEAN WAVES SOUNDSCAPE
  private startWaves() {
    if (!this.ctx || !this.masterGain) return;
    const noiseBuffer = this.createNoiseBuffer();

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Lowpass filter for deep roar of waves
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(320, this.ctx.currentTime);

    // LFO for wave swells (8-second cycle)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // ~8 sec period

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    const waveGain = this.ctx.createGain();
    waveGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain);

    noiseSource.connect(lp);
    lp.connect(waveGain);
    waveGain.connect(this.masterGain);

    lfo.start();
    noiseSource.start();

    this.currentSourceNodes.push({
      stop: () => {
        try {
          lfo.stop();
          noiseSource.stop();
          lfo.disconnect();
          noiseSource.disconnect();
        } catch {}
      },
    });
  }

  // 🌲 FOREST & WIND SOUNDSCAPE
  private startForest() {
    if (!this.ctx || !this.masterGain) return;
    const noiseBuffer = this.createNoiseBuffer();

    // Gentle wind noise
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(650, this.ctx.currentTime);
    bp.Q.setValueAtTime(1.2, this.ctx.currentTime);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    noiseSource.connect(bp);
    bp.connect(windGain);
    windGain.connect(this.masterGain);
    noiseSource.start();

    // Occasional gentle ambient bird chirp oscillator loop
    const birdInterval = window.setInterval(() => {
      if (!this.ctx || !this.isPlaying || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const baseFreq = 2600 + Math.random() * 800;
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 400, this.ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(baseFreq - 200, this.ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    }, 4500);

    this.currentSourceNodes.push({
      stop: () => {
        clearInterval(birdInterval);
        try {
          noiseSource.stop();
          noiseSource.disconnect();
        } catch {}
      },
    });
  }

  // ☕ COZY CAFE AMBIENCE
  private startCafe() {
    if (!this.ctx || !this.masterGain) return;
    const noiseBuffer = this.createNoiseBuffer();

    // Low rumble of cafe
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(280, this.ctx.currentTime);

    const cafeGain = this.ctx.createGain();
    cafeGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    noiseSource.connect(lp);
    lp.connect(cafeGain);
    cafeGain.connect(this.masterGain);
    noiseSource.start();

    // Warm Rhodes acoustic chord drone (F major chord: F3, A3, C4)
    const freqs = [174.61, 220.0, 261.63];
    const oscs: OscillatorNode[] = [];
    freqs.forEach(f => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, this.ctx.currentTime);
      g.gain.setValueAtTime(0.02, this.ctx.currentTime);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start();
      oscs.push(osc);
    });

    this.currentSourceNodes.push({
      stop: () => {
        try {
          noiseSource.stop();
          noiseSource.disconnect();
          oscs.forEach(o => {
            o.stop();
            o.disconnect();
          });
        } catch {}
      },
    });
  }

  // ⚡ BINAURAL BEAT FOCUS (432Hz + 10Hz Alpha Wave)
  private startBinaural() {
    if (!this.ctx || !this.masterGain) return;
    const merger = this.ctx.createChannelMerger(2);

    const oscL = this.ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(432, this.ctx.currentTime);

    const oscR = this.ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(442, this.ctx.currentTime); // 10Hz Alpha difference

    const gainL = this.ctx.createGain();
    gainL.gain.setValueAtTime(0.06, this.ctx.currentTime);

    const gainR = this.ctx.createGain();
    gainR.gain.setValueAtTime(0.06, this.ctx.currentTime);

    oscL.connect(gainL);
    oscR.connect(gainR);

    gainL.connect(merger, 0, 0); // left channel
    gainR.connect(merger, 0, 1); // right channel
    merger.connect(this.masterGain);

    oscL.start();
    oscR.start();

    this.currentSourceNodes.push({
      stop: () => {
        try {
          oscL.stop();
          oscR.stop();
          oscL.disconnect();
          oscR.disconnect();
          merger.disconnect();
        } catch {}
      },
    });
  }

  // PLAY SPECIFIED SOUNDSCAPE
  public playSound(type: SoundType) {
    this.initContext();
    this.stopCurrentSound();
    this.currentSound = type;
    this.isPlaying = true;

    switch (type) {
      case 'rain':
        this.startRain();
        break;
      case 'waves':
        this.startWaves();
        break;
      case 'forest':
        this.startForest();
        break;
      case 'cafe':
        this.startCafe();
        break;
      case 'binaural':
        this.startBinaural();
        break;
    }
  }

  public stopCurrentSound() {
    this.currentSourceNodes.forEach(node => {
      try {
        node.stop();
      } catch {}
    });
    this.currentSourceNodes = [];
    this.isPlaying = false;
  }

  public togglePlay(soundType?: SoundType) {
    if (this.isPlaying) {
      this.stopCurrentSound();
      return false;
    } else {
      const target = soundType || this.currentSound || 'rain';
      this.playSound(target);
      return true;
    }
  }

  public setVolume(val: number) {
    // val is 0 - 100
    this.volume = Math.max(0, Math.min(100, val)) / 100;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  // 🔔 CRYSTAL TIBETAN BOWL CHIME (Plays when session completes or tested)
  public playSessionChime() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const freqs = [528, 1056, 1584, 2112];
    const gains = [0.25, 0.12, 0.05, 0.02];

    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      g.gain.setValueAtTime(gains[idx], now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

      osc.connect(g);
      g.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 3.5);
    });
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentSound(): SoundType | null {
    return this.currentSound;
  }
}

export const audioEngine = new AudioEngine();
