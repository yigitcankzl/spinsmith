/**
 * The look of every panel, card and button: dark tinted glass with cut corners, thin glowing edges
 * (orange for SpinSmith and the player, steel for neutral UI; cyan is kept for the rival) and light, spaced lettering.
 */
import { CanvasTexture, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, Shape, SRGBColorSpace } from '@iwsdk/core';

/** The one display font of every panel, card and label (Rajdhani, SIL OFL, in public/fonts). */
export const FONT = 'Rajdhani, system-ui, sans-serif';

/**
 * Loads the display font before anything is drawn: canvas text drawn earlier would silently fall
 * back to the system font. Resolves even if the font fails to load.
 */
export async function loadFonts() {
  const base = import.meta.env.BASE_URL;
  const faces = [
    new FontFace('Rajdhani', `url(${base}fonts/Rajdhani-SemiBold.woff2)`, { weight: '600' }),
    new FontFace('Rajdhani', `url(${base}fonts/Rajdhani-Bold.woff2)`, { weight: '700' }),
  ];
  await Promise.all(faces.map((f) => f.load().then((loaded) => document.fonts.add(loaded)).catch(() => undefined)));
}

export const GLASS = 'rgba(9, 13, 21, 0.9)';
export const GLASS_LIGHT = 'rgba(22, 30, 44, 0.9)';
export const ORANGE = '#ff8a2a';
/** Every teaching visual (ghost hand, beacon, path, rip arrows, launch zone): one pale gold, never your team orange. */
export const GUIDE = 0xffd23a;
/** Cyan belongs to the rival; neutral UI accents use steel. */
export const CYAN = '#4fd1ff';
export const STEEL = '#c9d3e0';
export const TEXT = '#eef3fa';
export const TEXT_DIM = '#8f9bb0';

/** A rectangle with its corners cut at 45 degrees (c = cut size). */
export function chamfer(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: number) {
  g.beginPath();
  g.moveTo(x + c, y);
  g.lineTo(x + w - c, y);
  g.lineTo(x + w, y + c);
  g.lineTo(x + w, y + h - c);
  g.lineTo(x + w - c, y + h);
  g.lineTo(x + c, y + h);
  g.lineTo(x, y + h - c);
  g.lineTo(x, y + c);
  g.closePath();
}

/**
 * Paints a glass panel filling the canvas: tinted fill, a soft sheen, a thin edge, short bright
 * accents on two opposite corners and a steel rivet in each of the other two. Every SpinSmith
 * sign (match bar, notes, cards, buttons) is this panel.
 */
export function glass(g: CanvasRenderingContext2D, w: number, h: number, accent = ORANGE, fill = GLASS) {
  const c = Math.min(w, h) * 0.08;
  const m = 4;
  g.clearRect(0, 0, w, h);
  chamfer(g, m, m, w - 2 * m, h - 2 * m, c);
  g.fillStyle = fill;
  g.fill();
  // A soft sheen from the top.
  const sheen = g.createLinearGradient(0, 0, 0, h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.07)');
  sheen.addColorStop(0.4, 'rgba(255,255,255,0)');
  g.fillStyle = sheen;
  g.fill();
  chamfer(g, m, m, w - 2 * m, h - 2 * m, c);
  g.strokeStyle = 'rgba(160, 190, 230, 0.35)';
  g.lineWidth = 2;
  g.stroke();
  // Corner accents.
  g.strokeStyle = accent;
  g.lineWidth = Math.max(3, h * 0.012);
  g.shadowColor = accent;
  g.shadowBlur = 12;
  g.beginPath();
  g.moveTo(m, m + c + h * 0.18);
  g.lineTo(m, m + c);
  g.lineTo(m + c, m);
  g.lineTo(m + c + w * 0.18, m);
  g.moveTo(w - m, h - m - c - h * 0.18);
  g.lineTo(w - m, h - m - c);
  g.lineTo(w - m - c, h - m);
  g.lineTo(w - m - c - w * 0.18, h - m);
  g.stroke();
  g.shadowBlur = 0;
  const r = Math.max(3, h * 0.022);
  for (const [x, y] of [[w - m - c * 0.9, m + c * 0.9], [m + c * 0.9, h - m - c * 0.9]]) {
    const metal = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    metal.addColorStop(0, '#ffffff');
    metal.addColorStop(0.45, STEEL);
    metal.addColorStop(1, '#4a5566');
    g.fillStyle = metal;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

/** A plane of the given size (m) showing a glass panel. */
export function glassMesh(width: number, height: number, accent = ORANGE, px = 1024): Mesh {
  const c = document.createElement('canvas');
  c.width = px;
  c.height = Math.round((px * height) / width);
  glass(c.getContext('2d')!, c.width, c.height, accent);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
}

/** Spaced capitals, glowing, with an orange underline: the SpinSmith title. */
export function titleMesh(text: string, width: number, height: number): Mesh {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = Math.round((1024 * height) / width);
  const g = c.getContext('2d')!;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${Math.round(c.height * 0.58)}px ${FONT}`;
  (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Math.round(c.height * 0.18)}px`;
  g.fillStyle = TEXT;
  g.shadowColor = 'rgba(120, 190, 255, 0.6)';
  g.shadowBlur = 18;
  g.fillText(text, c.width / 2, c.height * 0.42);
  g.shadowColor = ORANGE;
  g.shadowBlur = 16;
  g.fillStyle = ORANGE;
  g.fillRect(c.width * 0.3, c.height * 0.84, c.width * 0.4, Math.max(4, c.height * 0.05));
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
}

/**
 * Paints a machined plate filling the canvas, the forge's sign language: dark graphite with fine
 * brushing, a bevelled edge (light on top, dark below) and a steel rivet in each corner. Text on it
 * goes through engrave().
 */
export function metalPlate(g: CanvasRenderingContext2D, w: number, h: number) {
  const c = Math.min(w, h) * 0.06;
  g.clearRect(0, 0, w, h);
  chamfer(g, 2, 2, w - 4, h - 4, c);
  const body = g.createLinearGradient(0, 0, 0, h);
  body.addColorStop(0, '#3a3f48');
  body.addColorStop(1, '#23272e');
  g.fillStyle = body;
  g.fill();
  g.save();
  g.clip();
  // Brushing: faint horizontal strokes.
  for (let y = 0; y < h; y += 3) {
    g.fillStyle = `rgba(255,255,255,${0.012 + 0.018 * ((y * 7919) % 13) / 13})`;
    g.fillRect(0, y, w, 1);
  }
  g.restore();
  // Bevel: light along the top edge, dark along the bottom.
  g.lineWidth = Math.max(2, h * 0.012);
  g.strokeStyle = 'rgba(255,255,255,0.28)';
  g.beginPath();
  g.moveTo(2 + c, 3);
  g.lineTo(w - 2 - c, 3);
  g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.beginPath();
  g.moveTo(2 + c, h - 3);
  g.lineTo(w - 2 - c, h - 3);
  g.stroke();
  chamfer(g, 2, 2, w - 4, h - 4, c);
  g.strokeStyle = 'rgba(150,160,175,0.5)';
  g.lineWidth = 2;
  g.stroke();
  const r = Math.max(3, h * 0.03);
  for (const [x, y] of [[c + r * 2, c * 0.4 + r * 2], [w - c - r * 2, c * 0.4 + r * 2], [c + r * 2, h - c * 0.4 - r * 2], [w - c - r * 2, h - c * 0.4 - r * 2]]) {
    const metal = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    metal.addColorStop(0, '#ffffff');
    metal.addColorStop(0.45, STEEL);
    metal.addColorStop(1, '#4a5566');
    g.fillStyle = metal;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

/** Text engraved into a metal plate: a dark cut with a light lower lip; color for filled (hot) text. */
export function engrave(g: CanvasRenderingContext2D, text: string, x: number, y: number, color = '#c9d3e0') {
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillText(text, x, y + 1.5);
  g.fillStyle = 'rgba(0,0,0,0.7)';
  g.fillText(text, x, y - 1);
  g.fillStyle = color;
  g.fillText(text, x, y);
}

/** A slab material: graphite whose glancing edges catch a warm rim light, like machined metal. */
export function slabMaterial(): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: 0x2b2f37, metalness: 0.6, roughness: 0.28 });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float rimLight = pow(1.0 - saturate(abs(dot(normalize(vNormal), normalize(vViewPosition)))), 3.0);
      outgoingLight += vec3(1.0, 0.62, 0.32) * rimLight * 0.55;
      #include <opaque_fragment>`,
    );
  };
  m.customProgramCacheKey = () => 'slab-rim';
  return m;
}
const SLAB = slabMaterial();

/**
 * Gives a sign a body: its cut-corner outline as a bevelled graphite slab `depth` thick, set just
 * behind the sign's plane (added as its child, so it follows the sign). A sign seen from the side
 * reads as a machined plate, not a sheet of paper. `cut` is the corner cut as a share of the
 * shorter side (the canvas panels use 0.08 for glass, 0.06 for metal).
 */
export function addSlab(sign: Object3D, width: number, height: number, cut = 0.08, depth = 0.005): Mesh {
  const c = Math.min(width, height) * cut;
  const b = Math.min(depth * 0.4, Math.min(width, height) * 0.04);
  // Inset by the bevel so the bevelled edge lines up with the painted outline.
  const w = width / 2 - b;
  const h = height / 2 - b;
  const k = Math.max(0, c - b * 0.6);
  const shape = new Shape();
  shape.moveTo(-w + k, h);
  shape.lineTo(w - k, h);
  shape.lineTo(w, h - k);
  shape.lineTo(w, -h + k);
  shape.lineTo(w - k, -h);
  shape.lineTo(-w + k, -h);
  shape.lineTo(-w, -h + k);
  shape.lineTo(-w, h - k);
  shape.closePath();
  const geo = new ExtrudeGeometry(shape, { depth: depth - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 1 });
  // Its front face just behind the sign.
  geo.translate(0, 0, -depth + b - 0.0004);
  const slab = new Mesh(geo, SLAB);
  slab.name = 'slab';
  sign.add(slab);
  return slab;
}

/**
 * Stands a plate on the table: a graphite post from its lower edge straight down `length` (in the
 * plate's own units) to a round foot. `tilt` is the plate's lean back (its rotation about X), undone
 * so the post stays upright.
 */
export function addStem(sign: Object3D, height: number, length: number, tilt = 0) {
  const pivot = new Group();
  pivot.position.set(0, -height * 0.45, -0.004);
  pivot.rotation.x = -tilt;
  const stem = new Mesh(new CylinderGeometry(0.0028, 0.0034, length, 10), SLAB);
  stem.position.y = -length / 2;
  const foot = new Mesh(new CylinderGeometry(0.011, 0.013, 0.004, 20), SLAB);
  foot.position.y = -length + 0.002;
  pivot.add(stem, foot);
  sign.add(pivot);
}
