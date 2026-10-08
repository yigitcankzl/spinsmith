/**
 * The arena lights your desk: a see-through black shell around the head dims the real room
 * (passthrough shows less where it is darker, as Meta's passthrough lighting guidance suggests),
 * leaving a pool of light on the table around the arena. Virtual things nearer than the shell are
 * never dimmed. It does nothing with passthrough off: the effect is the real room.
 */
import { BackSide, Color, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from '@iwsdk/core';
import { TUNE } from './tuning.js';
import { COMFORT } from './comfort.js';

export class RoomLight {
  readonly mesh: Mesh;
  private dim = 0;
  private flash = 0;
  private readonly uniforms = {
    uDim: { value: 0 },
    uTint: { value: new Color(0, 0, 0) },
    uCenter: { value: new Vector3() },
    uTableY: { value: 0 },
    uR0: { value: 0.4 },
    uR1: { value: 0.85 },
    uWave: { value: -1 },
  };
  private readonly warm = new Color(0.16, 0.06, 0.0);
  private readonly cold = new Color(0.02, 0.08, 0.18);
  /** Seconds left of a quench's cold wash over the room. */
  private coolT = 0;

  /** The quench: the forge's orange room flips to a cold blue, then settles. */
  quench() {
    this.coolT = 1.4;
  }

  /** A won match: a ring of warm light rolls out from the arena across the room (1.6 s). */
  wave() {
    this.waveT = 0;
  }
  private waveT = -1;

  constructor() {
    const material = new MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, side: BackSide });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRoomWorld;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvRoomWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vRoomWorld;\nuniform float uDim;\nuniform vec3 uTint;\nuniform vec3 uCenter;\nuniform float uTableY;\nuniform float uR0;\nuniform float uR1;\nuniform float uWave;',
        )
        .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
  // Where the eye ray meets the table: dark away from the arena, a pool of light around it.
  vec3 dir = normalize(vRoomWorld - cameraPosition);
  float a = uDim;
  if (dir.y < -0.01) {
    float t = (uTableY - cameraPosition.y) / dir.y;
    vec3 hit = cameraPosition + dir * t;
    float d = distance(hit.xz, uCenter.xz);
    a = uDim * smoothstep(uR0, uR1, d);
    // A won match: a warm ring rolls out across the room.
    if (uWave > 0.0) {
      float band = exp(-pow((d - uWave) / 0.4, 2.0));
      gl_FragColor = vec4(mix(uTint * a, vec3(1.0, 0.55, 0.15), band * 0.6), max(a * (1.0 - band), band * 0.4));
      return;
    }
  }
  gl_FragColor = vec4(uTint * a, a);`,
        );
    };
    this.mesh = new Mesh(new SphereGeometry(2.5, 24, 12), material);
    // Drawn before the other see-through things (labels, plates), so they are never dimmed.
    this.mesh.renderOrder = -5;
    this.mesh.frustumCulled = false;
  }

  /** The lit pool fits an arena whose rim is `rim` metres from its center. */
  setPool(rim: number) {
    this.uniforms.uR0.value = rim - 0.01;
    this.uniforms.uR1.value = rim + 0.45;
  }

  /** A hard hit: the room flashes warm for a moment. */
  hit() {
    if (COMFORT.flashes) this.flash = 1;
  }

  /**
   * Eases toward `target` (0 bright .. 1 dark), around the arena at `center` on a table at
   * `tableY`, following the head. `warm` tints the room the forge's orange.
   */
  update(head: Vector3, center: Vector3, tableY: number, target: number, warm: boolean, dt: number) {
    this.dim += (target * TUNE.dim - this.dim) * Math.min(1, dt / 0.6);
    this.flash = Math.max(0, this.flash - dt / 0.08);
    this.mesh.position.copy(head);
    this.mesh.visible = this.dim > 0.01;
    this.uniforms.uDim.value = Math.max(0, this.dim - 0.15 * this.flash);
    this.uniforms.uTint.value.copy(this.warm).multiplyScalar(warm ? 1 : this.flash);
    if (this.waveT >= 0) {
      this.waveT += dt;
      this.uniforms.uWave.value = this.waveT < 1.6 ? 0.2 + this.waveT * 2.2 : -1;
      if (this.waveT >= 1.6) this.waveT = -1;
    }
    if (this.coolT > 0) {
      this.coolT = Math.max(0, this.coolT - dt);
      this.uniforms.uTint.value.copy(this.cold).multiplyScalar(Math.min(1, this.coolT / 0.7));
    }
    this.uniforms.uCenter.value.copy(center);
    this.uniforms.uTableY.value = tableY;
  }
}
