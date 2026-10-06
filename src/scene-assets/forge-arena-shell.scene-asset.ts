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

const iron = new MeshStandardMaterial({ color: 0x51464a, metalness: 0.62, roughness: 0.5 });
const darkIron = new MeshStandardMaterial({ color: 0x242027, metalness: 0.58, roughness: 0.62 });
const brass = new MeshStandardMaterial({ color: 0xc4873b, metalness: 0.78, roughness: 0.34 });
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

const topCollar = new Mesh(
  new TorusGeometry(ARENA_RADIUS + 0.013, 0.004, 8, 64).rotateX(Math.PI / 2),
  brass,
);
topCollar.name = 'TopCollar';
topCollar.position.y = -0.01;
root.add(topCollar);

const emberBand = new Mesh(
  new TorusGeometry(ARENA_RADIUS + 0.014, 0.0022, 6, 64).rotateX(Math.PI / 2),
  ember,
);
emberBand.name = 'EmberBand';
emberBand.position.y = -0.064;
emberBand.userData.iwsdkPreviewBounds = 'exclude';
root.add(emberBand);

const clampGeo = new BoxGeometry(0.022, 0.042, 0.016);
const shoulderGeo = new BoxGeometry(0.032, 0.007, 0.029);
const boltGeo = new CylinderGeometry(0.0024, 0.0024, 0.003, 10).rotateX(Math.PI / 2);
const portGeo = new CircleGeometry(0.009, 20);

for (let i = 0; i < 8; i++) {
  const frame = new Group();
  frame.name = `RadialClamp_${i + 1}`;
  frame.rotation.y = (i / 8) * Math.PI * 2;

  const clamp = new Mesh(clampGeo, darkIron);
  clamp.name = 'ClampBody';
  clamp.position.set(0, -0.039, ARENA_RADIUS + 0.021);
  const shoulder = new Mesh(shoulderGeo, brass);
  shoulder.name = 'Shoulder';
  shoulder.position.set(0, -0.015, ARENA_RADIUS + 0.014);
  frame.add(clamp, shoulder);

  for (const x of [-0.006, 0.006]) {
    const bolt = new Mesh(boltGeo, brass);
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
