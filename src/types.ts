import p5 from 'p5';

export interface AudioData {
  level: number;    // 0.0 - 1.0 smoothed volume
  energy: number;   // Instantaneous energy
  subBass: number;  // 0.0 - 1.0
  bass: number;     // 0.0 - 1.0
  lowMid: number;   // 0.0 - 1.0
  mid: number;      // 0.0 - 1.0
  highMid: number;  // 0.0 - 1.0
  treble: number;   // 0.0 - 1.0
  spectrum: Uint8Array; // 1024 bins
  waveform: Uint8Array; // 1024 bins
}

export type ParamType = 'slider' | 'color' | 'checkbox';

export interface SketchParam {
  type: ParamType;
  value: any;
  min?: number; // For sliders
  max?: number; // For sliders
  step?: number; // For sliders
  name: string;
  description?: string; // Optional description field
  onChange?: (value: any) => void;
}

export interface SketchParams {
  [key: string]: SketchParam;
}

export interface Sketch {
  id: string;
  name: string;
  audioReactivity?: string; // Description of how audio affects the sketch
  mode?: 'P2D' | 'WEBGL'; // Renderer mode required by the sketch
  params?: SketchParams; // Optional params for customization
  setup: (p: p5) => void;
  // Updated draw signature to accept background image
  draw: (p: p5, audio: AudioData, bgImage?: p5.Image | null) => void;
  cleanup: () => void;
  keyPressed?: (p: p5, key: string) => void;
  mousePressed?: (p: p5) => void;
}

export const PALETTES = [
  ['#0a0a0a', '#00FFFF', '#FF00FF', '#FF8800'], // Neon
  ['#0a0a0a', '#80FFFF', '#FF80FF', '#FFFF00'], // Pastel Dark
  ['#050505', '#00FFFF', '#FFFFFF', '#008888'], // Cyan Mono
  ['#1a0505', '#FF0000', '#FF8800', '#FFFF00'], // Magma
  ['#000000', '#F00', '#FF0', '#0F0'], // Silence
];