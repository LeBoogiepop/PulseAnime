import p5 from 'p5';
import { Sketch, AudioData, SketchParams } from '../types';
import { drawBackground } from './Library';

// --- OUTILS MUSICAUX ---
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function getNoteFromFreq(frequency: number): { note: string, octave: number, hue: number } {
    // Formule standard : n = 12 * log2(freq / 440) + 69
    // 69 = A4 (La 440Hz)
    if (frequency === 0) return { note: "-", octave: 0, hue: 0 };

    const n = 12 * (Math.log(frequency / 440) / Math.log(2)) + 69;
    const noteIndex = Math.round(n);

    // Calcul de la note (0-11)
    const noteVal = (noteIndex % 12 + 12) % 12; // Modulo positif
    const octave = Math.floor(noteIndex / 12) - 1;

    // Mapping Note -> Couleur (Roue chromatique)
    // C (Do) = 0° (Rouge), G (Sol) = 210° (Bleu), etc.
    const hue = p5.prototype.map(noteVal, 0, 12, 0, 360);

    return {
        note: NOTE_NAMES[noteVal] || "-",
        octave: octave,
        hue: hue
    };
}

// --- PARTICULES ---
class MusicalParticle {
    pos: p5.Vector;
    vel: p5.Vector;
    acc: p5.Vector;
    history: p5.Vector[];
    maxHistory = 15;
    currentHue: number;

    constructor(p: p5) {
        this.pos = p.createVector(p.random(p.width), p.random(p.height));
        this.vel = p.createVector(0, 0);
        this.acc = p.createVector(0, 0);
        this.history = [];
        this.currentHue = 0;
    }

    update(p: p5, audio: AudioData, flowScale: number, speedMult: number, targetHue: number) {
        // Mouvement fluide (Flow Field)
        const t = p.frameCount * 0.005;
        const n = p.noise(this.pos.x * flowScale, this.pos.y * flowScale, t);
        const angle = n * p.TWO_PI * 4;

        this.acc = p5.Vector.fromAngle(angle);
        this.acc.mult(0.5); // Force douce

        this.vel.add(this.acc);
        this.vel.limit(3 * speedMult);
        this.pos.add(this.vel);

        // Lerp de la couleur vers la note cible (transition douce)
        // On gère le cas du passage 360->0 degrés pour éviter le clignotement
        let diff = targetHue - this.currentHue;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        this.currentHue += diff * 0.05; // 5% de rapprochement par frame
        if (this.currentHue < 0) this.currentHue += 360;
        if (this.currentHue > 360) this.currentHue -= 360;

        // Bords (Wrap)
        if (this.pos.x > p.width) { this.pos.x = 0; this.history = []; }
        if (this.pos.x < 0) { this.pos.x = p.width; this.history = []; }
        if (this.pos.y > p.height) { this.pos.y = 0; this.history = []; }
        if (this.pos.y < 0) { this.pos.y = p.height; this.history = []; }

        this.history.push(this.pos.copy());
        if (this.history.length > this.maxHistory) this.history.shift();
    }

    show(p: p5, opacity: number) {
        p.noFill();
        p.beginShape();
        for (let i = 0; i < this.history.length; i++) {
            const pos = this.history[i];
            const alpha = p.map(i, 0, this.history.length, 0, opacity);

            // Couleur dynamique basée sur la note
            p.stroke(this.currentHue, 80, 100, alpha); // HSB: Saturation 80, Brightness 100
            p.strokeWeight(2);
            p.vertex(pos.x, pos.y);
        }
        p.endShape();
    }
}

export class ColorShift implements Sketch {
    id = 'color_shift';
    name = 'Chromatique';
    audioReactivity = 'La couleur change selon la note jouée (Pitch Detection). L\'intensité contrôle la vitesse.';

    params: SketchParams = {
        flowScale: { type: 'slider', value: 0.003, min: 0.001, max: 0.01, step: 0.001, name: 'Courbure' },
        speed: { type: 'slider', value: 1.5, min: 0.1, max: 4.0, step: 0.1, name: 'Vitesse' },
        opacity: { type: 'slider', value: 200, min: 50, max: 255, step: 10, name: 'Opacité Trait' },
        threshold: { type: 'slider', value: 50, min: 10, max: 150, step: 5, name: 'Seuil Détection' }
    };

    particles: MusicalParticle[] = [];

    // État musical
    currentNote: string = "-";
    currentFreq: number = 0;
    targetHue: number = 0; // Teinte cible (0-360)

    // Smoothing
    noteHistory: string[] = [];
    historySize = 10;

    setup(p: p5) {
        p.colorMode(p.HSB, 360, 100, 100, 255); // Mode HSB indispensable pour la roue des couleurs
        this.particles = [];
        for (let i = 0; i < 400; i++) {
            this.particles.push(new MusicalParticle(p));
        }
    }

    draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
        p.colorMode(p.HSB, 360, 100, 100, 255);

        // 1. Fond
        if (bgImage) {
            drawBackground(p, bgImage, 20);
        } else {
            // Fond légèrement teinté par la note actuelle
            p.background(this.targetHue, 60, 5, 30);
        }

        // 2. ANALYSE DE LA NOTE (Pitch Detection Simplifié)
        let maxVal = 0;
        let maxIndex = 0;

        // On ignore les extrêmes graves (< 50Hz, index < 5) et extrêmes aigus
        for (let i = 5; i < audio.spectrum.length / 2; i++) {
            if (audio.spectrum[i] > maxVal) {
                maxVal = audio.spectrum[i];
                maxIndex = i;
            }
        }

        // Si le volume est suffisant (Seuil)
        if (maxVal > this.params.threshold.value) {
            // Calcul fréquence approx
            const nyquist = 22050; // Pour 44.1kHz
            const rawFreq = (maxIndex / audio.spectrum.length) * nyquist;

            const musicData = getNoteFromFreq(rawFreq);
            const detectedNote = `${musicData.note}${musicData.octave}`;

            // Smoothing: On ajoute la note détectée à l'historique
            this.noteHistory.push(detectedNote);
            if (this.noteHistory.length > this.historySize) this.noteHistory.shift();

            // On ne change la note affichée que si elle est majoritaire dans l'historique
            const counts: { [key: string]: number } = {};
            let maxCount = 0;
            let dominantNote = this.currentNote;

            for (const n of this.noteHistory) {
                counts[n] = (counts[n] || 0) + 1;
                if (counts[n] > maxCount) {
                    maxCount = counts[n];
                    dominantNote = n;
                }
            }

            // Si la note dominante est présente dans > 60% de l'historique, on valide
            if (maxCount > this.historySize * 0.6) {
                if (this.currentNote !== dominantNote) {
                    // Nouvelle note validée
                    this.currentNote = dominantNote;
                    this.currentFreq = rawFreq;
                    this.targetHue = musicData.hue;
                }
            }
        }

        // 3. Mise à jour Particules
        const fs = this.params.flowScale.value;
        const sp = this.params.speed.value;
        const op = this.params.opacity.value;

        for (let pt of this.particles) {
            pt.update(p, audio, fs, sp, this.targetHue);
            pt.show(p, op);
        }
    }

    cleanup() {
        this.particles = [];
    }
}
