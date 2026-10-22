import {
  AdditiveBlending,
  BufferAttribute,
  CircleGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
  Vector2,
} from '@iwsdk/core';
import { bevelBox, BRASS, GRAPHITE, GUNMETAL, SHELL_PAINT } from '../game/materials.js';
/** The shell is modelled around a 15 cm arena and scaled to the arena in play. */
const ARENA_RADIUS = 0.15;

export const FORGE_SHELL_HEIGHT = 0.08;

// The machine body (materials.ts): matte hammered graphite, with machined collar and clamps in the
// same color and brass bolts. The arena floor inside is clearly lighter steel.
const ember = new MeshBasicMaterial({
  color: 0xff5a24,
  transparent: true,
  opacity: 0.9,
  blending: AdditiveBlending,
  depthWrite: false,
});

const root = new Group();
root.name = 'ForgeArenaShell';

// One continuous, weighty silhouette: broad shoulder, inset waist and flared foot.
// Listed bottom to top so the lathe faces point outward (top to bottom renders inside-out).
const profile = [
  new Vector2(ARENA_RADIUS + 0.02, -FORGE_SHELL_HEIGHT),
  new Vector2(ARENA_RADIUS + 0.011, -0.071),
  new Vector2(ARENA_RADIUS + 0.017, -0.057),
  new Vector2(ARENA_RADIUS + 0.022, -0.026),
  new Vector2(ARENA_RADIUS + 0.019, -0.012),
  new Vector2(ARENA_RADIUS + 0.008, -0.002),
];
// Contact shading per profile point: darker where it meets the table, in the waist and under the collar.
const occlusion = [0.5, 0.72, 0.95, 1, 0.7, 0.55];
const bodyGeo = new LatheGeometry(profile, 64);
{
  const n = bodyGeo.getAttribute('position').count;
  const color = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) color.fill(occlusion[i % profile.length], i * 3, i * 3 + 3);
  bodyGeo.setAttribute('color', new BufferAttribute(color, 3));
}
const body = new Mesh(bodyGeo, SHELL_PAINT);
body.name = 'ForgedPlinth';
root.add(body);

// The rim's three layers are the dark body, the arena's metal lip and one accent light inside it,
// so the collar and trims stay dark here.
const topCollar = new Mesh(
  new TorusGeometry(ARENA_RADIUS + 0.013, 0.004, 8, 64).rotateX(Math.PI / 2),
  GUNMETAL,
);
topCollar.name = 'TopCollar';
topCollar.position.y = -0.01;
root.add(topCollar);

// One continuous brass compression belt turns the silhouette from a dark generic pedestal into a
// forge machine. It sits on the waist, where the outer clamps visibly transfer their load.
const compressionBand = new Mesh(
  new TorusGeometry(ARENA_RADIUS + 0.0165, 0.0026, 8, 64).rotateX(Math.PI / 2),
  BRASS,
);
compressionBand.name = 'BrassCompressionBand';
compressionBand.position.y = -0.057;
root.add(compressionBand);

// A recessed heat seam under the shoulder separates the black iron body from the polished collar.
const heatSeam = new Mesh(
  new TorusGeometry(ARENA_RADIUS + 0.0182, 0.0011, 6, 64).rotateX(Math.PI / 2),
  ember,
);
heatSeam.name = 'EmberShoulderSeam';
heatSeam.position.y = -0.022;
root.add(heatSeam);


const clampGeo = bevelBox(0.022, 0.042, 0.016, 0.0015);
// Shallow enough to stay inside the lathe body (only the clamps stand proud of it).
const shoulderGeo = bevelBox(0.032, 0.007, 0.012, 0.0012);
const boltGeo = new CylinderGeometry(0.0024, 0.0024, 0.003, 10).rotateX(Math.PI / 2);
const portGeo = new CircleGeometry(0.0065, 20);

for (let i = 0; i < 8; i++) {
  const frame = new Group();
  frame.name = `RadialClamp_${i + 1}`;
  frame.rotation.y = (i / 8) * Math.PI * 2;

  const clamp = new Mesh(clampGeo, GUNMETAL);
  clamp.name = 'ClampBody';
  clamp.position.set(0, -0.039, ARENA_RADIUS + 0.021);
  const shoulder = new Mesh(shoulderGeo, GRAPHITE);
  shoulder.name = 'Shoulder';
  shoulder.position.set(0, -0.015, ARENA_RADIUS + 0.014);
  frame.add(clamp, shoulder);

  // The launch ports take the bolts' place on the front and back clamps.
  for (const x of i === 0 || i === 4 ? [] : [-0.006, 0.006]) {
    const bolt = new Mesh(boltGeo, BRASS);
    bolt.name = 'Bolt';
    bolt.position.set(x, -0.039, ARENA_RADIUS + 0.03);
    frame.add(bolt);
  }

  // The front/back ports make the two launch axes readable before a round begins.
  if (i === 0 || i === 4) {
    const port = new Mesh(portGeo, ember);
    port.name = 'LaunchPort';
    port.position.set(0, -0.039, ARENA_RADIUS + 0.0305);
    frame.add(port);
  }
  root.add(frame);
}

export default root;
