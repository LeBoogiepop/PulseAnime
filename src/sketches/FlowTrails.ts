
import p5 from 'p5';
import { Sketch, AudioData, SketchParams } from '../types';
import { drawBackground } from './Library';

// --- SKETCH 3: FLOW TRAILS ---
class Particle {
    pos: p5.Vector;
    vel: p5.Vector;
    acc: p5.Vector;
    history: p5.Vector[];
    maxHistory = 10;

    constructor(p: p5) {
        this.pos = p.createVector(p.random(p.width), p.random(p.height));
        this.vel = p.createVector(0, 0);
        this.acc = p.createVector(0, 0);
        this.history = [];
    }

    update(p: p5, audio: AudioData, flowScale: number, speedMult: number, traceLen: number) {
        const t = p.frameCount * 0.01;
        const n = p.noise(this.pos.x * flowScale, this.pos.y * flowScale, t);
        const angle = n * p.TWO_PI * 4;

        this.acc = p5.Vector.fromAngle(angle);
        this.acc.mult(0.5 + audio.mid);

        this.vel.add(this.acc);
        this.vel.limit((4 + audio.bass * 10) * speedMult);
        this.pos.add(this.vel);

        if (this.pos.x > p.width) { this.pos.x = 0; this.history = []; }
        if (this.pos.x < 0) { this.pos.x = p.width; this.history = []; }
        if (this.pos.y > p.height) { this.pos.y = 0; this.history = []; }
        if (this.pos.y < 0) { this.pos.y = p.height; this.history = []; }

        this.history.push(this.pos.copy());
        if (this.history.length > traceLen) this.history.shift();
    }

    show(p: p5, audio: AudioData, color: string) {
        p.noFill();
        p.beginShape();
        for (let i = 0; i < this.history.length; i++) {
            const pos = this.history[i];
            const alpha = p.map(i, 0, this.history.length, 0, 255);

            // Parse color string or use default logic
            const c = p.color(color);
            c.setAlpha(alpha);
            p.stroke(c);

            // White accent on bass
            if (audio.bass > 0.6) {
                p.stroke(255, 255, 255, alpha);
            }

            p.vertex(pos.x, pos.y);
        }
        p.endShape();
    }
}

export class FlowTrails implements Sketch {
    id = 'flow_trails';
    name = 'Flux de Particules';
    audioReactivity = 'Les médiums accélèrent les particules. Les basses augmentent la vitesse limite et ajoutent des flashs blancs.';

    params: SketchParams = {
        flowScale: { type: 'slider', value: 0.005, min: 0.001, max: 0.02, step: 0.001, name: 'Échelle Flux' },
        speed: { type: 'slider', value: 1.0, min: 0.1, max: 3.0, step: 0.1, name: 'Vitesse Particules' },
        traceLength: { type: 'slider', value: 10, min: 2, max: 50, step: 1, name: 'Longueur Traînée' },
        particleColor: { type: 'color', value: '#00FFFF', name: 'Couleur' }
    };

    particles: Particle[] = [];

    setup(p: p5) {
        this.particles = [];
        for (let i = 0; i < 300; i++) {
            this.particles.push(new Particle(p));
        }
    }

    draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
        if (bgImage) {
            drawBackground(p, bgImage, 20);
        } else {
            p.background(0, 20);
        }

        const fs = this.params.flowScale.value;
        const sp = this.params.speed.value;
        const tl = this.params.traceLength.value;
        const col = this.params.particleColor.value;

        for (let pt of this.particles) {
            pt.update(p, audio, fs, sp, tl);
            pt.show(p, audio, col);
        }
    }
    cleanup() { }
}
