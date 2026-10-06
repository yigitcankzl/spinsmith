# SpinSmith: action plan to Nov 18, 2026

Written Oct 7, 2026, from `docs/COMPETITION-REVIEW.md` after checking it against the code.
Deadline: **Wed Nov 18, 2026, 12:00 PT** (20:00 UTC, 23:00 Turkey time; US daylight saving ends
Nov 1, so PT is UTC-8). No Quest is in hand yet and its arrival date is unknown.

Checks run today (read-only): `npm run typecheck` passes. `npm run check:sim` passes (type loop
0.70 / 0.57 / 0.57). `npm run report:shaping` matches the review exactly: none 46%, random 47%,
pushOut 57% (2.8 shapes per round, median 15.6 s, own KO 6%), centerWell 51%. The existing
`dist/` holds a 2.50 MB main chunk, a 456 KB MSDF worker and a 423 KB Inter font chunk.

Geometry used below: the arena root sits `REACH` 0.6 m ahead of the eyes (horizontal), at
`ARENA_SCALE` 2, and `TRAY_DROP` 0.35 m below the eyes (on a real table it is the table height
plus `PEDESTAL` 0.08 m, usually a similar drop). Arena-local units are multiplied by 2 for world
metres. "Elevation" means degrees below eye level. "dmm" means millimetres of height per metre
of distance (1 dmm = 1 mm seen from 1 m).

---

## 1. Verification of the review

| # | Review claim | Verdict | Evidence and correction |
|---|---|---|---|
| F1 | Never run on a headset; the rip is 60% from peak hand speed; near ramp grabs within 5 cm local (10 cm world); the well triggers at 4 mm | **Partly true** | The rip formula (`match-system.ts:932-935`, 0.4 x distance + 0.6 x speed) and `SHAPE_GRAB` 0.05 (`:52`) are right. The well threshold is `depth > 0.004` in **arena-local** units (`:1040-1041`), so it is **8 mm in the world**, not 4 mm. The "15-25 ms on Quest" figure is a guess: the 5.9-6.5 ms in `VISUAL-POLISH.md:102-107` was measured in IWER, which runs the emulator in the same thread, and that doc calls it uncalibrated. The risk is real; the number is not. |
| F2 | The table only sets the height; `anchors`, `hitTest`, `meshDetection` are requested but unused; there is no occlusion; a ring-out top disappears | **Confirmed** | `findTable` (`match-system.ts:798-817`) returns only a height. Feature flags are in `iwsdk.config.json` and nothing in `src/` uses anchors, hit tests or meshes. There is no depth sensing. `visuals.ts:601` `const visible = top.state !== 'out'`. Burst debris bounces only while `arena.inside()` (`visuals.ts:670`) and then falls through the table until `DEBRIS_LIFE` 2.5 s. |
| F3 | Core names, tip names, rail gear and 1/2/2 first-to-4 scoring come from Beyblade X | **Confirmed, and it understates the problem** | `parts.ts:149-152` (3-50, 4-60, 9-60, 5-80) and `:156-161` (Flat, Rush, Taper, Ball, Needle, Orb). `sim.ts:761-764` and `MATCH_POINTS = 4` (`match-system.ts:71`). The review missed four more echoes: (a) the result words are Beyblade X's official finish names, "Spin finish / Over finish / BURST" (`match-system.ts:1162-1163`); (b) two arenas have **3-point pockets** (`arenas.ts:57`, `:75`) and the workshop flips pockets between 2 and 3 (`builder.ts:580-581`), which mirrors the 3-point Xtreme finish, so the point table is 1/2/2/3 like the real one; (c) the forge's five dials ATTACK / DEFENSE / STAMINA / DASH / BURST RES (`forge.ts:652-658`) are the five stats printed on a Beyblade X box, as `TOP-CUSTOMIZATION.md:60-62` itself notes; (d) the pull label `RIP IT! 87%` (`match-system.ts:896`) echoes the franchise catchphrase. `DESIGN.md:206` says the game "does not imitate ... part names", which is false today. |
| F4 | Forge tabs sit about 22 cm and workshop tabs about 14 cm in front of the eyes, too close | **Partly true** | These are **horizontal** distances only. In 3D, from `TAB_Z` 0.19 / `TAB_Y` 0.006 (`forge.ts:107-108`) and `PLATE_Z` 0.232 / `PLATE_Y` -0.012 (`builder.ts:265-266`): forge tabs are **0.40 m (centre) to 0.45 m (outer)** from the eyes, and workshop tabs **0.40-0.44 m**. That is at or just under Meta's 42-46 cm direct-touch band, so "too close" is wrong. What is right: they sit **steeply below eye level**, about 57° (forge) and **70° (workshop)**, with the hand only 14-22 cm ahead of the eyes, so close to the chest. On a real desk the near rim (about 0.26-0.30 m ahead of the eyes) may also hang past the table edge. The review missed that the **most-used hub targets are the farthest**: the dock and the anvil (`hub.ts:61-62`) are about **0.59 m** away, inside the 0.5-0.8 m band Meta advises against. A near ramp at the arena centre needs a reach of about 0.69 m. Full table in WP6. |
| F5 | Placement is one-shot after `SETTLE` 2 s; `KeyP` only; no `reset` handler; re-entering XR keeps the old pose; planes may arrive late; pedestal drag was promised | **Confirmed** | `SETTLE` (`match-system.ts:37`), `place()` (`:778-795`), `KeyP` (`:338`), early return on `NonImmersive` (`:370`). There are no session or `reset` listeners anywhere in `src/` (grep). `DESIGN.md:166-168` promised the pedestal drag. |
| F6 | No hosting, video, cover; Pages from a private repo needs a paid plan; freeze after the deadline; keep it live until Dec 11; the video must be public | **Confirmed** | Rules: "you may not make changes or alterations to your submission" after the entry period; access "until the Winner Announcement" (on or around Dec 11); the video must be "made publicly visible on YouTube or Vimeo". `vite.config.ts` has `base: './'`, so any sub-path host works. Correction: device testing does **not** need public hosting. The dev server's LAN URL (README:159-160) or `iwsdk runtime pair-headset` over ADB is enough until the final build. |
| F7 | Saves live in `localStorage`; reset is dev-only; a second judge on the same headset skips onboarding | **Confirmed** | `progress.ts:155,180`, `forge.ts:41,48`. Reset is under `import.meta.env.DEV`, Backquote (`match-system.ts:332-336`). That reset also leaves `spinsmith.arenas.v1` (`builder.ts:45`) behind. |
| F8 | Far-rim text is about 10-12 mm at about 1 m | **Confirmed** (in em height) | Match bar: 1.6 x 0.17 x 2 = 0.544 m across 1400 px = 0.39 mm/px, 1.05 m from the eyes. Names 40 px = 14.8 dmm; Lv/XP 32 px = 11.8 dmm; rank 26 px = **9.6 dmm**. Smith's board (`board.ts:99-104`): 22-26 px = **8.6-10.1 dmm** at 1.16 m. Forge dial labels (`rim.ts:200`): 30 px = 12.9 dmm. The UI font is Rajdhani (`ui.ts:8`), which is condensed, so it reads smaller than these numbers suggest. |
| F9 | The well barely beats nothing; rival launch is random; the rival never shapes | **Confirmed** | Shaping report above. `launch()` (`match-system.ts:968-974`): rival power 0.5-0.98 and aim noise ±0.5 rad at level 1. `makeShape` is only called with the owner `'left'` or `'right'`. |
| F10 | `ArenaView.sync` every frame; match bar canvas redraws; `Label.set` during the pull; hub draw calls; bundle | **Confirmed, one item overstated** | `arenaView.sync` is called unconditionally at `match-system.ts:444`. It resamples 1,153 vertices, recolours them, calls `computeVertexNormals()` and uploads two buffers (`visuals.ts:1119-1148`), even in the hub and forge. The match bar builds a key string every frame and redraws plus re-uploads a 1400x330 texture whenever a spin percentage changes (`match-bar.ts:30-91`). `Label.set` only redraws when the integer percentage changes, on a 512x160 canvas, for about 0.3 s per rip: **low impact**. Not in the review: per-frame `JSON.stringify` change keys in `rim.ts:89,145`, `forge.ts:644`, `hub.ts:191` and `board.ts:50` (garbage, not draws). |
| F11 | The first match is 4-6 rounds, about 2-3 min, before the forge; the landing panel is generic | **Confirmed** | First to 4 at 13-30% knockouts takes about 5-7 rounds of about 28 s. The landing panel is UIKitML (`public/ui/welcome.uikitml`, `src/panel.ts`). |
| F12 | Procedural visuals, synthesized audio, no music | **Confirmed** | `audio.ts` is all synthesis. |
| F13 | Pinch at 20/35 mm OR'd with `buttons[0]`; accidental wells; ray vs direct ambiguity | **Confirmed** for the first two (`hands.ts:4-5,84,101`; `match-system.ts:1038-1041` fires a well on any fingertip below the floor while not pinching). The hub ambiguity was not checked in depth; it is a device item. |
| F14 | README contradictions; DESIGN.md stale; no LICENSE; agent folders in the repo | **Confirmed** | README:10 "first playable prototype"; README:14 "about 40 cm" (the code uses 0.6 m to the centre; 40 cm matches only the 3D distance to the tabs); README:141-142 the stale "alternates between the wide and the narrow shape"; README:144-145 says parts, pause and saving are missing, but all exist. `DESIGN.md:20,38,76,169` describe roguelike runs, Forge Energy and a palm pause. There is no `LICENSE`. `src/panel.ts` and `vite.config.ts` carry Meta's MIT header that points to a LICENSE file. The `.agents/`, `.codex/`, `.cursor/` and `.claude/` folders and `opencode.json` are present. `TOP-CUSTOMIZATION.md:17-62` maps every part to Beyblade X. That is fine as private research, but a liability if the repo is shared. |
| F15 | Come-back systems exist but are invisible in a one-day judging window | **Confirmed** | `orders.ts` seeds orders by date. `check:sim` §12 passes. |
| Rules | New Experience: built from Sep 24 | **Confirmed, safe** | The first commit is dated 2026-10-06 (`git log`). Keep the history intact as evidence. |

**Net effect on priorities.** Three corrections change the plan. Reach is a steep-angle and
table-edge problem, not a too-close problem, so the fix is a layout tune, not a redesign. The
Beyblade X overlap is wider than the review says, because of the stats dials, the finish words,
the 3-point pockets and "RIP IT!", so the rename package grows slightly. Public hosting is not
needed for device testing, so publishing can wait until the final build.

---

## 2. Decisions the developer must make

### D1. Hosting: needs your explicit OK (standing rule: no external publishing)
The rules require a judge-accessible link that stays unchanged from Nov 18 until about Dec 11, and
a public video. Nothing needs to be public before the final build.

| Option | Cost | Freeze evidence | Notes |
|---|---|---|---|
| **A. Separate public repo with only `dist/` on GitHub Pages** (e.g. `spinsmith-play`) | Free | Commit history shows nothing changed after Nov 18 | The source repo stays private. `base: './'` already works on a sub-path. Recommended. |
| B. Vercel or Netlify, prebuilt `dist/` deploy from the CLI | Free tier | Each deployment gets an immutable URL; submit the deployment URL, not an alias | No repo link needed. Check that Vercel's deployment protection is off for that URL. |
| C. GitHub Pages from the private source repo | GitHub Pro ($4 a month) | Commit history | The site is public anyway, so paying buys nothing over A. |
| D. Self-hosting | Time | Weak | Not recommended: uptime risk until Dec 11. |

**Recommendation: A.** Create the repo on Nov 9-10, push the final `dist/` on Nov 16, and tag it
`submission-2026-11-18`. Until then, test on the device over the dev server. A second OK is needed
for the **public video** on YouTube or Vimeo (rules: "publicly visible"). Do not link the private
source repo in the submission unless you also do WP13's scrub.

### D2. Original names for the Beyblade-derived terms
Display names only. **Internal ids and save keys stay** (`'4-60'`, `'flat'`, `'burst'`, `core:9-60`),
so saves, tests and reports keep working. Every name is a short smithy word and fits the ring
set (Striker, Hook, Anvil, Halo, Saw, Cog).

| Kind | Old | New | Blurb (new) |
|---|---|---|---|
| Core (low, loose) | 3-50 | **Stub** | Low: hits under, scrapes slopes |
| Core (standard) | 4-60 | **Bolt** | Standard height and lock |
| Core (tight lock) | 9-60 | **Clamp** | Locked tight: hard to shatter |
| Core (tall) | 5-80 | **Stilt** | Tall: rides over low hits |
| Tip (fast, flat) | Flat | **Chisel** | Fast and aggressive, burns spin |
| Tip (aggressive, steers) | Rush | **Spur** | Aggressive, steers better |
| Tip (balanced cone) | Taper | **Awl** | Balanced: roams, then settles |
| Tip (centre holder) | Ball | **Dome** | Holds the middle |
| Tip (stamina point) | Needle | **Pin** | Stays still, spins longest |
| Tip (drift) | Orb | **Bead** | Slow drift, long spin |
| Stamina preset | Needle | **Halo** | (the preset already uses the Halo ring) |
| Rails | dash rails | **kick rails** | "four slag pits, four kick rails" |
| Pockets | pockets | **slag pits** (in text) | |
| Forge dials | ATTACK / DEFENSE / STAMINA / DASH / BURST RES | **HIT / GUARD / ENDURE / KICK / HOLD** | |
| Finish: outspun | Spin finish | **OUTLAST** | |
| Finish: over the wall | Over finish | **THROWN** | |
| Finish: pocket | Pocket finish | **SLAG** | "YOUR RAMP → SLAG" |
| Finish: burst | BURST | **SHATTER** | Saw: "chips toward a shatter"; Sawtooth's style likewise |
| Pull label | RIP IT! 87% / Perfect rip! | **WHITE HOT 94%** / **White hot! Extra spin** | Fits the cord heating from white to orange |
| Points | points | **heat** | |

The "Stilt" and "Bead" names can change, but keep them one word and avoid numbers: numbered
cores are the Beyblade X signature. The noun "rip cord" can stay in prose. In the tagline and
video, prefer "pull" or "launch" over "rip it".

### D3. Scoring
| Option | Rule | Pros | Cons |
|---|---|---|---|
| **A. Heat, first to 3** | OUTLAST 1, any knockout (THROWN, SLAG, SHATTER) 2. Pockets always 2. | Keeps "a ramp knockout is worth more". Shorter matches (about 4-5 rounds), so the forge appears about a minute earlier. Fewer, larger pips. | Touches `arenas.ts:57,75` and the workshop's 2/3 flip. |
| B. Rounds, best of 5 | Every round is 1; the finish only changes XP and the result word | Simplest | Loses the KO incentive inside the match |
| C. Keep 1/2/2(/3), first to 5 | | Least work | Still the Beyblade X table |

**Recommendation: A.** Move `MATCH_POINTS` out of `match-system.ts` into `sim.ts` as
`export const MATCH_HEAT = 3` so the headless check can test it.

### D4. Getting a Quest
**Recommendation:** if no Quest is confirmed in hand by **Tue Oct 20**, buy a Quest 3S (or a
refurbished Quest 3) that day with the fastest delivery available. The prize band ($25k-100k) makes
this the highest-value spend of the project. Before it arrives (no device needed): enable a Meta
developer account and organisation, install `adb` (android-tools), and get OVR Metrics Tool ready.
**Last useful arrival date: Wed Nov 4**, which still leaves time for the protocol, one tuning
pass and video capture. After that, take the emulator branch (section 4).

### D5. Is the source repo shown to judges?
Not required. **Recommendation: no.** If yes, WP13 also removes the Beyblade X mapping from
`TOP-CUSTOMIZATION.md` (or moves it out of the repo) and the agent folders (`.agents/`, `.codex/`,
`.cursor/`, `opencode.json`), and adds a LICENSE.

### D6. Music
One hub loop and one win sting. Options: make them yourself, or use a CC0 or CC-BY track with
the credit in the testing notes. **Recommendation:** CC0, to avoid any IP question.

---

## 3. Work packages

Ordered by value for winning per day of effort. Sizes are focused developer time. "Criterion"
names the judging criterion (Innovation, Experience, Technical, Polish, 25% each) or the special
award it serves. Every package ends with `npm run typecheck`, `npm run check:sim`, and the
relevant `report:*` script with unchanged numbers unless the change is meant to move them.

### 3A. No Quest needed

#### WP1. Rename the terms and switch to heat scoring (1 day)
- **Serves:** Innovation ("Original, not a wrapper"), the third-party IP rule, Boldest Original Concept.
- **Changes:**
  - `parts.ts`: `name` and `blurb` of `CORES` and `TIPS`, preset name `Needle` → `Halo`, Saw blurb, `RIVALS` style for Sawtooth. Ids unchanged.
  - `forge.ts:652-658`: dial labels.
  - `match-system.ts`: `FINISH_WORD` (`:56`), the `name()` finish words (`:1162-1163`), the result line (`… +${points}` → `… +${points} heat`), the pull label (`:896`) and the perfect label (`:982`). Use `MATCH_HEAT` from `sim.ts` in `finish()` (`:1181`) and in `bar.bar(...)` (`:450`).
  - `sim.ts`: `finishPoints` returns 2 for every knockout (ignore `pocketPoints`, or clamp it to 2) and gains `export const MATCH_HEAT = 3`.
  - `arenas.ts:14,57,75`: rule text; pockets 3 → 2.
  - `builder.ts:39,580-581`: remove the 2↔3 flip (a tap on a pocket does nothing, or flips its width if that is cheap).
  - `progress.ts:97` unlock text; `progress.ts:230` (the 3-point bonus becomes dead code, so delete it). `orders.ts:93,96` order texts.
  - Docs: README, `SUBMISSION.md` (description, storyboard row "burst finish"), `GAMEPLAY-DIRECTION.md` §15 "first-to-4", `DESIGN.md:206`.
- **Acceptance:** new `scripts/sim-check.ts` §13 "Original vocabulary":
  - every `CORES[i].name` and `TIPS[i].name` fails `/^\d+-\d+$/` and is not in `['Flat','Rush','Taper','Ball','Needle','Orb']`;
  - `finishPoints` gives spin 1, over/pocket/burst 2;
  - `MATCH_HEAT === 3`;
  - every pocket in `ARENAS` has `points === 2`.
  - Then a `grep -rniE "burst res|rip it|spin finish|over finish|4-60|9-60|3-50|5-80"` over `src/` returns only ids and comments. `report:tops` and `report:arenas` show unchanged win rates; only points per round change.
- **Risks:** the first-session guide copy names the "Rush tip" in places (`progress.ts`, labels), so grep for it. XP pacing per match drops by about 25% because matches are shorter; acceptable, and it can be checked in `check:sim` §12.

#### WP2. Placement that survives the real world (1.5 days)
- **Serves:** Technical ("holding up in rooms the developer never tested", clean pause/resume), Experience.
- **Changes:**
  1. New pure module `src/game/placement.ts` (no three.js): `placeArena(head, fwd, tables[]) → {x, y, z, yaw, onTable}` holding the current `place()` and `findTable()` maths (`REACH`, `TRAY_DROP`, `TABLE_*`, `PEDESTAL`). `MatchSystem.place()` calls it.
  2. Split `place()` into `placeRoot()` (pose only, keeps `phase`) and the first-time `toHub()`.
  3. **Wait for planes:** in `'placing'`, place as soon as `findTable() !== null` after at least 0.5 s, otherwise at `SETTLE_MAX` = 5 s (replaces `SETTLE` 2).
  4. **Late table:** while in `'hub'`, if the arena is on the tray and a table appears within 30 s, ease `root.position.y` to `table + PEDESTAL` over 0.4 s and log `[MATCH] snapped to table`.
  5. **New session:** subscribe to `world.visibilityState`. On a transition from `NonImmersive` to `Visible`, call `placeRoot()`; if the phase was `pulling`, `fight` or `result`, call `toReady()` first.
  6. **Recenter:** attach a `reset` listener to `xr.getReferenceSpace()` once per session; on `reset`, call `placeRoot()`.
  7. **Manual move:** a small brass handle on the pedestal's near face, visible in `'hub'` only. Pinch it and the arena follows the hand in x/z (y within ±0.10 m, snapping to a table within 3 cm). On release, the yaw re-aims at the head. Reuse the hub's item grab code (`hub.ts` items, `GRAB_NEAR`). Add a short sound on grab and release.
- **Acceptance:**
  - `sim-check` §14: `placeArena` puts the centre 0.6 m ahead and facing the head for four head yaws; picks the nearest table; rejects a table 0.8 m below the eyes; falls back to the tray.
  - Emulator (IWSDK CLI):
    - `xr enter`, then `xr set-transform` with the headset yawed 90°;
    - `xr exit`, then `xr enter`;
    - the console shows a second `[MATCH] arena on …` line, and the arena is in front of the new pose (screenshot).
    - Dragging the handle in hand mode moves the arena (screenshot before and after).
  - `reset` can only be verified on a device (protocol T3).
- **Risks:** Quest Browser `reset` behaviour varies, so the session re-place is the safety net. The handle must not collide with the level plate (`hub.ts:440`, at `DOCK_AT.z + 0.04`).

#### WP3. Fresh start and demo save for shared headsets (0.5 day)
- **Serves:** Best First Five Minutes (every judge sees the onboarding), Best Reason to Come Back (progression can be shown), Experience.
- **Changes:**
  - `src/index.ts`, before `World.create`: read `URLSearchParams`.
    - `?fresh` removes `spinsmith.progress.v1`, `spinsmith.top.v1` and `spinsmith.arenas.v1`.
    - `?demo` writes a prepared save: level 8, guide `done`, 3 order stamps, rival marks, 2 champions.
    - Both then `history.replaceState` the flag away, so a reload does not repeat them.
  - Build the demo save in a new `src/game/demo-save.ts` by driving `Progress` with in-memory storage, so it stays valid when the format changes.
  - In-headset **"New smith"**: pinch and hold the level plate (`hub.ts:439-443`) for 2 s. A ring fills; then a second pinch within 3 s confirms. This calls a new `Progress.reset()`, resets `myBuild` to `PRESETS[0]` and calls `toHub()`. Only fall back to `location.reload()` if state leaks (reload exits XR).
- **Acceptance:** `sim-check` §15: `demoSave()` loads at level 8 with guide `done`, ≥2 champions and ≥1 mark; `Progress.reset()` returns to level 1, guide `launch`, and saves. In the emulator, `?fresh` shows the first-session dock call; `?demo` shows the board and champions.
- **Risks:** low.

#### WP4. Knocked-out tops and shattered parts land on the real table (1 day)
- **Serves:** Innovation (the "take it away" test), Boldest Original Concept, the video's first 15 s.
- **Changes:**
  - `visuals.ts` `TopView.sync` (`:594-604`): replace `visible = top.state !== 'out'` with a **fly-out** state on the first frame of `out`:
    - **THROWN:** a ballistic arc from the top's rim position with its outward velocity plus about 0.25 m/s up, in arena-local units, gravity 9.81 / `ARENA_SCALE`. It lands on the table plane at local y = `TABLE_Y` (-0.04, the same level as the hub props, `hub.ts:92`), skids with friction, then wobbles and falls using the existing `toppled` fall code. It stays until `toReady()`, or fades after 4 s.
    - **SLAG:** drops 2-3 cm into the pit over 0.25 s with a glow, then hides.
    - Clamp travel to 0.12 local (24 cm world) past the rim.
  - `updateBurst` (`:638-680`): add an `else` branch that bounces debris on `TABLE_Y` when outside the arena, and lengthen `DEBRIS_LIFE` to 4 s.
  - Add a contact shadow (the existing soft shadow) under landed parts.
  - Sound: `playPlace()`, or a new short "clack on wood", on landing.
- **Acceptance:** emulator, dev key `K` (shatter) and a ramp KO. Screenshots show the parts resting beside the pedestal at table level and the thrown top lying on the table. In the emulator's `living_room` the table plane is detected, so check that the `[MATCH] arena on table` log appears first. Draw calls during the result phase stay within +4.
- **Risks:** on the tray (no table) parts land in mid-air at prop level. Add a faint shadow disc so it reads as a floating tray. Real table edges are not known: an arc may land "off" a small table, which is acceptable at 24 cm.

#### WP5. Readable far-rim text (0.5 day)
- **Serves:** Experience, Polish.
- **Rule used (an engineering estimate, not Meta text):** Quest 3 is about 25 pixels per degree and Quest 3S about 20. Text read **during a fight** gets at least 18 dmm em height (about 26 px em on Quest 3). Text read **at rest** gets at least 13 dmm, and nothing goes below 12 dmm.
- **Changes:**
  - `match-bar.ts`:
    - drop the bottom XP row during `ready`, `pulling` and `fight`, and show XP only in `result`, larger;
    - names 40 → 56 px, pip radius 18 → 26 (3 pips with heat);
    - raise the smallest text to 44 px;
    - keep the plane at 0.17 scale unless the screenshot shows room.
    - Result: names 56 px is about 20.7 dmm at 1.05 m; the smallest is 16 dmm.
  - `rim.ts` `DialPlate`: dial labels 30 → 40 px (17 dmm).
  - `board.ts`: delete the notch legend line (`:104`), raise rival sub-names 22 → 30 px and the medallion labels to ≥ 32 px (12.4 dmm at 1.16 m). If that is still under 13 dmm, scale the board by 1.15.
- **Acceptance:** a table of every text item (px, mm, distance, dmm), recomputed in this doc, with all values meeting the rule. Emulator screenshots of `ready`, `fight`, `result`, forge and hub from the seated pose (headset at y 1.15, pitch -30°) stay readable at 50% zoom. On a device, protocol T8.
- **Risks:** a crowded bar. Fewer words is the fix, not a smaller font.

#### WP6. Comfortable touch targets (0.5 day now, plus device tuning)
- **Serves:** Experience (fatigue, missed pinches), Best First Five Minutes.
- **Measured today** (REACH 0.6, 0.35 m drop):

  | Target | 3D distance | Elevation |
  |---|---|---|
  | Forge tab, centre / outer | 0.40 / 0.45 m | 57° / 49° |
  | Workshop tab, centre / outer | 0.40 / 0.44 m | **70°** / 57° |
  | Forge part tray, nearest | 0.39 m | 46° |
  | Dock, anvil (hub) | **0.59 m** | 46° |
  | Blueprint | 0.51 m | 57° |
  | Menu | 0.57 m | 26° |
  | Arena centre floor (near ramp) | 0.69 m | 30° |
  | Quench slot | 0.73 m | 30° |

  At REACH 0.68 the tabs reach 0.45 / 0.43 m at 48° / 60°, but the dock and anvil move to 0.64 m
  and the bar to 1.13 m. So REACH is a device decision, not a desk decision.
- **Changes now:**
  1. New pure `src/game/reach.ts`: the eye-relative distance and elevation of every touch target, computed from exported constants (`TAB_Z`, `TAB_Y`, `PLATE_Z`, `PLATE_Y`, `RAIL_Z`, `RAIL_Y`, `DOCK_AT`, `FORGE_AT`, `BLUEPRINT_AT`, …) for drops of 0.30, 0.40 and 0.50 m.
  2. Fix the outlier: move the workshop tabs onto the forge's tab line (`PLATE_Z` 0.232 → 0.19, `PLATE_Y` -0.012 → 0.006), and lift the piece rail above the near wall (`RAIL_Z` 0.2 → 0.17, `RAIL_Y` 0.03 → 0.06). The rail already steps away while a piece is carried, so it does not hide drop spots.
  3. Pull the dock and anvil 3 cm local toward the player (`DOCK_AT` / `FORGE_AT` z 0.15 → 0.165), giving about 0.56 m.
  4. Add DEV-only URL tuning knobs in a new `src/game/tuning.ts` for the Quest day: `?reach=`, `?scale=`, `?pinchOn=`, `?pinchOff=`, `?fullPull=`, `?fullSpeed=`, `?perfect=`. No rebuilds needed while tuning on the device.
  5. **Table-edge fit** (code now, verify on device): in `placement.ts`, read the chosen table's `XRPlane` polygon via the plane entity's `object3D.matrixWorld`. If the pedestal's near edge would overhang the table edge, push the centre forward, up to REACH + 0.12.
- **Acceptance:** `sim-check` §16 asserts every direct-touch target is 0.38-0.58 m from the eyes and ≤ 62° below eye level for drops of 0.30-0.45 m. Emulator workshop screenshot: the tabs are no longer at the bottom edge of the view (compare with `docs/review/workshop.png`). On a device, protocol T7.
- **Risks:** moving the rail may cover the near arena in the workshop; check it in a screenshot.

#### WP7. Per-frame performance fixes (0.5 day)
- **Serves:** Technical (60 fps minimum).
- **Changes:**
  - `match-system.ts:444`: call `arenaView.sync(arena)` only when `arena.shapes.length > 0`, the layout or the tilt changed, embers are active (colours only, skip normals), or for one frame after shapes empty. Track this with a `dirty` flag set in `setArena`, `showLayout`, `toReady` and `makeShape`.
  - `match-bar.ts`: draw the two spin bars as two small `Mesh` quads scaled in x over the canvas plate. Redraw the canvas only on points, message, names or XP. Replace the joined string key with numeric field comparisons.
  - Quantise `Label.set` during the pull to 5% steps.
  - Leave the `JSON.stringify` keys until a device profile shows GC spikes.
  - Also consider dropping the unused `meshDetection` and `hitTest` from `iwsdk.config.json`, but only on the device day, after checking that planes still arrive.
- **Acceptance:** with a DEV `[PERF]` counter, `arena syncs/s` is 0 in hub and forge and ≤ 60 in a fight with shapes; match bar redraws are ≤ 3 per round outside the result. IWER CPU per frame in hub, `fight` and forge is lower than the `VISUAL-POLISH.md` baseline (5.9-6.5 ms), measured the same way.
- **Risks:** a missed dirty case leaves a stale floor. Cover it with a visual check of shapes relaxing.

#### WP8. Stop accidental shapes (0.5 day)
- **Serves:** Experience ("hands that don't listen").
- **Changes** in `updateShaping()` (`match-system.ts:994-1047`):
  - A well needs the fingertip moving **down** at ≥ 0.15 m/s as it crosses the floor. Track the last tip y per hand.
  - Ignore wells within 300 ms after the same hand's ramp release.
  - A far ramp commits only if the pinch is held ≥ 120 ms (a tap does nothing).
  - Keep the constants in `tuning.ts`.
- **Acceptance:** emulator: lowering a hand slowly onto the floor makes no well (log `[SHAPE]` absent); a quick press does. On a device, protocol T6.

#### WP9. Make the hero verb visible: decisive first ramp, slow-mo, rival shaping (1 day)
- **Serves:** Innovation, Best First Five Minutes, the video.
- **Changes:**
  1. **First match lower variance:** in `launch()`, when `progress.matches === 0`, set the rival's power to 0.7-0.8 and its aim noise to ±0.15.
  2. **Slow-mo:** when a finish falls within `CAUSE_WINDOW` of the player's shape, scale `dt` by 0.3 for 250 ms in `updateFight`, rendering only (the simulation's fixed `STEP` stays deterministic), plus a thock.
  3. **Rival shaping** (from Hookjaw, level 6): reuse `POLICIES.pushOut` from `shaping-report.ts` with its own `ShapingCharges` and owner `'rival'`. Add a second `ShapeMarks(CYAN)` instance (`visuals.ts:1410` takes the colour in its constructor) and a "THEIR RAMP" credit in `finish()`.
- **Acceptance:** `report:shaping` gains a "rival uses pushOut" row: the player's no-shaping win rate against it is 38-45%, and pushOut against pushOut is 47-53%. Emulator: the first match's `[MATCH] launch … vs AI` logs show AI power in 0.7-0.8.
- **Risks:** making Hookjaw too hard. Gate it at level 6 so judges mostly see it in `?demo` and the video. Cut item 3 first if time is short.

#### WP10. Landing page and shorter first session (0.5-1 day)
- **Serves:** Best First Five Minutes, Polish.
- **Changes:**
  - Replace the white UIKit welcome panel with a plain HTML overlay in `index.html`: the cover image, three icons ("sit at a table", "hands only", "allow spatial data"), "Enter", calling `world.launchXR()`.
  - Hide the UIKit panel. Removing `spatialUI` from `iwsdk.config.json` would save about 1 MB, but do it only if nothing else uses it (check `src/` for UIKit imports first).
  - With heat first to 3 (WP1), the first match ends about 1 minute earlier. Swap text in the intro card for an icon row where cheap (rival type icon, arena icon).
- **Acceptance:** a cold load on a desktop throttled to "Fast 4G" is interactive in ≤ 6 s. Clean-save emulator run: Enter XR → first launch ≤ 45 s, first forge ≤ 3:00 by `[MATCH]` timestamps.

#### WP11. Audio: music loop and panned clashes (0.5-1 day)
- **Serves:** Polish.
- **Changes:** in `audio.ts`, one CC0 hub loop (ducked in fights) and a win sting. Add a `StereoPannerNode` on clash, pocket and dash, panned by the event's arena-local x (`playClash(strength, x)`). Keep a short distinct sound on every tab, drawer and part selection (Meta: "pair every successful selection with a short, distinct sound"); audit the `forge.ts` and `builder.ts` tap paths.
- **Acceptance:** a listening pass in the emulator, then on device (T11). Credit noted in the testing notes.

#### WP12. Tomorrow teaser (0.25 day)
- **Serves:** Best Reason to Come Back.
- **Changes:** in `board.ts`, after today's order is done, show "Tomorrow: <rival> on <arena>" from `dailyOrder(nextDate)` (`orders.ts`).
- **Acceptance:** `sim-check` §12 extension: tomorrow's order is deterministic and differs from today's on at least 6 of 7 consecutive days.

#### WP13. README and docs clean-up (0.5 day)
- **Serves:** Polish, credibility if anyone reads the repo.
- **Changes:**
  - Rewrite the README as a judge-facing page: what it is, how to play, the gestures, `?fresh` / `?demo`, known limits.
  - Remove README:10, README:144-145 and README:141-142; state the true layout (arena centre about 60 cm ahead, tabs within about 45 cm).
  - Add a "Historical: superseded by GAMEPLAY-DIRECTION.md" banner to `DESIGN.md`. Fix `DESIGN.md:166-169,206` and the `SUBMISSION.md:58` wording ("within about 45 cm").
  - Add a `LICENSE` (your choice; MIT matches the template headers).
  - If D5 = yes, also scrub `TOP-CUSTOMIZATION.md:17-62` and the agent folders.
- **Acceptance:** `grep -n "prototype\|alternates\|Not in the prototype\|first to 4\|40 cm" README.md` returns nothing.

#### WP14. Submission materials (2 days spread, plus capture on a Quest)
- **Testing notes** (draft now, final Nov 16):
  - sit at a table;
  - Settings → enable hand tracking; put controllers down;
  - allow spatial data when asked (the arena sits on your table; without one it floats on a tray);
  - hold the Meta button to recenter, or drag the brass handle on the pedestal;
  - add `?fresh` to start as a new smith; add `?demo` to see mid-game progression;
  - what to expect in the first 5 minutes;
  - known limits.
- **Cover (16:9) and logo:** from a passthrough capture with the arena on a real table. Draft from the emulator now and replace later.
- **Devpost page:** update `SUBMISSION.md` with the new vocabulary; add the "how we built it" deterministic-sim story with the report numbers.
- **Video plan (≤ 2:50):**
  - Keep the `SUBMISSION.md` storyboard, but **open with a ramp knockout that throws the top onto the real table** (WP4) at 0:00-0:10.
  - The forge at 0:10-0:20; "WHITE HOT" pull; the heat result.
  - Use 20 s of the `?demo` save for progression.
  - Capture with Quest casting or the on-device recorder in passthrough, daylight, on a real wooden table; record in-headset audio.
  - Two takes per shot.
- **Acceptance:** a checklist ticked on Nov 16 (section 4).

#### WP15. Hosting setup and freeze procedure (0.25 day, after D1)
- **Steps:**
  - `npm run build`.
  - Copy `dist/` to the play repo, push, and enable Pages.
  - Open it on desktop and in a private window; on the device later.
- **Freeze:** after the Nov 16 deploy, no pushes. Tag the release and record the commit hash in `SUBMISSION.md`. Keep the repo untouched until Dec 12.

### 3B. Needs a Quest

#### Q0. Day-one headset protocol (1 day; run it before any new feature)
**Setup:**
- Quest Browser and hand tracking on. Space Setup with the desk labelled as a table.
- The dev server LAN URL (or `iwsdk runtime pair-headset` over ADB), plus remote DevTools (`chrome://inspect`) for `[MATCH]`, `[SHAPE]` and `[PERF]` logs.
- OVR Metrics Tool overlay for FPS, CPU/GPU level and utilisation.
- A tape measure.
- Use the `tuning.ts` URL knobs and record every value you try.

| Test | How | Pass | Fail → action |
|---|---|---|---|
| T1 Frame rate | 3 min each in hub, forge, workshop and a fight with shapes and a shatter. OVR Metrics, plus a DevTools performance trace of 10 s per phase | Sustained ≥ 72 fps in every phase. Never below 60 for > 1 s. p95 frame ≤ 13.9 ms. JS main thread ≤ 4 ms/frame on average | Apply WP7 if not done. Then reduce draw calls in the worst phase (merge static rim and hub meshes, instance the miniatures). Last resort: drop `ARENA_SCALE` detail (`rings` 18 → 12) |
| T2 Cold start | Clear site data; tap the URL; time to the 2D page; Enter → arena visible | 2D page ≤ 8 s on home Wi-Fi; arena ≤ 3 s after permissions | Lighter landing (WP10), preload audio lazily |
| T3 Placement | 2 rooms × (table / no table) × (entering facing forward / turned 45°); exit and re-enter; Meta-button recenter; late plane arrival (enter before Space Setup finishes) | On the table in ≥ 9/10 table entries. Faces the player after re-enter and recenter within 1 s. Handle drag works first try | Fix WP2 paths; lengthen `SETTLE_MAX` |
| T4 Rip | 20 deliberate rips, then 10 "best" attempts; 2 min with hands idle over the table | ≥ 18/20 launch. "White hot" in 3-8 of 10 best attempts. 0 accidental launches. Release-time tracking loss still launches | Tune `FULL_PULL`, `FULL_SPEED`, `PERFECT`, `HAND_LOSS_GRACE` |
| T5 Ramps | 20 near ramps, 20 far (ray) ramps, aim at a marked direction | Near ≥ 17/20, far ≥ 16/20, aim within ±30° in ≥ 15/20 | Tune `SHAPE_GRAB`, `RAY_BUMP_RATE`; enlarge the ghost |
| T6 Wells and accidents | 20 deliberate wells; 10 normal rounds counting unintended shapes | ≥ 18/20 deliberate; ≤ 1 accidental per 5 rounds | WP8 thresholds |
| T7 Reach and posture | Every tab, part, dock, anvil, board and menu item, 10 touches each, seated upright; measure the eye-to-table drop and the table edge | ≥ 9/10 first-try hits; no leaning forward; nothing hangs past the table edge | Try `?reach=0.64/0.68`; table-edge fit; then fix constants |
| T8 Text | Read every text item aloud from the seated pose (bar, plates, board, labels), on Quest 3 and 3S if possible | All readable without leaning | WP5 sizes up one step |
| T9 Pause and resume | Meta button menu mid-fight; take the headset off for 30 s (sleep); put it back on | Fight and audio paused; resumes in the same state; no jump in the sim | Fix `visibilityState` paths |
| T10 Hand loss | Hide a hand mid-pull and mid-ramp; cross the hands | Cancels, no launch or shape; recovers in < 0.5 s | `HAND_LOSS_GRACE`, cancel paths |
| T11 Audio | Speakers at 50% volume | Every selection has a sound; clashes are not clipping; the music sits under the SFX | Mix levels |
| T12 Comfort | One 10-minute session; neck, shoulder and arm ratings 1-5 | All ≤ 2 | Raise or move targets (WP6) |
| T13 Fresh players (separate day) | 3-5 people, `?fresh`, no help; `GAMEPLAY-DIRECTION.md` §17 table | Median first launch ≤ 45 s; ≥ 4/5 launch unaided in 60 s; ≥ 4/5 explain a loss; ≥ 3/5 replay unprompted | Fix the top 3 confusions only |

#### Q1. Tuning from the protocol (2-3 days)
Fix the top five failures from T1-T12, in table order. Do not start features until T1, T3, T4 and
T5 pass.

#### Q2. Depth occlusion trial (timebox 1 day; Quest 3 first)
Use `iwsdk-depth-occlusion` (`DepthOccludable`) on the arena floor and the tops. **Keep it only
if** it costs ≤ 1.5 ms per frame (T1 method), the fingers read correctly over the floor in a
screenshot, and it works or degrades cleanly on the 3S. Otherwise, add a fingertip glow dot when
a fingertip is inside the arena volume (2 h).

#### Q3. Second playtest and regression (1 day)
T1 and T13 again after the tuning.

#### Q4. Video capture and edit (2-3 days)
See WP14. Capture after the feature freeze.

---

## 4. Schedule (Oct 7 - Nov 18)

| Week | Dates | Work | Exit gate |
|---|---|---|---|
| 1 | Wed Oct 7 - Tue Oct 13 | Decisions D1-D6 by Fri Oct 9. **WP1** (1 d), **WP2** (1.5 d), **WP3** (0.5 d), **WP5** (0.5 d), **WP6** (0.5 d). Developer account, `adb`, OVR Metrics prepared | `check:sim` §13-16 pass; screenshots updated |
| 2 | Wed Oct 14 - Tue Oct 20 | **WP4** (1 d), **WP7** (0.5 d), **WP8** (0.5 d), **WP13** (0.5 d), WP10 (0.5-1 d). **Oct 20: buy a Quest if none is confirmed** | The emulator flow runs clean with the new vocabulary |
| 3 | Wed Oct 21 - Tue Oct 27 | Device arrives → **Q0 protocol** (1 d) → Q1 (2-3 d). No device: WP9 (1 d), WP11 (0.5-1 d), WP12, cover and logo drafts | T1, T3, T4, T5 pass (if device) |
| 4 | Wed Oct 28 - Tue Nov 3 | Q1 continued, Q2 occlusion timebox, Q3 playtests (T13). Otherwise the remaining WP9-WP12 | Playtest metrics recorded |
| 5 | Wed Nov 4 - Tue Nov 10 | **Feature freeze Fri Nov 6, end of day.** Bug fixes only after that. Video capture Nov 7-9, edit Nov 9-10. Final cover and logo. Hosting repo set up (D1) | Video rough cut ≤ 2:50 |
| 6 | Wed Nov 11 - Tue Nov 17 | **Code freeze Fri Nov 13** (P0 crash fixes only). Final build and deploy **Mon Nov 16**. Cold-start tests on the Quest (clean browser, private window, phone hotspot). Video uploaded publicly. Devpost form filled and **submitted Tue Nov 17** | Submitted |
| Buffer | Wed Nov 18 until 23:00 TRT | Only Devpost text fixes if the form allows; **no deploys** | — |

**If the Quest is late:**
- **Arrives Oct 21 - Nov 4:** run Q0 the same day, do Q1 for 3 days max, skip Q2, keep the freeze dates, and capture the video Nov 7-10 as planned.
- **Not in hand by Wed Nov 4 (emulator branch):**
  - keep the tuning conservative: pinch hysteresis unchanged, `FULL_PULL` slightly shorter so rips are forgiving, WP8 guards on;
  - no occlusion;
  - record the video in IWER with real gameplay (allowed by the rules) and say so honestly in the testing notes;
  - spend the Quest-protocol days on WP9-WP12 polish.
  - Expect to pass Stage One but not to place; Best First Five Minutes stays the realistic award.

---

## 5. Do-not-do list

- **XRAnchors**, a table-slam gesture, mesh-based physics or new gestures. Re-place on reset and the handle cover a seated table game; anchors only matter if drift is seen on the device.
- **More content:** arenas, parts, rivals, ranks, a daily run or a second economy. Judges will not see what exists already.
- **Multiplayer, leaderboards, accounts, cloud saves, LLM or agentic rivals, voice.** Skip the Social and Agentic awards.
- **Bloom, post-processing, shadow maps, an environment system**, or a full art rework of the tops.
- **PWA, Bubblewrap and Horizon Store packaging.** Not required; the manifest exists.
- **Renaming internal ids and save keys** (`'4-60'`, `'flat'`, `'burst'`). Display names are what judges see; id churn breaks saves, tests and reports for no score.
- **A hub draw-call or architecture refactor before T1 shows a problem.** The same goes for code splitting to silence the bundle warning.
- **Fine top-balance tuning.** The best build is at 66% and the parts at 44-60%. Re-run the reports only to confirm nothing moved.
- **Workshop polish beyond bugs.** Show it for 10 s in the video.
- **Accessibility-award features** (a one-hand mode or high-contrast mode as a project). Not winnable this cycle.
- **Public hosting before the final build**, and any deploy after Nov 16.
- **Re-recording the video** after the code freeze for small UI changes.

---

## 6. Status (Oct 7, 2026)

Decisions taken: hosting later (D1 open); names and scoring as proposed in D2 and D3 (heat,
first to 3); the developer handles the Quest (D4).

| WP | State | Notes |
|---|---|---|
| 1 Names and heat | Done | check:sim §13 |
| 2 Placement | Done | `placement.ts`, §14; wait for a table up to 5 s, late-table snap, re-place on a new session and on `reset`, brass drag handle |
| 3 Fresh / demo / reset | Done | `?fresh`, `?demo`, hold-and-confirm on the level plate; §15 |
| 4 Tops land on the table | Done | thrown tops arc onto the table and fall over; pit tops sink; shattered parts bounce on the table |
| 5 Readable text | Done | bar names 56 px, XP only after a round, bigger dials and board |
| 6 Touch targets | Done, except the table-edge fit | `reach.ts`, §16 (0.32-0.62 m, at most 63° below the eyes); `tuning.ts` dev knobs. The table edge needs the plane polygon on a device |
| 7 Performance | Done (lighter version) | floor syncs only while it changes; bar redraws in 2% steps instead of separate quads; pull card in 5% steps |
| 8 Accidental shapes | Done | the slow-press rejection can only be verified on a device (T6): emulator hand moves are teleports |
| 9 Hero verb | Done | first match steadier, slow motion on a shape knockout, rivals from Lv 6 ramp (no shaping 36% / push-out 47% against a full push-out rival in `report:shaping`) |
| 10 Landing page | Done | HTML landing with Enter; the UIKit panel is gone. Bundle size did not drop (UIKit ships with the core) |
| 11 Audio | Done | panned clashes, a synthesized forge loop (no files, no licence needed) |
| 12 Tomorrow teaser | Done | on the board once today's order is done |
| 13 Docs | Done | README rewritten at the top; LICENSE left to the developer |
| 14 Submission | Testing notes and storyboard done | cover, logo art and video need the Quest |
| 15 Hosting | Waiting for D1 | |

Draw calls: hub about 210 with a champion, forge 160, workshop 90, fight 108-112.
