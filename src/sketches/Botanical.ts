
import p5 from 'p5';
import { Sketch, AudioData, SketchParams } from '../types';

// --- UTILS PORTED FROM ORIGINAL ---

const getTheme = (p: p5) => p.random(["red", "green", "blue", "white", "yellow", "none"]);
const getBSType = (p: p5) => p.random(["A", "B", "C", "D", "E", "F", "G", "H", "I"]);

const setStrokeTheme = (p: p5, theme: string) => {
    const [f, s, t] = [255, p.random(127, 255), p.random(127, 255)];
    if (theme === "red") p.stroke(f, s, t);
    else if (theme === "green") p.stroke(s, f, t);
    else if (theme === "blue") p.stroke(s, t, f);
    else if (theme === "white") p.stroke(p.random(220, 255));
    else if (theme === "yellow") p.stroke(f, f, s);
    else if (theme === "brown") p.stroke(p.random(100, 127), p.random(64, 127), 0);
    else if (theme === "none") p.noStroke();
};

const randomPoints = (p: p5, posX: number, posY: number, w: number, h: number, num: number, theme: string) => {
    p.push();
    p.translate(posX, posY);
    let n = num;
    while (n > 0) {
        setStrokeTheme(p, theme);
        p.strokeWeight(p.random(5) * 0.65);
        const x = p.random(-1, 1);
        const y = p.random(-1, 1);
        if (x * x + y * y <= 1) p.point((x * w) / 2, (y * h) / 2);
        n--;
    }
    p.pop();
};

// --- L-SYSTEM DEFINITIONS ---

const recur = (bs: any, sentence: string, n: number = 0): string => {
    if (n === bs.n) return sentence;
    let result = "";
    for (let i = 0; i < sentence.length; i++) {
        const char = sentence.charAt(i);
        result += bs.rules[char] ? bs.rules[char] : char;
    }
    return recur(bs, result, n + 1);
};

// Optimized N values for realtime performance
// Reduced recursion depth to prevent lag with 15 plants
const BS: any = {
    A: (p: p5) => ({ n: 2, axiom: "F", rules: { F: "F[+F]F[-F]F" } }),
    B: (p: p5) => ({ n: 2, axiom: "F", rules: { F: "F[+F]F[-F][F]" } }),
    C: (p: p5) => ({ n: 2, axiom: "F", rules: { F: "FF-[-F+F+F]+[+F-F-F]" } }),
    D: (p: p5) => ({ n: 2, axiom: "X", rules: { X: "F[+X]F[-X]+X", F: "FF" } }),
    E: (p: p5) => ({ n: 3, axiom: "X", rules: { X: "F[+X][-X]FX", F: "FF" } }),
    F: (p: p5) => ({ n: 3, axiom: "X", rules: { X: "F-[[X]+X]+F[+FX]-X", F: "FF" } }),
    G: (p: p5) => ({ n: 3, axiom: "X", rules: { X: "F+[[X]-X]-F[-FX]+X", F: "FF" } }),
    H: (p: p5) => ({ n: 3, axiom: "FX", rules: { X: "[-FX]+FX" } }),
    I: (p: p5) => ({ n: 2, axiom: "F+F+F+F", rules: { F: "FF+F++F+F" } }),
};

// --- MAIN SKETCH ---

interface Plant {
    x: number;
    y: number;
    sentence: string;
    theme: string;
    scale: number;
    bsType: string;
}

export class Botanical implements Sketch {
    id = 'botanical';
    name = 'Jardin Botanique';
    audioReactivity = 'Les médiums modulent la force du vent sur les plantes. Les basses amplifient leur croissance. Les aigus ajoutent des tourbillons.';

    params: SketchParams = {
        wind: { type: 'slider', value: 0.5, min: 0.0, max: 3.0, step: 0.1, name: 'Force Vent' },
        growth: { type: 'slider', value: 1.0, min: 0.5, max: 2.0, step: 0.1, name: 'Taille' },
        branchProb: { type: 'slider', value: 0.08, min: 0.0, max: 0.5, step: 0.01, name: 'Densité Fleurs' },
        colorHue: { type: 'slider', value: 0, min: 0, max: 360, step: 1, name: 'Teinte' },
    };

    private plants: Plant[] = [];
    private groundLayer: p5.Graphics | null = null;
    private features: any;
    private gridCells: any[] = [];

    setup(p: p5) {
        // Config
        this.features = {
            Theme: getTheme(p),
            MixedThemes: p.random([true, false]),
            Darkness: p.random() < 0.1,
        };

        // 1. Generate Ground (Cached)
        if (this.groundLayer) {
            this.groundLayer.remove();
        }
        this.groundLayer = p.createGraphics(p.width, p.height);
        this.drawGround(this.groundLayer, p);

        // 2. Generate Plants Data
        this.plants = [];
        const plantCount = 15;
        for (let i = 0; i < plantCount; i++) {
            const type = getBSType(p);
            const bs = BS[type](p);
            const sentence = recur(bs, bs.axiom);

            this.plants.push({
                x: p.random(p.width),
                y: p.height - (50 + p.random(50)),
                sentence: sentence,
                theme: this.features.MixedThemes ? getTheme(p) : this.features.Theme,
                scale: p.random(15, 25), // Increased scale significantly
                bsType: type
            });
        }

        // 3. Setup Grid for Swirls
        this.setupGrid(p, 10, 10);
    }

    draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
        const windStrength = this.params.wind.value;
        const growthScale = this.params.growth.value;

        // Background Handling
        if (bgImage) {
            p.image(bgImage, 0, 0, p.width, p.height);
            p.background(0, 100); // Dark overlay to make plants pop
        } else if (this.groundLayer) {
            p.image(this.groundLayer, 0, 0);
        } else {
            p.background(20);
        }

        // Draw Plants
        p.push();
        for (let plant of this.plants) {
            this.drawPlant(p, plant, audio, windStrength, growthScale, this.params.branchProb.value, this.params.colorHue.value);
        }
        p.pop();

        // Draw Grid/Swirls overlay
        this.drawGridContent(p, audio);

        // Border
        p.noFill();
        p.stroke(255);
        p.strokeWeight(10);
        p.rect(0, 0, p.width, p.height);
    }

    // --- HELPERS ---

    drawGround(g: p5.Graphics, p: p5) {
        const bgColor = [p.random(20, 40), p.random(20, 40), p.random(20, 40)];
        g.background(bgColor[0], bgColor[1], bgColor[2]);

        // Ground patches
        for (let i = 0; i < 400; i++) {
            const posX = p.random(g.width);
            const posY = p.random(g.height - 150 - 80 * (p.noise(posX * 0.0025) * 2 - 1), g.height);
            randomPoints(g as unknown as p5, posX, posY, 30, 30, 20, "brown");
        }
    }

    drawPlant(p: p5, plant: Plant, audio: AudioData, windFactor: number, growthFactor: number, branchProb: number, hueShift: number) {
        p.push();
        p.translate(plant.x, plant.y);

        // Optimized Wind: Slower time, much lower base amplitude
        const t = p.frameCount * 0.002; // Slow down time
        const sway = Math.sin(t + plant.x * 0.005) + Math.cos(t * 1.7);

        // Base wind is minimal (0.002), reacts strongly to mid frequencies
        const wind = sway * (0.002 + (audio.mid * 0.08 * windFactor));
        p.rotate(wind);

        // Dynamic length based on bass
        const dynLen = plant.scale * growthFactor + (audio.bass * 2);

        // Interpreter
        for (let i = 0; i < plant.sentence.length; i++) {
            const char = plant.sentence[i];

            if (char === 'F') {
                // Draw Line
                const len = dynLen;
                const r = p.random(-0.5, 0.5); // Reduced jitter
                p.strokeWeight(p.random(0.5, 2.5)); // Thicker lines

                // Theme colors
                setStrokeTheme(p, plant.theme);

                // Apply Hue Shift if set
                if (hueShift > 0) {
                    p.colorMode(p.HSB);
                    // Use hueShift as base, high saturation/brightness
                    p.stroke((hueShift + p.random(-20, 20)) % 360, 80, 90);
                    p.colorMode(p.RGB);
                }

                p.line(0, 0, 0, -len + r);
                p.translate(0, -len + r);

                // Chance for decoration (leaves/flowers)
                if (p.random() < branchProb) {
                    p.push();
                    setStrokeTheme(p, plant.theme);
                    if (hueShift > 0) {
                        p.colorMode(p.HSB);
                        p.stroke((hueShift + 30 + p.random(20)) % 360, 90, 100);
                        p.colorMode(p.RGB);
                    }
                    p.strokeWeight(p.random(3, 6)); // Bigger flowers
                    p.point(0, 0);
                    p.pop();
                }
            } else if (char === '-') {
                p.rotate(p.radians(25) + wind);
            } else if (char === '+') {
                p.rotate(p.radians(-25) + wind);
            } else if (char === '[') {
                p.push();
            } else if (char === ']') {
                p.pop();
            }
        }
        p.pop();
    }

    setupGrid(p: p5, cols: number, rows: number) {
        this.gridCells = [];
        const w = p.width / cols;
        const h = p.height / rows;
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                this.gridCells.push({
                    x: c * w + w / 2,
                    y: r * h + h / 2,
                    w: w,
                    h: h
                });
            }
        }
    }

    drawGridContent(p: p5, audio: AudioData) {
        const sizeBase = 20;
        for (let cell of this.gridCells) {
            // Swirl - Low probability to keep clean
            if (p.random() < 0.005 + audio.treble * 0.05) {
                this.Swirl(p, cell.x, cell.y, sizeBase + audio.treble * 20);
            }
        }
    }

    Swirl(p: p5, x: number, y: number, size: number) {
        p.push();
        p.translate(x, y);
        p.noFill();
        let r = size / 1.5;
        const inc = size / 10;
        const start = Math.floor(p.random(0, 360));
        const end = start + 20;
        p.stroke(p.random(180, 255), 150);
        p.strokeWeight(1.0);
        p.beginShape();
        for (let i = start; i < end; i++) {
            (p as any).curveVertex(Math.cos(p.radians(i)) * r, Math.sin(p.radians(i)) * r);
            r -= inc;
        }
        p.endShape();
        p.pop();
    }

    cleanup() {
        if (this.groundLayer) {
            this.groundLayer.remove();
            this.groundLayer = null;
        }
        this.plants = [];
    }
}
