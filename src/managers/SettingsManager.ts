import p5 from 'p5';
import { t } from '../i18n';
import { SketchManager } from './SketchManager';
import { createDotMatrixSlider } from '../utils/uiUtils';

export class SettingsManager {
    sketchManager: SketchManager;

    // UI Elements
    settingsPanel: HTMLDivElement | null = null;
    settingsContent: HTMLDivElement | null = null;
    presetsList: HTMLDivElement | null = null;
    presetNameInput: HTMLInputElement | null = null;

    constructor(sketchManager: SketchManager) {
        this.sketchManager = sketchManager;

        this.settingsPanel = document.getElementById('settings-panel') as HTMLDivElement;
        this.settingsContent = document.getElementById('settings-content') as HTMLDivElement;
        this.presetsList = document.getElementById('presets-list') as HTMLDivElement;
        this.presetNameInput = document.getElementById('preset-name') as HTMLInputElement;
    }

    toggleSettings() {
        if (!this.settingsPanel) return;
        const isClosed = this.settingsPanel.classList.contains('-translate-x-full');
        if (isClosed) {
            this.settingsPanel.classList.remove('-translate-x-full');
            this.generateSettingsUI();
            this.loadPresetsList();
        } else {
            this.settingsPanel.classList.add('-translate-x-full');
        }
    }

    generateSettingsUI() {
        if (!this.settingsContent) return;
        this.settingsContent.innerHTML = '';
        const currentSketch = this.sketchManager.currentSketch;

        // --- RESET BUTTON SECTION ---
        const resetSection = document.createElement('div');
        resetSection.className = "mb-8 pb-8 border-b border-white/10";

        const resetBtn = document.createElement('button');
        resetBtn.innerText = t("reboot_btn");
        resetBtn.className = "w-full py-3 bg-red-900/20 border border-red-500/30 text-red-500 text-xs font-bold tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all uppercase hover:shadow-lg";
        resetBtn.onclick = () => {
            // 1. Reset Global Effects
            const globalParams = this.sketchManager.postProcessing.params;
            Object.keys(globalParams).forEach(key => {
                globalParams[key].value = 0; // Reset to default (assuming 0 is default for all current effects)
            });

            // 2. Reset Sketch Params
            const SketchClass = currentSketch.constructor as any;
            this.sketchManager.availableSketches[this.sketchManager.currentSketchIndex] = new SketchClass();
            // Update reference
            const newSketch = this.sketchManager.availableSketches[this.sketchManager.currentSketchIndex];
            this.sketchManager.currentSketch = newSketch;

            if (this.sketchManager.p5Instance) {
                newSketch.setup(this.sketchManager.p5Instance);
                const canvas = document.querySelector('canvas');
                if (canvas) {
                    canvas.style.filter = 'brightness(1.5) blur(2px)';
                    setTimeout(() => { canvas.style.filter = 'none'; }, 100);
                }
            }

            // 3. Refresh UI
            this.generateSettingsUI();
        };
        resetSection.appendChild(resetBtn);
        this.settingsContent.appendChild(resetSection);

        // --- GLOBAL EFFECTS SECTION (COLLAPSIBLE) ---
        const effectsDetails = document.createElement('details');
        effectsDetails.className = "mb-8 border border-white/10 bg-white/5 group";

        const effectsSummary = document.createElement('summary');
        effectsSummary.className = "p-4 cursor-pointer text-[10px] text-gray-400 font-mono uppercase tracking-widest hover:text-white transition-colors flex justify-between items-center select-none";
        effectsSummary.innerHTML = `<span>✨ GLOBAL EFFECTS</span> <span class="text-xs group-open:rotate-180 transition-transform">▼</span>`;

        const effectsContent = document.createElement('div');
        effectsContent.className = "p-4 pt-0 border-t border-white/5";

        // Render Global Params
        const globalParams = this.sketchManager.postProcessing.params;
        Object.keys(globalParams).forEach(key => {
            const param = globalParams[key];
            const container = document.createElement('div');
            container.className = 'group mb-4 last:mb-0';

            // Check if it's a boolean toggle (0-1, step 1)
            const isToggle = param.min === 0 && param.max === 1 && param.step === 1;

            if (isToggle) {
                const toggleContainer = document.createElement('div');
                toggleContainer.className = 'flex justify-between items-center h-6';

                const toggleLabel = document.createElement('span');
                toggleLabel.className = 'text-[9px] text-gray-500 font-mono uppercase tracking-widest group-hover:text-white transition-colors';
                toggleLabel.innerText = param.name;

                const toggleBtn = document.createElement('button');
                const updateToggle = () => {
                    const isActive = param.value > 0.5;
                    toggleBtn.className = `w-8 h-4 rounded-full relative transition-colors ${isActive ? 'bg-white' : 'bg-white/10'}`;
                    toggleBtn.innerHTML = `<div class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-black transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0'}"></div>`;
                };
                updateToggle();

                toggleBtn.onclick = () => {
                    param.value = param.value > 0.5 ? 0 : 1;
                    updateToggle();
                };

                toggleContainer.appendChild(toggleLabel);
                toggleContainer.appendChild(toggleBtn);
                container.appendChild(toggleContainer);
            } else {
                // DOT MATRIX SLIDER
                const header = document.createElement('div');
                header.className = 'flex justify-between items-end mb-2';

                const label = document.createElement('label');
                label.className = 'text-[9px] text-gray-500 font-mono uppercase tracking-widest group-hover:text-white transition-colors';
                label.innerText = param.name;

                const valDisplay = document.createElement('div');
                valDisplay.className = 'text-[10px] font-bold text-white font-mono px-2 py-0.5 min-w-[30px] text-right';
                valDisplay.innerText = Number(param.value).toFixed(2);

                header.appendChild(label);
                header.appendChild(valDisplay);
                container.appendChild(header);

                createDotMatrixSlider(param, container, valDisplay);
            }
            effectsContent.appendChild(container);
        });

        effectsDetails.appendChild(effectsSummary);
        effectsDetails.appendChild(effectsContent);
        this.settingsContent.appendChild(effectsDetails);

        // --- AUDIO REACTIVITY INFO ---
        if (currentSketch.audioReactivity) {
            const infoBox = document.createElement('div');
            infoBox.className = "mb-8 p-4 border border-white/10 bg-white/5";

            const infoTitle = document.createElement('div');
            infoTitle.className = "text-[10px] text-gray-400 font-mono uppercase tracking-widest mb-2 flex items-center gap-2";
            infoTitle.innerHTML = `<span class="w-2 h-2 bg-white rounded-full animate-pulse"></span> ${t("impact_audio")}`;

            const infoText = document.createElement('p');
            infoText.className = "text-xs text-gray-300 font-mono leading-relaxed";
            infoText.innerText = t(`sketch_${currentSketch.id}_desc`);

            infoBox.appendChild(infoTitle);
            infoBox.appendChild(infoText);
            this.settingsContent.appendChild(infoBox);
        }

        // --- SPECIFIC SKETCH UI: COLOR SHIFT ---
        if (currentSketch.id === 'color_shift') {
            const noteContainer = document.createElement('div');
            noteContainer.className = "mb-8 p-4 border border-white/10 bg-white/5 flex items-center justify-between";

            const leftCol = document.createElement('div');
            leftCol.innerHTML = `
                <div class="text-[10px] text-gray-400 font-mono uppercase tracking-widest mb-1">DETECTED PITCH</div>
                <div id="chromatic-note-val" class="text-3xl font-bold text-white font-mono">--</div>
                <div id="chromatic-freq-val" class="text-xs text-gray-500 font-mono">0 Hz</div>
            `;

            const rightCol = document.createElement('div');
            rightCol.id = "chromatic-color-indicator";
            rightCol.className = "w-12 h-12 rounded-full border-2 border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-colors duration-300";
            rightCol.style.backgroundColor = "#333";

            noteContainer.appendChild(leftCol);
            noteContainer.appendChild(rightCol);
            this.settingsContent.appendChild(noteContainer);
        }

        const params = currentSketch.params;
        if (!params) {
            const msg = document.createElement('div');
            msg.className = 'text-gray-600 text-xs italic text-center mt-10 font-mono border border-white/5 p-4 rounded';
            msg.innerText = t("no_params");
            this.settingsContent.appendChild(msg);
            return;
        }

        Object.keys(params).forEach(key => {
            const param = params[key];
            const translatedName = t(`param_${key}`);
            const displayName = translatedName !== `param_${key}` ? translatedName : param.name;

            if (param.type === 'slider') {
                const container = document.createElement('div');
                container.className = 'group mb-6';

                // Check if it's a boolean toggle (0-1, step 1)
                const isToggle = param.min === 0 && param.max === 1 && param.step === 1;

                if (isToggle) {
                    const toggleContainer = document.createElement('div');
                    toggleContainer.className = 'flex justify-between items-center h-6';

                    const toggleLabel = document.createElement('span');
                    toggleLabel.className = 'text-[10px] text-gray-400 font-mono uppercase tracking-widest group-hover:text-white transition-colors';
                    toggleLabel.innerText = displayName;

                    const toggleBtn = document.createElement('button');
                    const updateToggle = () => {
                        const isActive = param.value > 0.5;
                        toggleBtn.className = `w-8 h-4 rounded-full relative transition-colors ${isActive ? 'bg-white' : 'bg-white/10'}`;
                        toggleBtn.innerHTML = `<div class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-black transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0'}"></div>`;
                    };
                    updateToggle();

                    toggleBtn.onclick = () => {
                        param.value = param.value > 0.5 ? 0 : 1;
                        updateToggle();
                        if (param.onChange) param.onChange(param.value);
                    };

                    toggleContainer.appendChild(toggleLabel);
                    toggleContainer.appendChild(toggleBtn);
                    container.appendChild(toggleContainer);
                } else {
                    // DOT MATRIX SLIDER
                    const header = document.createElement('div');
                    header.className = 'flex justify-between items-end mb-2';

                    const label = document.createElement('label');
                    label.className = 'text-[10px] text-gray-400 font-mono uppercase tracking-widest group-hover:text-white transition-colors';
                    label.innerText = displayName;

                    const valDisplay = document.createElement('div');
                    valDisplay.className = 'text-xs font-bold text-white font-mono px-2 py-1 min-w-[40px] text-right';
                    valDisplay.innerText = Number(param.value).toFixed(2);

                    header.appendChild(label);
                    header.appendChild(valDisplay);
                    container.appendChild(header);

                    createDotMatrixSlider(param, container, valDisplay);
                }

                // Description
                const descKey = `param_desc_${key}`;
                const translatedDesc = t(descKey);
                if (translatedDesc !== descKey) {
                    const descEl = document.createElement('div');
                    descEl.className = 'text-[9px] text-gray-500 font-mono mt-1 leading-tight';
                    descEl.innerText = translatedDesc;
                    container.appendChild(descEl);
                }

                this.settingsContent!.appendChild(container);

            } else if (param.type === 'color') {
                const container = document.createElement('div');
                container.className = 'flex flex-col gap-2 mb-6';

                const label = document.createElement('div');
                label.className = "flex justify-between items-center";
                label.innerHTML = `<span class="text-[10px] text-gray-400 font-mono uppercase tracking-widest">${displayName}</span>`;

                const valDisplay = document.createElement('span');
                valDisplay.className = "text-[9px] text-gray-600 font-mono";
                valDisplay.innerText = param.value;
                label.appendChild(valDisplay);

                const inputWrapper = document.createElement('div');
                inputWrapper.className = "relative h-10 w-full border border-white/20 hover:border-white transition-colors bg-white/5 cursor-pointer rounded overflow-hidden";

                const input = document.createElement('input');
                input.type = 'color';
                input.value = param.value;
                input.className = "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20";

                const colorPreview = document.createElement('div');
                colorPreview.className = "absolute inset-0 w-full h-full z-10 pointer-events-none";
                colorPreview.style.backgroundColor = param.value;

                input.oninput = (e: any) => {
                    param.value = e.target.value;
                    colorPreview.style.backgroundColor = param.value;
                    valDisplay.innerText = param.value;
                    if (param.onChange) param.onChange(param.value);
                };

                // Append PREVIEW first, then INPUT (Input must be on top for clicks)
                inputWrapper.appendChild(colorPreview);
                inputWrapper.appendChild(input);

                // Add descriptive icon/text if needed? No, keeping it simple.

                const descKey = `param_desc_${key}`;
                const translatedDesc = t(descKey);

                container.appendChild(label);
                container.appendChild(inputWrapper);

                if (translatedDesc !== descKey) {
                    const descEl = document.createElement('div');
                    descEl.className = 'text-[9px] text-gray-500 font-mono mt-1 leading-tight';
                    descEl.innerText = translatedDesc;
                    container.appendChild(descEl);
                }

                this.settingsContent!.appendChild(container);
            }
        });
    }

    loadPresetsList() {
        if (!this.presetsList) return;
        this.presetsList.innerHTML = '';
        const currentSketch = this.sketchManager.currentSketch;
        const prefix = `pulseanime_preset_${currentSketch.id}_`;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                const name = key.replace(prefix, '');

                const item = document.createElement('div');
                item.className = 'flex justify-between items-center bg-white/5 p-3 border border-white/10 hover:border-white/30 transition-colors group';

                const label = document.createElement('span');
                label.innerText = name;
                label.className = 'text-[10px] text-gray-300 font-mono uppercase tracking-wide';

                const actions = document.createElement('div');
                actions.className = 'flex gap-3';

                const loadBtn = document.createElement('button');
                loadBtn.innerText = t('btn_load');
                loadBtn.className = 'text-[9px] text-white font-bold opacity-50 group-hover:opacity-100 transition-opacity hover:underline';
                loadBtn.onclick = () => {
                    try {
                        const saved = JSON.parse(localStorage.getItem(key)!);
                        if (currentSketch.params) {
                            Object.keys(saved).forEach(k => {
                                if (currentSketch.params![k]) currentSketch.params![k].value = saved[k];
                            });
                            this.generateSettingsUI();
                            if (this.sketchManager.p5Instance) currentSketch.setup(this.sketchManager.p5Instance);
                        }
                    } catch (e) { console.error(e); }
                };

                const delBtn = document.createElement('button');
                delBtn.innerText = t('btn_del');
                delBtn.className = 'text-[9px] text-red-500 hover:text-red-300 font-bold opacity-50 group-hover:opacity-100 transition-opacity';
                delBtn.onclick = () => {
                    localStorage.removeItem(key);
                    this.loadPresetsList();
                };

                actions.appendChild(loadBtn);
                actions.appendChild(delBtn);
                item.appendChild(label);
                item.appendChild(actions);
                this.presetsList.appendChild(item);
            }
        }
    }

    savePreset() {
        if (!this.presetNameInput) return;
        const name = this.presetNameInput.value.trim();
        const currentSketch = this.sketchManager.currentSketch;
        if (!name || !currentSketch.params) return;

        const data: any = {};
        Object.keys(currentSketch.params).forEach(k => {
            data[k] = currentSketch.params![k].value;
        });

        localStorage.setItem(`pulseanime_preset_${currentSketch.id}_${name}`, JSON.stringify(data));
        this.presetNameInput.value = '';
        this.loadPresetsList();
    }

    update() {
        // Update specific UI elements that need real-time data
        const currentSketch = this.sketchManager.currentSketch;

        if (currentSketch.id === 'color_shift') {
            const noteDisplay = document.getElementById('chromatic-note-val');
            const freqDisplay = document.getElementById('chromatic-freq-val');
            const colorIndicator = document.getElementById('chromatic-color-indicator');

            // We need to cast currentSketch to ColorShift to access its specific properties
            // Since we don't import ColorShift here to avoid circular deps, we use 'any'
            const sketch = currentSketch as any;

            if (noteDisplay && sketch.currentNote) {
                noteDisplay.innerText = sketch.currentNote;
            }
            if (freqDisplay && sketch.currentFreq) {
                freqDisplay.innerText = `${Math.round(sketch.currentFreq)} Hz`;
            }
            if (colorIndicator && sketch.targetHue !== undefined) {
                colorIndicator.style.backgroundColor = `hsl(${sketch.targetHue}, 80%, 50%)`;
            }
        }
    }
}
