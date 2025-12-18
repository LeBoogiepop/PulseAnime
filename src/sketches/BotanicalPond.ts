import p5 from 'p5';
import { Sketch, AudioData, SketchParams } from '../types';

// ==========================================
// 1. MATHS & COULEURS
// ==========================================

const easeOutSine = (x: number) => Math.sin((x * Math.PI) / 2);
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const easeInQuad = (x: number) => x * x;
const easeOutBack = (x: number) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const easeInOutBack = (x: number) => { const c1 = 1.70158; const c2 = c1 * 1.525; return x < 0.5 ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2 : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2; };
const easeOutCirc = (x: number) => Math.sqrt(1 - Math.pow(x - 1, 2));
const easeInOutCirc = (x: number) => x < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2;
const easeOutQuad = (x: number) => 1 - (1 - x) * (1 - x);
const easeInOutQuad = (x: number) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

function processHue(_hue: number) {
    let result = _hue % 360;
    if (result < 0) result += 360;
    return result;
}

function NYLerpHue(_hueA: number, _hueB: number, _t: number) {
    let hueA = _hueA; let hueB = _hueB;
    let hueDiff = Math.abs(hueB - hueA);
    if (Math.abs((hueB - 360) - hueA) < hueDiff) hueB -= 360;
    else if (Math.abs((hueB + 360) - hueA) < hueDiff) hueB += 360;

    let resultHue = p5.prototype.lerp(hueA, hueB, _t);
    if (resultHue < 0) resultHue += 360;
    else if (resultHue > 360) resultHue -= 360;
    return resultHue;
}

class NYColor {
    h: number; s: number; b: number; a: number;
    constructor(h: number, s: number, b: number, a: number = 1.0) {
        this.h = h; this.s = s; this.b = b; this.a = a;
    }
    copy() { return new NYColor(this.h, this.s, this.b, this.a); }

    slightRandomize(p: p5, hDiff = 10, sDiff = 12, bDiff = 12, aDiff = 0.0) {
        this.h += p.random(-0.5 * hDiff, 0.5 * hDiff);
        this.s += p.random(-0.5 * sDiff, 0.5 * sDiff);
        this.b += p.random(-0.5 * bDiff, 0.5 * bDiff);
        this.a += p.random(-0.5 * aDiff, 0.5 * aDiff);
    }

    // Applique un décalage de teinte global
    shifted(hueShift: number): NYColor {
        return new NYColor(processHue(this.h + hueShift), this.s, this.b, this.a);
    }
}

function NYLerpColor(_colorA: NYColor, _colorB: NYColor, _t: number) {
    let _hue = NYLerpHue(_colorA.h, _colorB.h, _t);
    let _sat = p5.prototype.lerp(_colorA.s, _colorB.s, _t);
    let _bri = p5.prototype.lerp(_colorA.b, _colorB.b, _t);
    let _alpha = p5.prototype.lerp(_colorA.a, _colorB.a, _t);
    return new NYColor(_hue, _sat, _bri, _alpha);
}

function getRandomColorSet(p: p5) {
    return {
        waterColor: new NYColor(220, 40, 10),
        waterFlowColor: new NYColor(192, 86, 90),
        plantColorA: new NYColor(120, 60, 60),
        plantColorB: new NYColor(80, 60, 60),
        plantContrastColor: new NYColor(40, 70, 80),
        plantHighlightColor: new NYColor(0, 0, 100),
        flowerInsideColor: new NYColor(300, 20, 100, 0.8),
        flowerOutsideColor: new NYColor(0, 0, 100, 0.8),
        pistilColorA: new NYColor(52, 90, 95, 0.6),
        pistilColorB: new NYColor(326, 30, 90, 0.6)
    };
}

// ==========================================
// 2. DESSIN (Avec support Hue Shift & Scale)
// ==========================================

function drawFlowerSlice(pg: p5.Graphics, p: p5, _x: number, _y: number, _dir: number, _length: number, _thickness: number, _fromC: NYColor, _toC: NYColor) {
    let strokeCount = _length / 2;
    for (let i = 0; i < strokeCount; i++) {
        let t = i / (strokeCount - 1);
        let offsetX = p.sin(p.radians(_dir)) * _length * t;
        let offsetY = -p.cos(p.radians(_dir)) * _length * t;

        let nowThickness = _thickness * easeInOutSine(t);
        if (t < 0.5) nowThickness = p.lerp(0, _thickness, easeOutSine(t * 2));
        else nowThickness = p.lerp(0.0, _thickness, easeOutSine((1.0 - t) * 2));

        let nowC = NYLerpColor(_fromC, _toC, t);
        nowC.slightRandomize(p, 10, 10, 20);

        pg.strokeWeight(p.random(1, 3));
        pg.stroke(nowC.h, nowC.s, nowC.b, nowC.a * 100);
        pg.noFill();
        pg.push();
        pg.translate(_x, _y);
        pg.arc(offsetX, offsetY, nowThickness, nowThickness / 2, p.radians(0), p.radians(180));
        pg.pop();
    }
}

function drawNoiseLine(pg: p5.Graphics, p: p5, _x: number, _y: number, _dir: number, _length: number, _fromC: NYColor, _toC: NYColor) {
    let dotCount = _length / 2;
    let nowX = _x; let nowY = _y;

    for (let i = 0; i < dotCount; i++) {
        let t = i / (dotCount - 1);
        let nowC = NYLerpColor(_fromC, _toC, easeInQuad(t));
        pg.stroke(nowC.h, nowC.s, nowC.b, 100);

        let pointSizeNoise = p.noise(nowX * 0.01, nowY * 0.01, 666);
        let nowSize = p.lerp(0.1, 2.0, pointSizeNoise) + p.random(0.0, 1.0);
        pg.strokeWeight(nowSize);

        let rotNoise = p.noise(nowX * 0.01, nowY * 0.01, 1234);
        let rotAdd = p.lerp(-60, 60, rotNoise);
        let nowRot = _dir + rotAdd;

        pg.point(nowX, nowY);
        nowX += p.sin(p.radians(nowRot)) * 2;
        nowY += -p.cos(p.radians(nowRot)) * 2;
    }
}

function drawFlowLine(pg: p5.Graphics, p: p5, _x: number, _y: number, _length: number, _thickness: number, _fromC: NYColor, _toC: NYColor, turbulence: number) {
    let strokeCount = _length / 2;
    let nowX = _x; let nowY = _y;

    for (let i = 0; i < strokeCount; i++) {
        let t = i / (strokeCount - 1);
        // Turbulence param controls the noise scale influence
        let sizeNoise = p.noise(nowX * 0.01 * turbulence, nowY * 0.01 * turbulence, 4096);
        let rotNoise = p.noise(nowX * 0.01 * turbulence, nowY * 0.01 * turbulence, 6666);

        let nowSize = _thickness * p.lerp(0.6, 1.2, sizeNoise);
        let nowRot = 90 + p.lerp(-40 * turbulence, 40 * turbulence, rotNoise);

        nowX += p.sin(p.radians(nowRot)) * 2;
        nowY += -p.cos(p.radians(nowRot)) * 2;

        let nowColor = NYLerpColor(_fromC, _toC, t);
        pg.stroke(nowColor.h, nowColor.s, nowColor.b, 100);
        pg.strokeWeight(nowSize);
        pg.point(nowX, nowY);
    }
}

// ==========================================
// 3. CLASSE PLANT
// ==========================================

class PlantLili {
    x: number; y: number; tall: number;
    type: 'FLOWER' | 'LEAF';
    currentStep: number = 0;
    totalSteps: number;

    fromColor: NYColor; toColor: NYColor;
    fromX: number; fromY: number; toX: number; toY: number;

    leafSize: number = 0;
    flowerSliceCount: number = 0; flowerLeafLength: number = 0; pistilCount: number = 0;
    easingFunc: (x: number) => number;
    colorSet: any;

    constructor(p: p5, x: number, y: number, tall: number, colorSet: any) {
        this.x = x; this.y = y; this.tall = tall; this.colorSet = colorSet;
        this.type = p.random() < 0.15 ? 'FLOWER' : 'LEAF';
        if (this.type == 'FLOWER') this.tall += p.random(0.0, 1.2) * 300;
        this.totalSteps = Math.floor(this.tall / 0.6);

        let colorType = Math.floor(p.random(0, 3));
        this.fromColor = (colorType % 2 == 0) ? colorSet.plantColorA.copy() : colorSet.plantColorB.copy();
        this.toColor = (colorType < 2) ? colorSet.plantColorB.copy() : colorSet.plantColorA.copy();
        this.fromColor.slightRandomize(p, 10, 10, 30);
        this.toColor.slightRandomize(p, 10, 10, 30);

        this.fromX = x; this.fromY = y;
        this.toX = x + p.random(-200, 200);
        this.toY = y - this.tall * 0.6;

        const easings = [easeOutSine, easeInOutSine, easeOutQuad, easeInOutQuad, easeOutBack, easeInOutBack, easeOutCirc, easeInOutCirc];
        this.easingFunc = p.random(easings);

        if (this.type == 'LEAF') {
            let r = p.random();
            this.leafSize = r < 0.4 ? p.random(10, 40) : (r < 0.5 ? p.random(120, 280) : p.random(60, 120));
        } else {
            this.flowerSliceCount = Math.floor(p.random(3, 12));
            this.flowerLeafLength = p.random(10, 60);
            this.pistilCount = Math.floor(p.random(3, 12));
        }
    }

    drawStep(pg: p5.Graphics, p: p5, hueShift: number) {
        if (this.currentStep >= this.totalSteps) return false;
        let t = this.currentStep / this.totalSteps;
        let animatedT = this.easingFunc(t);
        // On applique le Hue Shift
        let nowColor = NYLerpColor(this.fromColor.shifted(hueShift), this.toColor.shifted(hueShift), t);

        pg.noStroke();
        pg.fill(nowColor.h, nowColor.s, nowColor.b, nowColor.a * 100);
        let nowX = p.lerp(this.fromX, this.toX, animatedT);
        let nowY = p.lerp(this.fromY, this.toY, t);
        pg.circle(nowX, nowY, 3);
        this.currentStep++;
        return true;
    }

    drawFinal(pg: p5.Graphics, p: p5, scale: number, hueShift: number) {
        // Sauvegarde du contexte pour le Scale
        pg.push();
        pg.translate(this.toX, this.toY);
        pg.scale(scale);
        // On remet à 0 car on a translaté
        const localX = 0;
        const localY = 0;

        if (this.type == 'LEAF') {
            let leafMainColor = this.fromColor.shifted(hueShift);
            let nowHue = processHue(leafMainColor.h + p.random(-20, 20));
            let strokeCount = this.leafSize * p.random(0.6, 2.4);
            for (let i = 0; i < strokeCount; i++) {
                pg.noFill();
                let arcHue = nowHue + p.random(-20, 20);
                pg.stroke(arcHue, leafMainColor.s, leafMainColor.b, 80);
                pg.strokeWeight(p.random(1.0, 6.0));
                let arcSize = p.random() * this.leafSize;
                let arcAngleFrom = p.random(0, 360);
                let arcAngleTo = arcAngleFrom + p.random(12, 36);
                pg.arc(localX, localY, arcSize, arcSize * 0.36, p.radians(arcAngleFrom), p.radians(arcAngleTo));
            }
        } else {
            // BACK
            for (let i = 0; i < this.flowerSliceCount; i++) {
                let t = i / (this.flowerSliceCount - 1);
                let sliceDegree = p.lerp(-60, 60, t) + p.random(-10, 10);
                let len = p.random(0.6, 1.2) * this.flowerLeafLength;
                let thick = p.random(0.8, 1.2) * len / 2;

                let from = this.colorSet.flowerInsideColor.shifted(hueShift); from.slightRandomize(p, 10);
                let to = this.colorSet.flowerOutsideColor.shifted(hueShift); to.slightRandomize(p, 10);
                drawFlowerSlice(pg, p, localX, localY, sliceDegree, len, thick, from, to);
            }
            // PISTIL
            for (let i = 0; i < this.pistilCount; i++) {
                let rot = p.random(-60, 60);
                let sx = localX + p.random(-6, 6); let sy = localY + p.random(-3, 3);
                let l = this.flowerLeafLength * p.random(0.6, 1.2);
                let from = this.colorSet.pistilColorA.shifted(hueShift); from.slightRandomize(p, 10);
                let to = this.colorSet.pistilColorB.shifted(hueShift); to.slightRandomize(p, 10);
                drawNoiseLine(pg, p, sx, sy, rot, l, from, to);
            }
            // FRONT
            for (let i = 0; i < this.flowerSliceCount; i++) {
                let t = i / (this.flowerSliceCount - 1);
                let sliceDegree = p.lerp(-80, 80, t) + p.random(-10, 10);
                let len = p.random(0.3, 0.8) * this.flowerLeafLength;
                let thick = p.random(0.8, 1.2) * len / 2;

                let from = this.colorSet.flowerOutsideColor.shifted(hueShift); from.slightRandomize(p, 10);
                let to = this.colorSet.flowerOutsideColor.shifted(hueShift); to.slightRandomize(p, 10);
                drawFlowerSlice(pg, p, localX, localY + 3, sliceDegree, len, thick, from, to);
            }
        }
        pg.pop();
    }
}

// ==========================================
// 4. SKETCH MANAGER
// ==========================================

export class BotanicalPond implements Sketch {
    id = 'water_lily';
    name = 'Nénuphar';
    audioReactivity = 'L\'étang se peint. Les nénuphars poussent sur le rythme.';

    params: SketchParams = {
        speed: { type: 'slider', value: 15, min: 1, max: 50, step: 1, name: 'Vitesse Eau' },
        density: { type: 'slider', value: 30, min: 5, max: 80, step: 1, name: 'Densité Fleurs' },

        // --- NOUVEAUX PARAMETRES ---
        flowerScale: { type: 'slider', value: 1.0, min: 0.5, max: 2.5, step: 0.1, name: 'Taille Fleurs' },
        turbulence: { type: 'slider', value: 1.0, min: 0.1, max: 3.0, step: 0.1, name: 'Turbulence' },
        hueShift: { type: 'color', value: '#ff0000', name: 'Teinte' },
        growthSpeed: { type: 'slider', value: 1.0, min: 0.5, max: 3.0, step: 0.1, name: 'Vitesse Pousse' },
        waterOpacity: { type: 'slider', value: 255, min: 50, max: 255, step: 5, name: 'Opacité Fond' }
    };

    private waterLayer: p5.Graphics | null = null;
    private flowerLayer: p5.Graphics | null = null;

    private plants: PlantLili[] = [];
    private activePlants: PlantLili[] = [];
    private colorSet: any;

    setup(p: p5) {
        p.pixelDensity(1);
        p.colorMode(p.HSB, 360, 100, 100, 1.0);
        this.reset(p);
    }

    reset(p: p5) {
        this.colorSet = getRandomColorSet(p);
        this.plants = [];
        this.activePlants = [];

        if (this.waterLayer) this.waterLayer.remove();
        this.waterLayer = p.createGraphics(p.width, p.height);
        this.waterLayer.colorMode(p.HSB, 360, 100, 100, 1.0);

        // Background dynamique (on applique la teinte)
        // Conversion hex -> hue
        const hex = String(this.params.hueShift.value);
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) { r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16); }
        else if (hex.length === 7) { r = parseInt(hex.substring(1, 3), 16); g = parseInt(hex.substring(3, 5), 16); b = parseInt(hex.substring(5, 7), 16); }
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let hVal = 0;
        if (max !== min) { const d = max - min; switch (max) { case r: hVal = (g - b) / d + (g < b ? 6 : 0); break; case g: hVal = (b - r) / d + 2; break; case b: hVal = (r - g) / d + 4; break; } hVal /= 6; }
        const hueVal = hVal * 360;

        const h = processHue(this.colorSet.waterColor.h + hueVal);
        this.waterLayer.background(h, this.colorSet.waterColor.s, this.colorSet.waterColor.b);

        if (this.flowerLayer) this.flowerLayer.remove();
        this.flowerLayer = p.createGraphics(p.width, p.height);
        this.flowerLayer.colorMode(p.HSB, 360, 100, 100, 1.0);
        this.flowerLayer.clear();

        for (let i = 0; i < 150; i++) {
            let x = p.random(0.1, 0.9) * p.width;
            let y = p.random(-0.1, 1.1) * p.height;
            if (p.random() < 0.3) {
                let count = Math.floor(p.random(1, 6));
                for (let j = 0; j < count; j++) {
                    this.plants.push(new PlantLili(p, x + p.random(-20, 20), y + p.random(-20, 20), 300, this.colorSet));
                }
            } else {
                this.plants.push(new PlantLili(p, x, y, 300, this.colorSet));
            }
        }
        this.plants.sort(() => p.random() - 0.5);
    }

    draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
        // --- RENDU EN COUCHES ---
        if (bgImage) p.image(bgImage, 0, 0, p.width, p.height);

        if (this.waterLayer) {
            p.push();
            // Appliquer l'opacité du fond
            p.tint(255, this.params.waterOpacity.value);
            p.image(this.waterLayer, 0, 0);
            p.pop();
        }

        if (this.flowerLayer) p.image(this.flowerLayer, 0, 0);

        if (!this.waterLayer || !this.flowerLayer) return;
        const energy = audio.energy;

        // Récupération des paramètres dynamiques
        const turb = this.params.turbulence.value;

        // Conversion de la couleur hex en teinte (0-360)
        const hex = String(this.params.hueShift.value);
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) { r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16); }
        else if (hex.length === 7) { r = parseInt(hex.substring(1, 3), 16); g = parseInt(hex.substring(3, 5), 16); b = parseInt(hex.substring(5, 7), 16); }
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let hVal = 0;
        if (max !== min) { const d = max - min; switch (max) { case r: hVal = (g - b) / d + (g < b ? 6 : 0); break; case g: hVal = (b - r) / d + 2; break; case b: hVal = (r - g) / d + 4; break; } hVal /= 6; }
        const hue = hVal * 360;

        const fScale = this.params.flowerScale.value;
        const gSpeed = this.params.growthSpeed.value;

        if (energy > 0.05) {
            // EAU
            const flowCount = Math.floor(energy * 10 * this.params.speed.value);
            const waterC = this.colorSet.waterColor;
            const flowC = this.colorSet.waterFlowColor;

            for (let i = 0; i < flowCount; i++) {
                let x = p.random(-0.2, 1.2) * p.width;
                let y = p.random(-0.2, 1.2) * p.height;
                let len = p.random(0.03, 0.2) * p.min(p.width, p.height);
                let thick = p.random(1.0, 3.0);

                let from = new NYColor(flowC.h + p.random(-10, 10), flowC.s, flowC.b).shifted(hue);
                let to = waterC.copy().shifted(hue);

                if (p.random() < 0.5) drawFlowLine(this.waterLayer, p, x, y, len, thick, from, to, turb);
                else drawFlowLine(this.waterLayer, p, x, y, len, thick, to, from, turb);
            }

            // PLANTES (Activation)
            if (audio.bass > 0.6 && this.activePlants.length < 5 && this.plants.length > 0 && p.random() < 0.2) {
                const next = this.plants.pop();
                if (next) this.activePlants.push(next);
            }

            // CROISSANCE
            const growthSteps = Math.floor(energy * 5 * gSpeed) + 1;
            for (let i = this.activePlants.length - 1; i >= 0; i--) {
                const plant = this.activePlants[i];
                let stillGrowing = true;

                // Tiges sur flowerLayer (Devant) + Hue Shift
                for (let k = 0; k < growthSteps; k++) {
                    if (!plant.drawStep(this.flowerLayer, p, hue)) {
                        stillGrowing = false;
                        break;
                    }
                }

                if (!stillGrowing) {
                    plant.drawFinal(this.flowerLayer, p, fScale, hue);
                    this.activePlants.splice(i, 1);
                }
            }
        }
    }

    cleanup() {
        if (this.waterLayer) { this.waterLayer.remove(); this.waterLayer = null; }
        if (this.flowerLayer) { this.flowerLayer.remove(); this.flowerLayer = null; }
        this.plants = [];
    }
}