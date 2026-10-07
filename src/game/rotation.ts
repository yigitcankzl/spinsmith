/**
 * Which arena the next match is played in, when the player has not pinned one: a newly unlocked
 * arena first (so a level-up shows its new arena at once), else the rival's home arena unless it
 * was just played, else the arena played longest ago. No three.js or DOM here.
 */

/** Each rival's home: the arena that suits its style. */
export const RIVAL_HOME: Record<string, string> = {
  'Rim Raider': 'Frost Oval',
  'Iron Keep': 'Sumo Square',
  Drifter: 'Zero-G Dish',
  Leech: 'Forge Bowl',
  Hookjaw: 'Ember Ring',
  Sawtooth: 'Clockwork Spire',
  Bastion: 'Zero-G Dish',
};

/**
 * `open`: the arenas the player can play, in unlock order. `recent`: arenas played, most recent
 * first. `played`: every arena played at least once.
 */
export function nextArena(open: string[], recent: string[], played: string[], rival: string): string {
  const fresh = open.find((a) => !played.includes(a));
  if (fresh) return fresh;
  const home = RIVAL_HOME[rival];
  if (home && open.includes(home) && recent[0] !== home) return home;
  // The one played longest ago (never-recent ones count as oldest).
  let best = open[0];
  let bestAge = -1;
  for (const a of open) {
    const i = recent.indexOf(a);
    const age = i < 0 ? Infinity : i;
    if (age > bestAge && a !== recent[0]) {
      best = a;
      bestAge = age;
    }
  }
  return best;
}
