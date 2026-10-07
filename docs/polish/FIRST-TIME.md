# First-time experience and home: what makes it read as a prototype, and what to change

Oct 8, 2026. Read-only review: no source was edited and the emulator was not used. I read the code
and two shots another agent took today (`docs/polish/shots/01-placing.png`, `02-hub-first.png`).
Line numbers are from today's tree. `match-system.ts` is being edited in parallel, so its line numbers
may drift; I give the function name with each one.

Scope: the landing page, entering XR, arena placement, the first view of home (dock, anvil,
blueprint, level plate, comfort dial, Smith's board, champions), the first-session notes and beacon,
the moves between home, forge, workshop and match, and menus and labels.

Constraints followed: changes are code-only (canvas textures, procedural geometry, WebAudio). Nothing
new has to be touched. Every new element is either read-only or replaces an existing touch target in
the same spot, so the seated reach test (`reach.ts`, sim-check §16) does not change. No new verbs are
added, so one verb per match still holds.

---

## 1. Diagnosis: why the first five minutes feel like a prototype

The pieces are good: the forged-tech props, the matcaps, the font, the dimming pool and the motif.
What reads as a prototype is that **nothing arrives, everything just appears**, and that **the game
teaches by text cards**.

| Moment | What happens now | Where |
|---|---|---|
| Landing page | A static HTML card. ENTER is clickable before the world exists: a click before `World.create` resolves does nothing, and a rejected `launchXR()` is not caught | `index.html:47-56`, `src/index.ts:20-32` |
| Entering XR | Passthrough, then a small orange ring and a glass card: "Press your table / palm down, here: the arena rises". The ring stands in for a hand print (the code comment says so) | `match-system.ts` `init` (~489-497), `updatePress` |
| Placement | The card promises that "the arena rises", but `placeRoot` sets `root.visible = true` (~1327) and the whole machine pops in at full size. The sound is `playPlace()`, the workshop's piece click. Only a palm press adds three spark bursts | `place()` ~1210, `placeRoot` ~1304 |
| Title | No title anywhere in XR. `titleMesh()` exists in `ui.ts:128` and is never used | `ui.ts:128` |
| First view of home | Floating white billboard words (PLAY, COMFORT) drawn in a different style from everything else. COMFORT is as big as PLAY during teaching. The glass level plate sits front and centre and offers "Next: Zero-G Dish at Lv 2" to someone who has not played yet | `hub.ts:241, 341-347, 383, 407-438` |
| Guide | Two-line text cards are the main teacher. The beacon is a flat ring under the dock and does not show the motion (carry the top into the arena) | `match-system.ts` `guideNote` ~894, `hub.ts:118, 189, 210-212` |
| Text changes | `Label.set` redraws in place: no fade, no motion, no sound. Messages replace each other abruptly | `visuals.ts:1474-1496` |
| Two UI languages | A sci-fi glass card (blue grid, steel rivets) for notes, the level plate and the Menu button. Engraved graphite plates for the board, tabs and match bar. Bare white text for station names | `ui.ts:51` vs `ui.ts:155`, `builder.ts:131` |
| Type | Weights are `bold`, `700`, `600` and `''`. The second line of every Label is drawn at weight 400, which is not loaded (only 600 and 700 are), so the browser substitutes | `visuals.ts:1489-1491`, `ui.ts:16-19` |
| Unlocks at home | The anvil, blueprint, board and champions toggle `visible` from one frame to the next. The first appearance of the anvil (your first reward) has no ceremony | `hub.ts:166-173` |
| Into a match | Dropping the top in the arena calls `startMatch`. `hub.hide()` makes the home vanish, and the top teleports to its spawn. The rival intro is a text card | `startMatch` ~1123, `toReady` ~1551 |
| Menu | A floating glass "Menu" button beside the arena, the one thing in the game that looks like a flat-screen button | `match-system.ts:464`, `builder.ts:84` |

Shipped games handle these moments differently. Each of their first moments is a staged event with
motion, light and sound, and teaching is shown, not written:
- Moss opens on a book that the world springs out of, and page-turn sounds mark every move between
  scenes ([GamesBeat](https://gamesbeat.com/polyarcs-moss-hides-clever-vr-game-design-under-its-cuteness/)).
- Meta's passthrough guidance asks for "gentle, predictable animations that help users visually
  track changes" and for passthrough that dims gradually, as in The World Beyond
  ([Meta, passthrough design](https://developers.meta.com/horizon/resources/mr-design-passthrough/)).

---

## 2. Reference notes (what the shipped games and guidelines do)

- **Meta hands UI guidance:** "show clear hover feedback so the user knows what they are about to
  select"; "every interactive element should change visually on press"; "pair every successful
  selection with a short, distinct sound. The sound is the primary confirmation," and it calls this
  "not optional" without controller haptics
  ([Meta, hands UI best practices](https://developers.meta.com/horizon/design/hands-ui-best-practices/)).
  Meta also recommends showing every state (hover, grab, hold, fail) with subtle sounds and small
  animations such as glow, squash and pulse
  ([Meta, hands design principles](https://developers.meta.com/horizon/design/hands-plain-language-principles/)).
- **Meta typography:** use heavier weights (Bold, Medium), avoid italics in immersive scenes, and
  remember that bright rooms wash out subtle text in MR
  ([Meta, typography](https://developers.meta.com/horizon/design/styles_typography/)).
- **Meta onboarding (Growth Insights):** most players are lost in the first five to ten minutes, so
  shorten the time to the first interaction and the first reward. In MR, setting up the room should
  be part of the experience
  ([Meta blog](https://developers.meta.com/horizon/blog/growth-insights-series-building-competency-new-user-onboarding/)).
- **Cubism (MR update):** the puzzle snaps onto your real table and the menu lies flat on it, so
  pressing a button gives the real table's feel
  ([UploadVR](https://www.uploadvr.com/cubism-quest-3-update/)). Its developer's main lesson is to
  playtest with MR and hand tracking as much as possible
  ([Meta success story](https://developers.meta.com/horizon/discover/success-stories/ariko-eleven-table-tennis-and-cubism)).
  SpinSmith's home is already of this kind; the stations just need to look built into the machine.
- **Demeo (MR and hands):** the board snaps to a real surface; turn your palm toward you and a deck
  of cards appears in your hand; menus are objects you handle
  ([Mixed](https://mixed-news.com/en/demeo-tabletop-vr-role-playing-game-gets-hand-tracking/),
  [Road to VR](https://roadtovr.com/demeo-mixed-reality-update-quest-pro/)).
- **Tiny Golf (2025 Start winner):** "no controllers, no floating menus, just your hands": one pinch
  verb and pieces you handle instead of UI panels ([Devpost](https://devpost.com/software/tiny-golf)).
- **LEGO Bricktales (Quest 3):** the diorama sits on your table or carpet, and reviewers call it one
  of the most natural MR experiences
  ([FutureFive](https://futurefive.co.nz/story/game-review-lego-bricktales-meta-quest-3)). One
  complaint was having to keep adjusting the playfield, so placement must just work the first time.
- **First Encounters:** the room is scanned first, then the game breaks through it, so the
  boundary between room and game blurs gently
  ([Creative Bloq](https://www.creativebloq.com/news/meta-quest-3-game-changer),
  [UNIT9](https://unit9.com/project/meta-first-encounters)).
- **Beat Saber:** new players are often lost in its menus, cannot see which button to press and
  struggle to read menu text
  ([Codementor write-up](https://www.codementor.io/@vynloverdrive/why-i-built-a-minimalist-beat-saber-menu-2pgyahfw60)).
  Its hit sounds carry the feel: turning them down weakens the sense of power
  ([Steam discussion](https://steamcommunity.com/app/620980/discussions/0/1736588252391931686)).
  For SpinSmith: short, readable text and a strong sound on every confirmation.
- **PianoVision:** aligns a virtual keyboard to the real one before play. Hands-only input "can miss
  inputs", so confirm everything audibly and visually
  ([UploadVR](https://uploadvr.com/pianovision-impressions-quest-2/),
  [Pianoers review](https://pianoers.com/pianovision-review/)).
- **Laser Dance:** make the game adapt to different spaces, and build tools to emulate them
  ([Road to VR](https://roadtovr.com/designing-mixed-reality-apps-dynamic-spaces-laser-dance-case-study/)).
  For SpinSmith, the placing and tray fallback should feel like a deliberate part of the game.

---

## 3. Ranked changes

Effort: **S** is under half a day, **M** half a day to a day, **L** more than a day. **Emulator**
means it can be checked with `scripts/drive.sh` screenshots or the MP4 recorder (`db69190`).
Passthrough dimming and real legibility still need the headset.

### 1. The arena forges up out of the table (arrival sequence). M. Emulator: yes

**What.** Replace the pop-in with a 1.6 s staged arrival from the print's spot:
1. 0-0.3 s: the print flares and a ring of molten light spreads to the rim radius.
2. 0.2-1.1 s: the pedestal and arena rise out of the table. Ease root scale Y (or a clip plane at
   table height) from 0 to 1 with ease-out-back; the floor's rim glow runs around once.
3. 1.0-1.6 s: the stations pop up one by one (item 4), and a closing clank lands.

Sound: `playMachine()` at the start, then a new `playArrive()` (an anvil hit plus the four-note
motif from `audio.ts:170`) as it lands. Start the `ForgeLoop` from silence over 2 s instead of at
full level. Light: during placing, take the room dim to about 0.35 ("lights down"). As the arena
lands, ease it to home's 0.1, so the arena reads as the light source on your desk.

**Where.**
- `match-system.ts` `place()` (~1210) and `updatePress` (~1180-1206): both end in `toHub()`. Start
  an `arrive` timer there.
- `placeRoot` (~1327): `root.visible = true`.
- `update` (~654, ~659): the dim table `p === 'hub' ? 0.1 : 0`. Add `placing ? 0.35` and an arrival
  override.
- `updateSize` already eases root scale. Multiply in the arrival factor there so the easing stays in
  one place.

**Why.** This is the first thing a judge sees, and the card already promises "the arena rises". It
is the MR equivalent of Moss opening its book. Meta asks for gentle animations that track changes,
and The World Beyond dims passthrough gradually.

**Reach and verb.** No new touch.

### 2. A title moment in XR, and a greeting for returning players. S. Emulator: yes

**What.** As the arena lands (item 1, about t=1.0 s), show `titleMesh('SPINSMITH', …)` from
`ui.ts:128` (written but never used) over the far rim. It rises 3 cm and fades in over 0.4 s, holds
1.8 s, then fades out. The motif plays under it.
- First session: the title is followed by the first guide note.
- Returning player: replace it after 1 s with a one-line greeting such as "Welcome back, Journeyman
  · Lv 4" and, if open, "Today's order: …".
- Only on the session's first placement, not on recentres.

**Where.** `match-system.ts` `toHub` (~852), and the `LABEL_AT` anchor (`:80`) for the position.

**Why.** Every shipped game has a title beat. Without one the experience starts mid-sentence. The
greeting also answers the "Reason to Come Back" criterion as soon as the arena lands.

### 3. Show the first move, then name it (ghost carry arc). M. Emulator: yes

**What.** While `guide === 'launch'` or `'rematch'`, a dotted arc of five or six small ember dots
runs from the dock over the rim into the arena centre, on a loop, together with a translucent ghost
copy of your top. This says "carry this there" without words; the beacon ring already sits under
the dock. For `guide === 'forge'`, run the same arc from the dock to the anvil.

Shorten the note to one verb-first line, with the second line as a small caption:
- "Carry your top into the arena" (small: "pinch it, move it, let go")
- "New part: the Spur tip" (small: "pinch the anvil to fit it")
- "Rematch: carry your top in"

**Where.**
- `hub.ts` beacon (`:118`, `:187-189`, `:210-212`): add an `arc` group beside it with the same
  visibility rule.
- `match-system.ts` `guideNote` (~894).

**Why.** Meta's onboarding advice is to minimise the time to the first action. Demeo and Tiny Golf
teach by handling objects. The evaluation scored onboarding 5.5 because "text is the main teacher".

**Reach.** It only shows the existing carry.

### 4. Home assembles; unlocks get a reveal. M. Emulator: yes

**What.**
- **Every time home is shown** (after arrival, and on return from forge, workshop or match): the
  stations rise from the table one by one with `popIn` (`rim.ts:11`, already used by the forge and
  workshop drawers). Each rises 1.5 cm with ease-out-back and makes a small tick. Order: dock, level
  plate, dial, then anvil, blueprint, board and champions.
- **On leaving home:** run the same pop in reverse over 0.25 s instead of `root.visible = false`.
- **First appearance of a station** (the anvil after match 1; the board and champions when the
  guide ends):
  - a 1 s spotlight (a raised additive disc plus a light shaft cone),
  - a `playUnlock()`,
  - a one-line caption: "The forge is open", "The Smith's board: a new order every day".

  Store "seen" flags in `Progress`.

**Where.** `hub.ts` `show()` (`:160-198`) toggles visibility now; add a `t` and per-item delays.
`hide()` (`:200`).

**Why.** In the shot of the first home everything is simply there. A home that builds itself feels
made. Unlock reveals are the reward beat Meta's onboarding advice asks for: the first reward should
come quickly and visibly.

### 5. One sign language, one type scale. M. Emulator: yes (look), headset (legibility)

**What.**
- **On the machine (permanent):** engraved graphite plates (`metalPlate` + `engrave`) for
  everything, as the board, tabs and match bar already are.
  - Station names: small engraved plaques fixed to the rim in front of each station, tilted toward
    the player like the rim tabs. They replace the floating `tag()` billboards (`builder.ts:131`,
    `hub.ts:341-347`).
  - Level plate: the same metal plate. It is glass now (`hub.ts:413`).
  - Menu: becomes an engraved rim tab, "HOME", in the same place (`match-system.ts:464`).
- **Transient notes:** keep the glass card, but make it warm. Drop the blue grid and the
  blue-grey edge (`ui.ts:67`, `:84`) and use a dark smoked glass with the orange edge, so it belongs
  to the forge palette.
- **Type tokens in `ui.ts`:** `TITLE = 700`, `BODY = 600`, used everywhere. Replace the `bold` and
  `''` strings in `visuals.ts:1490`, `builder.ts:115,140` and `match-bar.ts:72`. Line 2 of a Label
  then stops falling back from the unloaded 400 weight. No italics: Meta advises against them.
- **During the first session,** hide the COMFORT name until it is pointed at (`hub.ts:241`), so
  PLAY is the only word on the near rim.

**Why.** Three styles side by side are the strongest "prototype" signal in `02-hub-first.png`.
Cubism lays its menu on the table as part of the object, and Meta's typography guide favours heavy
weights and no italics.

**Reach.** Plaques are labels, not targets. HOME keeps the Menu's position and pick radius.

### 6. Messages animate in and out, with a voice. S. Emulator: yes (MP4)

**What.** `Label.set` gets a 160 ms in (scale 0.92→1, opacity 0→1, a 4 mm drop) and a 120 ms out
before new text replaces old. Coalesce sets in the same frame.
- Guide notes and unlocks: a soft two-tone tick (a new `playNote()`, a quiet slice of the motif).
- Round words (SLAG, HELD!, INTERRUPTED!): a short punch scale (1.25→1).

**Where.** `visuals.ts:1452-1497` `Label`. It needs an `update(dt)`, called from
`MatchSystem.update`.

**Why.** Meta: "every interactive element should change visually", and sound is "the primary
confirmation". Text that blinks in place is the most common tell of jam UI.

### 7. A rival intro beat ("VS"). S-M. Emulator: yes

**What.** At a match's first READY (`toReady`, ~1551, `myPoints === 0 && theirPoints === 0`):
1. The match bar slams in: scale 1.15→1 over 0.2 s, with a low hit.
2. Your name fills from the left and the rival's from the right.
3. The rival's top spins up on its spot with a cyan flare ring. This reuses `Impacts`: tint a ring
   cyan.
4. Then the "Rival: … · style / rule" card appears.

Total about 1.2 s. It fits inside the existing `INTRO_TIME = 2.5` (`:73`) before the rip hint, so it
does not delay play.

**Where.** `match-system.ts` `toReady`; `match-bar.ts:30` (`bar()`: add an intro progress value for
the fill).

**Why.** Fighting games, which the match bar already imitates, sell the matchup before round one.
It makes the rival a character, which the "Reason to Come Back" layer (medallions, signature parts)
depends on.

### 8. The drop into the arena is a launch-pad moment. M. Emulator: yes

**What.** When the top is let go over the arena (`hub.ts` `updateHeld`, `:292-297`, which returns
`play`):
1. The top flies on a short arc (0.35 s) to its spawn and lands with a clack and a small dust ring.
2. Home sinks away (item 4 reversed) while the arena opens to match size. `updateSize` already plays
   `playMachine` and `playPlace` for this (~1260); give it a heavier landing thud.
3. `startMatch` begins after the arc, not on the frame of release.

**Where.** `match-system.ts` `startMatch` (~1123): defer by the arc time, and keep the hub visible
while it sinks.

**Why.** It turns "the home vanished" into cause and effect: you put your top in, and the machine
reconfigures for the fight.

### 9. A landing page that feels shipped, and a safe ENTER. S. Emulator: page only (desktop browser)

**What.**
- While fonts load and `World.create` runs, ENTER shows "Heating the forge…", disabled. It enables
  when the world exists. Today a click in that window does nothing (`index.ts:20-27`).
- Wrap `world.launchXR()` in try/catch. On failure, show "Could not start: allow spatial data and try
  again".
- A canvas-drawn hero: a spinning top with orange embers on the dark radial background. Pure
  canvas 2D or CSS, no assets.
- Three numbered pictograms instead of plain chips: 1 sit at a table, 2 put the controllers down,
  3 allow spatial data. Pinch and table glyphs drawn inline as SVG.
- One line: "Best on Meta Quest 3 / 3S · 10 minutes · hands only".
- ENTER becomes "ENTER THE FORGE".

**Where.** `index.html:8-56`, `src/index.ts:20-33`.

**Why.** It is the first frame a judge sees and the thumbnail of the hosted link. Meta's Growth
Insights treat expectation-setting before launch as part of onboarding.

### 10. A real hand print and an honest wait while placing. S. Emulator: yes

**What.**
- Draw a hand-print glyph (palm and five fingers, orange glow) on a canvas texture in place of the
  ring and disc. The code itself calls them a stand-in (`match-system.ts` ~489).
- Text: "Rest your palm here" / small "or pinch the glow".
- A thin countdown arc around the print shows the 8 s auto-place (`PRESS_WAIT`, `:40`). A tray
  placement after it then looks deliberate: the arc completes, and "No table found" becomes "No
  table: your arena floats here".
- A low hum rises as the palm nears the print height.

**Why.** PianoVision aligns to the real keyboard as a visible step. Making the room part of the
game is what Meta's onboarding guidance asks for in MR. A countdown removes the "did it freeze?"
gap.

**Reach.** Unchanged: the same press and pinch.

### 11. A UI sound set. S. Emulator: logs only (WebAudio does not play in screenshots)

**What.** Add five small synth voices to `audio.ts` beside `playPick`/`playPlace`:
- `playArrive` (item 1);
- `playNote` (item 6);
- `playHover`: a 30 ms very quiet tick when a hub item starts to be pointed at (`hub.ts:237-245`,
  on hover change only);
- `playOpen` and `playClose`: a heavier latch for entering and leaving the forge and workshop.

Stop using the builder's `playPlace` for arrival and for leaving home. The ForgeLoop should fade in
on arrival and duck to 0 during the title (`match-system.ts:654`).

**Why.** Meta calls audio confirmation "not optional" for hands. Beat Saber players say quieter hit
sounds make hits feel weaker.

### 12. A quieter level plate in the first session. S. Emulator: yes

**What.** While `progress.guide !== 'done'`, the plate shows only "Lv 1 · APPRENTICE" and the XP
bar. "Next: … at Lv 2" and "Next match: …" appear after the first session. Shrink the plate about
15% and move it 1 cm lower so the dock and the guide own the first view.

**Where.** `hub.ts` `drawRank` (`:407-438`), `buildStand` (`:447-452`).

**Why.** One message at a time. "Zero-G Dish at Lv 2" means nothing before the first fight.

### 13. A comfort dial you can read without text. S. Emulator: yes

**What.** A canvas disc under the knob with four engraved positions and glyphs: speaker, eye without
a flash, palm, and speaker-off plus palm. The notch points at the active one. The name card shows
only on hover or change. Today its state is readable only through the transient card.

**Where.** `hub.ts` `buildComfort` (`:372-389`).

**Why.** Diegetic state, like a real dial. It also supports the Accessibility award without asking
the judge to read.

### 14. An idle, living home. S. Emulator: yes (MP4)

**What.**
- A few slow additive embers rising off the anvil's glowing face (reuse `Sparks` at a low rate).
- The rival's top waiting in the arena wobbles and idles slowly.
- The arena's rim glow breathes once every 4 s.
- The dock top already turns (`hub.ts:213`).

Keep the particle count under 20 for fill rate.

**Why.** An "attract mode" at rest is what separates a game from a scene. It is cheap, and the
video needs it.

---

## 4. Copy pass (first session)

| Now | Proposed |
|---|---|
| "Press your table / palm down, here: the arena rises" | "Rest your palm here" / "or pinch the glow" |
| "Your top waits in its dock / Put it in the arena to play" | "Carry your top into the arena" / "pinch it, move it, let go" |
| "Finish your first match / Put your top in the arena" | "Your first match is still on" / "carry your top in" |
| "New part: Spur tip! / Pinch the small anvil to forge" | "New part: the Spur tip" / "pinch the anvil to fit it" |
| "Your top is ready / Put it in the arena for a rematch" | "Rematch" / "carry your top in" |
| "No table found: the arena floats here / Move it by its brass handle" | "No table: your arena floats here" / "drag the brass handle to move it" |
| "Comfort: Calm: no flashes, press to strike / Pinch the dial again for the next" | "Calm" / "no flashes · press to strike" (the dial glyphs carry the rest) |
| "Menu" | "HOME" (an engraved rim tab) |

Rules: a first line of at most five words, starting with the verb or the noun that matters; a small
second line; one exclamation mark at most, and only for rewards.

---

## 5. Suggested order

Items 1, 2 and 11 together are the single biggest "real game" change: arrival, title and sound in
one pass, about a day. Then 5 and 6 (UI consistency and motion), then 3 and 4 (teaching by showing,
assembling home), then 7 and 8 (match entry), then 9, 10 and 12-14 as fillers. Re-run sim-check §16
after item 5 (the HOME tab) and after any station move. Record a before and after MP4 of the first
90 seconds with the hand driver for each step.
