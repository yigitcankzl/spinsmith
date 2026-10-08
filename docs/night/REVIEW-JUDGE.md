# Competition judge review (night RC pass, 2026-10-08)

Read-only review. Inputs: BRIEF.md, README.md, docs/SUBMISSION.md, docs/TESTING-NOTES.md,
docs/NIGHT-AUDIT.md, docs/polish/PLAYTHROUGH3.md, docs/polish/DONE3.md, the baseline screenshots
in docs/night/baseline/01-09, and spot checks in src/game/match-system.ts.

## 1. Official pages vs BRIEF.md (fetched 2026-10-08)

WebFetch returned 403, so I fetched the pages with curl: overview, /rules, /updates,
/details/judging, /details/special-awards, /details/faqs, /details/dates on
https://start-developer-competition-26.devpost.com/.

**Unchanged:**
- Deadline Nov 18, 2026 12:00 PM PST. Judging Nov 23 9:00 AM PST to Dec 9 7:00 PM PST. Winners Dec 11 10:00 AM PST (/details/dates).
- Four criteria, each 25%, with a Stage One pass/fail viability screen. "AI tools may also be used to assist in the judging" (rules section 5).
- IWSDK builds need a link (GitHub Pages or "your preferred hosting solution"). The project must stay available until the winner announcement and must not change after the deadline.
- The video must be under 3 minutes and public on YouTube or Vimeo. Emulator footage is allowed.
- Team names, emails and roles go in the submission form.
- Updates: no new posts since BRIEF. The newest is still "Give yourself a schedule" (Live Build Session Oct 13).

**New or sharper than BRIEF.md (add to the brief):**
- **Special award texts, verbatim** (BRIEF lists only the names):
  - *Best First Five Minutes*: "The craft of the opening: how fast it explains itself, teaches controller-free interaction without a wall of text, and delivers a payoff before the headset comes off."
  - *Best Reason to Come Back*: "Thoughtful progression and reward design: something to work toward, visible growth between sessions, a loop that pulls the user back tomorrow. Built for longevity, not a one-time demo."
  - *Boldest Original Concept*: "...whether the experience would fall apart on any other platform."
  - The awards are open to both divisions. FAQ: "Each Entry is only eligible for one prize... you will be awarded the highest prize value."
- **A second hard requirement on the overview: "Policy Compliance".** The entry must follow the Meta VR Start Program Terms, Community Standards, Code of Conduct in VR Policy, Developer App Policies, Developer Content Guidelines "and all other Developer Policies". BRIEF only lists the content rating. Data use matters here: plane data stays local, and the project has a privacy.html.
- **Design guideline wording:** the "one bus stop test" ("can someone have a complete moment in a short ride?") sits alongside "something satisfying in 10 minutes or less".
- **Language:** testing instructions must also be in English (rules line on Language). TESTING-NOTES already is.
- **Criteria wording:** the rules version of Innovation is shorter ("e.g., spatial depth, hands-first design") than the /details/judging version that BRIEF quotes ("...gaze, passthrough mode, scene understanding, persistent anchors"). Same weights. Treat the longer judging-page text as the operative one.
- **FAQ:** IWSDK entries go "to a GitHub page link (if built with IWSDK/WebXR)". Other hosts remain allowed by the rules.
- **Participants:** 2,536 (up from 2,412 in judge-report.md).

## 2. Scores today (as a judge would play it, assuming a working URL)

| Criterion | Score /10 | One-line reason |
|---|---|---|
| Innovation & Creativity | 7.0 | Reshaping the arena mid-fight, plus real-table moments (off the desk, palm strike, portal on a wall), is distinctive. Tops are a familiar genre. |
| Experience Design | 6.5 | One-verb-at-a-time onboarding with a ghost hand, seated reach checks, comfort dial. Hurt by tiny or clipped UI (FoV) and the result-phase pinch bug. |
| Technical Implementation | 5.0 | Deterministic sim, plane-based table fit, frame-rate guard (match-system.ts:1503-1517). **Zero headset measurement** (README.md:32) against a stated 60 fps bar. Relies on a private `XRPlane._plane` (match-system.ts:2034). |
| Polish & Presentation | 4.5 | In-engine look is cohesive (01-09), but there is no video, no hosted link, no cover image (SUBMISSION.md:108-113). The pitch is a feature list. |
| First Five Minutes (special) | 6.5 | Landing page, then the ring on the table, the dock, the ghost-hand rip, a ramp, a knockout and its replay inside about 2 minutes: strong. Round transitions are fragile (finding 3). |
| Reason to Come Back (special) | 6.0 | Daily Smith Order, circuits with champions, feats, levels unlock options, challenge codes (09-home-reload.png). All local and solo. The board that sells it is hard to read (finding 2). |

Without a hosted URL and a video the entry fails Stage One. Everything above is conditional on that.

## 3. Findings (max five, prioritized)

### 1. CRITICAL: Nothing a judge can open, and nothing measured on a Quest
- **Evidence:**
  - docs/SUBMISSION.md:108-113 ("Hosted production build... Capture the video on a Quest" still to do).
  - README.md:32 ("nothing has been measured on a headset yet").
  - docs/NIGHT-AUDIT.md "Quest-only / owner blockers".
  - Rules: IWSDK entries need "a link... for judges to access and test" and must stay available until the winner announcement. Technical criterion: "performant on Meta Quest hardware (min 60 fps)".
  - Night baseline: 2.6 MB main chunk (728 kB gzip), 134-144 draw calls.
- **Impact:** critical. Without a link the entry fails Stage One. Without a headset run, the 25% Technical score is a guess. The [PERF] guard at match-system.ts:1503 is a safety net, not evidence.
- **Smallest fix:** owner deploys the current `dist/` to a public static host now (Vercel, or a public deploy-only repo with Pages; the source repo is private). Then one 15-minute seated session on a Quest 3 or 3S: cold start in a private tab, no table labelled, then a labelled table. Read the `[PERF]` and `[MATCH]` console lines over ADB, and write the measured fps into README.md:32.
- **Regression/scope risk:** none to the code. The hosted URL must be frozen after Nov 18.
- **Do NOT now:** add features or rewrite visuals before the first headset numbers exist. Do not buy a paid GitHub plan just for Pages.

### 2. HIGH: FoV-aware design is visibly failing in three views
- **Evidence:**
  - 07-workshop.png: the piece strip is clipped at the right ("BOOS", "PAD"), and the fifth tab ("AR...") runs off the side.
  - 09-home-reload.png: the Smith's board (the Reason to Come Back surface) sits top-left and off-axis. Its rival row and the "Challenge a friend: ?vs=..." footnote are unreadable at emulator resolution.
  - 02-first-ready.png and 03-first-fight.png: the instruction sub-lines ("pull back and let go", "drag to aim it at the rival") are a fraction of the headline's size.
  - 05-home-after-match.png and 09-home-reload.png: the WORKSHOP plaque is still drawn across the forge anvil (PLAYTHROUGH3 #17, not in DONE3).
  - Criteria: "keep essential UI and interactions within a comfortable, narrower FoV and adapt across devices".
- **Impact:** high. FoV awareness is named explicitly in both Experience Design and Technical. Judges on a Quest 3S, with a narrower FoV than Quest 3, see even less.
- **Smallest fix:**
  - Workshop: shrink the drawer row or page it so all tabs fit within about ±25° of the arena axis.
  - Board: move it onto the arena axis behind the far rim, or tilt it toward the head.
  - Raise the minimum label sub-line size to about the headline size × 0.6.
  - Offset the WORKSHOP plaque off the anvil.

  These are placement and size constants only.
- **Regression/scope risk:** low to medium. Moving the board can collide with the portal (now "centred low beyond the far rim") and the match bar. Re-check 01, 05 and 09 and the reach test in check:sim.
- **Do NOT now:** redesign the hub, add a 2D menu or new panels, or restyle fonts.

### 3. HIGH: A pinch during a round's result skips the card and arms the next rip, and "pinch to skip" the replay does the same
- **Evidence:**
  - src/game/match-system.ts:840-879: in `result`, every frame calls `updateReadyPinch()` after the Menu check.
  - src/game/match-system.ts:2223-2225: any fresh pinch within `LAUNCH_REACH = 1.0` m (line 58), which covers the whole seated space, calls `toReady()` and starts a rip from that pinch.
  - src/game/match-system.ts:1277-1282: the REPLAY plate says "pinch to skip", and that same `justPinched` is consumed by both paths.
  - PLAYTHROUGH3 #17: "A floor pinch made just after a round ended launched a 20% rip ('launch power 0.20') twice". It is not listed as fixed in DONE3.
- **Impact:** high for First Five Minutes and Experience Design. In the first session the player is taught to pinch the floor for ramps, and keeps doing it as the round ends. The between-round tip card ("Rip again / Leech opposite spin...") and the replay vanish, the next round starts with a cord already attached, and a weak launch can cost the round. On a headset it reads as "the game launched by itself".
- **Smallest fix:** in `updateReadyPinch`, make the result-to-ready transition consume the pinch: `if (this.phase === 'result') { this.toReady(); return; }`. In the `result` case, also `break` before `updateReadyPinch()` while `this.replay` is active, so the replay's own skip handles that pinch. Optionally ignore pinches for the first 0.5 s of `ready`.
- **Regression/scope risk:** low. It adds one pinch between rounds. Driver recipes that chain `rip` right after a result (scripts/drive.sh, the SUBMISSION storyboard recipes) may need an extra `wait` or pinch. Re-run the clean-save first-session flow from the night baseline.
- **Do NOT now:** rework the round state machine or the replay system.

### 4. MEDIUM: The forge, the second-session hook, does not read
- **Evidence:**
  - 06-forge.png: the tip parts are look-alike cog blobs. The labels overlap (SPUR over CHISEL; PIN and BEAD crowd the rim), and the top on the anvil hides the drawer's centre.
  - The stats card ("STRIKER BOLT CHISEL" with five gauges) is tiny.
  - PLAYTHROUGH3 #17: "The forge label is still empty in the forge phase".
  - SUBMISSION.md:34-36 claims 226 combinations "each changes the physics, not just a number". A judge cannot see that difference in this view.
- **Impact:** medium. Reason to Come Back ("visible growth between sessions") and Polish both lean on this screen. Today it looks like an inventory grid.
- **Smallest fix:** keep only the parts you own visible, and space them on a wider arc, with one label each and no overlap. Put the selected part's one-line effect ("Spur: rushes, burns spin fast") on the empty forge label. Enlarge the stats card gauges.
- **Regression/scope risk:** low to medium. The forge carry/drop hit-tests use part positions. Re-check the fit-Spur and quench flow from the night baseline.
- **Do NOT now:** add parts, change part balance, or build a new forge UI.

### 5. MEDIUM: The headline room moments depend on Space Setup labels the judge's room may not have, and the pitch oversells that
- **Evidence:**
  - Table fit and off-the-desk need a horizontal plane labelled table or desk (match-system.ts:1933, 2039). The portal on a wall needs a vertical plane labelled wall (match-system.ts:2060).
  - Without a labelled table, the arena floats on a tray after 8 s (TESTING-NOTES.md:69).
  - Plane data is read from IWSDK's private `_plane` (match-system.ts:2034).
  - Yet SUBMISSION.md's description and storyboard open on "OFF THE DESK!" and the portal on a wall.
  - Criteria: "holding up in rooms the developer never tested", "show real gameplay that honestly represents the experience".
- **Impact:** medium. A judge without a labelled desk gets a floating tray and none of the cold-open moments, so passthrough looks decorative. The palm-press placement mitigates the height, but not the desk edge.
- **Smallest fix (docs only):**
  - Make "Run Space Setup and mark your desk (and a wall)" step 0 of TESTING-NOTES "Before you start" and of README "Try it (judges)".
  - In the tray fallback message, say it in-headset: "No table found: lay your palm on your table".
  - In the video, label room shots "on Quest, desk marked in Space Setup".
- **Regression/scope risk:** none for the docs. A message change in the fallback is small.
- **Do NOT now:** try to build depth-based table detection or mesh detection before the deadline. Do not drop the private `_plane` read without a headset test.

## 4. Rule and requirement gaps only the owner can close
- **Hosted URL:** public HTTPS, free, frozen from Nov 18 to Dec 11. The source repo is private, so use Vercel or a separate public deploy-only repo. Test it in a private tab, from another network and on a Quest browser.
- **Demo video:** under 3:00, public on YouTube or Vimeo, real Quest footage (passthrough, a real table), English captions. No AI-generated video carrying the pitch.
- **Eligibility:** confirm Meta VR Start Program membership and a Meta account with Developer Access, both by submission time. Confirm residence is not in an excluded region.
- **Submission form:** team member names, emails, roles; Track = Gaming; Division = New Experience; target launch date; cover image and logo (still to do).
- **Policy Compliance** (new in the overview): pick a content rating (10+ fits) and keep privacy.html linked.
- **Device verification:** 60 fps on Quest 3 and 3S, slap/press thresholds, reach, and hand tracking under real light. Write the numbers into README.
- **Before any repo or video goes public:** scrub the "Beyblade" mentions from about 10 docs (docs/TOP-CUSTOMIZATION.md, COMPETITION-REVIEW.md, ...). The shipped bundle only keeps old part ids as a save migration (src/game/parts.ts:197), which is fine.
