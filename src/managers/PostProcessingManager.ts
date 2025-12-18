import p5 from 'p5';
import { SketchParams } from '../types';

const vertShader = `
precision mediump float;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;
void main() {
    vTexCoord = aTexCoord;
    gl_Position = vec4(aPosition, 1.0);
}
`;

const fragShader = `
precision mediump float;

varying vec2 vTexCoord;
uniform sampler2D tex0;
uniform float uTime;
uniform float uGlitch;
uniform float uGray;
uniform float uInvert;
uniform float uScan;
uniform float uVignette;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = vTexCoord;
    uv.y = 1.0 - uv.y; // Flip Y for p5 texture

    // 1. Glitch (Displacement)
    if (uGlitch > 0.0) {
        float noise = random(vec2(floor(uv.y * 20.0), floor(uTime * 10.0)));
        if (noise < uGlitch * 0.01) {
            uv.x += (random(vec2(uTime, uv.y)) - 0.5) * 0.1;
        }
    }

    vec4 col = texture2D(tex0, uv);

    // 2. Grayscale
    if (uGray > 0.5) {
        float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
        col.rgb = vec3(gray);
    }

    // 3. Invert
    if (uInvert > 0.5) {
        col.rgb = 1.0 - col.rgb;
    }

    // 4. Scanlines
    if (uScan > 0.0) {
        float scan = sin(uv.y * 800.0) * 0.5 + 0.5;
        col.rgb *= 1.0 - (scan * uScan * 0.01);
    }

    // 5. Vignette
    if (uVignette > 0.0) {
        vec2 center = vec2(0.5);
        float dist = distance(uv, center);
        float vig = smoothstep(0.8, 0.2, dist * (1.0 + uVignette * 0.01));
        col.rgb *= vig;
    }

    gl_FragColor = col;
}
`;

export class PostProcessingManager {
    params: SketchParams = {
        glitch: { type: 'slider', value: 0, min: 0, max: 100, step: 1, name: 'Glitch' },
        grayscale: { type: 'slider', value: 0, min: 0, max: 1, step: 1, name: 'Noir & Blanc' },
        invert: { type: 'slider', value: 0, min: 0, max: 1, step: 1, name: 'Invert' },
        scanlines: { type: 'slider', value: 0, min: 0, max: 100, step: 5, name: 'Scanlines' },
        vignette: { type: 'slider', value: 0, min: 0, max: 100, step: 5, name: 'Vignette' },
    };

    private shader: p5.Shader | null = null;

    setup(p: p5) {
        // Only create shader if in WEBGL mode
        // @ts-ignore
        if (p._renderer && p._renderer.GL) {
            this.shader = p.createShader(vertShader, fragShader);
        }
    }

    apply(p: p5) {
        // TEMPORARY FIX: Disable custom shader to restore functionality
        // The custom shader was causing orientation and lag issues.
        // We will use standard p5 filters for now.

        // 1. Grayscale
        if (this.params.grayscale.value > 0.5) {
            p.filter(p.GRAY);
        }

        // 2. Invert
        if (this.params.invert.value > 0.5) {
            p.filter(p.INVERT);
        }

        // 3. Scanlines (Manual Draw)
        if (this.params.scanlines.value > 0) {
            p.push();
            p.stroke(0, this.params.scanlines.value * 2.55);
            p.strokeWeight(1);
            for (let i = 0; i < p.height; i += 4) {
                p.line(0, i, p.width, i);
            }
            p.pop();
        }

        // 4. Vignette (Manual Draw)
        if (this.params.vignette.value > 0) {
            // Simple vignette using radial gradient drawing
            p.push();
            p.noStroke();
            const ctx = p.drawingContext as CanvasRenderingContext2D;
            const gradient = ctx.createRadialGradient(p.width / 2, p.height / 2, p.height / 3, p.width / 2, p.height / 2, p.height);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, `rgba(0,0,0,${this.params.vignette.value / 100})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, p.width, p.height);
            p.pop();
        }

        // 5. Glitch (Simple Random Slice - P2D/WEBGL compatible-ish)
        // Note: p.get() is slow, so we only do it if glitch is high enough to warrant the cost, or skip it.
        // For now, let's skip glitch to ensure performance.
    }
}
