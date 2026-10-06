/**
 * The look of every panel, card and button: dark tinted glass with cut corners, thin glowing edges
 * (orange for SpinSmith, cyan as the second accent) and light, spaced lettering.
 */
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from '@iwsdk/core';

export const GLASS = 'rgba(9, 13, 21, 0.86)';
export const GLASS_LIGHT = 'rgba(22, 30, 44, 0.9)';
export const ORANGE = '#ff8a2a';
export const CYAN = '#4fd1ff';
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
 * Paints a glass panel filling the canvas: tinted fill, a faint grid, a thin edge, and short
 * bright accents on two opposite corners.
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
  // A faint grid.
  g.save();
  g.clip();
  g.strokeStyle = 'rgba(120, 160, 220, 0.06)';
  g.lineWidth = 1;
  const step = Math.max(24, Math.round(h / 14));
  for (let x = 0; x < w; x += step) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
  }
  for (let y = 0; y < h; y += step) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  g.restore();
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
  g.font = `800 ${Math.round(c.height * 0.58)}px system-ui, sans-serif`;
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
