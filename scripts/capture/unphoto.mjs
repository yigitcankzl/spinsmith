// Undoes the hub's one-way photo mode (prepare-room's shot.mjs sets it) so a capture shows the
// whole home: the comfort dial, the brawl pegs, the reset plate and the board.
export default async function run({ page, frame }) {
  for (const f of [frame, ...page.frames()].filter(Boolean)) {
    const ok = await f.evaluate(() => {
      const g = window.__game;
      if (!g) return false;
      g.photo = false;
      const h = g.hub;
      h.photoMode = false;
      h.board.mesh.visible = true;
      for (const it of h.items) if (['reset', 'comfort', 'comfortToggle', 'brawl'].includes(it.action.kind)) it.model.visible = true;
      return true;
    }).catch(() => false);
    if (ok) return { photo: false };
  }
  throw new Error('game not found');
}
