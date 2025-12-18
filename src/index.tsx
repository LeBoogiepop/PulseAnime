import p5 from 'p5';
import { audioEngine } from './services/audio';
import { SketchManager } from './managers/SketchManager';
import { SettingsManager } from './managers/SettingsManager';
import { UIManager } from './managers/UIManager';
import { SpectrumVisualizer } from './components/SpectrumVisualizer';
import { AudioDebug } from './components/AudioDebug';

// --- INITIALIZATION ---
const sketchManager = new SketchManager();

const settingsManager = new SettingsManager(sketchManager);
const audioDebug = new AudioDebug();
const uiManager = new UIManager(sketchManager, settingsManager, audioDebug);
const spectrumVisualizer = new SpectrumVisualizer(64);

// --- WIRE UP MANAGERS ---
sketchManager.onSketchChange = (sketch, index) => {
  uiManager.updateSketchButtonsStyle(index);
  settingsManager.generateSettingsUI();
  settingsManager.loadPresetsList();
};

// Handle p5 recreation request from SketchManager
sketchManager.onRequestP5Recreation = () => {
  const container = document.getElementById('canvas-container');
  if (container) {
    sketchManager.p5Instance = new p5(sketch, container);
  }
};

// --- P5 INSTANCE DEFINITION ---
const sketch = (p: p5) => {
  p.setup = () => {
    sketchManager.setup(p);
  };

  p.draw = () => {
    const audio = audioEngine.getAnalysis();
    sketchManager.draw(p, audio);
    audioDebug.update(audio);
    settingsManager.update();
    uiManager.update();

    // Draw Spectrum Visualization (2D Context on top overlay)
    if (uiManager.spectrumCtx && uiManager.spectrumCanvas) {
      const canvas = uiManager.spectrumCanvas;

      // Synchronize internal resolution with displayed size
      if (canvas.width !== canvas.clientWidth) canvas.width = canvas.clientWidth;
      if (canvas.height !== canvas.clientHeight) canvas.height = canvas.clientHeight;

      const w = canvas.width;
      const h = canvas.height;

      // Check if we have spectrum data
      if (audio.spectrum && audio.spectrum.length > 0) {
        spectrumVisualizer.draw(uiManager.spectrumCtx, audio.spectrum, audioEngine.sensitivity, w, h);
      } else {
        uiManager.spectrumCtx.clearRect(0, 0, w, h);
      }
    }


    if (uiManager.fpsCounter && p.frameCount % 30 === 0) {
      uiManager.fpsCounter.innerText = `${Math.round(p.frameRate())} FPS`;
    }
  };

  p.windowResized = () => {
    sketchManager.handleResize(p);
  };

  p.mousePressed = () => {
    sketchManager.handleMousePressed(p);
  }

  p.keyPressed = () => {
    if (sketchManager.p5Instance) sketchManager.handleKeyPressed(sketchManager.p5Instance, p.key);
  };
};

// --- BOOTSTRAP ---
uiManager.init();

const container = document.getElementById('canvas-container');
if (container) {
  sketchManager.p5Instance = new p5(sketch, container);
}
