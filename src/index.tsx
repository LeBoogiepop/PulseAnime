import p5 from 'p5';
import { audioEngine } from './services/audio';
import { SketchManager } from './managers/SketchManager';
import { SettingsManager } from './managers/SettingsManager';
import { UIManager } from './managers/UIManager';
import { SpectrumVisualizer } from './components/SpectrumVisualizer';
import { AudioDebug } from './components/AudioDebug';
import { fetchAppSketchOrder } from './services/library';

(async () => {
  const sketchIdFromUrl = new URLSearchParams(window.location.search).get('sketch');
  const sketchOrder = await fetchAppSketchOrder();
  const sketchManager = new SketchManager(sketchOrder || undefined);
  const settingsManager = new SettingsManager(sketchManager);
  const audioDebug = new AudioDebug();
  const uiManager = new UIManager(sketchManager, settingsManager, audioDebug);
  const spectrumVisualizer = new SpectrumVisualizer(64);

  sketchManager.onSketchChange = (sketch, index) => {
    uiManager.updateSketchButtonsStyle(index);
    settingsManager.generateSettingsUI();
    settingsManager.loadPresetsList();
  };

  const sketch = (p: p5) => {
    p.setup = () => sketchManager.setup(p);
    p.draw = () => {
      const audio = audioEngine.getAnalysis();
      sketchManager.draw(p, audio);
      audioDebug.update(audio);
      settingsManager.update();
      uiManager.update();
      if (uiManager.spectrumCtx && uiManager.spectrumCanvas) {
        const canvas = uiManager.spectrumCanvas;
        if (canvas.width !== canvas.clientWidth) canvas.width = canvas.clientWidth;
        if (canvas.height !== canvas.clientHeight) canvas.height = canvas.clientHeight;
        if (audio.spectrum?.length) {
          spectrumVisualizer.draw(uiManager.spectrumCtx, audio.spectrum, audioEngine.sensitivity, canvas.width, canvas.height);
        } else {
          uiManager.spectrumCtx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      if (uiManager.fpsCounter && p.frameCount % 30 === 0) {
        uiManager.fpsCounter.innerText = `${Math.round(p.frameRate())} FPS`;
      }
    };
    p.windowResized = () => sketchManager.handleResize(p);
    p.mousePressed = () => sketchManager.handleMousePressed(p);
    p.keyPressed = () => sketchManager.p5Instance && sketchManager.handleKeyPressed(sketchManager.p5Instance, p.key);
  };

  sketchManager.onRequestP5Recreation = () => {
    const container = document.getElementById('canvas-container');
    if (container) sketchManager.p5Instance = new p5(sketch, container);
  };

  uiManager.init();

  const container = document.getElementById('canvas-container');
  if (container) sketchManager.p5Instance = new p5(sketch, container);

  if (sketchIdFromUrl) {
    const idx = sketchManager.availableSketches.findIndex(s => s.id === sketchIdFromUrl);
    if (idx >= 0) {
      sketchManager.switchSketch(idx, 'canvas-container');
    }
    window.history.replaceState({}, '', window.location.pathname);
  }
})();
