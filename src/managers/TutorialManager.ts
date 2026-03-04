
import { t, getLang } from '../i18n';

export interface TutorialStep {
    id: number;
    targetId?: string;
    titleKey: string;
    messageKey: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    highlightOffset?: { x: number, y: number, w: number, h: number };
    tooltipOffset?: { x: number, y: number };
    tooltipWidth?: number;
}

export class TutorialManager {
    public static instance: TutorialManager | null = null;
    private isActive = false;
    private currentStep = 0;
    private overlay: HTMLDivElement | null = null;
    private highlight: HTMLDivElement | null = null;
    private tooltip: HTMLDivElement | null = null;
    private debugMode = false;
    private debugPanel: HTMLDivElement | null = null;
    private lastStepForDebugSync = -1;
    private shouldClampTooltip = false;

    private steps: TutorialStep[] = [
        {
            id: 0,
            titleKey: 'tut_welcome_title',
            messageKey: 'tut_welcome_msg',
            position: 'center'
        },
        {
            id: 1,
            targetId: 'sketch-controls',
            titleKey: 'tut_step1_title',
            messageKey: 'tut_step1_msg',
            position: 'left',
            highlightOffset: { x: 78, y: -8, w: -69, h: 16 },
            tooltipOffset: { x: 114, y: 17 },
            tooltipWidth: 340
        },
        {
            id: 2,
            targetId: 'audio-upload',
            titleKey: 'tut_step2_title',
            messageKey: 'tut_step2_msg',
            position: 'bottom',
            highlightOffset: { x: -8, y: -8, w: 16, h: 16 },
            tooltipOffset: { x: -120, y: -30 },
            tooltipWidth: 340
        },
        {
            id: 3,
            targetId: 'mic-btn',
            titleKey: 'tut_step3_title',
            messageKey: 'tut_step3_msg',
            position: 'top',
            highlightOffset: { x: -8, y: -8, w: 16, h: 16 },
            tooltipOffset: { x: -233, y: 122 },
            tooltipWidth: 340
        },
        {
            id: 4,
            targetId: 'sens-container',
            titleKey: 'tut_step4_title',
            messageKey: 'tut_step4_msg',
            position: 'top',
            highlightOffset: { x: -8, y: -8, w: 16, h: 16 },
            tooltipOffset: { x: -6, y: 40 },
            tooltipWidth: 340
        },
        {
            id: 5,
            targetId: 'shortcuts-area',
            titleKey: 'tut_step5_title',
            messageKey: 'tut_step5_msg',
            position: 'top',
            highlightOffset: { x: -7, y: 5, w: -40, h: 0 },
            tooltipOffset: { x: -26, y: -41 },
            tooltipWidth: 338
        },
        {
            id: 6,
            targetId: 'lang-toggle',
            titleKey: 'tut_step6_title',
            messageKey: 'tut_step6_msg',
            position: 'bottom',
            highlightOffset: { x: -8, y: -8, w: 16, h: 16 },
            tooltipOffset: { x: -30, y: -26 },
            tooltipWidth: 340
        },
        {
            id: 7,
            titleKey: 'tut_step',
            messageKey: 'tut_done_msg',
            position: 'center'
        }
    ];

    constructor() {
        TutorialManager.instance = this;
        this.init();
    }

    public static isTutorialActive(): boolean {
        return !!TutorialManager.instance?.isActive;
    }

    private init() {
        // Always start tutorial for now as requested (skip localStorage check)
        setTimeout(() => this.start(), 1000);

        window.addEventListener('resize', () => {
            if (this.isActive) this.updateUI();
        });

        window.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            if (e.key === 'ArrowRight' || e.key === 'Enter') this.next();
            if (e.key === 'ArrowLeft') this.previous();
            if (e.key === 'Escape') {
                const title = getLang() === 'en' ? "Skip Tutorial?" : "Passer le tutoriel ?";
                if (window.confirm(title)) {
                    this.skip();
                }
            }
        });
    }

    public start() {
        this.isActive = true;
        this.currentStep = 0;
        this.createOverlay();
        this.updateUI();
        document.body.classList.add('overflow-hidden');
    }

    public skip() {
        this.finish(true);
    }

    private finish(skipped = false) {
        this.isActive = false;
        const container = document.getElementById('tut-container');
        if (container) {
            container.classList.add('opacity-0');
            container.style.transition = 'opacity 0.4s ease';
            setTimeout(() => {
                container.remove();
                this.overlay = null;
                this.tooltip = null;
                this.highlight = null;
            }, 400);
        }
        localStorage.setItem('pulseanime_tutorial_completed', 'true');
        document.body.classList.remove('overflow-hidden');
    }

    public next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.updateUI();
        } else {
            this.finish();
        }
    }

    public previous() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateUI();
        }
    }

    private createOverlay() {
        if (this.overlay) return;

        const container = document.createElement('div');
        container.id = 'tut-container';
        container.className = 'fixed inset-0 z-[9999] pointer-events-none';

        this.overlay = document.createElement('div');
        this.overlay.className = 'absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto';

        this.highlight = document.createElement('div');
        this.highlight.className = 'absolute pointer-events-none ring-4 ring-white shadow-[0_0_40px_rgba(255,255,255,0.4)] rounded-lg z-[10000] opacity-0 transition-opacity duration-300';

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'absolute bg-gray-900/95 backdrop-blur-xl border border-white/30 p-6 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-[340px] transition-all duration-500 ease-in-out transform scale-100 opacity-100 flex flex-col gap-4 text-white z-[10001] pointer-events-auto';

        container.appendChild(this.overlay);
        container.appendChild(this.highlight);
        container.appendChild(this.tooltip);

        document.body.appendChild(container);

        window.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 't') {
                this.toggleDebug();
            }
        });
    }

    private toggleDebug() {
        this.debugMode = !this.debugMode;
        if (this.debugMode) {
            this.showDebugPanel();
        } else {
            this.hideDebugPanel();
        }
    }

    private showDebugPanel() {
        if (!this.isActive || this.debugPanel) return;

        this.debugPanel = document.createElement('div');
        this.debugPanel.className = 'fixed top-20 left-4 bg-black/90 border border-cyan-500 p-4 z-[10002] text-white font-mono text-[10px] flex flex-col gap-2 rounded shadow-lg';
        this.debugPanel.innerHTML = `
            <div class="flex items-center justify-between border-b border-cyan-900 pb-1 mb-1">
                <div class="text-cyan-400 font-bold italic">STEP ${this.currentStep} DEBUG</div>
                <div class="text-[8px] text-white/40">ALT+T TO HIDE</div>
            </div>
            <div class="text-cyan-400/60 font-bold text-[8px] uppercase tracking-tighter mt-1">Highlight Focus</div>
            <div class="flex items-center justify-between gap-4">
                <span>HX:</span>
                <input type="range" id="debug-hx" min="-400" max="400" step="1" class="w-24">
                <span id="debug-hx-val" class="w-6 text-right">0</span>
            </div>
            <div class="flex items-center justify-between gap-4">
                <span>HY:</span>
                <input type="range" id="debug-hy" min="-400" max="400" step="1" class="w-24">
                <span id="debug-hy-val" class="w-6 text-right">0</span>
            </div>
            <div class="flex items-center justify-between gap-4">
                <span>HW:</span>
                <input type="range" id="debug-hw" min="-400" max="400" step="1" class="w-24">
                <span id="debug-hw-val" class="w-6 text-right">0</span>
            </div>
            <div class="flex items-center justify-between gap-4">
                <span>HH:</span>
                <input type="range" id="debug-hh" min="-400" max="400" step="1" class="w-24">
                <span id="debug-hh-val" class="w-6 text-right">0</span>
            </div>
            <div class="h-px bg-white/10 my-1"></div>
            <div class="text-cyan-400/60 font-bold text-[8px] uppercase tracking-tighter">Tooltip Panel</div>
            <div class="flex items-center justify-between gap-4">
                <span>TX:</span>
                <input type="range" id="debug-tx" min="-800" max="800" step="1" class="w-24">
                <span id="debug-tx-val" class="w-6 text-right">0</span>
            </div>
            <div class="flex items-center justify-between gap-4">
                <span>TY:</span>
                <input type="range" id="debug-ty" min="-800" max="800" step="1" class="w-24">
                <span id="debug-ty-val" class="w-6 text-right">0</span>
            </div>
            <div class="flex items-center justify-between gap-4">
                <span>TW:</span>
                <input type="range" id="debug-tw" min="200" max="800" step="1" class="w-24">
                <span id="debug-tw-val" class="w-6 text-right">340</span>
            </div>
            <button id="copy-pos" class="bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-2 mt-2 hover:bg-cyan-900 font-bold transition-all active:scale-95 uppercase tracking-widest text-[9px] rounded">COPY SETTINGS</button>
        `;

        document.body.appendChild(this.debugPanel);

        const hxInput = this.debugPanel.querySelector('#debug-hx') as HTMLInputElement;
        const hyInput = this.debugPanel.querySelector('#debug-hy') as HTMLInputElement;
        const hwInput = this.debugPanel.querySelector('#debug-hw') as HTMLInputElement;
        const hhInput = this.debugPanel.querySelector('#debug-hh') as HTMLInputElement;
        const txInput = this.debugPanel.querySelector('#debug-tx') as HTMLInputElement;
        const tyInput = this.debugPanel.querySelector('#debug-ty') as HTMLInputElement;
        const twInput = this.debugPanel.querySelector('#debug-tw') as HTMLInputElement;

        const hxVal = this.debugPanel.querySelector('#debug-hx-val') as HTMLSpanElement;
        const hyVal = this.debugPanel.querySelector('#debug-hy-val') as HTMLSpanElement;
        const hwVal = this.debugPanel.querySelector('#debug-hw-val') as HTMLSpanElement;
        const hhVal = this.debugPanel.querySelector('#debug-hh-val') as HTMLSpanElement;
        const txVal = this.debugPanel.querySelector('#debug-tx-val') as HTMLSpanElement;
        const tyVal = this.debugPanel.querySelector('#debug-ty-val') as HTMLSpanElement;
        const twVal = this.debugPanel.querySelector('#debug-tw-val') as HTMLSpanElement;

        const updateDebug = () => {
            const step = this.steps[this.currentStep];
            if (!step.highlightOffset) step.highlightOffset = { x: 0, y: 0, w: 0, h: 0 };
            if (!step.tooltipOffset) step.tooltipOffset = { x: 0, y: 0 };

            step.highlightOffset.x = parseInt(hxInput.value);
            step.highlightOffset.y = parseInt(hyInput.value);
            step.highlightOffset.w = parseInt(hwInput.value);
            step.highlightOffset.h = parseInt(hhInput.value);
            step.tooltipOffset.x = parseInt(txInput.value);
            step.tooltipOffset.y = parseInt(tyInput.value);
            step.tooltipWidth = parseInt(twInput.value);

            hxVal.innerText = hxInput.value;
            hyVal.innerText = hyInput.value;
            hwVal.innerText = hwInput.value;
            hhVal.innerText = hhInput.value;
            txVal.innerText = txInput.value;
            tyVal.innerText = tyInput.value;
            twVal.innerText = twInput.value;

            this.updateUI();
        };

        [hxInput, hyInput, hwInput, hhInput, txInput, tyInput, twInput].forEach(i => i.oninput = updateDebug);

        const copyBtn = this.debugPanel.querySelector('#copy-pos') as HTMLButtonElement;
        copyBtn.onclick = () => {
            const step = this.steps[this.currentStep];
            const config = `Step ${this.currentStep}: position: '${step.position}', highlightOffset: { x: ${hxInput.value}, y: ${hyInput.value}, w: ${hwInput.value}, h: ${hhInput.value} }, tooltipOffset: { x: ${txInput.value}, y: ${tyInput.value} }, tooltipWidth: ${twInput.value}`;
            navigator.clipboard.writeText(config);
            copyBtn.innerText = 'COPIED!';
            setTimeout(() => copyBtn.innerText = 'COPY SETTINGS', 2000);
        };
    }

    private hideDebugPanel() {
        this.debugPanel?.remove();
        this.debugPanel = null;
    }

    private updateUI() {
        if (!this.isActive || !this.overlay || !this.tooltip || !this.highlight) return;

        const step = this.steps[this.currentStep];
        this.tooltip.innerHTML = `
            <div class="flex flex-col gap-1">
                ${this.currentStep > 0 && this.currentStep < this.steps.length - 1 ? `<div class="text-[10px] uppercase tracking-widest text-white/40 font-bold font-mono">${t('tut_step')} ${this.currentStep}/6</div>` : ''}
                <h3 class="text-xl font-bold tracking-tight uppercase font-mono">${t(step.titleKey)}</h3>
            </div>
            <p class="text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-line">${t(step.messageKey)}</p>
            <div class="flex gap-2 justify-between mt-4">
                <div class="flex gap-2">
                    ${this.currentStep > 0 ? `<button id="tut-prev" class="px-4 py-1.5 text-[10px] font-bold uppercase border border-white/20 text-gray-400 hover:text-white hover:bg-white/10 transition-colors rounded font-mono">${t('tut_prev')}</button>` : ''}
                    ${this.currentStep === 0 ? `<button id="tut-skip-inline" class="px-4 py-1.5 text-[10px] font-bold uppercase border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-colors rounded font-mono">${t('tut_skip')}</button>` : ''}
                </div>
                <button id="tut-next" class="px-6 py-2 text-[10px] font-bold uppercase bg-white text-black hover:bg-cyan-400 transition-colors rounded shadow-[0_0_20px_rgba(255,255,255,0.2)] font-mono">${this.currentStep === 0 ? t('tut_start') : (this.currentStep === this.steps.length - 1 ? t('tut_finish') : t('tut_next'))}</button>
            </div>
        `;

        this.tooltip.style.transform = '';
        this.tooltip.style.left = '';
        this.tooltip.style.top = '';

        const nextBtn = this.tooltip.querySelector('#tut-next') as HTMLButtonElement;
        if (nextBtn) nextBtn.onclick = () => this.next();
        const prevBtn = this.tooltip.querySelector('#tut-prev') as HTMLButtonElement;
        if (prevBtn) prevBtn.onclick = () => this.previous();
        const skipBtn = this.tooltip.querySelector('#tut-skip-inline') as HTMLButtonElement;
        if (skipBtn) skipBtn.onclick = () => this.skip();

        const target = step.targetId ? document.getElementById(step.targetId) : null;
        let actualTarget = target;
        if (step.targetId === 'audio-upload' && target?.parentElement) actualTarget = target.parentElement;

        if (actualTarget) {
            this.shouldClampTooltip = true;
            const rect = actualTarget.getBoundingClientRect();

            // Highlight
            const hOff = step.highlightOffset || { x: -8, y: -8, w: 16, h: 16 };
            let hX = hOff.x, hY = hOff.y, hW = hOff.w, hH = hOff.h;

            if (this.debugPanel) {
                hX = parseInt((this.debugPanel.querySelector('#debug-hx') as HTMLInputElement).value);
                hY = parseInt((this.debugPanel.querySelector('#debug-hy') as HTMLInputElement).value);
                hW = parseInt((this.debugPanel.querySelector('#debug-hw') as HTMLInputElement).value);
                hH = parseInt((this.debugPanel.querySelector('#debug-hh') as HTMLInputElement).value);
            }

            this.highlight.style.opacity = '1';
            this.highlight.style.width = `${rect.width + hW}px`;
            this.highlight.style.height = `${rect.height + hH}px`;
            this.highlight.style.left = `${rect.left + hX}px`;
            this.highlight.style.top = `${rect.top + hY}px`;

            // Visual Cues for Debugging
            if (this.debugMode) {
                this.highlight.innerHTML = `
                    <div class="absolute inset-0 flex items-center justify-center">
                        <div class="w-full h-px bg-cyan-400/50"></div>
                        <div class="h-full w-px bg-cyan-400/50 absolute"></div>
                    </div>
                `;
                this.highlight.style.cursor = 'crosshair';
                if (this.overlay) this.overlay.style.cursor = 'crosshair';
            } else {
                this.highlight.innerHTML = '';
                this.highlight.style.cursor = 'none';
                if (this.overlay) this.overlay.style.cursor = 'auto';
            }

            // Tooltip
            const margin = 50;
            const tWidth = (this.debugPanel ? parseInt((this.debugPanel.querySelector('#debug-tw') as HTMLInputElement).value) : (step.tooltipWidth || 340));
            this.tooltip.style.width = `${tWidth}px`;
            this.tooltip.style.maxWidth = `${tWidth}px`;

            let txVal = step.tooltipOffset?.x || 0;
            let tyVal = step.tooltipOffset?.y || 0;
            if (this.debugPanel) {
                txVal = parseInt((this.debugPanel.querySelector('#debug-tx') as HTMLInputElement).value);
                tyVal = parseInt((this.debugPanel.querySelector('#debug-ty') as HTMLInputElement).value);
            }

            switch (step.position) {
                case 'left':
                    this.tooltip.style.left = `${rect.left - tWidth - margin + txVal}px`;
                    this.tooltip.style.top = `${rect.top + rect.height / 2 - 120 + tyVal}px`;
                    break;
                case 'right':
                    this.tooltip.style.left = `${rect.right + margin + txVal}px`;
                    this.tooltip.style.top = `${rect.top + rect.height / 2 - 120 + tyVal}px`;
                    break;
                case 'top':
                    this.tooltip.style.left = `${rect.left + rect.width / 2 - tWidth / 2 + txVal}px`;
                    this.tooltip.style.top = `${rect.top - 240 - margin + tyVal}px`;
                    break;
                case 'bottom':
                    this.tooltip.style.left = `${rect.left + rect.width / 2 - tWidth / 2 + txVal}px`;
                    this.tooltip.style.top = `${rect.bottom + margin + tyVal}px`;
                    break;
            }

            // Sync debug sliders only on step change
            if (this.debugPanel && this.lastStepForDebugSync !== this.currentStep) {
                const titleEl = this.debugPanel.querySelector('.text-cyan-400.font-bold.italic') as HTMLElement;
                if (titleEl) titleEl.innerText = `STEP ${this.currentStep} DEBUG`;

                const currH = step.highlightOffset || { x: 0, y: 0, w: 0, h: 0 };
                const currT = step.tooltipOffset || { x: 0, y: 0 };
                const currTW = step.tooltipWidth || 340;

                (this.debugPanel.querySelector('#debug-hx') as HTMLInputElement).value = String(currH.x);
                (this.debugPanel.querySelector('#debug-hy') as HTMLInputElement).value = String(currH.y);
                (this.debugPanel.querySelector('#debug-hw') as HTMLInputElement).value = String(currH.w);
                (this.debugPanel.querySelector('#debug-hh') as HTMLInputElement).value = String(currH.h);
                (this.debugPanel.querySelector('#debug-tx') as HTMLInputElement).value = String(currT.x);
                (this.debugPanel.querySelector('#debug-ty') as HTMLInputElement).value = String(currT.y);
                (this.debugPanel.querySelector('#debug-tw') as HTMLInputElement).value = String(currTW);

                // Update labels
                (this.debugPanel.querySelector('#debug-hx-val') as HTMLSpanElement).innerText = String(currH.x);
                (this.debugPanel.querySelector('#debug-hy-val') as HTMLSpanElement).innerText = String(currH.y);
                (this.debugPanel.querySelector('#debug-hw-val') as HTMLSpanElement).innerText = String(currH.w);
                (this.debugPanel.querySelector('#debug-hh-val') as HTMLSpanElement).innerText = String(currH.h);
                (this.debugPanel.querySelector('#debug-tx-val') as HTMLSpanElement).innerText = String(currT.x);
                (this.debugPanel.querySelector('#debug-ty-val') as HTMLSpanElement).innerText = String(currT.y);
                (this.debugPanel.querySelector('#debug-tw-val') as HTMLSpanElement).innerText = String(currTW);

                this.lastStepForDebugSync = this.currentStep;
            }

            // Clip-path
            const x1 = rect.left + hX - 2;
            const y1 = rect.top + hY - 2;
            const x2 = x1 + rect.width + hW + 4;
            const y2 = y1 + rect.height + hH + 4;
            this.overlay!.style.clipPath = `polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, ${x1}px ${y1}px, ${x2}px ${y1}px, ${x2}px ${y2}px, ${x1}px ${y2}px, ${x1}px ${y1}px)`;
        } else {
            this.shouldClampTooltip = false;
            this.highlight.style.opacity = '0';
            this.overlay!.style.clipPath = 'none';
            this.tooltip.style.left = '50%';
            this.tooltip.style.top = '50%';
            this.tooltip.style.transform = 'translate(-50%, -50%)';
        }

        setTimeout(() => this.clampTooltip(), 0);
    }

    private clampTooltip() {
        if (!this.tooltip || !this.shouldClampTooltip) return;
        const rect = this.tooltip.getBoundingClientRect();
        const m = 20;
        if (rect.left < m) this.tooltip.style.left = `${m}px`;
        if (rect.right > window.innerWidth - m) this.tooltip.style.left = `${window.innerWidth - rect.width - m}px`;
        if (rect.top < m) this.tooltip.style.top = `${m}px`;
        if (rect.bottom > window.innerHeight - m) this.tooltip.style.top = `${window.innerHeight - rect.height - m}px`;
    }
}
