/**
 * The arena lights your desk: a see-through black shell around the head dims the real room
 * (passthrough shows less where it is darker, as Meta's passthrough lighting guidance suggests),
 * leaving a pool of light on the table around the arena. Virtual things nearer than the shell are
 * never dimmed. It does nothing with passthrough off: the effect is the real room.
 */
import { BackSide, Color, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from '@iwsdk/core';
import { TUNE } from './tuning.js';

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
  };
  private readonly warm = new Color(0.16, 0.06, 0.0);

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
          '#include <common>\nvarying vec3 vRoomWorld;\nuniform float uDim;\nuniform vec3 uTint;\nuniform vec3 uCenter;\nuniform float uTableY;\nuniform float uR0;\nuniform float uR1;',
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
    a = uDim * smoothstep(uR0, uR1, distance(hit.xz, uCenter.xz));
  }
  gl_FragColor = vec4(uTint * a, a);`,
        );
    };
    this.mesh = new Mesh(new SphereGeometry(2.5, 24, 12), material);
    // Drawn before the other see-through things (labels, plates), so they are never dimmed.
    this.mesh.renderOrder = -5;
    this.mesh.frustumCulled = false;
  }

  /** A hard hit: the room flashes warm for a moment. */
  hit() {
    this.flash = 1;
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
    this.uniforms.uCenter.value.copy(center);
    this.uniforms.uTableY.value = tableY;
  }
}
