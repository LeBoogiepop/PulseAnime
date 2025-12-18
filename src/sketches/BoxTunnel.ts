import p5 from 'p5';
import { Sketch, AudioData, SketchParams } from '../types';

const vertShader = `#version 300 es
  precision mediump float;
  in vec3 aPosition;
  in vec2 aTexCoord;
  uniform mat4 uProjectionMatrix;
  uniform mat4 uModelViewMatrix;
  out vec2 vTexCoord;
  void main() {
    vTexCoord = aTexCoord;
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
  }
`;

const fragShader = `#version 300 es
  precision mediump float;
  
  uniform float iTime;
  uniform vec2 iResolution;
  uniform float iBass;
  uniform float iHigh;
  uniform float uSpeed;
  uniform float uDensity;
  uniform float uGlow;
  uniform float uFOV;
  uniform float uColorSpeed;
  uniform float uRoundness; // 0.0 = Carré, 1.0 = Rond
  uniform float uImpact;    // Force du "Bam" (Zoom/Rush)

  in vec2 vTexCoord;
  out vec4 fragColor;

  // Palette Arc-en-ciel douce
  vec3 palette(float t) {
      vec3 a = vec3(0.5, 0.5, 0.5);
      vec3 b = vec3(0.5, 0.5, 0.5);
      vec3 c = vec3(1.0, 1.0, 1.0);
      vec3 d = vec3(0.0, 0.33, 0.67);
      return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
      vec2 uv = vTexCoord * 2.0 - 1.0;
      uv.x *= iResolution.x / iResolution.y;

      // --- EFFET DE ZOOM BASS (LE "BAM") ---
      // uImpact contrôle la violence du zoom sur les basses
      float fov = uFOV + iBass * uImpact;
      uv /= fov;

      // --- FORME DU TUNNEL (ROND vs CARRÉ) ---
      // Distance Box (Carré)
      float boxDist = max(abs(uv.x), abs(uv.y));
      // Distance Cercle (Rond)
      float circleDist = length(uv);
      
      // On mixe les deux selon le paramètre uRoundness
      float dist = mix(boxDist, circleDist, uRoundness);
      
      float z = 1.0 / dist;

      // --- COULEUR & MOUVEMENT ---
      // Le mouvement dépend VIVEMENT de la basse pour l'effet "ça arrive"
      // On utilise aussi uImpact pour accélérer le flux
      float flow = iTime * uSpeed + iBass * (3.0 + uImpact * 2.0);
      
      // Texture étirée pour éviter les stries
      vec3 col = palette(z * 0.05 + flow * 0.2 * uColorSpeed);

      // --- MASQUES (LE NOIR) ---
      
      // 1. Le Trou Central (Noir profond)
      float centerHole = smoothstep(0.05, 0.3, dist);
      
      // 2. Les Bords Noirs (Vignette)
      // On adapte la vignette à la forme (rond ou carré)
      float edgeVignette = 1.0 - smoothstep(0.5, 0.9, dist);
      
      // --- RÉACTION LUMINEUSE ---
      float brightness = 0.05 + iBass * uGlow;
      
      // Combinaison
      vec3 finalCol = col * centerHole * edgeVignette * brightness;

      // Flash blanc au centre de l'explosion
      if (iBass > 0.8) {
          finalCol += 0.1 * centerHole * edgeVignette;
      }

      fragColor = vec4(finalCol, 1.0);
  }
`;

export class BoxTunnel implements Sketch {
    id = 'box_tunnel';
    name = 'Tunnel Concert';
    mode = 'WEBGL' as const;
    audioReactivity = 'Les basses font pulser le tunnel et inversent les couleurs (Strobe).';

    params: SketchParams = {
        speed: { type: 'slider', value: 1.0, min: 0.1, max: 5.0, step: 0.1, name: 'Vitesse' },
        density: { type: 'slider', value: 8.0, min: 2.0, max: 20.0, step: 1.0, name: 'Densité' },
        glow: { type: 'slider', value: 2.5, min: 1.0, max: 5.0, step: 0.1, name: 'Intensité Flash' },
        fov: { type: 'slider', value: 1.0, min: 0.5, max: 2.0, step: 0.1, name: 'Zoom Base' },
        colorSpeed: { type: 'slider', value: 1.0, min: 0.1, max: 3.0, step: 0.1, name: 'Vitesse Couleurs' },
        roundness: { type: 'slider', value: 0.0, min: 0.0, max: 1.0, step: 0.01, name: 'Arrondi' },
        impact: { type: 'slider', value: 0.5, min: 0.1, max: 2.0, step: 0.1, name: 'Force Impact' }
    };

    private shader: p5.Shader | null = null;

    setup(p: p5) {
        this.shader = p.createShader(vertShader, fragShader);
    }

    draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
        if (!this.shader) return;

        p.shader(this.shader);

        // Envoi des données au GPU
        this.shader.setUniform('iResolution', [p.width, p.height]);
        this.shader.setUniform('iTime', p.frameCount * 0.01);

        // On lisse un peu la basse pour éviter le scintillement désagréable
        // Mais on garde le punch
        this.shader.setUniform('iBass', audio.bass);
        this.shader.setUniform('iHigh', audio.treble);

        this.shader.setUniform('uSpeed', this.params.speed.value);
        this.shader.setUniform('uDensity', this.params.density.value);
        this.shader.setUniform('uGlow', this.params.glow.value);
        this.shader.setUniform('uFOV', this.params.fov.value);
        this.shader.setUniform('uColorSpeed', this.params.colorSpeed.value);
        this.shader.setUniform('uRoundness', this.params.roundness.value);
        this.shader.setUniform('uImpact', this.params.impact.value);

        // Si une image est chargée, on pourrait l'utiliser comme texture
        // Mais pour cet effet "Concert", c'est mieux sans.

        p.rect(-p.width / 2, -p.height / 2, p.width, p.height);
    }

    cleanup() { }
}
