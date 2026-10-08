import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  TorusGeometry,
  Vector2,
} from '@iwsdk/core';
/** The shell is modelled around a 15 cm arena and scaled to the arena in play. */
const ARENA_RADIUS = 0.15;

export const FORGE_SHELL_HEIGHT = 0.08;

// Graphite, not mauve: the forge's machine color (the darkest large surface stays above #26282d, so passthrough never shows a hole).
const iron = new MeshStandardMaterial({ color: 0x5b5f69, metalness: 0.45, roughness: 0.5 });
const darkIron = new MeshStandardMaterial({ color: 0x41444b, metalness: 0.4, roughness: 0.55 });
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
const body = new Mesh(
  new LatheGeometry(
    // Listed bottom to top so the lathe faces point outward (top to bottom renders inside-out).
    [
      new Vector2(ARENA_RADIUS + 0.02, -FORGE_SHELL_HEIGHT),
      new Vector2(ARENA_RADIUS + 0.011, -0.071),
      new Vector2(ARENA_RADIUS + 0.017, -0.057),
      new Vector2(ARENA_RADIUS + 0.022, -0.026),
      new Vector2(ARENA_RADIUS + 0.019, -0.012),
      new Vector2(ARENA_RADIUS + 0.008, -0.002),
    ],
    64,
  ),
  iron,
);
body.name = 'ForgedPlinth';
root.add(body);

// The rim's three layers are the dark body, the arena's metal lip and one accent light inside it,
// so the collar and trims stay dark here.
const topCollar = new Mesh(
  new TorusGeometry(ARENA_RADIUS + 0.013, 0.004, 8, 64).rotateX(Math.PI / 2),
  darkIron,
);
topCollar.name = 'TopCollar';
topCollar.position.y = -0.01;
root.add(topCollar);


const clampGeo = new BoxGeometry(0.022, 0.042, 0.016);
// Shallow enough to stay inside the lathe body (only the clamps stand proud of it).
const shoulderGeo = new BoxGeometry(0.032, 0.007, 0.012);
const boltGeo = new CylinderGeometry(0.0024, 0.0024, 0.003, 10).rotateX(Math.PI / 2);
const portGeo = new CircleGeometry(0.0065, 20);

for (let i = 0; i < 8; i++) {
  const frame = new Group();
  frame.name = `RadialClamp_${i + 1}`;
  frame.rotation.y = (i / 8) * Math.PI * 2;

  const clamp = new Mesh(clampGeo, darkIron);
  clamp.name = 'ClampBody';
  clamp.position.set(0, -0.039, ARENA_RADIUS + 0.021);
  const shoulder = new Mesh(shoulderGeo, iron);
  shoulder.name = 'Shoulder';
  shoulder.position.set(0, -0.015, ARENA_RADIUS + 0.014);
  frame.add(clamp, shoulder);

  // The launch ports take the bolts' place on the front and back clamps.
  for (const x of i === 0 || i === 4 ? [] : [-0.006, 0.006]) {
    const bolt = new Mesh(boltGeo, iron);
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
