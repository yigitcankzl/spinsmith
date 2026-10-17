/**
 * The look of every sign, card and button, in two panel styles and four type sizes.
 * - PLATE (things you pinch): machined graphite with an engraved label, laid back at SIGN_TILT.
 * - GLASS (things you only read: the message card, the match bar): dark tinted glass, one thin edge.
 * Colour: orange is you, the selected tab and the one action to take now; cyan is the rival only;
 * gold (GUIDE) is the first session's teaching only; everything else is steel and white.
 */
import { CanvasTexture, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, Shape, SRGBColorSpace } from '@iwsdk/core';
import { ARENA_SCALE } from './reach.js';

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

/**
 * The type scale: four sizes as angular size in dmm (1 dmm is 1 mm seen from 1 m), so a role
 * reads the same on every sign whatever its distance. Nothing is smaller than CAPTION; nothing
 * shrinks to fit (a text that does not fit wraps, or its copy is too long).
 */
export const TYPE = {
  /** Stamps (RIP!, THROWN!) and the result word only. */
  display: { dmm: 68, weight: 700, track: 0.06 },
  /** Station names, panel titles, names in the match bar, tab labels. */
  title: { dmm: 40, weight: 700, track: 0.04 },
  /** Sentences: the card's body, the order, the dial plate's message. */
  body: { dmm: 28, weight: 600, track: 0 },
  /** Section labels, units, numbers beside a bar. */
  caption: { dmm: 21, weight: 600, track: 0.08 },
} as const;
export type Role = keyof typeof TYPE;

/** Canvas px per world metre of a sign `px` canvas pixels across and `world` metres wide. */
export function pxPerM(px: number, world: number): number {
  return px / world;
}

/**
 * Sets the canvas font (and tracking) for a type role on a sign drawn at `k` canvas px per world
 * metre and seen from `dist` m. Returns the font size in canvas px.
 */
export function setType(g: CanvasRenderingContext2D, role: Role, k: number, dist: number): number {
  const t = TYPE[role];
  const px = Math.round((t.dmm * dist * k) / 1000);
  g.font = `${t.weight} ${px}px ${FONT}`;
  (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(t.track * px).toFixed(1)}px`;
  return px;
}

/**
 * Breaks text into at most `maxLines` lines no wider than `maxW` (current font), as even as possible:
 * of every way to cut it into the fewest lines that fit, the one whose widest line is narrowest,
 * never leaving a single word alone on the last line when the text has more. A text that cannot fit
 * still comes back in `maxLines` lines; fillText's maxWidth squeezes the long one.
 */
export function wrap(g: CanvasRenderingContext2D, text: string, maxW: number, maxLines = 2): string[] {
  const words = text.split(' ').filter(Boolean);
  if (words.length <= 1 || g.measureText(text).width <= maxW) return words.length ? [words.join(' ')] : [];
  const widths = new Map<string, number>();
  const width = (s: string) => {
    let w = widths.get(s);
    if (w === undefined) widths.set(s, (w = g.measureText(s).width));
    return w;
  };
  const search = (n: number, limit: number, widow: boolean): string[] | null => {
    let best: string[] | null = null;
    let bestW = Infinity;
    const cut: string[] = [];
    const walk = (start: number, left: number, widest: number) => {
      if (widest >= bestW) return;
      if (left === 1) {
        const rest = words.slice(start).join(' ');
        // One word alone on the last line reads as a mistake ("your top" / "dock").
        if (widow && start === words.length - 1 && words.length > n) return;
        const w = Math.max(widest, width(rest));
        if (w <= limit && w < bestW) {
          bestW = w;
          best = [...cut, rest];
        }
        return;
      }
      for (let end = start + 1; end <= words.length - (left - 1); end++) {
        const line = words.slice(start, end).join(' ');
        const w = width(line);
        if (w > limit) break;
        cut.push(line);
        walk(end, left - 1, Math.max(widest, w));
        cut.pop();
      }
    };
    walk(0, n, 0);
    return best;
  };
  const most = Math.min(maxLines, words.length);
  for (let n = 2; n <= most; n++) {
    const fit = search(n, maxW, true) ?? search(n, maxW, false);
    if (fit) return fit;
  }
  return search(most, Infinity, true) ?? search(most, Infinity, false) ?? [text];
}

/** A sign's texture: sRGB, mipmapped and filtered at grazing angles (most signs are seen tipped back). */
export function signTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * Every sign in the touch band (station names, tabs, the menu, the workshop's actions, the level
 * plate) leans back this far from upright (radians): one pitch for all of them, laid toward a
 * seated player's eyes looking down at the near rim.
 */
export const SIGN_TILT = 1.0;
/** Slab depths in world metres: a plate is 8 mm thick, a glass card 4 mm. */
export const PLATE_DEPTH = 0.008;
export const GLASS_DEPTH = 0.004;

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
 * Paints a glass panel filling the canvas: tinted fill, a soft sheen from the top and one thin
 * edge. No accents, no rivets: glass is for reading (the message card, the match bar), never touched.
 */
export function glass(g: CanvasRenderingContext2D, w: number, h: number, fill = GLASS) {
  const c = Math.min(w, h) * 0.08;
  const m = 2;
  g.clearRect(0, 0, w, h);
  chamfer(g, m, m, w - 2 * m, h - 2 * m, c);
  g.fillStyle = fill;
  g.fill();
  const sheen = g.createLinearGradient(0, 0, 0, h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.06)');
  sheen.addColorStop(0.4, 'rgba(255,255,255,0)');
  g.fillStyle = sheen;
  g.fill();
  g.strokeStyle = 'rgba(160, 190, 230, 0.35)';
  g.lineWidth = 2;
  g.stroke();
}

/** Spaced capitals with a soft shadow: the SpinSmith title. */
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
  g.shadowColor = 'rgba(0, 0, 0, 0.6)';
  g.shadowBlur = 10;
  g.fillText(text, c.width / 2, c.height * 0.5);
  return new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ map: signTexture(c), transparent: true, depthWrite: false }));
}

/**
 * Paints a machined plate filling the canvas, the sign of everything you pinch: dark graphite with
 * fine brushing and a bevelled edge (light on top, dark below); a steel rivet in each corner only
 * on plates wide enough to carry them (15 cm and up). Text on it goes through engrave().
 */
export function metalPlate(g: CanvasRenderingContext2D, w: number, h: number, rivets = true) {
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
  // The touchable plate family belongs to the forge: brass perimeter, steel face. Read-only glass
  // keeps its cool blue edge, so the player can tell what can be pinched before reading it.
  g.strokeStyle = 'rgba(201,154,80,0.72)';
  g.lineWidth = 2;
  g.stroke();
  if (!rivets) return;
  const r = Math.max(3, h * 0.03);
  for (const [x, y] of [[c + r * 2, c * 0.4 + r * 2], [w - c - r * 2, c * 0.4 + r * 2], [c + r * 2, h - c * 0.4 - r * 2], [w - c - r * 2, h - c * 0.4 - r * 2]]) {
    const metal = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    metal.addColorStop(0, '#ffffff');
    metal.addColorStop(0.45, '#c99a50');
    metal.addColorStop(1, '#4a5566');
    g.fillStyle = metal;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

/**
 * Text engraved into a metal plate: a dark cut with a light lower lip, both sized to the type (a
 * fixed pixel would vanish on a fine canvas); color for filled (hot) text. maxW squeezes a line
 * that would not fit instead of letting it run off the plate.
 */
export function engrave(g: CanvasRenderingContext2D, text: string, x: number, y: number, color = STEEL, maxW?: number) {
  const px = parseFloat(/([\d.]+)px/.exec(g.font)?.[1] ?? '40');
  const d = Math.max(1, px * 0.025);
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillText(text, x, y + d * 1.5, maxW);
  g.fillStyle = 'rgba(0,0,0,0.7)';
  g.fillText(text, x, y - d, maxW);
  g.fillStyle = color;
  g.fillText(text, x, y, maxW);
}

/**
 * A name plate in the touch band: a small metal PLATE sized to its words, a TITLE line and an
 * optional CAPTION line under it, on a canvas sharp enough for arm's length. Redraws only on change.
 * `width` x `height` (in its parent's units, `scale` world metres each) is the most it can take.
 */
export class Nameplate {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private slab: Mesh;
  private key = '';
  private readonly k: number;

  constructor(
    readonly width: number,
    readonly height: number,
    /** Seen from about this far (m): sets the type's pixel size. */
    private readonly dist = 0.55,
    scale = ARENA_SCALE,
  ) {
    this.canvas.width = 768;
    this.canvas.height = Math.round((768 * height) / width);
    this.k = pxPerM(768, width * scale);
    this.tex = signTexture(this.canvas);
    this.mesh = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.slab = addSlab(this.mesh, width, height, 0.06, PLATE_DEPTH / scale);
  }

  set(title: string, sub = '', color = TEXT) {
    const key = `${title}|${sub}|${color}`;
    if (key === this.key) return;
    this.key = key;
    const g = this.canvas.getContext('2d')!;
    const W = this.canvas.width;
    const H = this.canvas.height;
    g.clearRect(0, 0, W, H);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const sp = sub ? setType(g, 'caption', this.k, this.dist) : 0;
    const sw = sub ? g.measureText(sub).width : 0;
    const tp = setType(g, 'title', this.k, this.dist);
    const tw = g.measureText(title).width;
    // The plate hugs its words, with a margin of about half a letter.
    const pad = tp * 0.5;
    const pw = Math.min(W, Math.max(tw, sw) + 2 * pad);
    const tH = tp * 1.15;
    const sH = sub ? sp * 1.3 : 0;
    const ph = Math.min(H, tH + sH + pad * 0.7);
    g.save();
    g.translate((W - pw) / 2, (H - ph) / 2);
    metalPlate(g, pw, ph, false);
    g.restore();
    const top = (H - tH - sH) / 2;
    engrave(g, title, W / 2, top + tH / 2 + tp * 0.04, color, pw - pad);
    if (sub) {
      setType(g, 'caption', this.k, this.dist);
      engrave(g, sub, W / 2, top + tH + sH / 2, STEEL, pw - pad);
    }
    // The slab under it follows the painted plate.
    this.slab.scale.set(pw / W, ph / H, 1);
    this.tex.needsUpdate = true;
  }
}

/**
 * A one-line name plate (part names, station names, QUENCH TO SAVE): `width` across, a quarter of
 * that tall, seen from about `dist` m. Its Nameplate is in userData.plate, for a later rename.
 */
export function tag(text: string, width: number, dist = 0.5): Mesh {
  const plate = new Nameplate(width, width / 4, dist);
  plate.set(text);
  plate.mesh.userData.plate = plate;
  return plate.mesh;
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
