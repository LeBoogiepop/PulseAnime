import { AudioData } from '../types';

export class AudioEngine {
  public context: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  public micGain: GainNode | null = null;
  public compressor: DynamicsCompressorNode | null = null;

  private micSource: MediaStreamAudioSourceNode | null = null;
  private fileSource: AudioBufferSourceNode | null = null;
  private micStream: MediaStream | null = null;

  private dataArray: Uint8Array<ArrayBuffer>;
  private waveArray: Uint8Array<ArrayBuffer>;

  public isInitialized = false;
  public isMicActive = false;
  public isFilePlaying = false;
  public sensitivity = 1.0;

  // Auto-gain tracking
  private volMax = 100;
  private volDecay = 0.1; // Slower decay for stable normalization

  // Smoothing state
  private smoothSubBass = 0;
  private smoothBass = 0;
  private smoothLowMid = 0;
  private smoothMid = 0;
  private smoothHighMid = 0;
  private smoothTreble = 0;
  private smoothEnergy = 0;

  constructor() {
    this.dataArray = new Uint8Array(0);
    this.waveArray = new Uint8Array(0);
  }

  async initialize() {
    if (this.context) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.context = new AudioContextClass();

    this.analyser = this.context.createAnalyser();
    // High resolution FFT for precise bass detection
    this.analyser.fftSize = 4096;
    // Lower smoothing for snappy transient detection (we smooth manually)
    this.analyser.smoothingTimeConstant = 0.6;

    // --- MICROPHONE PROCESSING CHAIN ---
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -50;
    this.compressor.knee.value = 40;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0;
    this.compressor.release.value = 0.25;

    this.micGain = this.context.createGain();
    this.micGain.gain.value = 2.0;

    this.micGain.connect(this.compressor);
    this.compressor.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount; // 2048 bins
    this.dataArray = new Uint8Array(bufferLength);
    this.waveArray = new Uint8Array(bufferLength);

    this.isInitialized = true;
  }

  async toggleMicrophone(): Promise<boolean> {
    await this.initialize();
    if (!this.context || !this.analyser) return false;

    if (this.isMicActive) {
      this.stopMic();
      this.isMicActive = false;
      return false;
    } else {
      // Removed mutual exclusivity: File keeps playing if it was on

      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });

        this.micSource = this.context.createMediaStreamSource(this.micStream);
        if (this.micGain) this.micSource.connect(this.micGain);

        this.isMicActive = true;
        this.resume();
        return true;
      } catch (e) {
        console.error("Microphone access denied", e);
        return false;
      }
    }
  }

  stopMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
  }

  private startTime = 0;
  private pausedAt = 0;
  private currentBuffer: AudioBuffer | null = null;

  async loadFile(arrayBuffer: ArrayBuffer) {
    await this.initialize();
    if (!this.context || !this.analyser) return;

    try {
      this.currentBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.stopFile();
      // Do not auto-play
    } catch (e) {
      console.error("Error playing audio file", e);
    }
  }

  // Legacy support if needed, or just alias
  async playFile(arrayBuffer: ArrayBuffer) {
    await this.loadFile(arrayBuffer);
    this.playBuffer(0);
  }

  private playBuffer(offset: number) {
    if (!this.context || !this.analyser || !this.currentBuffer) return;

    // Stop existing source if any
    if (this.fileSource) {
      try { this.fileSource.stop(); this.fileSource.disconnect(); } catch (e) { }
    }

    this.fileSource = this.context.createBufferSource();
    this.fileSource.buffer = this.currentBuffer;

    this.fileSource.connect(this.analyser);
    this.fileSource.connect(this.context.destination);

    this.fileSource.onended = () => {
      // Only reset if we reached the end naturally
      if (this.context && this.currentBuffer && this.context.currentTime > this.startTime + this.currentBuffer.duration - 0.1) {
        this.isFilePlaying = false;
        this.pausedAt = 0;
      }
    };

    this.startTime = this.context.currentTime - offset;
    this.fileSource.start(0, offset);
    this.isFilePlaying = true;
    this.resume();
  }

  pauseFile() {
    if (this.fileSource && this.isFilePlaying) {
      if (this.context) {
        this.pausedAt = this.context.currentTime - this.startTime;
        this.fileSource.stop();
        this.fileSource.disconnect();
        this.fileSource = null;
      }
      this.isFilePlaying = false;
    }
  }

  resumeFile() {
    if (!this.isFilePlaying && this.currentBuffer) {
      this.playBuffer(this.pausedAt);
    }
  }

  stopFile() {
    if (this.fileSource) {
      try { this.fileSource.stop(); this.fileSource.disconnect(); } catch (e) { }
      this.fileSource = null;
    }
    this.isFilePlaying = false;
    this.pausedAt = 0;
  }

  seek(time: number) {
    if (!this.currentBuffer) return;
    time = Math.max(0, Math.min(time, this.currentBuffer.duration));

    this.pausedAt = time;
    if (this.isFilePlaying) {
      this.playBuffer(time);
    }
  }

  getDuration(): number {
    return this.currentBuffer ? this.currentBuffer.duration : 0;
  }

  getCurrentTime(): number {
    if (!this.currentBuffer) return 0;
    if (this.isFilePlaying && this.context) {
      return this.context.currentTime - this.startTime;
    }
    return this.pausedAt;
  }

  private getAverageVolume(array: Uint8Array, startBin: number, endBin: number): number {
    if (endBin <= startBin) return 0;
    let sum = 0;
    const safeEnd = Math.min(endBin, array.length);
    if (startBin >= safeEnd) return 0;

    for (let i = startBin; i < safeEnd; i++) {
      sum += array[i];
    }
    return sum / (safeEnd - startBin);
  }

  getAnalysis(): AudioData {
    if (!this.analyser || !this.isInitialized) {
      return {
        level: 0, energy: 0,
        subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0,
        spectrum: new Uint8Array(0), waveform: new Uint8Array(0)
      };
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    this.analyser.getByteTimeDomainData(this.waveArray);

    const spectrum = this.dataArray;
    const waveform = this.waveArray;

    // --- FREQUENCY MAPPING (FFT 4096 / SR 44100 -> ~10.76 Hz/bin) ---
    // Sub-Bass: 20-60Hz -> Bins 2 - 6
    // Bass: 60-250Hz -> Bins 6 - 23
    // Low Mid: 250-500Hz -> Bins 23 - 46
    // Mid: 500-2000Hz -> Bins 46 - 186
    // High Mid: 2000-6000Hz -> Bins 186 - 558
    // Treble: 6000-20000Hz -> Bins 558 - 1858

    const subBassRaw = this.getAverageVolume(spectrum, 2, 6);
    const bassRaw = this.getAverageVolume(spectrum, 6, 23);
    const lowMidRaw = this.getAverageVolume(spectrum, 23, 46);
    const midRaw = this.getAverageVolume(spectrum, 46, 186);
    const highMidRaw = this.getAverageVolume(spectrum, 186, 558);
    const trebleRaw = this.getAverageVolume(spectrum, 558, 1858);

    // Grouping for simplified 3-band output
    const bassTotal = Math.max(subBassRaw, bassRaw); // Peak detection for bass
    const midTotal = (lowMidRaw + midRaw) / 2;
    const trebleTotal = (highMidRaw + trebleRaw) / 2;
    const energyTotal = (bassTotal * 1.5 + midTotal + trebleTotal * 0.5) / 3;

    // --- AUTO GAIN CONTROL (AGC) ---
    this.volMax -= this.volDecay;
    if (this.volMax < 50) this.volMax = 50;

    if (bassTotal > this.volMax) this.volMax = bassTotal;
    if (midTotal > this.volMax) this.volMax = midTotal;

    // --- NORMALIZATION & DYNAMICS ---
    const process = (val: number) => {
      let n = val / this.volMax;
      n *= this.sensitivity;
      n = Math.min(1, Math.max(0, n));
      return Math.pow(n, 1.8); // Expander
    };

    const targetBass = process(bassTotal);
    const targetMid = process(midTotal);
    const targetTreble = process(trebleTotal);
    const targetEnergy = process(energyTotal);

    // --- SMART SMOOTHING (Attack/Decay) ---
    // Fast attack (0.1) for impact, slow decay (0.2) for smoothness
    const smooth = (current: number, target: number) => {
      if (target > current) {
        return current + (target - current) * 0.9; // Fast attack
      } else {
        return current + (target - current) * 0.2; // Slow decay
      }
    };

    this.smoothSubBass = smooth(this.smoothSubBass, process(subBassRaw));
    this.smoothBass = smooth(this.smoothBass, process(bassRaw));
    this.smoothLowMid = smooth(this.smoothLowMid, process(lowMidRaw));
    this.smoothMid = smooth(this.smoothMid, process(midRaw));
    this.smoothHighMid = smooth(this.smoothHighMid, process(highMidRaw));
    this.smoothTreble = smooth(this.smoothTreble, process(trebleRaw));
    this.smoothEnergy = smooth(this.smoothEnergy, targetEnergy);

    return {
      level: this.smoothEnergy,
      energy: this.smoothEnergy,
      subBass: this.smoothSubBass,
      bass: this.smoothBass,
      lowMid: this.smoothLowMid,
      mid: this.smoothMid,
      highMid: this.smoothHighMid,
      treble: this.smoothTreble,
      spectrum,
      waveform
    };
  }

  resume() {
    if (this.context?.state === 'suspended') {
      this.context.resume();
    }
  }
}

export const audioEngine = new AudioEngine();