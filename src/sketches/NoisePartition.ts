
import p5 from 'p5';
import { Sketch, AudioData, SketchParams } from '../types';
import { drawBackground } from './Library';
import { MBR, polygonArea, findSplitChordInteriorPoint, pointInPolygon, curvePolygonSplit } from '../utils/geometry';
import { gradNoise } from '../utils/noise';

const PARTITION_PALETTES = [
  ["#4f501e", "#507c37", "#329888", "#40a6e0", "#c697f7", "#fbaca8", "#e5de41"],
  ["#205750", "#277a85", "#3d88d8", "#bd77ee", "#f88c91", "#e4c237", "#52f5d9"],
  ["#244e80", "#5d5bce", "#bf4eca", "#ee6d6e", "#d3ab31", "#44e3ae", "#bcdbfd"],
  ["#702d72", "#b33679", "#d25d3d", "#b5992d", "#45cc94", "#89cdfb", "#f2c6f7"],
  ["#773823", "#975f24", "#8c8b2c", "#3eb38a", "#56bcf0", "#dab0f9", "#fdcabd"]
];

export class NoisePartition implements Sketch {
  id = 'partition';
  name = 'Partition de Bruit';
  mode = 'WEBGL' as const;
  audioReactivity = 'Les basses réinitialisent le canevas une fois terminé. L\'énergie globale déclenche les divisions. Les aigus font varier les couleurs.';

  params: SketchParams = {
    maxPolys: { type: 'slider', value: 150, min: 50, max: 300, step: 10, name: 'Max Partitions' },
    imageOpacity: { type: 'slider', value: 100, min: 0, max: 100, step: 1, name: 'Image Opacity' },
    chaos: { type: 'slider', value: 50, min: 0, max: 200, step: 10, name: 'Explosion Chaos' },
    splitThreshold: { type: 'slider', value: 0.25, min: 0.1, max: 0.8, step: 0.05, name: 'Seuil Division' },
    minSize: { type: 'slider', value: 100, min: 10, max: 500, step: 10, name: 'Taille Min' },
    colorVariance: { type: 'slider', value: 0.05, min: 0.0, max: 0.5, step: 0.01, name: 'Variance Couleur' },
    flashIntensity: { type: 'slider', value: 0.0, min: 0.0, max: 1.0, step: 0.1, name: 'Flash Bass' },
    borderWidth: { type: 'slider', value: 1.5, min: 0.5, max: 5.0, step: 0.5, name: 'Épaisseur Traits' },
  };

  private polygons: any[] = [];
  private curveCount = 0;
  private currentPalette: string[] = [];
  private stagnationFrames = 0;

  setup(p: p5) {
    p.noiseDetail(1, 0.5);
    this.generate(p);
  }

  generate(p: p5) {
    p.push();
    p.colorMode(p.HSB, 1);

    this.curveCount = 0;
    this.stagnationFrames = 0;
    this.currentPalette = p.random(PARTITION_PALETTES);
    const pts = [
      p.createVector(0, 0),
      p.createVector(p.width, 0),
      p.createVector(p.width, p.height),
      p.createVector(0, p.height)
    ];

    const initColor = p.color(p.random(this.currentPalette));

    const mbr = new MBR();
    pts.forEach(pt => mbr.add(pt));

    // Initialize with random explosion vector for image mode
    this.polygons = [{
      pts,
      mbr,
      color: varyColor(p, initColor),
      area: polygonArea(pts),
      vel: p5.Vector.random3D().mult(p.random(0.5, 2))
    }];

    p.pop();
  }

  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    p.push();
    // WEBGL Coordinate fix
    p.translate(-p.width / 2, -p.height / 2);
    p.colorMode(p.HSB, 1);

    const imgOp = this.params.imageOpacity.value / 100;
    const chaosVal = this.params.chaos.value;
    const hasImage = bgImage && imgOp > 0.01;

    if (hasImage) {
      p.background(0);
      p.textureMode(p.NORMAL);
    } else {
      p.background(0, 0, 0.96);
    }

    const maxP = this.params.maxPolys.value;

    // LOGIQUE DE RESET
    if (this.curveCount >= maxP) {
      this.stagnationFrames++;
      if (this.stagnationFrames > 60 || audio.bass > 0.85) {
        this.generate(p);
      }
    } else {
      this.stagnationFrames = 0;
    }

    const splitThresh = this.params.splitThreshold.value;
    const minArea = this.params.minSize.value * 100; // Approximate area check
    const colVar = this.params.colorVariance.value;

    const shouldSplit = this.curveCount < maxP && audio.energy > splitThresh;

    if (shouldSplit) {
      this.curveCount++;
      this.polygons.sort((a, b) => b.area - a.area);

      const seedIndex = 0;
      let seedPoly = this.polygons[seedIndex];

      if (seedPoly && seedPoly.area > minArea) {
        let seed = findSplitChordInteriorPoint(seedPoly.pts);
        let curvePts = genCurve(p, seed, audio.mid);

        for (let poly of this.polygons) {
          if (poly.mbr.contains(seed) && pointInPolygon(seed, poly.pts)) {
            let parts = curvePolygonSplit(curvePts, poly.pts);
            if (parts.length === 2) {
              for (let part of parts) {
                let partMbr = new MBR();
                part.forEach((pt: p5.Vector) => partMbr.add(pt));

                this.polygons.push({
                  pts: part,
                  mbr: partMbr,
                  color: varyColor(p, poly.color, colVar + audio.treble * 0.1),
                  area: polygonArea(part),
                  vel: p5.Vector.random3D().mult(p.random(0.5, 2)) // Inherit velocity
                });
              }
              this.polygons.splice(this.polygons.indexOf(poly), 1);
              break;
            }
          }
        }
      }
    }

    // Render Loop
    for (let poly of this.polygons) {
      p.push();

      if (hasImage) {
        // --- IMAGE MODE (EXPLOSIVE) ---
        const explosion = audio.bass * chaosVal;
        const displacement = poly.vel.copy().mult(explosion);
        p.translate(displacement.x, displacement.y, displacement.z);

        p.texture(bgImage);
        p.tint(255, imgOp * 255);
        p.stroke(255, 200);
        p.strokeWeight(2);
      } else {
        // --- NORMAL MODE (STATIC) ---
        // No translation/explosion here
        p.fill(poly.color);

        // Flash Effect
        if (audio.bass > 0.8 && this.params.flashIntensity.value > 0) {
          p.fill(p.hue(poly.color), 0, 1, this.params.flashIntensity.value);
        }

        p.stroke(0, 0, 1, 0.8); // Original subtle stroke
        p.strokeWeight(this.params.borderWidth.value);
      }

      p.beginShape();
      for (let v of poly.pts) {
        if (hasImage) {
          // UV Mapping for WEBGL
          p.vertex(v.x, v.y, 0, v.x / p.width, v.y / p.height);
        } else {
          p.vertex(v.x, v.y);
        }
      }
      p.endShape(p.CLOSE);
      p.pop();
    }

    p.pop();
  }

  cleanup() { }
}

// --- LOCALLY USED GENERATORS ---

function randomWalkers(p: p5, startPoint: p5.Vector, segLen: number, maxSteps = 1000, audioNoiseMod = 0.0) {
  const seed = p.random(10000);
  const noiseScale = 0.1;

  const makeWalker = (dAng: number, sgn: number) => function* () {
    let pos = startPoint.copy();
    let q = startPoint.copy();
    const hgt = (x: number, y: number) => gradNoise(x * noiseScale, y * noiseScale, seed + audioNoiseMod);
    const nrm = (x: number, y: number) => p.createVector(1, 0).rotate(hgt(x, y) * p.TWO_PI);

    for (let i = 0; i < maxSteps; i++) {
      const v = nrm(q.x, q.y).rotate(dAng);
      q.add(v);
      pos.add(v.copy().mult(segLen));
      yield pos;
    }
  }

  let angSeed = p.random(p.TWO_PI);
  return [makeWalker(angSeed, 1)(), makeWalker(angSeed + p.PI, 1)()];
}

function varyColor(p: p5, c: p5.Color, amt = 0.1) {
  let h = p.hue(c);
  let s = p.saturation(c);
  let b = p.brightness(c);
  return p.color(
    p.constrain(h + p.random(-amt, amt), 0, 1),
    p.constrain(s + p.random(-amt, amt), 0, 1),
    p.constrain(b + p.random(-amt, amt), 0, 1)
  );
}

function genCurve(p: p5, startPoint: p5.Vector, audioMod: number) {
  let start = startPoint;
  let [fwd, bck] = randomWalkers(p, start, 20, 100, audioMod);
  let pts = [start];
  for (let q of fwd) {
    pts.push(q.copy());
    if (q.x < 0 || q.y < 0 || q.x > p.width || q.y > p.height) break;
  }
  pts.reverse();
  for (let q of bck) {
    pts.push(q.copy());
    if (q.x < 0 || q.y < 0 || q.x > p.width || q.y > p.height) break;
  }
  return pts;
}
