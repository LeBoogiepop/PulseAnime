import p5 from 'p5';
import { Sketch, AudioData } from '../types';
import { LandingPage } from '../sketches/Library';
import { SKETCH_REGISTRY } from '../sketches/registry';
import { PostProcessingManager } from './PostProcessingManager';

/** Image de fond par défaut pour la scène Nénuphar (locale) */
const WATER_LILY_BG_URL = '/image/water-lily.png';

export class SketchManager {
    availableSketches: Sketch[];
    landingSketch: Sketch;
    currentSketchIndex: number = -1;
    currentSketch: Sketch;
    p5Instance: p5 | null = null;
    currentRendererMode: 'P2D' | 'WEBGL' = 'WEBGL';
    uploadedBgImage: p5.Image | null = null;
    /** Image de fond par défaut pour water_lily (chargée à la demande) */
    private waterLilyDefaultBg: p5.Image | null = null;
    private waterLilyBgLoading = false;

    postProcessing: PostProcessingManager;

    onSketchChange?: (sketch: Sketch, index: number) => void;

    constructor(sketchOrder?: string[]) {
        this.landingSketch = new LandingPage();
        this.availableSketches = this.buildSketchList(sketchOrder);
        this.currentSketch = this.landingSketch;
        this.postProcessing = new PostProcessingManager();
    }

    private buildSketchList(order?: string[]): Sketch[] {
        const byId = new Map<string, Sketch>();
        for (const C of SKETCH_REGISTRY) {
            const s = new C();
            byId.set(s.id, s);
        }
        if (order && order.length > 0) {
            const result: Sketch[] = [];
            for (const id of order) {
                const s = byId.get(id);
                if (s) result.push(s);
            }
            if (result.length > 0) return result;
        }
        // Par défaut : toutes les scènes du registre
        return SKETCH_REGISTRY.map(C => new C());
    }

    setup(p: p5) {
        const mode = this.currentRendererMode === 'WEBGL' ? p.WEBGL : p.P2D;
        p.createCanvas(window.innerWidth, window.innerHeight, mode);
        p.frameRate(60);
        p.textFont('Courier New');
        this.postProcessing.setup(p);
        this.currentSketch.setup(p);
    }

    draw(p: p5, audio: AudioData) {
        // Charger l'image de fond par défaut pour water_lily si nécessaire
        let bgImage = this.uploadedBgImage;
        if (this.currentSketch.id === 'water_lily' && !bgImage) {
            if (this.waterLilyDefaultBg) {
                bgImage = this.waterLilyDefaultBg;
            } else if (!this.waterLilyBgLoading) {
                this.waterLilyBgLoading = true;
                p.loadImage(WATER_LILY_BG_URL, (img) => {
                    this.waterLilyDefaultBg = img;
                }, () => {
                    this.waterLilyBgLoading = false;
                });
            }
        }

        p.push();
        this.currentSketch.draw(p, audio, bgImage);
        p.pop();

        // Apply Global Effects
        this.postProcessing.apply(p);
    }

    switchSketch(idx: number, containerId: string) {
        // Clear user-uploaded background on switch (water_lily garde son image par défaut)
        this.uploadedBgImage = null;

        // Logic: If clicking the currently active sketch, toggle back to Landing (-1)
        if (this.currentSketchIndex === idx && idx !== -1) {
            idx = -1;
        }

        // If already gallery and requesting gallery, do nothing
        if (this.currentSketchIndex === -1 && idx === -1) return;

        // Determine next sketch
        if (idx === -1) {
            this.currentSketchIndex = -1;
            this.currentSketch = this.landingSketch;
        } else {
            this.currentSketchIndex = idx;
            this.currentSketch = this.availableSketches[idx];
        }

        // Determine Renderer
        const nextRendererMode = this.currentSketch.mode || 'P2D';

        // P5 Context Switch
        if (nextRendererMode !== this.currentRendererMode) {
            if (this.p5Instance) {
                this.p5Instance.remove();
                this.p5Instance = null;
            }
            this.currentRendererMode = nextRendererMode;
            const container = document.getElementById(containerId);
            if (container && this.onRequestP5Recreation) {
                this.onRequestP5Recreation();
            }
        } else {
            if (this.currentSketch.cleanup) this.currentSketch.cleanup();
            if (this.p5Instance) {
                this.p5Instance.clear();
                this.p5Instance.resetMatrix();
                if (this.currentRendererMode === 'WEBGL') {
                    // @ts-ignore
                    if (this.p5Instance.resetShader) this.p5Instance.resetShader();
                } else {
                    this.p5Instance.imageMode(this.p5Instance.CORNER);
                    this.p5Instance.rectMode(this.p5Instance.CORNER);
                }
                this.currentSketch.setup(this.p5Instance);
            }
        }

        if (this.onSketchChange) {
            this.onSketchChange(this.currentSketch, this.currentSketchIndex);
        }
    }

    onRequestP5Recreation?: () => void;

    handleResize(p: p5) {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
        // Do NOT call setup() here, as it resets the animation state (User Request)
    }

    goToNextSketch(containerId: string) {
        if (this.currentSketchIndex === -1) {
            this.switchSketch(0, containerId);
        } else {
            const nextIdx = (this.currentSketchIndex + 1) % this.availableSketches.length;
            this.switchSketch(nextIdx, containerId);
        }
    }

    goToPreviousSketch(containerId: string) {
        if (this.currentSketchIndex === -1) {
            this.switchSketch(this.availableSketches.length - 1, containerId);
        } else {
            const prevIdx = (this.currentSketchIndex - 1 + this.availableSketches.length) % this.availableSketches.length;
            this.switchSketch(prevIdx, containerId);
        }
    }

    handleKeyPressed(p: p5, key: string) {
        if (this.currentSketch.keyPressed) this.currentSketch.keyPressed(p, key);
    }

    handleMousePressed(p: p5) {
        if (this.currentSketch.mousePressed) this.currentSketch.mousePressed(p);
    }
}
