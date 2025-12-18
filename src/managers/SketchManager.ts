import p5 from 'p5';
import { Sketch, AudioData } from '../types';
import {
    FlowTrails,
    PlexusVoronoi,
    NoiseField,
    TravelShader,
    LandingPage,
    NoisePartition,
    Botanical,
    GoldenScars,
    ColorShift,
    BotanicalPond,
    BoxTunnel
} from '../sketches/index';

import { PostProcessingManager } from './PostProcessingManager';

export class SketchManager {
    availableSketches: Sketch[];
    landingSketch: Sketch;
    currentSketchIndex: number = -1;
    currentSketch: Sketch;
    p5Instance: p5 | null = null;
    currentRendererMode: 'P2D' | 'WEBGL' = 'WEBGL';
    uploadedBgImage: p5.Image | null = null;

    postProcessing: PostProcessingManager;

    // Callback for when sketch changes (to update UI)
    onSketchChange?: (sketch: Sketch, index: number) => void;

    constructor() {
        this.landingSketch = new LandingPage();
        this.availableSketches = [
            new BotanicalPond(),
            new ColorShift(),
            new GoldenScars(),
            new NoisePartition(),
            new TravelShader(),
            new PlexusVoronoi(),
            new BoxTunnel()
        ];
        this.currentSketch = this.landingSketch;
        this.postProcessing = new PostProcessingManager();
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
        p.push();
        this.currentSketch.draw(p, audio, this.uploadedBgImage);
        p.pop();

        // Apply Global Effects
        this.postProcessing.apply(p);
    }

    switchSketch(idx: number, containerId: string) {
        // Clear background image on every switch to avoid confusion
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
            if (container) {
                // We need to re-instantiate p5. 
                // Note: This is tricky because the main sketch function in index.tsx wraps this.
                // We might need to reload the page or handle this differently.
                // Ideally, index.tsx should handle the p5 creation, but we want to move logic here.
                // Let's assume index.tsx will call a method to re-init if needed, 
                // OR we pass a callback to recreate p5.
                // For now, let's just update the mode and let the caller handle re-creation if possible,
                // but actually the p5 instance is created with a specific mode.
                // We can't change mode of existing canvas easily without remove/create.

                // We will trigger a callback to request p5 recreation
                if (this.onRequestP5Recreation) {
                    this.onRequestP5Recreation();
                }
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

    // Callback placeholder
    onRequestP5Recreation?: () => void;

    handleResize(p: p5) {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
        // Do NOT call setup() here, as it resets the animation state (User Request)
    }

    handleKeyPressed(p: p5, key: string) {
        if (this.currentSketch.keyPressed) this.currentSketch.keyPressed(p, key);
    }

    handleMousePressed(p: p5) {
        if (this.currentSketch.mousePressed) this.currentSketch.mousePressed(p);
    }
}
