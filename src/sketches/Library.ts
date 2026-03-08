
import p5 from 'p5';
import { Sketch, AudioData, SketchParams } from '../types';
import { t } from '../i18n';

export const drawBackground = (p: p5, bgImage?: p5.Image | null, opacity: number = 20) => {
  if (bgImage) {
    p.push();
    p.imageMode(p.CORNER);
    p.tint(255, opacity + 10);
    p.image(bgImage, 0, 0, p.width, p.height);
    p.pop();
    p.background(0, 255 - (opacity + 30));
  } else {
    p.background(10);
  }
};

// --- SKETCH 5: PLEXUS VORONOI ---
export class PlexusVoronoi implements Sketch {
  id = 'plexus';
  name = 'Réseau Plexus';
  audioReactivity = 'Le volume sonore contrôle le seuil de connexion des lignes. Les aigus font vibrer les points de manière aléatoire.';

  params: SketchParams = {
    threshold: { type: 'slider', value: 150, min: 50, max: 300, step: 10, name: 'Seuil Connexion' },
    pointSize: { type: 'slider', value: 4, min: 1, max: 10, step: 0.5, name: 'Taille Points' },
    speed: { type: 'slider', value: 1, min: 0.1, max: 5, step: 0.1, name: 'Vitesse' },
    lineColor: { type: 'color', value: '#FFFFFF', name: 'Couleur' },
    pointCount: { type: 'slider', value: 80, min: 20, max: 200, step: 10, name: 'Nombre Points' },
    lineAlpha: { type: 'slider', value: 255, min: 50, max: 255, step: 5, name: 'Opacité Lignes' },
    noiseSpeed: { type: 'slider', value: 0.0, min: 0.0, max: 0.1, step: 0.001, name: 'Vitesse Noise' },
    noiseComplexity: { type: 'slider', value: 1.0, min: 0.1, max: 5.0, step: 0.1, name: 'Complexité Noise' }
  };

  points: { pos: p5.Vector, vel: p5.Vector }[] = [];

  setup(p: p5) {
    this.points = [];
    for (let i = 0; i < 80; i++) {
      this.points.push({
        pos: p.createVector(p.random(p.width), p.random(p.height)),
        vel: p.createVector(p.random(-1, 1), p.random(-1, 1))
      });
    }
  }

  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    drawBackground(p, bgImage);

    const thresh = this.params.threshold.value + audio.level * 200;
    const pSize = this.params.pointSize.value;
    const spd = this.params.speed.value;
    const col = this.params.lineColor.value;
    const count = this.params.pointCount.value;
    const lAlpha = this.params.lineAlpha.value;
    const nSpd = this.params.noiseSpeed.value;
    const nCpx = this.params.noiseComplexity.value;

    // Dynamic Point Count
    if (this.points.length < count) {
      for (let i = 0; i < count - this.points.length; i++) {
        this.points.push({
          pos: p.createVector(p.random(p.width), p.random(p.height)),
          vel: p.createVector(p.random(-1, 1), p.random(-1, 1))
        });
      }
    } else if (this.points.length > count) {
      this.points.splice(count);
    }

    // Convert hex color to p5 color for manipulation
    const baseC = p.color(col);

    for (let pt of this.points) {
      pt.pos.add(p5.Vector.mult(pt.vel, spd));

      if (pt.pos.x < 0 || pt.pos.x > p.width) pt.vel.x *= -1;
      if (pt.pos.y < 0 || pt.pos.y > p.height) pt.vel.y *= -1;

      // Noise movement
      const nVal = p.noise(pt.pos.x * 0.01 * nCpx, pt.pos.y * 0.01 * nCpx, p.frameCount * nSpd);
      pt.pos.x += Math.cos(nVal * p.TWO_PI) * 0.5;
      pt.pos.y += Math.sin(nVal * p.TWO_PI) * 0.5;

      if (audio.treble > 0.3) {
        pt.pos.x += p.random(-2, 2);
        pt.pos.y += p.random(-2, 2);
      }
      p.stroke(baseC);
      p.strokeWeight(pSize);
      p.point(pt.pos.x, pt.pos.y);
    }

    p.strokeWeight(1);

    for (let i = 0; i < this.points.length; i++) {
      for (let j = i + 1; j < this.points.length; j++) {
        let d = p.dist(this.points[i].pos.x, this.points[i].pos.y, this.points[j].pos.x, this.points[j].pos.y);
        if (d < thresh) {
          let alpha = p.map(d, 0, thresh, lAlpha, 0);

          // Use chosen color with alpha
          const lineC = p.color(p.red(baseC), p.green(baseC), p.blue(baseC), alpha);
          p.stroke(lineC);

          p.line(this.points[i].pos.x, this.points[i].pos.y, this.points[j].pos.x, this.points[j].pos.y);
        }
      }
    }
  }
  cleanup() { }
}

// --- SKETCH 7: NOISE ABSTRACT ---
export class NoiseField implements Sketch {
  id = 'noise_abstract';
  name = 'Champ de Bruit';
  audioReactivity = 'Les basses propulsent le champ de bruit vers l\'avant. La grille réagit subtilement aux variations de volume.';

  params: SketchParams = {
    resolution: { type: 'slider', value: 20, min: 5, max: 50, step: 5, name: 'Résolution' },
    noiseScale: { type: 'slider', value: 0.1, min: 0.01, max: 0.5, step: 0.01, name: 'Échelle Bruit' },
    speed: { type: 'slider', value: 0.02, min: 0.001, max: 0.1, step: 0.001, name: 'Vitesse' },
    noiseHeight: { type: 'slider', value: 1.0, min: 0.1, max: 3.0, step: 0.1, name: 'Hauteur Bruit' },
    waterLevel: { type: 'slider', value: 0.4, min: 0.0, max: 1.0, step: 0.05, name: 'Niveau Eau' },
    colorSpeed: { type: 'slider', value: 0.5, min: 0.0, max: 2.0, step: 0.1, name: 'Vitesse Couleur' },
    gridDensity: { type: 'slider', value: 1.0, min: 0.5, max: 3.0, step: 0.1, name: 'Densité Grille' },
    useColor: { type: 'slider', value: 0, min: 0, max: 1, step: 1, name: 'Mode Couleur (0/1)' }
  };

  setup(p: p5) { }

  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    if (bgImage) {
      p.image(bgImage, 0, 0, p.width, p.height);
      p.background(0, 200);
    } else {
      p.background(0);
    }

    const res = this.params.resolution.value;
    const ns = this.params.noiseScale.value;
    const spd = this.params.speed.value;
    const nH = this.params.noiseHeight.value;
    const wL = this.params.waterLevel.value;
    const cSpd = this.params.colorSpeed.value;
    const gDens = this.params.gridDensity.value;
    const useCol = this.params.useColor.value > 0.5;

    p.noStroke();
    const cols = Math.ceil(p.width / res);
    const rows = Math.ceil(p.height / res);
    const t = p.frameCount * spd;

    if (useCol) {
      p.colorMode(p.HSB, 1);
    } else {
      p.colorMode(p.RGB, 255);
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let n = p.noise(x * ns * gDens, y * ns * gDens, t + audio.bass);
        n = n * nH; // Height multiplier

        if (useCol) {
          if (n < wL) {
            p.fill(0.6, 0.8, 0.8, 0.8); // Water
          } else {
            // Land with color cycling
            const hue = (n + p.frameCount * 0.001 * cSpd) % 1;
            p.fill(hue, 0.7, n, 0.8);
          }
        } else {
          // Original Grayscale
          p.fill(n * 255, 200);
        }

        p.rect(x * res, y * res, res, res);
      }
    }
    p.colorMode(p.RGB);
  }
  cleanup() { }
}

// --- LANDING PAGE ---
export class LandingPage implements Sketch {
  id = 'landing';
  name = 'Accueil';
  mode = 'WEBGL' as const;
  /** Si true, n'affiche pas le texte (pour fond page lib) */
  static hideText = false;
  audioReactivity = 'La sphère centrale pulse en rythme avec les basses fréquences.';

  params: SketchParams = {
    sphereSize: { type: 'slider', value: 110, min: 50, max: 300, step: 10, name: 'Taille Sphère' },
    rotationSpeed: { type: 'slider', value: 0.01, min: 0.0, max: 0.05, step: 0.001, name: 'Vitesse Rotation' },
    rotationX: { type: 'slider', value: 1.0, min: 0, max: 1, step: 1, name: 'Axe X' },
    rotationY: { type: 'slider', value: 1.0, min: 0, max: 1, step: 1, name: 'Axe Y' },
    rotationZ: { type: 'slider', value: 0.0, min: 0, max: 1, step: 1, name: 'Axe Z' },
    detailLevel: { type: 'slider', value: 24, min: 4, max: 48, step: 2, name: 'Détails' },
    sphereColor: { type: 'color', value: '#FFFFFF', name: 'Couleur' },
    pulseAmount: { type: 'slider', value: 50, min: 0, max: 200, step: 10, name: 'Force Pulsation' }
  };

  textLayer: p5.Graphics | null = null;

  setup(p: p5) {
    // Create a 2D graphics buffer for text
    this.textLayer = p.createGraphics(720, 72);
    this.textLayer.textAlign(p.CENTER, p.CENTER);
    this.textLayer.textSize(18); // Plus compact pour tenir sur une ligne
    this.textLayer.textStyle(p.BOLD);
    this.textLayer.textFont('Courier New');
  }

  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    if (bgImage) {
      p.push();
      // Z = -200 pousse l'image au fond
      p.translate(0, 0, -200);
      p.imageMode(p.CENTER);
      p.image(bgImage, 0, 0, p.width * 1.5, p.height * 1.5);
      p.pop();
      p.background(0, 150);
    } else {
      p.background(10);
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // --- SPHÈRE 3D ---
    p.push();
    p.noFill();
    p.stroke(255);
    p.strokeWeight(1);

    // 1. Position de base (puis rotation autour de son propre centre)
    const rotSpd = this.params.rotationSpeed.value;
    const rx = this.params.rotationX.value;
    const ry = this.params.rotationY.value;
    const rz = this.params.rotationZ.value;
    const det = this.params.detailLevel.value;
    const col = this.params.sphereColor.value;

    const yOffset = isMobile ? -80 : -40;
    p.translate(0, yOffset, 0);

    // 2. Rotation continue (autour du centre déjà positionné)
    if (rx > 0.5) p.rotateX(p.frameCount * rotSpd);
    if (ry > 0.5) p.rotateY(p.frameCount * rotSpd);
    if (rz > 0.5) p.rotateZ(p.frameCount * rotSpd);

    // 3. Pulsation Audio (Taille)
    const baseSize = this.params.sphereSize.value * (isMobile ? 0.9 : 1.0);
    const pulse = this.params.pulseAmount.value * (isMobile ? 0.7 : 1.0);
    const r = baseSize + audio.bass * pulse;

    p.stroke(col);
    // Dessin de la sphère
    p.sphere(r, det, Math.floor(det * 0.66));
    p.pop();

    // --- TEXTE FLOTTANT (sauf en mode fond lib) ---
    if (!LandingPage.hideText) {
      p.push();
      p.fill(255);
      p.noStroke();
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(16);

      const yOff = Math.sin(p.frameCount * 0.05) * 5;

      if (isMobile) {
        p.translate(0, -230 + yOff, 0);
      } else {
        p.translate(0, 180 + yOff, 0);
      }

      if (this.textLayer) {
        this.textLayer.clear();
        this.textLayer.fill(255);
        this.textLayer.noStroke();
        this.textLayer.text(t('landing_cta'), this.textLayer.width / 2, this.textLayer.height / 2);

        p.imageMode(p.CENTER);
        if (isMobile) p.scale(0.8);
        p.image(this.textLayer, 0, 0);
      }

      p.pop();
    }
  }

  cleanup() { }
}
