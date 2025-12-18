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

  uniform sampler2D iImage0;
  uniform sampler2D iImage1;
  uniform sampler2D iImage2;
  uniform float iTime;
  uniform vec2 iDelta; 
  uniform float iAudio; 
  uniform float uDistStrength; 
  uniform float uDistFreq; 
  uniform float uColorSpeed; 
  uniform float uGlow; 

  in vec2 vTexCoord;
  out vec4 fragColor;

  // --- NOISE FUNCTIONS ---
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i); 
    vec4 p = permute( permute( permute( 
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  float noiseSample(vec2 uv, vec3 move, vec2 offset) {
     // Modulation par uDistFreq pour contrôler la densité du bruit
     return snoise(vec3(uv.x * uDistFreq + move.x + offset.x, uv.y * uDistFreq + move.y + offset.y, move.z));
  }

  vec4 noiseImageRGB(vec2 uv, vec3 move) {
    vec2 offR = vec2(0.0, 0.0);
    vec2 offG = vec2(15.5, 3.4);
    vec2 offB = vec2(5.1, 20.2);

    float r = noiseSample((uv - vec2(421.0, 132.0)) * 1.0, move, offR);
    float g = noiseSample((uv - vec2(421.0, 132.0)) * 1.0, move, offG);
    float b = noiseSample((uv - vec2(421.0, 132.0)) * 1.0, move, offB);
    vec3 n = vec3(r, g, b);

    // Octaves supplémentaires pour le détail
    r = noiseSample((uv - vec2(834.0, 724.0)) * 4.0, move, offR);
    g = noiseSample((uv - vec2(834.0, 724.0)) * 4.0, move, offG);
    b = noiseSample((uv - vec2(834.0, 724.0)) * 4.0, move, offB);
    n += vec3(r, g, b) * 0.25;

    n = n / 1.25;
    n = n * 0.5 + 0.5;
    return vec4(n, 1.0);
  }

  vec2 mirror(vec2 uv) {
    return abs(fract(uv) * 2.0 - 1.0);
  }

  vec2 displace(vec2 uv, vec2 map, float scale, float strength) {
    return uv + (map - 0.5) * strength * scale;
  }

  void main() {
    vec2 uv = vTexCoord;
    uv.y = 1.0 - uv.y; 

    // RALENTISSEMENT DU BRUIT (x0.0005 au lieu de x0.002)
    vec3 trans = vec3(iDelta.x, iDelta.y, iTime * 0.0005);
    vec4 dimg = noiseImageRGB(uv, trans);

    // RÉACTIVITÉ : La distorsion réagit aux basses (iAudio)
    // On multiplie par 4.0 pour que les kicks déforment bien l'image
    float strength = uDistStrength + (iAudio * 4.0); 
    
    vec2 duv = displace(uv, dimg.rb, 0.2, strength); // Scale réduit à 0.2 pour moins de chaos
    duv = mirror(duv);

    vec4 img0 = texture(iImage0, duv);
    vec4 img1 = texture(iImage1, duv);
    vec4 img2 = texture(iImage2, duv);

    // CYCLE COULEUR RALENTI
    float t = iTime * uColorSpeed * 0.5; // Encore plus lent
    float it = floor(t);
    float grad = 0.5 + 0.5 * sin((fract(t) - 0.5) * 3.14159);

    vec4 col;
    float cycle = mod(it, 3.0);
    if (cycle == 0.0) col = mix(img0, img1, grad);
    else if (cycle == 1.0) col = mix(img1, img2, grad);
    else col = mix(img2, img0, grad);

    fragColor = col * uGlow;
  }
`;

export class TravelShader implements Sketch {
  id = 'travel';
  name = 'Voyage';
  mode = 'WEBGL' as const;
  audioReactivity = 'L\'image se déforme sur les basses (Kicks). Vitesse lente et hypnotique.';

  params: SketchParams = {
    // Paramètres par défaut beaucoup plus doux
    speed: { type: 'slider', value: 0.001, min: 0.0, max: 0.01, step: 0.0001, name: 'Vitesse Voyage' },
    baseDistortion: { type: 'slider', value: 1.5, min: 0.0, max: 5.0, step: 0.1, name: 'Distortion Base' },
    distortionFreq: { type: 'slider', value: 1.0, min: 0.1, max: 5.0, step: 0.1, name: 'Fréq Distortion' },
    colorShiftSpeed: { type: 'slider', value: 0.002, min: 0.0, max: 0.05, step: 0.001, name: 'Vitesse Couleur' },
    glowStrength: { type: 'slider', value: 1.0, min: 0.5, max: 2.0, step: 0.1, name: 'Intensité Glow' }
  };

  private shaderProg: p5.Shader | null = null;
  private imgs: p5.Image[] = [];
  private deltaX = 0;
  private deltaY = 0;

  setup(p: p5) {
    this.shaderProg = p.createShader(vertShader, fragShader);

    const urls = [
      "https://raw.githubusercontent.com/ZRNOF/.ink/main/Package/Rain_Window_01.jpg",
      "https://raw.githubusercontent.com/ZRNOF/.ink/main/Package/Tunnel_01.jpg",
      "https://raw.githubusercontent.com/ZRNOF/.ink/main/Package/The_Dome_of_Light_02.jpg"
    ];

    this.imgs = urls.map(url => p.loadImage(url) as unknown as p5.Image);
  }

  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    if (!this.shaderProg) return;

    const baseSpd = this.params.speed.value;
    const dist = this.params.baseDistortion.value;

    // ACCÉLÉRATION : Seulement sur les basses, et très légère (x0.01)
    // Pour éviter l'effet "mal de mer"
    const speed = baseSpd + audio.bass * 0.01;
    this.deltaX += speed;
    this.deltaY += speed * 0.5;

    p.shader(this.shaderProg);

    this.shaderProg.setUniform('iTime', p.frameCount);
    this.shaderProg.setUniform('iDelta', [this.deltaX, this.deltaY]);

    // AUDIO : On envoie uniquement les basses pour le punch
    this.shaderProg.setUniform('iAudio', audio.bass);

    this.shaderProg.setUniform('uDistStrength', dist);
    this.shaderProg.setUniform('uDistFreq', this.params.distortionFreq.value);
    this.shaderProg.setUniform('uColorSpeed', this.params.colorShiftSpeed.value);
    this.shaderProg.setUniform('uGlow', this.params.glowStrength.value);

    if (bgImage) {
      this.shaderProg.setUniform('iImage0', bgImage);
      this.shaderProg.setUniform('iImage1', bgImage);
      this.shaderProg.setUniform('iImage2', bgImage);
    } else {
      if (this.imgs[0] && this.imgs[0].width > 1) this.shaderProg.setUniform('iImage0', this.imgs[0]);
      if (this.imgs[1] && this.imgs[1].width > 1) this.shaderProg.setUniform('iImage1', this.imgs[1]);
      if (this.imgs[2] && this.imgs[2].width > 1) this.shaderProg.setUniform('iImage2', this.imgs[2]);
    }

    p.noStroke();
    p.rect(-p.width / 2, -p.height / 2, p.width, p.height);
  }

  cleanup() { }
}