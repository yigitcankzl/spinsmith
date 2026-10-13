// Runs the hand-driver steps in .drive.json on the running game (dev): see scripts/drive.sh.
// With .drive-video set (a path), the game's canvas is recorded while the steps run (MediaRecorder,
// then ffmpeg) into that MP4.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export default async function run({ page, frame, workspaceRoot }) {
  const steps = JSON.parse(readFileSync(join(workspaceRoot, '.drive.json'), 'utf8'));
  const videoFile = join(workspaceRoot, '.drive-video');
  const video = existsSync(videoFile) ? readFileSync(videoFile, 'utf8').trim() : '';
  const capture = {
    width: Number(process.env.DRIVE_VIDEO_WIDTH ?? 1920),
    height: Number(process.env.DRIVE_VIDEO_HEIGHT ?? 1080),
    fps: Number(process.env.DRIVE_VIDEO_FPS ?? 60),
    bitrate: Number(process.env.DRIVE_VIDEO_BITRATE ?? 24_000_000),
    crf: String(process.env.DRIVE_VIDEO_CRF ?? 12),
    preset: String(process.env.DRIVE_VIDEO_PRESET ?? 'slow'),
  };
  // The game runs in the app frame; find the one with the driver.
  let target = null;
  for (const f of [frame, ...page.frames()].filter(Boolean)) {
    if (await f.evaluate(() => typeof window.drive === 'object').catch(() => false)) {
      target = f;
      break;
    }
  }
  if (!target) throw new Error('window.drive not found: is this a dev build in XR?');
  if (!video) return target.evaluate((s) => window.drive.run(s), steps);

  // Calibrate both emulated hands before recording so the clip opens on a settled natural pose,
  // not on the driver's one-time open/closed measurements.
  await target.evaluate(() => window.drive.prepare());

  // Records what the player sees: the emulator's room (canvas z 1) with the game drawn over it
  // (canvas z 2), composited each frame; the emulator's gizmos and panels (z 3) are left out.
  const started = await target.evaluate((settings) => {
    const byZ = (z) => [...document.querySelectorAll('canvas')].find((c) => c.style.zIndex === z);
    const room = byZ('1');
    const game = byZ('2');
    if (!room || !game) return 'canvases not found';
    const out = document.createElement('canvas');
    out.width = settings.width;
    out.height = settings.height;
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    const drawCover = (source) => {
      const sourceAspect = source.width / source.height;
      const outputAspect = out.width / out.height;
      let sx = 0;
      let sy = 0;
      let sw = source.width;
      let sh = source.height;
      if (sourceAspect > outputAspect) {
        sw = source.height * outputAspect;
        sx = (source.width - sw) * 0.5;
      } else if (sourceAspect < outputAspect) {
        sh = source.width / outputAspect;
        sy = (source.height - sh) * 0.5;
      }
      g.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);
    };
    let on = true;
    const draw = () => {
      if (!on) return;
      g.clearRect(0, 0, out.width, out.height);
      drawCover(room);
      drawCover(game);
      requestAnimationFrame(draw);
    };
    draw();
    // With the game's sound when it can be tapped.
    const stream = out.captureStream(settings.fps);
    const sound = window.__audioTap?.();
    for (const t of sound?.getAudioTracks() ?? []) stream.addTrack(t);
    const rec = new MediaRecorder(stream, {
      mimeType: sound ? 'video/webm;codecs=vp9,opus' : 'video/webm;codecs=vp9',
      videoBitsPerSecond: settings.bitrate,
    });
    const parts = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.start(500);
    const source = {
      room: [room.width, room.height],
      game: [game.width, game.height],
      output: [out.width, out.height],
    };
    window.__rec = { rec, parts, source, stop: () => (on = false) };
    return { ok: true, source };
  }, capture);
  if (!started?.ok) throw new Error(String(started));
  let result;
  try {
    result = await target.evaluate((s) => window.drive.run(s), steps);
    await new Promise((r) => setTimeout(r, 300));
  } finally {
    await target.evaluate(
      () =>
        new Promise((done) => {
          const { rec, parts, stop } = window.__rec;
          stop();
          rec.onstop = async () => {
            const buf = new Uint8Array(await new Blob(parts, { type: 'video/webm' }).arrayBuffer());
            let bin = '';
            for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
            window.__rec.b64 = btoa(bin);
            done();
          };
          rec.stop();
        }),
    );
  }
  // Fetched in slices: a script result is limited to about 1 MB.
  const size = await target.evaluate(() => window.__rec.b64.length);
  let b64 = '';
  for (let at = 0; at < size; at += 700000) b64 += await target.evaluate(([a, n]) => window.__rec.b64.slice(a, a + n), [at, 700000]);
  await target.evaluate(() => delete window.__rec);
  const webm = `${video}.webm`;
  writeFileSync(webm, Buffer.from(b64, 'base64'));
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', webm,
    '-c:v', 'libx264', '-crf', capture.crf, '-preset', capture.preset, '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-r', String(capture.fps),
    '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', video,
  ]);
  rmSync(webm);
  return { video, mb: +(b64.length * 0.75 / 1e6).toFixed(1), source: started.source, state: result };
}
