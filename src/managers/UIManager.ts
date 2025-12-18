import { t, getLang, setLang } from '../i18n';
import { audioEngine } from '../services/audio';
import { SketchManager } from './SketchManager';
import { SettingsManager } from './SettingsManager';
import { createDotMatrixSlider } from '../utils/uiUtils';
import { TutorialManager } from './TutorialManager';
import { AudioDebug } from '../components/AudioDebug';

export class UIManager {
    sketchManager: SketchManager;
    settingsManager: SettingsManager;
    audioDebug: AudioDebug;
    tutorialManager: TutorialManager | null = null;

    // DOM Elements
    micBtn = document.getElementById('mic-btn') as HTMLButtonElement;
    spectrumCanvas = document.getElementById('spectrum-viz') as HTMLCanvasElement;
    spectrumCtx = this.spectrumCanvas ? this.spectrumCanvas.getContext('2d') : null;
    controlsContainer = document.getElementById('sketch-controls') as HTMLDivElement;
    fpsCounter = document.getElementById('fps-counter') as HTMLDivElement;
    uiLayer = document.getElementById('ui-layer') as HTMLDivElement;
    sensitivitySlider = document.getElementById('sensitivity-slider') as HTMLInputElement;
    sensitivityDisplay = document.getElementById('sens-val') as HTMLSpanElement;
    audioInput = document.getElementById('audio-upload') as HTMLInputElement;
    bgInput = document.getElementById('bg-upload') as HTMLInputElement;
    bgUploadContainer = document.getElementById('bg-upload-container') as HTMLDivElement;
    removeBgBtn = document.getElementById('remove-bg-btn') as HTMLButtonElement;
    playAudioBtn = document.getElementById('play-audio') as HTMLButtonElement;
    stopAudioBtn = document.getElementById('stop-audio') as HTMLButtonElement;
    closeAudioBtn = document.getElementById('close-audio') as HTMLButtonElement;
    audioControls = document.getElementById('audio-controls') as HTMLDivElement;
    audioProgress = document.getElementById('audio-progress') as HTMLInputElement;
    audioTime = document.getElementById('audio-time') as HTMLSpanElement;

    langToggle = document.getElementById('lang-toggle') as HTMLButtonElement;
    aboutModal = document.getElementById('about-modal') as HTMLDivElement;
    btnAbout = document.getElementById('btn-about') as HTMLButtonElement;
    closeAbout = document.getElementById('close-about') as HTMLButtonElement;
    closeSettings = document.getElementById('close-settings') as HTMLButtonElement;
    tabParams = document.getElementById('tab-params') as HTMLButtonElement;
    tabPresets = document.getElementById('tab-presets') as HTMLButtonElement;
    settingsContent = document.getElementById('settings-content') as HTMLDivElement;
    presetsContent = document.getElementById('presets-content') as HTMLDivElement;
    savePresetBtn = document.getElementById('save-preset') as HTMLButtonElement;

    constructor(sketchManager: SketchManager, settingsManager: SettingsManager, audioDebug: AudioDebug) {
        this.sketchManager = sketchManager;
        this.settingsManager = settingsManager;
        this.audioDebug = audioDebug;
    }

    init() {
        this.initSketchButtons();
        this.initGlobalSensitivity();
        this.initMicToggle();
        this.initAudioUpload();
        this.initBgUpload();
        this.initLangToggle();
        this.initModal();
        this.initSettingsToggle();
        this.initTabs();
        this.initKeyboard();
        this.initPresetSave();
        this.initTutorial();

        // Initial UI Update
        this.updateUIText();
    }

    update() {
        this.updateAudioUI();
    }

    updateAudioUI() {
        if (!this.audioControls || this.audioControls.classList.contains('hidden')) return;

        const duration = audioEngine.getDuration();
        const current = audioEngine.getCurrentTime();

        if (this.audioProgress && !this.isDraggingProgress) {
            // Update min/max/value on the input
            this.audioProgress.max = String(duration);
            this.audioProgress.value = String(current);

            // Call the visual update method attached to the input
            if ((this.audioProgress as any).updateVisuals) {
                (this.audioProgress as any).updateVisuals(current);
            }
        }

        if (this.audioTime) {
            const fmt = (t: number) => {
                const m = Math.floor(t / 60).toString().padStart(2, '0');
                const s = Math.floor(t % 60).toString().padStart(2, '0');
                return `${m}:${s}`;
            };
            this.audioTime.innerText = `${fmt(current)} / ${fmt(duration)}`;
        }

        if (this.playAudioBtn) {
            this.playAudioBtn.innerText = audioEngine.isFilePlaying ? "PAUSE" : "PLAY";
        }
    }

    private isDraggingProgress = false;

    initAudioUpload() {
        if (this.audioInput) {
            this.audioInput.onchange = async (e: any) => {
                const file = e.target.files[0];
                if (file) {
                    const arrayBuffer = await file.arrayBuffer();
                    await audioEngine.loadFile(arrayBuffer); // Load but don't play

                    if (this.audioControls) this.audioControls.classList.remove('hidden');
                    if (this.playAudioBtn) this.playAudioBtn.innerText = "PLAY";

                    // Reset progress
                    if (this.audioProgress) {
                        this.audioProgress.value = "0";
                        if ((this.audioProgress as any).updateVisuals) {
                            (this.audioProgress as any).updateVisuals(0);
                        }
                    }
                }
            };
        }

        if (this.playAudioBtn) {
            this.playAudioBtn.onclick = () => {
                if (audioEngine.isFilePlaying) {
                    audioEngine.pauseFile();
                } else {
                    audioEngine.resumeFile();
                }
                // Button text updated in updateAudioUI
            };
        }

        if (this.stopAudioBtn) {
            this.stopAudioBtn.onclick = () => {
                audioEngine.stopFile();
                // We keep controls visible but reset state
                if (this.playAudioBtn) this.playAudioBtn.innerText = "PLAY";
            };
        }

        if (this.closeAudioBtn) {
            this.closeAudioBtn.onclick = () => {
                audioEngine.stopFile();
                if (this.audioControls) this.audioControls.classList.add('hidden');
                if (this.audioInput) this.audioInput.value = ''; // Reset input so same file can be selected again
                if (this.playAudioBtn) this.playAudioBtn.innerText = "PLAY";
            };
        }

        // Replace Audio Progress Slider
        if (this.audioProgress && this.audioProgress.parentElement) {
            const parent = this.audioProgress.parentElement;
            const oldInput = this.audioProgress;

            // Create new slider
            const { wrapper, input } = createDotMatrixSlider({
                value: 0,
                min: 0,
                max: 100, // Will be updated dynamically
                step: 0.1,
                onChange: (val) => {
                    audioEngine.seek(val);
                }
            }, parent);

            // Replace in DOM
            parent.replaceChild(wrapper, oldInput);

            // Update reference
            this.audioProgress = input;

            // Re-attach listeners
            this.audioProgress.onmousedown = () => { this.isDraggingProgress = true; };
            this.audioProgress.onmouseup = () => { this.isDraggingProgress = false; };
            // oninput is handled by createDotMatrixSlider via onChange
        }
    }

    updateUIText() {
        // Update static data-i18n elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) el.textContent = t(key);
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) (el as HTMLInputElement).placeholder = t(key);
        });

        // Update Lang Button
        if (this.langToggle) this.langToggle.innerText = getLang() === 'en' ? 'FR' : 'EN';

        // Update Dynamic Sketch Buttons
        if (this.controlsContainer) {
            const buttons = Array.from(this.controlsContainer.children) as HTMLButtonElement[];
            this.sketchManager.availableSketches.forEach((s, i) => {
                if (buttons[i]) buttons[i].innerText = t(`sketch_${s.id}_name`);
            });
        }

        // Regenerate Settings UI to translate params/descriptions
        this.settingsManager.generateSettingsUI();

        // Update Mic Button Status text
        if (this.micBtn) {
            if (audioEngine.isMicActive) {
                this.micBtn.innerText = t("mic_on");
            } else {
                this.micBtn.innerText = t("mic_off");
            }
        }

        // Update Presets labels
        this.settingsManager.loadPresetsList();
    }

    initSketchButtons() {
        if (this.controlsContainer) {
            this.controlsContainer.innerHTML = ''; // Clear existing
            this.sketchManager.availableSketches.forEach((s, idx) => {
                const btn = document.createElement('button');
                btn.innerText = t(`sketch_${s.id}_name`);
                btn.className = 'px-3 py-1 border border-white/20 text-gray-400 text-xs font-mono uppercase hover:bg-white/10 hover:text-white transition-colors';
                btn.onclick = () => this.sketchManager.switchSketch(idx, 'canvas-container');
                this.controlsContainer.appendChild(btn);
            });
        }
    }

    updateSketchButtonsStyle(idx: number) {
        if (this.controlsContainer) {
            Array.from(this.controlsContainer.children).forEach((btn: any, i) => {
                if (i === idx) {
                    btn.className = 'px-3 py-1 border border-white bg-white text-black font-bold text-xs font-mono uppercase transition-all shadow-lg';
                } else {
                    btn.className = 'px-3 py-1 border border-white/20 text-gray-400 text-xs font-mono uppercase hover:bg-white/10 hover:text-white transition-colors';
                }
            });
        }

        // --- BACKGROUND UPLOAD RESTRICTION ---
        // Only show background upload for 'travel' sketch
        const activeSketch = idx === -1 ? this.sketchManager.landingSketch : this.sketchManager.availableSketches[idx];
        const isTravel = activeSketch.id === 'travel';

        if (this.bgUploadContainer) {
            if (isTravel) {
                this.bgUploadContainer.classList.remove('hidden');
                this.bgUploadContainer.classList.add('flex');
            } else {
                this.bgUploadContainer.classList.add('hidden');
                this.bgUploadContainer.classList.remove('flex');
            }
        }

        // On sketch change, uploaded image is cleared in SketchManager, 
        // so hide the remove button here if it was visible.
        if (this.removeBgBtn) {
            this.removeBgBtn.classList.add('hidden');
            this.removeBgBtn.classList.remove('flex');
        }
        if (this.bgInput) this.bgInput.value = '';
    }

    initGlobalSensitivity() {
        // Replace Sensitivity Slider
        if (this.sensitivitySlider && this.sensitivitySlider.parentElement) {
            const parent = this.sensitivitySlider.parentElement;
            const oldInput = this.sensitivitySlider;
            const display = this.sensitivityDisplay;

            // Create new slider
            const { wrapper, input } = createDotMatrixSlider({
                value: 1.0,
                min: 0.1,
                max: 3.0,
                step: 0.1,
                onChange: (val) => {
                    audioEngine.sensitivity = val;
                    if (display) display.innerText = val.toFixed(1);
                }
            }, parent);

            // Replace in DOM
            parent.replaceChild(wrapper, oldInput);

            // Update reference
            this.sensitivitySlider = input;
            this.sensitivitySlider.id = 'sensitivity-slider'; // Restore ID for tutorial target

            // Force init value
            audioEngine.sensitivity = 1.0;
            if (display) display.innerText = "1.0";
        }
    }

    initMicToggle() {
        if (this.micBtn) {
            this.micBtn.onclick = async () => {
                try {
                    const isActive = await audioEngine.toggleMicrophone();
                    if (isActive) {
                        this.micBtn.innerText = t("mic_on");
                        this.micBtn.classList.add('bg-red-900/20', 'text-red-500', 'border-red-500', 'shadow-[0_0_10px_rgba(255,0,0,0.4)]');
                        this.micBtn.classList.remove('bg-white/5', 'border-white/20');
                    } else {
                        this.micBtn.innerText = t("mic_off");
                        this.micBtn.classList.remove('bg-red-900/20', 'text-red-500', 'border-red-500', 'shadow-[0_0_10px_rgba(255,0,0,0.4)]');
                        this.micBtn.classList.add('bg-white/5', 'text-white', 'border-white/20');
                    }
                } catch (e) {
                    console.error("Mic Error", e);
                    this.micBtn.innerText = t("mic_err");
                }
            };
        }
    }

    initBgUpload() {
        if (this.bgInput) {
            this.bgInput.onchange = (e: any) => {
                const file = e.target.files[0];
                if (file && this.sketchManager.p5Instance) {
                    const url = URL.createObjectURL(file);
                    this.sketchManager.p5Instance.loadImage(url, (img) => {
                        this.sketchManager.uploadedBgImage = img;
                        if (this.removeBgBtn) {
                            this.removeBgBtn.classList.remove('hidden');
                            this.removeBgBtn.classList.add('flex');
                        }
                    });
                }
            };
        }

        if (this.removeBgBtn) {
            this.removeBgBtn.onclick = () => {
                this.sketchManager.uploadedBgImage = null;
                if (this.bgInput) this.bgInput.value = '';
                this.removeBgBtn.classList.add('hidden');
                this.removeBgBtn.classList.remove('flex');
            };
        }
    }

    initLangToggle() {
        if (this.langToggle) {
            this.langToggle.onclick = () => {
                const nextLang = getLang() === 'en' ? 'fr' : 'en';
                setLang(nextLang);
                this.updateUIText();
            };
        }
    }

    initModal() {
        if (this.btnAbout && this.aboutModal && this.closeAbout) {
            this.btnAbout.onclick = () => {
                this.aboutModal.classList.remove('hidden');
                this.aboutModal.classList.add('flex');
            };
            this.closeAbout.onclick = () => {
                this.aboutModal.classList.add('hidden');
                this.aboutModal.classList.remove('flex');
            };
        }
    }

    initSettingsToggle() {
        if (this.closeSettings) this.closeSettings.onclick = () => this.settingsManager.toggleSettings();
    }

    initTabs() {
        if (this.tabParams && this.tabPresets && this.settingsContent && this.presetsContent) {
            this.tabParams.onclick = () => {
                this.tabParams.classList.add('bg-white/5', 'text-white', 'border-white');
                this.tabParams.classList.remove('text-gray-500', 'border-transparent');
                this.tabPresets.classList.remove('bg-white/5', 'text-white', 'border-white');
                this.tabPresets.classList.add('text-gray-500', 'border-transparent');
                this.settingsContent.classList.remove('hidden');
                this.presetsContent.classList.add('hidden');
            };
            this.tabPresets.onclick = () => {
                this.tabPresets.classList.add('bg-white/5', 'text-white', 'border-white');
                this.tabPresets.classList.remove('text-gray-500', 'border-transparent');
                this.tabParams.classList.remove('bg-white/5', 'text-white', 'border-white');
                this.tabParams.classList.add('text-gray-500', 'border-transparent');
                this.presetsContent.classList.remove('hidden');
                this.settingsContent.classList.add('hidden');
            };
        }
    }

    initPresetSave() {
        if (this.savePresetBtn) {
            this.savePresetBtn.onclick = () => this.settingsManager.savePreset();
        }
    }

    initKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (TutorialManager.isTutorialActive()) return;
            if (e.key === 'h' && this.uiLayer) {
                this.uiLayer.style.opacity = this.uiLayer.style.opacity === '0' ? '1' : '0';
            }
            if (e.key === ' ') {
                if (this.sketchManager.p5Instance && this.sketchManager.p5Instance.isLooping()) this.sketchManager.p5Instance.noLoop();
                else if (this.sketchManager.p5Instance) this.sketchManager.p5Instance.loop();
            }
            if (e.key === 'm' && this.micBtn) {
                this.micBtn.click();
            }
            if (e.key === 'r' || e.key === 'R') {
                this.settingsManager.toggleSettings();
            }
            if (e.key === 'd' || e.key === 'D') {
                this.audioDebug.toggle();
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                audioEngine.sensitivity = Math.min(3.0, audioEngine.sensitivity + 0.1);
                this.updateSensitivityUI();
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                audioEngine.sensitivity = Math.max(0.1, audioEngine.sensitivity - 0.1);
                this.updateSensitivityUI();
            }
            if (e.key === 'ArrowRight') {
                if (this.sketchManager.currentSketchIndex === -1) {
                    this.sketchManager.switchSketch(0, 'canvas-container');
                } else {
                    const nextIdx = (this.sketchManager.currentSketchIndex + 1) % this.sketchManager.availableSketches.length;
                    this.sketchManager.switchSketch(nextIdx, 'canvas-container');
                }
            }
            if (e.key === 'ArrowLeft') {
                if (this.sketchManager.currentSketchIndex === -1) {
                    this.sketchManager.switchSketch(this.sketchManager.availableSketches.length - 1, 'canvas-container');
                } else {
                    const prevIdx = (this.sketchManager.currentSketchIndex - 1 + this.sketchManager.availableSketches.length) % this.sketchManager.availableSketches.length;
                    this.sketchManager.switchSketch(prevIdx, 'canvas-container');
                }
            }
            if (this.sketchManager.p5Instance) this.sketchManager.handleKeyPressed(this.sketchManager.p5Instance, e.key);
        });
    }

    private updateSensitivityUI() {
        if (this.sensitivityDisplay) this.sensitivityDisplay.innerText = audioEngine.sensitivity.toFixed(1);
        if (this.sensitivitySlider) {
            this.sensitivitySlider.value = audioEngine.sensitivity.toString();
            // Trigger visual update for custom slider if exists
            if ((this.sensitivitySlider as any).updateVisuals) {
                (this.sensitivitySlider as any).updateVisuals(audioEngine.sensitivity);
            }
        }
    }

    initTutorial() {
        this.tutorialManager = new TutorialManager();
        const restartBtn = document.getElementById('restart-tutorial');
        if (restartBtn) {
            restartBtn.onclick = () => {
                if (this.aboutModal) {
                    this.aboutModal.classList.add('hidden');
                    this.aboutModal.classList.remove('flex');
                }
                this.tutorialManager?.start();
            };
        }
    }
}
