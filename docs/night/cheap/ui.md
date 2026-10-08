# Why SpinSmith feels cheap: UI, typography, layout, spatial composition

Audit date 2026-10-08. Read-only. Screenshots are from `docs/night/design/` (the grey room and grey hands come from the IWER emulator's synthetic passthrough, so they are ignored here).
Angular sizes are given in **dmm** (distance-independent millimetres: 1 dmm is 1 mm seen from 1 m, about 0.057 deg). They are calculated from code with these assumptions: eyes 0.42 m above the arena floor, arena centre 0.68 m ahead (`placement.ts:10`), `ARENA_SCALE` 2.4 (`reach.ts:17`), `rootK`/`grow` = 1. The working targets are a rough summary of Meta's Horizon text-legibility guidance, not exact figures: about 20+ dmm for comfortable body text, about 14 dmm as an absolute floor, headers 30+ dmm, and about 25+ texels per degree so the texture is not softer than the Quest 3 panel.

---

## Summary

1. **There is no design system. There are five sign dialects.** Glass cards (`ui.ts:53`), brushed metal plates (`ui.ts:138`), rounded "sticker" plaques (`builder.ts:136`), outlined stamp text (`visuals.ts:2124`) and glow titles (`ui.ts:111`). They have three different corner treatments, rivets in 2-vs-4 layouts, and they are mixed on the same screen. The home screen alone shows four of them (r4-home).
2. **Hierarchy is inverted at home.** The busiest, most important panel (the Smith board: 10 text lines, 6 medallions, 7 stamps) is the farthest (about 1.37 m), off to the upper left and partly hidden by the hand. Its body text sits at 13–16 dmm. Meanwhile three one-word labels (PLAY/FORGE/WORKSHOP) are about 46 dmm and the closest thing in view.
3. **No orientation rule.** At least 7 different facing rules (yaw-only billboards, fixed pitches of -0.25, -0.55 and -1.25 rad, a yaw+pitch Menu sign, yaw-to-a-point workshop actions). So the signs look randomly tilted: PLAY slopes up, FORGE and WORKSHOP slope down (r4-home, vr-home, r4-workshop).
4. **Debug strings and auto-shrunk text.** `SMITH ORDER · 2026-10-08`, `Challenge a friend: ?vs=U4-6 on their address fights your top`, `feats 1/13`, `15 / 1160 XP`. 12 auto-fit loops (`do font = size--`) mean the same role renders at a different size every time. The result is about 18 distinct effective type sizes, plus one-word orphan lines on the message card ("your top", "Champion", "dock").
5. **Orange means everything.** It is used for the player, selection, actions, decoration, headers, warnings, stamps and the corner accents of every panel. There are 5 oranges and 3 golds in code. The documented colour rule (gold = guide only, `ui.ts:26`) is broken by the player's own stamp gradient (`visuals.ts:2177`). Add the low texture density on small signs (256 px canvases, about 17–20 texels/deg) and the result is soft, sticker-like, toy-grade UI.

---

## Inventory

### Fonts and weights
- One family: Rajdhani SemiBold 600 and Bold 700 (`ui.ts:8-21`). Good. But `'bold'` and `700` are both used (`builder.ts:120`, `match-bar.ts:128`). Case is mixed: ALL CAPS (tabs, tags, `HELD!`), Title case (`Menu`, `Lv 9`), sentence case (card bodies, board lines), and lowercase stats (`attack · right spin · 33 / 40 g`).

### Type sizes (canvas px → world dmm)

| Element | File:line | Canvas px | mm/px | Dist (m) | dmm | Verdict |
|---|---|---|---|---|---|---|
| Board title (order) | board.ts:74 | 58 (auto ≥24) | 0.72 | 1.37 | 30 | ok |
| Board header `SMITH ORDER · date` | board.ts:71 | 40 | 0.72 | 1.37 | 21 | ok, content is debug |
| Board subline | board.ts:78 | 36 | 0.72 | 1.37 | 19 | borderline |
| Board `RIVALS` / `LEDGER` | board.ts:85,120 | 32 | 0.72 | 1.37 | 17 | small |
| Board stats + challenge lines, rival surnames | board.ts:114,133,135 | 30 | 0.72 | 1.37 | 16 | **below body target** |
| Medallion names (HOOKJAW, SAWTOOTH) | board.ts:110 | 34→24 auto | 0.72 | 1.37 | 12.6–18 | **below floor** |
| Rank plate `Lv 9` | hub.ts:471 | 54 | 0.375 | 0.43 | 47 | big |
| Rank name | hub.ts:474 | 34 | 0.375 | 0.43 | 30 | ok |
| `Next: …` | hub.ts:490 | 28 | 0.375 | 0.43 | 24 | ok |
| `15 / 1160 XP` | hub.ts:483 | 22 | 0.375 | 0.43 | 19 | small |
| `Next match: …` | hub.ts:497 | 28→16 auto | 0.375 | 0.43 | 14–24 | varies |
| PLAY/FORGE/WORKSHOP/COMFORT tag | builder.ts:136, hub.ts:396 | 46→~44 | 0.56 | 0.54 | ~46 | biggest text at home |
| Champion `N wins` tag | hub.ts:553 | 44 | 0.66 | ~0.6 | ~48 | |
| Match bar names | match-bar.ts:108 | 66 | 0.576 | 1.21 | 31 | ok |
| Match bar word (FIGHT/READY) | match-bar.ts:127 | 64→44 auto | 0.576 | 1.21 | 21–30 | varies |
| Match bar `Lv`/`+XP` | match-bar.ts:138,149 | 48 | 0.576 | 1.21 | 23 | ok |
| Message card headline | visuals.ts:1747 | 112→40 auto | 0.645 | 1.2 | 21–60 | **3x range, same role** |
| Message card body | visuals.ts:1748 | 68→36 auto | 0.645 | 1.2 | 19–37 | varies |
| Stamp word | visuals.ts:2162 | 150→40 ×weight 1–1.5 | 0.47 | 1.2 | up to ~87 | |
| Stamp sub (MATCH WON) | visuals.ts:2184 | 56→40 | 0.47 | 1.2 | 16–22 | small under a huge word |
| Menu button | builder.ts:117, match-system.ts:274 | ~47 | 0.66 | 0.66 | 47 | |
| Dial plate title / subtitle / dial labels / message | rim.ts:274,276,320,325 | 64/52/54/44→24 | 0.52 | ~1.1 | 30/25/26/11–21 | message can drop below floor |
| Rim tabs (RING/CORE…) | rim.ts:189 | 50% H auto | ~0.45 | ~0.5 | ~25–35 | |

**Count:** 9 hard-coded px sizes, 12 auto-shrink loops (board.ts:75,111; match-bar.ts:128; hub.ts:497; rim.ts:190,325; builder.ts:120,145,1064; visuals.ts:1748,2163,2185), giving **about 18 distinct effective world sizes** between 12.6 and 87 dmm. A disciplined VR UI uses 3–4.

### Texture density (sharpness)

| Sign | Canvas width | World width | Angular width | Texels/deg |
|---|---|---|---|---|
| Hub tag (PLAY…) | 256 | 0.144 m @0.54 | ~15° | **~17** |
| Menu button | 256 | 0.168 m @0.66 | ~14.5° | **~18** |
| Rank plate | 512 | 0.154 m (×0.8) @0.43 | ~20° | **~25** (marginal) |
| Rim tab (per tab) | 256 | ~0.115 m @0.5 | ~13° | **~20** |
| Smith board | 1200 | 0.864 m @1.37 | ~35° | ~34 |
| Message card | 1024 | 0.66 m @1.2 | ~31° | ~33 |

The closest, most-touched signs are the blurriest. Engraving offsets of 1–1.5 canvas px (`ui.ts:186-191`) are smaller than a display pixel on those signs, so they smear instead of reading as a cut.

### Panel styles (5)

| # | Style | Painter | Corners | Rivets | Used by |
|---|---|---|---|---|---|
| A | Blue-black glass, orange glowing corner accents | `glass()` ui.ts:53 | chamfer 8% | 2 | message card, rank plate, Menu/Buttons |
| B | Brushed graphite metal plate, bevel | `metalPlate()` ui.ts:138 | chamfer 6% | 4 | Smith board, match bar, rim tabs, dial plate |
| C | Rounded black plaque, orange underline ("sticker") | `tag()` builder.ts:136 | roundRect r10, slab cut 19% | 0 | PLAY/FORGE/WORKSHOP/COMFORT, champions, part names, QUENCH TO SAVE |
| D | Outlined gradient word, no panel | `Stamp` visuals.ts:2124 | none | n/a | RIP!, THROWN!, ROUND 2 |
| E | Glowing spaced capitals with orange underline | `titleMesh()` ui.ts:111 | none | n/a | title |

Plus slab depths of 0.004/0.005/0.006/0.008/0.01/0.03 (`addSlab` calls), and a lit-orange filled button state (`builder.ts:111`) that exists nowhere else.

### Colours (22 distinct hex values in the 7 UI files, plus about 20 rgba values)
- **Orange ×5:** `#ff8a2a` ORANGE (ui.ts:25), `#ff9a3c` bar fill (match-bar.ts:25,53), `0xff7a2a` slot well (rim.ts:338), `0xff5a1a` (hub.ts), `0xff6a2a` forge theme (builder.ts:167).
- **Gold/brass ×4:** `0xffd23a` GUIDE (ui.ts:27), `#ffd34a` board GOLD (board.ts:38), `#ffd23a` inside the *player* stamp gradient (visuals.ts:2177), `0xe2b866` brass.
- **Cyan ×2:** `#4fd1ff` rival, `#1fb6ff` rival stamp.
- **Green `#6fd36f`** (done, better preview), **red `#e0574a`** (low spin, worse preview), peach `#ffd2a8` (lit), plus 3 text greys (`#eef3fa`, `#c9d3e0`, `#8f9bb0`), `#8a94a3` and two glass blues.
- Orange roles in use at the same time: player team, selected tab, hot action (TRY/SAVE), headers (SMITH ORDER), call to action (Next match, Challenge), rank name, ledger stamps, medallion notches, decoration (every glass corner, every tag underline, card light strip), XP gain. **At least 10 roles for one colour.**

### Orientation / placement rules (7+)
1. Hub tags: yaw-only billboard (hub.ts:266-269).
2. Smith board: fixed pitch -0.25, faces +Z, not the head (hub.ts:167). It sits at x = -0.47 m, so it is about 20° off-axis.
3. Rank plate: pitched -1.25 rad like a desk plaque (hub.ts:513).
4. Menu sign: pitch -0.5, yaw 0.4, on a stem (match-system.ts:593-596).
5. Match bar: pitch -0.55 (match-system.ts:641).
6. Workshop BACK/TRY/SAVE: yaw toward a point 0.32 behind (builder.ts:396).
7. Rim tabs: flat on the near rim (rim.ts rowSpots), dial plate upright on a stem.
8. Stamps: `depthTest:false`, renderOrder 30 (visuals.ts:2151).

Depths are not "all the same". They are **scattered with no rule**: rank plate 0.43 m, tags 0.54 m, Menu 0.66 m, message card / bar 1.2 m, board 1.37 m. The most information-dense panel is the farthest, and the least important (a plaque with level numbers) is the closest.

---

## Why it looks cheap (evidence)

### 1. Five sign dialects on one screen
*r4-home:* the metal Smith board (B) floats top left, glass rank plate (A) bottom centre, three sticker tags (C) around the arena. *r4-fight / ready-clockwork:* the glass message card (A) sits directly above the metal match bar (B), two different materials stacked 2 cm apart, with an outlined stamp (D) on top. *r4-workshop / r4-forge:* metal tabs (B), sticker `QUENCH TO SAVE` (C), metal dial plate (B), glass card (A). The `ui.ts:51` comment says "Every SpinSmith sign … is this panel", and the metal-plate comment (ui.ts:134) calls metal "the forge's sign language". Both claims are now false. Premium games (Beat Saber, Walkabout, Synth Riders) use one material family for interactive panels and one for ambient information.

### 2. Sticker-like action labels
`tag()` (builder.ts:150-157) paints a rounded 82%-black rectangle with a 3 px orange underline into a 256×64 canvas. It is then extruded with a 19% corner cut (builder.ts:161) that does not match the painted roundRect. At about 17 texels/deg the edges are soft. Next to the crisp chamfered slabs, PLAY/FORGE/WORKSHOP read as decals stuck on posts (r4-home, vr-home). They are also the only rounded corners in the game.

### 3. Random sign angles
Yaw-only billboards (hub.ts:268) stay vertical, but the player looks down about 35–60° at the near rim. Perspective then turns each vertical plate into a different apparent roll. *r4-home:* PLAY slopes up to the right, FORGE and WORKSHOP slope down to the right at about 15–20°. WORKSHOP also clips into the arena's rim (vr-home) and overlaps the rank plate's corner (r4-home). *r4-workshop:* BACK and TRY are rotated in opposite directions and SAVE a third way, so it looks like nobody aligned them.

### 4. Home board: an information dump, in the wrong place
board.ts draws 10 text runs: header + ISO date (:72), order (:77), subline (:80), RIVALS (:86), 6 names (:113) + 6 surnames (:115), LEDGER (:121), stats line (:134), challenge URL (:136). It also draws 6 medallions with 3 notches each and 7–14 stamps. *r4-home:*
- `SMITH ORDER · 2026-10-08`: an ISO date reads as a log line, not a game.
- `Challenge a friend: ?vs=U4-6 on their address fights your top`: a URL query parameter, in orange (the CTA colour), on a headset where nobody types URLs.
- `3 stamps · a new emblem glow at 5 · feats 1/13`: three unrelated stats in one 16 dmm line.
- Medallion labels auto-shrunk to 24 px (12.6 dmm) for HOOKJAW/SAWTOOTH, so the six names render at different sizes. The surname under IRON ("RIP…") is cut off by the hand and the medallion row.
- The board is upper left at 1.37 m, far beyond hand reach, but its subline says "pinch the board to take it" (board.ts:80).

### 5. Competing hierarchy
*r4-home:* the brightest, largest text in view is `PLAY`, `FORGE`, `WORKSHOP` (46 dmm, white on black, closest), next to `Lv 9` (47 dmm). The day's goal (the order) is 30 dmm and the rivals are 13–18 dmm. The eye is pulled to labels it already understands and to a level number. Three orange text lines (header, CTA, Next match) all compete as "the action". The rank plate itself has 5 text tiers (54/34/28/22/16–28 px) in a 10 cm plaque.

### 6. Same role, different size; orphan lines
The message card's auto-fit (visuals.ts:1746-1757) shrinks the headline from 112 to 40 px until it fits in 4 lines. Short messages shout (`HELD!` at about 60 dmm) and long ones whisper (about 21 dmm). The greedy wrap leaves one-word widows: "Pick a drawer, bring a part to / **your top**" (r4-forge, vr-forge-side), "Sawtooth, the Iron / **Champion**" (ready-clockwork), "Your top waits in its / **dock**" (r3-first-hub-ghost, only "dock" visible). The forge card's body also wraps mid-phrase ("chips you toward a / shatter, in Zero-G Dish").

### 7. Fight HUD: two boxes and a sign, nothing anchored
*r4-fight:* the match bar is a 1.6:0.377 metal plate that is about 60% empty dark metal. The names are 31 dmm, the pips are grey dots, and `FIGHT` sits in a 300 px slot (match-bar.ts:129-131). Long words are silently dropped (`if width <= 300`). The card above it (ready-clockwork) is a different material. The stamp `RIP!` floats above both at another depth. The Menu sign (r4-fight, left) is a glass button on a post, in Title case, angled 0.4 rad. It is the only Title-case action in the game, and it is bigger than anything in the bar. After a match, a small XP row appears inside the bar in a 26 px strip (match-bar.ts:138-150), in tiny text below the giant THROWN! stamp (r2-result).

### 8. Colour noise
Orange is in every glass corner (ui.ts:71-84), every tag underline, every card strip (visuals.ts:1684), the selected tab, hot actions, the player's bar, pips, stamps, notches, the CTA text, the rank and the slot well. When everything is orange, nothing is selected. Gold is documented as "never your team" (ui.ts:26) yet sits in the player stamp gradient (visuals.ts:2177) and the board's gilded/full marks (board.ts:96). Green/red only appear on the dial plate preview needles and the board "DONE" line, so they never become a learnt language.

### 9. Low-res, soft small signs
See the texel table. The signs the player touches most (tags, Menu, tabs, rank plate) render at 17–25 texels/deg. The board and card, which are read rarely, get about 34. Softness is the biggest single "cheap" cue on a Quest 3, where everything 3D is crisp.

### 10. Decoration fighting content
Each glass panel has a sheen, a steel edge, two glowing orange corner L-brackets and two rivets (ui.ts:60-96). Each metal plate has brushing, a bevel and four rivets (ui.ts:149-181). On a 10 cm rank plate the rivets and corner glow take up the same visual weight as the data. The rim tabs are four separate riveted plates per row, giving 16 rivets for 4 words (r4-forge).

---

## Proposed design system

### Type scale (4 sizes, world-locked in dmm, not canvas px)
Write each canvas so that **text px = dmm × distance / mm-per-px**. Better: give each sign a `textScale(role)` helper that returns px from the role and the sign's known world size and distance. Remove every auto-shrink loop. If text does not fit, the copy is too long.

| Token | dmm | Weight / case | Use |
|---|---|---|---|
| `DISPLAY` | 60 | 700, CAPS, +6% tracking | stamps (RIP!, THROWN!), result word only |
| `TITLE` | 36 | 700, CAPS, +4% | station names, panel titles, match-bar names, tab labels |
| `BODY` | 24 | 600, sentence case | card body, order text, Next match |
| `CAPTION` | 18 | 600, CAPS, +8%, dim `#8f9bb0` | section labels (RIVALS), units, XP numbers |

Nothing is below 18 dmm. One line height is 1.2. Wrap with balanced lines (minimise the max line width over 2 lines, never leave a single-word last line).

### Two panel styles
1. **PLATE (interactive):** the existing `metalPlate`, chamfer 6%, **no rivets under 15 cm width**, engraving off below 25 texels/deg, one slab depth of 8 mm. It is used for everything you pinch: station signs, tabs, Menu, BACK/TRY/SAVE, the board. States: idle steel text, hover white, selected = orange text + 2 mm orange underline.
2. **GLASS (information, never touched):** a dark translucent card with **no corner L-brackets and no rivets**, a single 1 px edge, and one lit strip only on the message card. It is used for the message card, match bar and result. Merge the match bar and message card into **one** glass unit (see sketch).

Drop the rounded `tag()` plaque (rebuild it as a small PLATE) and the `titleMesh` glow.

### Colour rules (one accent + one opponent + one guide)
- **Orange `#ff8a2a`** = *you / selected / the one action to take now*. **At most one orange element per view** outside the fight bar. No orange decoration (remove the corner accents and underlines on idle signs).
- **Cyan `#4fd1ff`** = rival only.
- **Gold `#ffd23a`** = teaching guide only. Remove it from the player stamp gradient (use white→orange) and use a steel/white treatment for "gilded".
- **Neutral:** text `#eef3fa`, dim `#8f9bb0`, surface graphite. Green and red only for stat deltas (+/−), always paired with an arrow glyph.
- Merge the five oranges into one token (bar fill = ORANGE, slot well = ORANGE × emissive).

### Sign language (placement and orientation)
- **Two depth bands.** *Touch band* 0.40–0.55 m: things you pinch, laid **on or flush with the near rim**, tilted 30–40° toward the eye (same pitch for all), never vertical billboards. *Read band* 1.1–1.3 m: one centred glass HUD above the far rim, facing the head (full billboard on yaw + pitch, about 10° up). Nothing else floats.
- **One orientation rule per band:** the touch band uses a shared pitch with yaw toward the head; the read band is a full billboard.
- **Case:** CAPS for things you pinch and for names; sentence case for sentences. "Menu" becomes `MENU`.
- **Copy:** no dates, no URLs, no internal counters on the main surface. Show a stat only if it changes a decision.
- **Resolution:** at least 30 texels/deg for every canvas (tags/Menu/tabs: 512–768 px wide).

---

## Fix plan, ranked

| # | Fix | Impact | Effort | Files |
|---|---|---|---|---|
| 1 | Cut debug copy from the board: drop the ISO date (`board.ts:72`), drop `?vs=` line (:136; move challenge to a pinchable "SHARE" that shows a short code/QR only when asked), split/remove stats line (:134) | High | S | board.ts, hub.ts |
| 2 | Replace sticker `tag()` with a small PLATE (chamfer, metal, 512 px canvas, no rounded rect); same for champion/part labels and QUENCH TO SAVE | High | S | builder.ts:136-163, hub.ts:396/417/553, forge.ts:301/821/856 |
| 3 | One orientation rule for station signs: lay PLAY/FORGE/WORKSHOP flush on the rim (shared 35° pitch, yaw to head) instead of yaw-only vertical billboards; fix WORKSHOP overlap with rank plate/rim | High | S–M | hub.ts:266-269, 396-420, 527 |
| 4 | Raise canvas resolution of Button, tag, RimTabs columns, rank plate to ≥30 texels/deg (512–768 px); disable engrave offsets on small signs | High | S | builder.ts:99, 139; rim.ts (canvas width 256/tab); hub.ts:508 |
| 5 | Kill orange decoration: remove glass corner L-brackets and tag underlines; orange only for selected/now/you; take gold out of player stamp gradient | High | S | ui.ts:70-96, visuals.ts:2177, builder.ts:155 |
| 6 | Introduce type tokens (DISPLAY/TITLE/BODY/CAPTION in dmm) and delete the 12 auto-shrink loops; balanced 2-line wrap without widows in Label | High | M | ui.ts (new helpers), visuals.ts:1726-1770, 2160-2190, board.ts, hub.ts, rim.ts, match-bar.ts, builder.ts |
| 7 | Redesign home hierarchy: move the order to a centred read-band card above the far rim (BODY/TITLE), move rivals/ledger to a secondary "Smith board" that opens on pinch, shrink the rank plaque to `LV 9 · bar` | High | M | board.ts, hub.ts:74,167,464-500 |
| 8 | Merge message card and match bar into one glass HUD unit; widen the centre word slot instead of silently dropping text (match-bar.ts:131); pips as orange/cyan per side | Med–High | M | match-bar.ts, visuals.ts Label, match-system.ts:533,640-642,1933-1950 |
| 9 | Menu: CAPS `MENU`, PLATE style, laid on the left rim in the touch band (no post, no 0.4 yaw) | Med | S | match-system.ts:274,593-597 |
| 10 | Workshop: align BACK/TRY/SAVE on the same rim line as the tabs (left: BACK; right: SAVE (orange), TRY); drop the piece-name strip into the tab plate as CAPTION, stop clipping (`BOOS PAD`, `AREN S`) | Med | M | builder.ts:302-404 |
| 11 | Unify rivets/slab depths: 4 rivets only on plates ≥15 cm, no rivets on glass; one slab depth (8 mm plates, 4 mm glass) | Med | S | ui.ts:86-96,171-181, all addSlab calls |
| 12 | Consistent case rules for all Label strings (`HELD!`, `WHITE HOT 82%` vs sentence case); headline ≤ 28 chars | Low–Med | S | match-system.ts label.set call sites |

Fixes 1–5 are all S, touch about 6 files, and remove most of the "cheap" read.

---

## Layout sketches

### Home hub (seated view, arena centred)

```
 CURRENT (r4-home)                          PROPOSED
 ┌──────────────┐                            ┌─────────── READ BAND, 1.2 m, centred ──────────┐
 │SMITH ORDER·  │ (far, off-axis,            │  TODAY'S ORDER            (CAPTION 18)         │
 │2026-10-08    │  10 lines, 13–30 dmm)      │  Beat Rim Raider without giving up heat (BODY)│
 │Beat Rim …    │                            │  Forge Bowl · ●●●○○○○ ledger      (CAPTION)    │
 │RIVALS ○○○○○○ │                            └────────────────────────────────────────────────┘
 │LEDGER ●●●○○○ │                                           ╭───────────────╮
 │3 stamps·…    │                                          (     ARENA       )
 │?vs=U4-6 …    │      ╭─────────╮                          ╰───────────────╯
 └──────────────┘     (  ARENA    )            near rim, TOUCH BAND 0.45 m, one pitch (35°):
   PLAY↗               ╰─────────╯   FORGE↘    ┌────────┐  ┌───────┐  ┌────────┐  ┌────────┐
                  ┌Lv 9 SMITH 15/1160┐ ↘WORKSHOP│  PLAY  │  │ RIVALS│  │WORKSHOP│  │ FORGE  │
                  │Next: … at Lv 10  │          │ (dock) │  │ board │  │ (roll) │  │(anvil) │
                  │Next match: …     │          └────────┘  └───────┘  └────────┘  └────────┘
                  └──────────────────┘            TITLE 36 dmm, PLATE style, orange only on
                                                  the current guide target (e.g. PLAY)
                                                ┌ LV 9 ▓▓▓▓░░░░░░  (CAPTION, flush on rim) ┐
```
- Rivals and full ledger move behind a pinch on `RIVALS` (opens a read-band panel and replaces the order card while open).
- "Next match: Sawtooth · Zero-G Dish" becomes the PLAY plate's second line (CAPTION) instead of a third orange line on the rank plaque.
- Share/challenge: a long-press option on the rank strip, showing a big code, never a URL fragment.

### Fight HUD

```
 CURRENT (r4-fight / ready-clockwork)          PROPOSED: one glass unit above the far rim, 1.2 m
        RIP!            ← stamp, own depth     ┌──────────────────────────────────────────────┐
  ┌───────────────────┐ ← glass card           │ YOU  ▓▓▓▓▓▓▓▓▓▓▓░░  ROUND 2  ░░▓▓▓▓▓▓▓▓ SAWTOOTH│ TITLE 36
  │Sawtooth, the Iron │                        │ ● ● ○                           ○ ○ ●     │ pips orange / cyan
  │Champion           │                        ├──────────────────────────────────────────────┤
  │"Every hit…"       │                        │   Sawtooth winds up a charge — brace!        │ BODY 24, one line,
  └───────────────────┘                        └──────────────────────────────────────────────┘ fades when idle
  ┌YOU ▓▓▓ FIGHT ▓▓▓ SAWTOOTH┐ ← metal bar,                RIP!   ← DISPLAY 60, same plane,
  │●●○              ○○●      │   60% empty                         punches in over the HUD centre
  └──────────────────────────┘
 [Menu]↗ on a post, left                     MENU: small PLATE flush on the left rim (touch band),
                                             CAPS, no post, steel text (no orange)
```
- The bar becomes glass (information), the same family as the card, and they are built as one mesh with a shared edge.
- The centre word slot is TITLE size and wide enough for `MATCH POINT`. Never silently drop it.
- Result: the stamp plus a single BODY line `+230 XP · LV 10 ▓▓░░` in the HUD's lower row. No separate small strip.

### Forge / Workshop (alignment only)

```
 far:            ┌ STRIKER BOLT SPUR (TITLE) · attack · right spin (CAPTION) ┐   ← read band, centred,
                 │   ◔ HIT   ◔ GUARD   ◔ ENDURE   ◔ KICK   ◔ HOLD          │     replaces the card+stem plate
                 └────────────────────────────────────────────────────────────┘
 near rim:  [BACK]   [ RING ][ CORE ][ TIP ][ STYLE ]   [QUENCH ▸ SAVE]   ← one line, one pitch,
                                                                            orange only on selected tab + SAVE
```
