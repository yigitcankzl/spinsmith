# SpinSmith: competition review (judge's view)

Review date: Oct 7, 2026. Deadline: Nov 18, 2026, 12:00 PT. That leaves 6 weeks.

Scope of the review:
- All docs, the six review screenshots, and the source in `src/game/`.
- Checks run: `typecheck`, `check:sim`, `report:arenas`, `report:tops`, `report:shaping`, `build`.
- A live look at the running IWER emulator (status, one screenshot, console logs). Emulator state was not changed.
- Web research on the rules, the 2025 winners, Meta's guidance and prior art. Sources are listed at the end.

Nothing has been measured on a Quest. Every comfort, tracking and performance statement below is a risk to verify, not a measurement.

---

## 1. Verdict

SpinSmith has a real, original hook for Quest: a hand-forged spinning top, a physical rip-cord launch, and reshaping the arena floor during the fight. The systems design is unusually thorough for week two:
- a deterministic sim with balance reports;
- a guided first session;
- daily orders and rival medallions.

As a judge would see it today, though, it is a **promising emulator prototype, not a contender**. Four things hold it back:

1. **It has never run on a headset.** The competition requires at least 60 fps on Quest and "holding up in rooms the developer never tested." The hero interactions (rip, ramp, well) depend on hand-tracking quality that cannot be judged in IWER.
2. **The mixed reality is shallow.** The real table only sets the arena's height. Without a table, it plays identically on a floating tray. There are no anchors, no occlusion, no re-placement, and nothing interacts with the room. The judging text explicitly penalises "a scene that plays identically with passthrough off."
3. **The vocabulary is borrowed from Beyblade X.** Core names 3-50/4-60/9-60/5-80, tips Flat/Rush/Taper/Ball/Needle/Orb, dash rails geared by the tip, and spin/over/burst finishes worth 1/2/2 points, first to 4. Beyblade fans among the judges will read it as a Beyblade X clone, which cuts against "Original, not a wrapper" and the third-party-IP rule.
4. **Presentation is not at Quest-store level.** Assets are procedural matcaps, all audio is synthesized with no music, the text on the far rim is very small, and there is no video, cover art or hosted build yet.

**Estimated scores (1-10) if submitted as is, with a plausible emulator video:**

| Criterion (25% each) | Score | Reasoning |
|---|---|---|
| Innovation & Creativity | **6.5** | Arena reshaping and the hand-forge are fresh on Quest; no top battler appears on the store. Points lost: the table is barely used (take-it-away test), and the Beyblade X terminology makes it look derivative. |
| Experience Design | **5.5** | Seated, hands-only and with a designed first session: good. Against that: interactables near the chest (tabs 14-22 cm in front of the eyes), small far text, no in-headset recenter, onboarding hidden after the first player on a shared headset, and an untested feel. |
| Technical Implementation | **4.5** | Strong headless sim and tests, clean pause, robust saves. But no Quest frame time; about 6 ms CPU per frame on a desktop emulator; per-frame normal recomputation and canvas uploads; no anchors or occlusion; placement is a one-shot 2 s after entry. |
| Polish & Presentation | **4** | A coherent "forged tech" palette and a font now exist. Still: procedural primitives, gray emulator shots, synthesized-only audio with no music, and a generic white 2D landing panel. No video, cover, logo or hosting. |
| **Weighted** | **≈5.1 / 10** | Probably passes Stage One (viability). Not in the prize band for the $100k/$50k Gaming slots. |

**Realistic ceiling with 6 focused weeks and at least one week on a Quest: ≈7-7.5.** That is competitive for **Best First Five Minutes**, plausible for **Boldest Original Concept** if the real table matters, and a long shot for a Gaming placing.

---

## 2. What the competition rewards (research summary)

| Fact | Source |
|---|---|
| Four criteria at 25% each: Innovation & Creativity, Experience Design, Technical Implementation, Polish & Presentation. Stage One is pass/fail viability; Stage Two scores. Human judges, possibly AI-assisted. | Rules §5, FAQ, Judging page |
| Passthrough "should be purposeful… a table becomes the play surface… rather than a scene that plays identically with passthrough off" | Judging page |
| Technical: "performant on Meta Quest hardware (min 60 fps), solid and bug-free", "anchoring content to detected planes, surfaces… holding up in rooms the developer never tested" | Judging page |
| Gaming track: "hands-first or eyes and hands… genres that thrive seated, without controllers". Hard requirement: "fully usable with hands, end-to-end… complete the entire experience without ever pairing a controller" | Overview, FAQ |
| Design guidelines: airplane-seat test (two-foot radius); "Fast cold start, clean pause/resume, and something satisfying in 10 minutes or less… one bus stop test"; "Original, not a wrapper… take it away test" | Overview |
| New Experience division: conceived and built from Sep 24, 2026; no pre-existing codebase | Overview |
| WebXR/IWSDK: a hosting link judges can open (GitHub Pages, Vercel, etc.). No PWA or store listing required | FAQ / Resources |
| Video: under 3 minutes, on YouTube or Vimeo, Quest or emulator footage, "real gameplay that honestly represents the experience". Judges need not watch past 3:00 | Rules, Judging page |
| Projects modified after the deadline may be disqualified. The project must stay free and available until winners are announced (Dec 11) | Rules |
| No third-party IP, brand names or recognizable branded products | Rules |
| Special awards, $25k each: Best First Five Minutes, Best Reason to Come Back, Boldest Original Concept, Accessibility, Social & Multiplayer, Agentic Interaction. Plus 2 Judge's Choice at $20k | Special awards page |
| The 2025 winners lean towards MR table-scale toys driven by a pinch (Tiny Golf won Best Casual Game), hands-only physical verbs, and tight, polished scope. IWSDK winners: Dun Jun (hands plus physics, built in about a month) and The Nanauts | Meta "meet the winners" blog |
| Hands UI: targets of about 2.5-3° and at least 48 dp; direct touch at 42-46 cm; avoid 0.5-0.8 m; frequent controls in the lower half; a short, distinct sound on every selection | Meta hands UI best practices |
| WebXR frame budget: 13.7 ms at 72 Hz, 16.6 ms at 60 Hz; app logic over 2 ms should be optimized; one light with PBR | Meta WebXR perf workflow and best practices |

Implication: judges will test on a real Quest in their own rooms, probably once or twice, from a link. Everything that only works in the developer's emulator is invisible or a liability.

---

## 3. Findings, ranked by impact on winning

Sizes are rough developer time.

### F1. Never run on a headset: the core feel, comfort and frame rate are unproven (critical)
- **What.** Every pillar is a hand-tracking gesture whose feel is unknown:
  - the rip, whose power is 60% from peak hand speed (`match-system.ts:912-940`);
  - the near ramp (pinch within 5 cm local, which is 10 cm in the world, of the floor);
  - the well (fingertip 4 mm into a virtual floor);
  - far ramps by hand ray.
  The docs' own P0 kill criteria (`DESIGN.md` §14, `GAMEPLAY-DIRECTION.md` §16-17) have not been tested.
- **Evidence.**
  - `QUESTLESS-PLAN.md` "Only verifiable on a physical Quest": all 8 items are open.
  - Desktop CPU per frame is already 5.9-6.5 ms in IWER (`VISUAL-POLISH.md` §6). Quest 3's CPU is several times slower per thread than a desktop core, so the same work could land at 15-25 ms. Unmeasured.
- **Why judges care.** 60 fps minimum is explicit. Hands that "don't listen" kill Experience Design and the First Five Minutes award.
- **Fix.** Secure a Quest 3 or 3S for at least 5-7 days in total (borrow, buy refurbished, a university lab). Day 1 is the device checklist below. **Size:** device access is the blocker; tuning is 3-5 days.

### F2. The real room barely matters: it fails the passthrough "take it away" test (high)
- **What.**
  - The table only sets the arena height (`findTable`, `match-system.ts:799-818`). Without one it floats on a tray (`TRAY_DROP`).
  - `anchors`, `hitTest` and `meshDetection` are requested (`iwsdk.config.json`) but never used.
  - There is no depth occlusion. Real hands are drawn *behind* the virtual floor exactly when you pinch it or press a well into it.
  - A ring-out top simply disappears (`visuals.ts:601`, `visible = top.state !== 'out'`).
- **Why judges care.** The judging text calls this out directly, and Boldest Original Concept asks whether it "would fall apart on any other platform." Today the honest answer is "it would work on a flat screen with a mouse," which `DESIGN.md` §2 itself feared.
- **Fix, cheapest first:**
  1. **Ring-outs onto the real table.** The ejected top flies over the rim, lands on the detected table plane (its height is already known), skids, wobbles and topples beside the arena, then fades. Bursts scatter parts onto the table too. This is the single biggest MR payoff per hour. ~1 day.
  2. **Contact shadow and AO** on the real table plane under the arena and tops (partly done). Make it visibly *on* the table.
  3. **Depth occlusion** (`DepthOccludable`, IWSDK skill `iwsdk-depth-occlusion`) for at least the arena floor and tops, so fingers pressing into the floor read correctly. Must be checked for cost on device. 1-2 days.
  4. **Anchor the arena** (XRAnchor on the table plane) and re-place on `referenceSpace` `reset` (see F5). 0.5-1 day.
  5. Optional, cut if short of time: a **table slam**. A palm strike on the real table (wrist velocity spike near the plane height) jolts both tops. This was in the original design.

### F3. Beyblade X terminology and rules: an originality and IP risk (high, cheap to fix)
- **What.**
  - Cores: `3-50, 4-60, 9-60, 5-80` with teeth and height (`parts.ts:149-152`). These mirror Beyblade X ratchet names (3-60, 4-60, 9-60, 5-80 …).
  - Tips: `Flat, Rush, Taper, Ball, Needle, Orb` (`parts.ts:156-161`). These are Beyblade X bit names.
  - Rails whose dash depends on the tip's gear echo Beyblade X's Xtreme Line and Xtreme Dash.
  - Scoring: spin +1, over/burst +2, first to 4 (`match-system.ts` `MATCH_POINTS`, README:123). This is Beyblade X's tournament scoring.
- **Evidence.** Beyblade X parts: https://beyblade.fandom.com/wiki/Basic_Line, https://otakumart.co.nz/products/ux-10-customize-set-u-beyblade-x. Scoring: https://www.chaoscards.co.uk/blog/x-perience-the-new-beyblade-generation. `DESIGN.md` §11 says the game "does not imitate … part names", but it does.
- **Why judges care.** The rules forbid third-party IP and brand-recognizable elements, and the track asks for "Original, not a wrapper". The likeliest judge reaction is "Beyblade X in MR." This costs Innovation points even if it never becomes a legal issue.
- **Fix.**
  - Rename into the smith fiction:
    - cores by function, e.g. *Low Hilt / Standard / Locked / Tall*, or smith stamps;
    - tips, e.g. *Skid, Chase, Drift-Point, Anchor-Ball, Awl, Bead*.
  - Re-label finishes in smith terms, e.g. *Quenched / Thrown / Shattered / Outlasted*.
  - Change the match target to something that is not "first to 4 with 1/2/2" (first to 5, or 3 for a pocket).
  - Remove "burst" as a branded-sounding term from the UI and the video.
  - **Size:** 0.5-1 day including the docs, `SUBMISSION.md` and the reports.

### F4. Interactables sit too close and too low for a seated player at a real table (high)
- **What.** The arena center sits 0.6 m in front of the eyes (`REACH`, `match-system.ts:28`), drawn at 2x (`ARENA_SCALE`). As a result:
  - The forge tabs at `TAB_Z 0.19` local (`forge.ts:107`) end up about **0.22 m** in front of the eyes horizontally, roughly 0.4 m below them.
  - The workshop tabs at `PLATE_Z 0.232` (`builder.ts:265`) end up about **0.14 m** in front of the eyes, at chest height.
  - The docs disagree with the code: README:14 says 40 cm, `SUBMISSION.md:58` says "about 0.45 m".
- **Evidence.**
  - `docs/review/workshop.png`: the PIECES/FLOOR/FORM/EXTRAS tabs sit at the very bottom edge of the view.
  - The live forge screenshot shows the part tray under the hands at the bottom of the frame.
  - Meta's guidance puts direct touch at 42-46 cm. Hand tracking is weakest close to the body and below the headset's camera field of view.
  - On a real table the tabs may also hang past the table edge, over the lap.
- **Why judges care.** Fatigue (cramped elbows), missed pinches, and hands occluding each other. This is exactly the "doesn't listen" failure.
- **Fix.**
  - Move the tabs and the tray out to 0.35-0.45 m from the eyes. For example, keep the arena at 0.6 m but put the tabs on the near rim's *sides*, or tilt the near rim up.
  - Clamp everything touchable to 0.30-0.50 m horizontally from the eyes and to no lower than the table plane.
  - Fix the docs to match.
  - **Size:** 0.5-1 day, then a device check.

### F5. Placement is one-shot and cannot be corrected in the headset (high)
- **What.**
  - The arena is placed once, 2 s after the session starts, from the head pose at that instant (`SETTLE`, `place()` at `match-system.ts:37` and `:778`). Re-placing is a dev key only (`KeyP`, `:338`).
  - There is no handler for the reference-space `reset` (Meta-button recenter).
  - Exit and re-enter XR keeps the old world position (`update` returns early on `NonImmersive` and `phase` is unchanged, `:370`). On a new session the local-floor origin may differ, so the arena can appear offset or behind the player.
  - On Quest, planes may arrive after 2 s (permission prompt, Space Setup), which would put the arena on the tray even though a table exists.
  - `DESIGN.md` §8 promised "pinch and drag the pedestal (always available)". It does not exist.
- **Why judges care.** The rules say "holding up in rooms the developer never tested" and "clean pause/resume." A judge who glanced sideways at 2 s gets a sideways arena with no fix but reloading.
- **Fix.**
  - A grab handle on the pedestal, or a two-hand pinch on the rim, to drag and turn the arena.
  - Re-run `place()` on a new session and on `reset`.
  - Wait for a head pose that is roughly level and forward, or for planes, up to about 5 s, before placing.
  - Re-snap to a table if one arrives later.
  - **Size:** 1 day.

### F6. No hosted build, video, cover art or testing notes yet; hosting conflicts with a standing preference (blocker)
- **What.** `SUBMISSION.md` "Still to do" lists the cover/logo, hosting, a cold-start test and the video. Hosting is mandatory: judges need a link. The developer's standing preference is "no external publishing", so this needs an explicit decision.
  - GitHub Pages from a private repo requires a paid GitHub plan.
  - Vercel or Netlify static hosting works for a Vite `dist/`.
- **Rules traps:**
  - "Projects modified after the submission deadline may be disqualified": freeze a versioned URL and do not redeploy after Nov 18.
  - The link must stay up and free until Dec 11.
  - The video must be public on YouTube or Vimeo.
- **Size:**
  - Hosting: 2-4 h.
  - Video: 2-3 days including capture on a Quest (Meta's casting/recording plus a mic for sound).
  - Cover/logo: 0.5-1 day.

### F7. A shared judge headset skips the onboarding, and progress lives only in one browser (medium-high)
- **What.**
  - Progress, guide state, orders and the top live in `localStorage` (`progress.ts:180`, `forge.ts:48`). Clearing it is dev-only (Backquote, `match-system.ts:332-336`).
  - A second judge on the same headset and browser profile sees a finished tutorial, an unlocked hub and someone else's level. The best-designed part of the entry (the first session) disappears.
  - A judge using a private window loses all progress, so Best Reason to Come Back cannot be shown at all.
- **Fix.**
  - A hand-reachable "New smith" reset, for example pinch-and-hold the level plate for 2 s, then confirm.
  - A `?fresh` URL flag documented in the testing notes.
  - A second line in the notes: "To see progression quickly, open `?demo=lv8`." This seeds a mid-game save: orders, medallions, champions.
  - **Size:** 0.5 day.

### F8. Text is too small at the far rim (medium)
- **What.**
  - The match bar is 1.6 x 0.377 units, scaled 0.17 at 2x, so about 0.54 m wide across 1400 px. Its 26-32 px lines (rank, XP, names; `match-bar.ts:52-88`) come out about 10-12 mm high at about 1 m from the eyes, roughly 10-12 dmm.
  - Meta typography advises considerably larger for reading. The `docs/review/*.png` shots show the bar text and the rival card as barely legible.
- **Fix.**
  - Raise the minimum to about 18-20 dmm at the reading distance.
  - Put fewer words on the bar: name, pips and spin bars only. Move XP to the near level plate.
  - **Size:** 0.5 day.

### F9. The hero mechanic's payoff is modest and the rival never uses it (medium)
- **Evidence (`npm run report:shaping`, run today):**

  | Policy | Win rate | KO wins | Shapes per round | Notes |
  |---|---|---|---|---|
  | none | 46% | 13% | 0 | |
  | random | 47% | | | |
  | pushOut | 57% | 30% | 2.8 | median 15.6 s |
  | centerWell | 51% | | | |

  - The well barely beats doing nothing.
  - The rival's launch is random (power 0.5-0.98, aim noise; `match-system.ts:957-964`). Rounds depend heavily on the dice.
  - The rival never shapes, so the hero mechanic is never *demonstrated* to the player.
- **Why judges care.** In one sitting a judge plays perhaps 6-10 rounds. With +11 pp for a good shaper, many will not *feel* that their ramp mattered unless the result says so. The "YOUR RAMP → POCKET" callout is good but needs to fire often.
- **Fix.**
  - Make a well-timed ramp more decisive in the first match: a stronger first ramp, or the guide spot placed exactly where it ejects.
  - Add a 150-250 ms slow-motion on shape-caused finishes.
  - Give the wells one clear use, for example a well catches and *holds* a stamina top so it survives a striker.
  - Let one late rival (e.g. Bastion) raise ramps too (cyan), so the player sees the verb used against them.
  - Keep rival launch variance lower in the first match so the outcome reads as caused.
  - **Size:** 1-2 days plus the shaping report.

### F10. Performance hot spots visible in code (medium; verify on device)
- `ArenaView.sync` runs **every frame in every phase** (`match-system.ts:444`). It resamples 18x64 vertices with `arena.height()`, re-colors them, and calls `computeVertexNormals()` plus two buffer uploads (`visuals.ts:1119-1148`). Gate it on "shapes live, tilt or embers changed".
- The match bar redraws a 1400x330 canvas and re-uploads it whenever a spin percentage changes, several times a second per top during a fight (`match-bar.ts:30-91`). It also builds a string key every frame, which allocates in `update` (against `AGENTS.md`). Draw the bars as two scaled meshes over a static plate.
- `Label.set` redraws during every pull frame (`RIP IT! 87%`).
- Draw calls: hub about 196-210, forge 162, fight about 110 in IWER. This is above the ~100-150 rule of thumb for the hub. Instancing the miniatures and champions or merging static rim geometry would help.
- Bundle: 2.5 MB main (696 KB gzip) plus a 456 KB MSDF worker and the 423 KB Inter font (283 KB gzip) from the Horizon UI kit. That is only used by the 2D welcome panel. Cold start on Quest Wi-Fi is fine, but dropping the UIKit welcome panel for plain HTML would remove about 1 MB.
- **Size:** 1-2 days; worth it only after measuring on the Quest. Set the frame-rate target (72 Hz) explicitly and check that it sustains.

### F11. First five minutes: well designed, but text-led and unverified (medium)
- **Good.**
  - Dock → carry or tap the top → intro → rip arrows → a breathing ring where a ramp would pay off → first match → the Rush tip unlock → a guided forge → rematch. All are logged as non-overlapping (`QUESTLESS-PLAN.md` status).
  - Estimated time to the first rip: about 30-45 s after Enter XR. This is the strongest award angle.
- **Risks.**
  - The 2D entry page (`docs/review/home.png`) is a generic white Horizon panel with "Enter XR". It gives no art, no "sit at a table, hands only, no controllers needed", and no note to enable hand tracking.
  - Permission prompts (spatial data) come first.
  - A first match to 4 points takes perhaps 4-6 rounds at about 28 s each (rip plus ~18 s median fight plus 4 s result), so roughly 2-3 minutes before the forge appears. Acceptable, but the forge (the "Smith" in SpinSmith) is not seen until about minute 4.
  - Cards like "Rival: Iron Keep · heavy center holder / Balanced bowl: four pockets, four dash rails" are text; the award text asks for teaching "without a wall of text".
- **Fix.**
  - A styled 2D landing page with one image, three icons (seated, table, hands) and Enter.
  - Shorten the first match (first to 3, or first to 2 in the tutorial).
  - Show the forge for 5 s at the very start: the top is forged in front of you, hands-free, as an intro animation.
  - Replace intro text with icons.
  - **Size:** 1 day.

### F12. Visuals and audio below polished Quest MR titles (medium)
- **What.**
  - Procedural matcap geometry; the screenshots read as a tidy prototype, with clean UI plates but primitive part tokens. In `forge.png` the drawer parts read as dark blobs.
  - All audio is synthesized (`audio.ts`). There is no music and no spatial panning of the clashes.
  - The review images are taken in IWER's gray room, not passthrough. The video and cover need real passthrough footage.
- **Fix.**
  - The visual work in `VISUAL-POLISH.md` §5 items 6-8: emissive chips, impact flash, spin trails.
  - Make the forge parts read: a lighter rim light on the part pedestals, slight rotation.
  - Add one licensed or self-made loop for the hub and a short sting for wins.
  - Pan the clash and pocket SFX to the arena position. WebAudio `PannerNode` is cheap.
  - **Size:** 2-3 days. Do not start post-processing.

### F13. Hands-first details that will bite on a real Quest (medium)
- **Raw pinch threshold.** 20 mm on, 35 mm off on thumb and index tips (`hands.ts:4-5`), OR'ed with `gamepad.buttons[0]`. Quest's system pinch is more robust when fingers are occluded, so measure both. Fast rips lose tracking at release; handled at `match-system.ts:899-912`, but verify.
- **Accidental shapes.** During a fight, any pinch whose system ray hits the floor raises a far ramp. Any fingertip that dips 4 mm into the floor makes a well and spends a charge (`match-system.ts:994-1042`). A resting hand drifting down over the arena, or the hand coming down after a ramp, can burn charges.
  - Fix: require the fingertip to *move down* into the floor at some speed. Ignore wells within 300 ms after a ramp release from the same hand. Add a short dwell before a far ramp commits.
- **Ray versus direct ambiguity in the hub.** Near objects (dock, anvil) and far ones (miniatures and order board at about 1.1 m; `[HUB]` log) are both live. A pinch over the near rim with the ray crossing a miniature can pick the wrong thing. `distance()` biases toward near (+5 cm); verify on device.
- **No visual hands.** Without occlusion (F2), hands disappear under the arena. Consider a fingertip glow dot when the finger is inside the arena volume.
- **Haptics do not exist on hands.** Meta asks for "a short, distinct sound on every selection." Most actions have one (`playPick`, `playPlace`, `playThock`); check that the tab and drawer taps do too.

### F14. Repository and docs inconsistencies a judge might read (low-medium)
- README:10 says "Status: first playable prototype".
- README:144 says "Not in the prototype yet: top shaping, parts, energy, … pause, saving progress", which contradicts the rest of the README.
- README:146-147 says "Your top alternates between the wide and narrow shape", which is stale.
- README:14 says 40 cm; the code uses 0.6 m.
- `DESIGN.md` still describes roguelike runs, Forge Energy, a pause palm gesture and pedestal drag, none of which exist.
- There is no LICENSE.
- `.claude/`, `.agents/`, `.codex/`, `.cursor/`, `opencode.json` and `AGENTS.md` are in the repo. Harmless for the rules (there is no AI-disclosure rule), but tidy them if the repo is shared.
- **Fix.** Rewrite the README as a judge-facing page: what it is, how to play, controls, known limits. Mark `DESIGN.md` as historical. **Size:** 2-3 h.

### F15. Reason to come back: designed well, but invisible in a one-or-two-session judging window (low for scoring, matters for the award)
- **Good.**
  - Daily Smith Order seeded by date and checked as playable (`orders.ts`, `check:sim` §12).
  - Rival medallions with three notches.
  - Champions; levels 1-20 with no power creep.
  - A PWA manifest.
- **Problem.** A judge plays on one day and sees one order. `localStorage` is lost in private windows. Nothing reaches outside the session: no streak, no "tomorrow's rival" teaser.
- **Fix.**
  - After the first order, show tomorrow's order silhouette ("Tomorrow: Hookjaw on Frost Oval").
  - Show the ledger's next reward as a target.
  - Put a 20-second progression montage in the video, from the `?demo` save.
  - **Size:** 0.5 day.

---

## 4. Blockers before submission

1. **Run it on a Quest.** Measure sustained frame time in hub, forge, fight and workshop; target 72 Hz and never below 60. Verify the rip, ramp, well, forge tabs, hub ray targets, pause/resume (Meta button, sleep/wake), exit and re-enter, and plane timing in at least 2 rooms (with a table and without).
2. **Placement robustness (F5).** In-headset re-placement, re-place on new session and reset, and wait for planes.
3. **De-Beyblade the vocabulary and scoring (F3).**
4. **A hosted, frozen build** with a cold-start test from a clean browser on Quest and a private window. A versioned URL kept live until Dec 11. This needs the developer's explicit OK to publish.
5. **A video under 3 minutes** of real Quest passthrough gameplay, public on YouTube or Vimeo. An emulator video is allowed but would sink Polish and MR credibility.
6. **Testing notes** in the form:
   - sit at a table;
   - enable hand tracking;
   - allow spatial data;
   - how to recenter;
   - the `?fresh` / `?demo` flags;
   - the expected first 5 minutes.
7. **A reset or fresh path for shared headsets (F7).**
8. **Cover image, logo and a styled 2D landing page.**

## 5. High value next (after the blockers)

1. Ring-outs and burst debris landing on the real table (F2.1). This is the single best "only in MR" moment, and it belongs in the video's first 30 s.
2. Bring the touch targets into the 35-50 cm band (F4).
3. Make the first ramp decisive, add slow motion on shape-caused finishes, and give the well a clear use (F9).
4. Depth occlusion for hands over the arena (F2.3), if the frame budget allows.
5. Bigger far-rim text and a slimmer match bar (F8).
6. Perf gating: arena sync and the match bar canvas (F10).
7. Shorten the tutorial match and show the forge earlier (F11).
8. One music loop, spatial SFX and impact juice (F12).
9. A tomorrow teaser and a demo save for showing progression (F15).

## 6. Do not bother

- Multiplayer or social, leaderboards, an AI or agentic rival, voice. Out of reach and off-identity; skip the Social and Agentic awards.
- More arenas, parts, rivals or progression systems. There is already more content than a judge will see.
- Polish on the arena workshop beyond bugs. Judges may never open it. Keep it off the critical path and show it for 10 s in the video.
- Bloom or post-processing, real-time shadow maps, new environment systems.
- PWA, Bubblewrap and Horizon Store packaging. Not required; the manifest is enough.
- Fine top-balance tuning. The best build is at 66% and the parts at 44-60%. Fine for judging.
- Code splitting only to silence the bundle warning.

---

## 7. Plan to Nov 18 (6 weeks)

Assumption: a Quest is available from week 2. If it is not available by Oct 20, the entry should be submitted as is (Stage One safe) and expectations lowered. No amount of emulator work replaces this.

**Week 1 (Oct 7-13), no Quest needed**
- F3 renames (cores, tips, finishes, scoring) across the code, the docs and `SUBMISSION.md`.
- F5 placement: pedestal drag, re-place on session and reset, plane wait.
- F7 `?fresh` / `?demo` and the in-headset reset.
- F4 reach: move the tabs and tray out to 35-50 cm.
- F8 text sizes.
- F14 README cleanup.
- Decide on hosting (Vercel suggested). Deploy a *private test* URL for device testing.
- Attend the Oct 13 live build session if possible (Devpost update).

**Week 2 (Oct 14-20), Quest needed**
- Device day 1 checklist:
  - FPS per phase (OVR Metrics Tool or the Quest Browser perf overlay);
  - rip feel (FULL_PULL, FULL_SPEED, PERFECT thresholds);
  - near and far ramp reliability;
  - accidental wells;
  - tab reach;
  - pause/resume; exit and re-enter;
  - two rooms.
- Fix the top 5 issues found. Apply the F10 perf gating if frame time is over 11 ms.
- Run 3-5 fresh players through the first session and record the `GAMEPLAY-DIRECTION.md` §17 metrics.

**Week 3 (Oct 21-27), mostly no Quest**
- F2.1 ring-outs onto the table.
- F9 decisive first ramp and slow motion.
- F11 landing page and shorter tutorial match.
- F2.4 anchors.
- Back on the Quest at the end of the week: test occlusion (F2.3) and keep it only if it is cheap.

**Week 4 (Oct 28-Nov 3)**
- F12 audio (music loop, panning) and impact juice.
- Make the forge parts read.
- F15 teaser.
- On the Quest: a second playtest round and a frame-time regression check.

**Week 5 (Nov 4-10), Quest needed**
- Content freeze on Nov 6.
- Capture video footage in passthrough: several sessions, good lighting, and a real table that reads on camera.
- Cover art and logo from real captures.
- Edit the video to the storyboard. Lead with the ring-out onto the table and "YOUR RAMP → POCKET" in the first 15 s.

**Week 6 (Nov 11-17)**
- Final build, deployed to a versioned URL.
- Cold-start test on Quest (clean browser, private window, another network).
- Fill in the Devpost form, upload the video, write the testing notes.
- **Submit by Nov 17.** No deploys after Nov 18 noon PT. Keep the host up until Dec 11.

**Needs a physical Quest:**
- frame rate and frame time;
- pinch, rip, ramp and well reliability;
- reach and fatigue;
- occlusion cost and look;
- pause/resume, recenter, sleep/wake;
- plane timing and table snapping;
- passthrough readability of the colours and text;
- audio mix;
- video capture.

**Does not need one:**
- renames; placement code; reset and demo flags; reach layout math; text sizes; README;
- ring-out animation; first-ramp tuning and slow motion; perf gating;
- landing page; audio assets; teaser;
- hosting setup; submission texts.

---

## 8. Special awards: realistic targets

| Award | Fit | What it needs |
|---|---|---|
| **Best First Five Minutes** | **Best shot.** The flow is already designed and logged | Device-verified gestures; fewer words (icons); a shorter tutorial match; the forge seen early; a styled landing page. Prove it with timed playtests (first rip under 45 s) |
| **Boldest Original Concept** | Possible | The table must matter (F2) and the Beyblade X echoes must go (F3). Pitch "the arena floor is clay in your hands" plus "your top flies off onto your real desk" |
| **Best Reason to Come Back** | Weak in judging conditions | Judges play once. Show it in the video and with the `?demo` save; add the tomorrow teaser. Local-only progress limits credibility |
| Judge's Choice | Long shot | Only with standout polish |
| Accessibility | Not as is | It would need one-handed mode, a seated-low option, high contrast and a ray-only mode. Not worth it this cycle beyond one-handed play, which mostly works already |
| Social & Multiplayer, Agentic Interaction | No | Out of scope; `GAMEPLAY-DIRECTION.md` §15 rightly freezes them |

---

## 9. What is genuinely strong (keep it, put it in front of judges)

- **The concept:** a hand-forged top, a rip-cord launch, and reshaping the arena floor. Nothing comparable was found on the Quest store. The closest prior art is phone AR (BEYBLADE XR Project α) with no hands.
- **The deterministic sim with measurable balance reports.** `check:sim` passes, `report:tops` has no warnings, the type loop holds, arena round medians are 15-22 s. This is excellent for the "how we built it" text: it shows rigor.
- **Clean pause and resume** on visibility change, with audio suspended (`match-system.ts:370-378`, `audio.ts:39`).
- **Robust saves:** corrupt data falls back to defaults.
- **Controllers work as a fallback** through the grip pose, while hands are primary.
- **One machine on the table:** forge, workshop and score are part of the arena. A strong, seated-friendly UX idea that matches Meta's "no floating menus" spirit.

---

## 10. Sources

Competition:
- Overview, tracks and design guidelines: https://start-developer-competition-26.devpost.com/
- Rules: https://start-developer-competition-26.devpost.com/rules
- Judging criteria: https://start-developer-competition-26.devpost.com/details/judging
- FAQ: https://start-developer-competition-26.devpost.com/details/faqs
- Dates: https://start-developer-competition-26.devpost.com/details/dates
- Special awards: https://start-developer-competition-26.devpost.com/details/special-awards

Previous winners and similar entries:
- 2025 winners: https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/
- Dun Jun (IWSDK winner): https://devpost.com/software/dunjun
- The Nanauts workflow: https://xraispotlight.substack.com/p/tools-and-workflows-for-shipping
- Pocket Lands: https://uploadvr.com/pocket-lands-early-access-launch

Meta guidance:
- Hands UI best practices: https://developers.meta.com/horizon/design/hands-ui-best-practices/
- WebXR performance workflow: https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/
- WebXR performance best practices: https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/
- IWSDK build and deploy: https://developers.meta.com/horizon/documentation/web/iwsdk-guide-build-deploy
- PWA packaging (optional): https://developers.meta.com/horizon/documentation/web/pwa-packaging/

Prior art and comparisons:
- BEYBLADE XR Project α: https://apps.apple.com/us/app/-/id6477907047
- Beyblade X app: https://apps.apple.com/app/id6480068432
- Table Troopers: https://uploadvr.com/table-troopers-mixed-reality-strategy
- Hand Physics Lab: https://developers.meta.com/horizon/discover/success-stories/hand-physics-lab-holonautic/
- First Hand: https://developers.meta.com/horizon/blog/introducing-first-hand/

Beyblade X parts and scoring (F3):
- https://beyblade.fandom.com/wiki/Basic_Line
- https://otakumart.co.nz/products/ux-10-customize-set-u-beyblade-x
- https://www.chaoscards.co.uk/blog/x-perience-the-new-beyblade-generation

Local evidence:
- Command output run Oct 7, 2026: `npm run typecheck` (pass), `check:sim` (pass), `report:arenas`, `report:tops` (best 66%, no warnings), `report:shaping` (none 46%, random 47%, pushOut 57%, centerWell 51%), `build` (main 2.50 MB / 696 KB gzip).
- Screenshots: `docs/review/*.png`.
- Live IWER: session active, no app errors in the console.
