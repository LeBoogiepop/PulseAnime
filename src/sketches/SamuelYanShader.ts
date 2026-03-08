import p5 from 'p5';
import { Sketch, AudioData } from '../types';

const vert = `
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;
void main() {
  vTexCoord = aTexCoord;
  vec4 positionVec4 = vec4(aPosition, 1.0);
  positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
  gl_Position = positionVec4;
}
`;

const frag = `
precision mediump float;
varying vec2 vTexCoord;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform sampler2D u_texture;
uniform float u_level;
uniform float u_bass;
uniform float u_mid;
uniform float u_treble;
uniform float u_energy;

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  vec4 texColor = texture2D(u_texture, vTexCoord);

  float distort = u_level * 0.12 + u_bass * 0.08;
  vec2 uv = vTexCoord - 0.5;
  uv *= 1.0 + distort;
  uv += 0.5;
  uv = clamp(uv, 0.0, 1.0);
  texColor = texture2D(u_texture, uv);

  float satBoost = 1.0 + u_energy * 0.5;
  float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
  vec3 saturated = mix(vec3(gray), texColor.rgb, satBoost);
  texColor.rgb = saturated;

  vec3 tint = vec3(u_bass * 0.3, u_mid * 0.2, u_treble * 0.3);
  texColor.rgb += tint;

  float pulse = 1.0 + u_bass * 0.2;
  texColor.rgb *= pulse;

  gl_FragColor = texColor;
}
`;

export class SamuelYanShader implements Sketch {
  id = 'samuel_yan_shader';
  name = 'Shaders 0417';
  mode = 'WEBGL' as const;
  audioReactivity = 'Full spectrum drives distortion, saturation and color tint.';

  private shader: p5.Shader | null = null;
  private img: p5.Image | null = null;

  setup(p: p5) {
    this.shader = p.createShader(vert, frag);
    p.loadImage('/image/favicon.png', (loaded) => {
      this.img = loaded;
    });
  }

  draw(p: p5, audio: AudioData, _bgImage?: p5.Image | null) {
    p.background(10);

    if (!this.shader) return;

    p.shader(this.shader);
    this.shader.setUniform('u_resolution', [p.width, p.height]);
    this.shader.setUniform('u_time', p.millis() / 1000);
    this.shader.setUniform('u_mouse', [p.mouseX / 100, p.map(p.mouseY, 0, p.height, p.height, 0) / 100]);
    this.shader.setUniform('u_level', audio.level);
    this.shader.setUniform('u_bass', audio.bass);
    this.shader.setUniform('u_mid', audio.mid);
    this.shader.setUniform('u_treble', audio.treble);
    this.shader.setUniform('u_energy', audio.energy);

    if (this.img) this.shader.setUniform('u_texture', this.img);

    p.rect(0, 0, p.width, p.height);
    p.resetShader();
  }

  cleanup() {
    this.shader = null;
    this.img = null;
  }
}
