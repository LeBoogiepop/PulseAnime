import p5 from 'p5';
import { Sketch, AudioData, SketchParams } from '../types';

class Scar {
    path: p5.Vector[] = [];
    offsets: { x: number, y: number, weight: number, alpha: number }[];

    drawIndex: number = 0;

    constructor(p: p5, tension: number, sketchiness: number, centerX: number, centerY: number) {
        // 1. Définir la géométrie
        const edgeStart = Math.floor(p.random(4));
        const p1 = this.getPointOnEdge(p, edgeStart);

        let edgeEnd = Math.floor(p.random(4));
        while (edgeEnd === edgeStart) edgeEnd = Math.floor(p.random(4));
        const p2 = this.getPointOnEdge(p, edgeEnd);

        // La "Tension" définit si la courbe est molle ou tendue
        // Tension haute = Points de contrôle proches du centre = Courbe complexe
        // Tension basse = Points proches de la ligne = Trait presque droit
        // UPDATE: Utilisation du centre dynamique
        const cp1 = p.createVector(centerX + p.random(-tension, tension), centerY + p.random(-tension, tension));
        const cp2 = p.createVector(centerX + p.random(-tension, tension), centerY + p.random(-tension, tension));

        // 2. Pré-calcul de la courbe (50 points)
        const steps = 50;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = p.bezierPoint(p1.x, cp1.x, cp2.x, p2.x, t);
            const y = p.bezierPoint(p1.y, cp1.y, cp2.y, p2.y, t);
            this.path.push(p.createVector(x, y));
        }

        // 3. Style "Crayon" (Nombre de sous-lignes défini par le paramètre)
        this.offsets = [];
        const count = Math.floor(sketchiness);
        for (let i = 0; i < count; i++) {
            this.offsets.push({
                x: p.random(-3, 3),
                y: p.random(-3, 3),
                weight: p.random(0.5, 1.5),
                alpha: p.random(150, 255)
            });
        }
    }
    getPointOnEdge(p: p5, edge: number): p5.Vector {
        const m = -50;
        switch (edge) {
            case 0: return p.createVector(p.random(p.width), m);
            case 1: return p.createVector(p.width - m, p.random(p.height));
            case 2: return p.createVector(p.random(p.width), p.height - m);
            case 3: return p.createVector(m, p.random(p.height));
            default: return p.createVector(0, 0);
        }
    }

    update(speed: number) {
        // La vitesse est maintenant contrôlée par le slider global
        if (this.drawIndex < this.path.length) {
            this.drawIndex += speed;
        }
    }

    draw(p: p5, colorHex: string, baseWidth: number) {
        p.noFill();

        // Conversion de la couleur Hex en RGB pour gérer l'alpha
        const c = p.color(colorHex);
        const r = p.red(c);
        const g = p.green(c);
        const b = p.blue(c);

        const limit = Math.min(Math.floor(this.drawIndex), this.path.length);
        if (limit < 2) return;

        for (let l of this.offsets) {
            // Couleur paramétrable avec alpha individuel
            p.stroke(r, g, b, l.alpha);

            // Épaisseur globale * variation individuelle
            // baseWidth vient du slider 'lineWidth'
            const w = Math.max(0.1, l.weight * baseWidth);
            p.strokeWeight(w);

            p.beginShape();
            for (let i = 0; i < limit; i++) {
                p.vertex(this.path[i].x + l.x, this.path[i].y + l.y);
            }
            p.endShape();
        }
    }
}

export class GoldenScars implements Sketch {
    id = 'golden_scars';
    name = 'Cicatrices d\'Or';
    audioReactivity = 'Les impacts tracent des lignes. Contrôlez la couleur, la vitesse et le style du crayon.';

    // --- NOUVEAUX PARAMÈTRES ---
    params: SketchParams = {
        maxLines: { type: 'slider', value: 40, min: 10, max: 80, step: 5, name: 'Max Traits' },
        audioThreshold: { type: 'slider', value: 0.2, min: 0.05, max: 0.6, step: 0.01, name: 'Seuil Audio' },

        // Personnalisation Visuelle
        drawSpeed: { type: 'slider', value: 3, min: 1, max: 10, step: 0.5, name: 'Vitesse Tracé' },
        lineWidth: { type: 'slider', value: 1.0, min: 0.5, max: 3.0, step: 0.1, name: 'Épaisseur' },
        sketchiness: { type: 'slider', value: 3, min: 1, max: 6, step: 1, name: 'Densité Crayon' },
        tension: { type: 'slider', value: 150, min: 0, max: 400, step: 10, name: 'Courbure' },

        // Positionnement
        focusX: { type: 'slider', value: 0.5, min: 0.0, max: 1.0, step: 0.05, name: 'Centre X' },
        focusY: { type: 'slider', value: 0.5, min: 0.0, max: 1.0, step: 0.05, name: 'Centre Y' },

        scarColor: { type: 'color', value: '#DAA520', name: 'Couleur' } // Or par défaut
    };

    scars: Scar[] = [];
    private prevBass = 0;
    private cooldown = 0;

    setup(p: p5) {
        this.scars = [];
        p.background(15);
    }

    draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
        // Ensure RGB mode for correct color interpretation
        p.colorMode(p.RGB, 255);

        // Fond
        if (bgImage) {
            p.image(bgImage, 0, 0, p.width, p.height);
            p.background(0, 230);
        } else {
            p.background(15, 15, 17);
        }

        // --- DÉTECTION ---
        const currentBass = audio.bass + audio.lowMid * 0.5;
        const delta = currentBass - this.prevBass;
        const isHit = delta > this.params.audioThreshold.value;
        const isSustain = (audio.energy > 0.6) && (p.frameCount % 15 === 0);

        // --- AJOUT (Spawn) ---
        if ((isHit || isSustain) && this.cooldown <= 0) {
            // On passe les paramètres de style à la création
            this.scars.push(new Scar(
                p,
                this.params.tension.value,      // Courbure
                this.params.sketchiness.value,   // Nombre de traits
                this.params.focusX.value * p.width, // Centre X
                this.params.focusY.value * p.height // Centre Y
            ));
            this.cooldown = 15;
        }

        if (this.cooldown > 0) this.cooldown--;
        this.prevBass = currentBass;

        // Nettoyage
        while (this.scars.length > this.params.maxLines.value) {
            this.scars.shift();
        }

        // --- DESSIN ---
        p.drawingContext.shadowBlur = 0;

        // Récupération des paramètres globaux pour l'update
        const spd = this.params.drawSpeed.value;
        const col = this.params.scarColor.value;
        const wid = this.params.lineWidth.value;

        for (let s of this.scars) {
            s.update(spd); // Vitesse dynamique
            s.draw(p, col, wid); // Couleur et taille dynamiques
        }
    }

    cleanup() {
        this.scars = [];
    }
}