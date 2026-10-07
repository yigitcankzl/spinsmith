# SpinSmith: benchmark against the best hand-tracking and MR games on Quest

Oct 8, 2026. Read-only research: no source was edited and no emulator or browser was used. The
inputs were README.md, BRIEF.md, docs/SUBMISSION.md, docs/polish/DONE.md and
docs/reviews/FULL-EVALUATION.md, a short look at `src/game/` to check that each proposal fits the
code, and web research (reviews, store pages, Meta's design docs). Sources are listed at the end
and cited inline as [n].

**Honesty notes.**
- "Pencil Pals" could not be found. The closest match is **Pencil!** [25], the 2024 Meta Presence
  Platform Hackathon winner, and that is what this report uses.
- No mixed reality mode for Walkabout Mini Golf could be confirmed (its Quest 3 update is about
  resolution and frame rate [16]). It is used here for social play, replay and comfort.
- **No VR or MR spinning-top battler was found** on the Quest Store, App Lab, SideQuest or Steam.
  The nearest games are flat-screen: Beyblade X Evobattle (Steam and Switch 2) [27] and the mobile
  game Spin-Tops [28]. The genre slot on Quest is empty.

---

## 1. What the best games do, per dimension

| Dimension | Who does it best, and how | What reviews criticise |
|---|---|---|
| **Onboarding** | **Tiny Golf**, the 2025 Start winner for Best Casual Game: "all you need is a pinch" [1]. **Starship Home**: a companion teaches as you play [5]. **First Encounters**: the room scan itself is a delight ("an incredibly satisfying experience") [7]. **Pencil!**: a small tutor character, Leo, sits on your desk [25]. | **Laser Dance**: almost no guidance, so players learn by trial and error [3]. **Thrasher**: "does take a little sticking with" before it clicks [12]. **Starship Home**: the companion "pipes in a little too much" [5]. |
| **Hand-tracking feel and feedback** | **Cubism**: fingertips light up to show which fingers hold a grab, and the hand turns red when it is occluded or hard to track [9]. Its passthrough mode draws an outline of your real hands over game objects [10]. **Thrasher**: one continuous motion verb that "never once felt anything but accurate" [12]. **Demeo**: you pick up minis, pull cards from a palm-up deck and roll the die [14]. Meta's guidance: "teach one core interaction, use it everywhere"; every poke, pinch or grab "needs strong audiovisual feedback"; go by the general direction of a gesture, not its exact position [20][21]. | **Hand Physics Lab**: you cannot predict when tracking will fail, and objects get "launched into the stratosphere". After an hour the reviewer's hands felt like "weak meat puppets". Score 5/10 [11]. Quest tracks hands at 30 Hz by default, overshoots on fast motion [22], and tracks worse in dim rooms [23]. |
| **MR use of the room** | **Laser Dance**: levels are "calculated parametrically based on the room", and the developer tested many rooms side by side in an emulator [4]. **Starship Home**: ship modules placed around your room, plus 3D audio that tells you where to turn [5][6]. **Demeo**: the board snaps to a real table, with lighting matched to the room [15]. **Eleven Table Tennis**: passthrough made players feel safer, and some stayed "over three hours" [8]. | **LEGO Bricktales**: its MR is "closer to a gimmick… just plain passthrough", although the diorama on the table still feels natural [13]. **Starship Home**: small rooms lose the magic [6]. **Drop Dead: Home Invasion**: 3.1 stars on the store, and its later updates had to add better onboarding and MR fixes [17][18]. |
| **Session length** | **Cubism**: sessions of 10 to 20 minutes, "pick up and play" [19]. **Walkabout**: 20 to 30 minutes alone, hours with friends [16]. **Starship Home**: about 3 hours in total [5]. | **First Encounters** "does get stale fairly quickly" [26]. **Laser Dance** is "not endlessly replayable, at least not yet" [3]. |
| **Replay hooks** | **Walkabout**: a hidden ball on every hole, hard versions of courses, hunts that give cosmetics [16]. **Thrasher**: leaderboards and unlocks [12]. **Pocket Lands** (a 2025 Start winner for hand interactions): an in-game camera to record and share builds [24]. **Tiny Golf**: a course builder [1]. | Short showcase games (First Encounters, Laser Dance in early access) are criticised mostly for lacking depth [3][26]. |
| **Presentation polish** | **Cubism**: a minimalist, "perfect, complete package" [19]. **Thrasher**: "gorgeous, entrancing sights and sounds" [12]. **Starship Home**: diegetic interfaces and coloured overlays that set the mood [5]. | **Bricktales**: you spend most of the time hunched over the diorama, steering like an RC car [13]. |
| **Audio** | **Cubism**: slow, calm piano [19]. **Starship Home**: a catchy beat made from the plants, plus spatial cues [5][6]. **Thrasher**: its soundtrack is the selling point [12]. | Meta's hand guidance treats sound as the stand-in for missing haptics [20][21]. |
| **Social and sharing** | **Walkabout**: its multiplayer is where it "truly shines" [16]. **Eleven** and **Demeo**: co-located and online play [8][15]. **Pocket Lands**: share captures [24]. **Laser Dance**: a party game that is fun to watch [3]. | Single-player MR showcases are rarely praised for longevity [26]. |
| **Accessibility** | **Laser Dance**: settings for player height, shoulder width, lowest crouch and laser speed [3][4]. **Walkabout**: plays seated or standing; the putter auto-extends to the green and never collides [16]. **Cubism**: advanced controls and a dark mode [19]. | **Cubism**: some placements need "twisting your arm into a strange position" [19]. Meta: never ask for hands above heart level for long, and avoid reaching far [21]. |
| **Performance** | **Walkabout**: 90 fps on Quest 3 [16]. A WebXR game loads from a URL in seconds and needs no install [29]. | Quest Browser WebXR is usually GPU-bound, with a frame budget of about 8 to 14 ms [29][30]. |

**What past competition winners have in common** (BRIEF.md, [1][2][25]): one legible hand verb
(Tiny Golf's pinch, Dun Jun's punch, slap and poke, Pencil's real pencil); the real table, room or
object at the centre; tight scope with high polish; and, for Tiny Golf and Pocket Lands, a way to
create something.

---

## 2. Where SpinSmith is already competitive

1. **An original concept in an empty slot.** No MR spinning-top battler exists on Quest (see the
   honesty notes). Its hero verb, reshaping the arena floor mid-fight, has no counterpart in any
   game above. This beats Bricktales' "plain passthrough" criticism [13] on its own terms: the
   table sets the arena's height, a palm on the table places it, slapping the table is the strike,
   and thrown tops land on the real desk.
2. **Diegetic, table-scale UI** at the level of Demeo and Starship Home [5][15]. The forge, the
   workshop, the match bar, the board and the level plate are all one machine on the table, and
   there are no floating menus.
3. **A user-generated arena workshop with a built-in balance oracle**, the same kind of feature
   as Tiny Golf's course builder [1]. The live dials (median round length, knockout rate, type
   balance), computed in a worker, go further than any comparable builder found.
4. **Depth for "Reason to Come Back".** 226 builds, 15 arenas, 7 rivals in circuits, daily Smith
   Orders, feats, personal bests and champions. That is more structure than First Encounters or
   Laser Dance, which reviewers called thin [3][26], and it is close to Walkabout's
   collectibles-and-hard-mode loop [16].
5. **Forgiving input that follows Meta's advice** [20][21]. The pinch has hysteresis, tracking
   gaps under 0.1 s are ignored, a lost hand cancels instead of committing, the ramp rises on the
   pinch rather than on release, and the slap detector ("down, then still") ignores a hand resting
   on the table. Every shape, pick and place has a sound (`playThock`, `playPick`, `playPlace`).
   This is exactly what made Hand Physics Lab frustrating when it was missing [11].
6. **Comfort is already designed in.** It is seated, every touch target sits between 0.32 and
   0.67 m (checked in CI), and the comfort dial covers calm, quiet and a press-and-hold strike.
   That is more than most jam entries, though less than Laser Dance (see gap 9).
7. **Juice and identity.** Stamped words, hit-stop, slow motion, replays of your own knockouts,
   sparks that cool, a synthesized score at 96 bpm on one motif, and clashes tuned to each ring.
   This is the same "a whole, consistent package" quality that reviewers praise in Cubism and
   Thrasher [12][19]. All of it is unverified on a headset.
8. **Zero-install access.** The game opens from a URL, with `?fresh` and `?demo` for shared
   headsets, and an install manifest. Judges hit no store flow and no download [29].

---

## 3. The 10 most important gaps, ranked

Ranked by how much each one changes a judge's 10-minute session first, and store-style reviews
second. Effort assumes one developer on the existing code. Every proposal uses procedural assets
and synthesized audio only.

### 1. Feel, latency and frame rate on a real headset are unproven
**Benchmark.** Hand Physics Lab scored 5/10 because tracking was unpredictable [11]. Thrasher's
praise is "never once felt anything but accurate" [12]. The competition requires at least 60 fps.
**SpinSmith.** Nothing has been measured on a Quest yet (README "Known limits"). The rip (1 m/s)
and the slap (0.6 m/s down) are both fast motions, exactly where Quest's default 30 Hz tracking
overshoots [22]. The shaping report shows the game turns on latency: a ramp lag of 0.35 s wins 57%
of rounds and a lag of 0.62 s wins 51%.
**Proposal.** Run the ACTION-PLAN day-one protocol first: pinch-to-ramp latency, slap hits out of
20 and false slaps from a resting hand out of 20, fps in the hub (about 210 draw calls) with the
dimming shell and the occluders on, and the pinch thresholds. Tune only through the `tuning.ts`
knobs. Add a dev-only on-screen fps and latency readout so the numbers can be quoted in the
submission ("72 fps on Quest 3").
**Effort.** 1 day of measuring, then 1-2 days of tuning.

### 2. No live hand-state feedback (Cubism's red hand)
**Benchmark.** Cubism's fingertip glow and red occluded hand [9], and Meta's rule that every pinch
"needs strong audiovisual feedback" plus a hover state [21].
**SpinSmith.** Actions have sounds and the far ray has a blue dot, but the hand itself never shows
(a) how close it is to a pinch, (b) that a pinch is held, or (c) that tracking is weak. A judge
whose ramp "didn't happen" cannot tell a missed pinch from a lost hand.
**Proposal.** In `hands.ts` / `hand-occluder.ts`, draw a small procedural ring between the thumb
tip and the index tip. It closes as the gap nears the 2.0 cm pinch threshold and turns
molten-orange while the pinch is held, in the cord's colours. When the joint poses go missing or
jump more than a few cm in one frame, tint the ring red for about 0.3 s and play a soft "fizz". On
the arena, show a faint ghost ramp under the pinch point during the 0.12 s hold (it exists for the
ramp; extend it to the cup).
**Effort.** 0.5-1 day.

### 3. Teaching still leans on text; show the gesture instead
**Benchmark.** Tiny Golf teaches one pinch [1]. Starship Home and Pencil! use an embodied guide
[5][25]. Laser Dance is criticised for no guidance [3], Starship Home for too much talk [5], and
Meta says to minimise time to the first action [21].
**SpinSmith.** The staged guide is good (one verb per match), but each new verb still arrives as a
two-line label at about 70 cm, and its legibility in the headset is unverified (FULL-EVALUATION
section 4).
**Proposal.** **Ghost hands.** Build a translucent hand from capsules and spheres on the WebXR
joint layout, and replay the motions the hand driver already scripts (`src/dev-drive.ts`: rip,
ramp, cup, sling, palm slap) at the exact spot, in a 2 s loop, until the player does it once. Cut
each label to one or two words ("PULL", "PINCH THE FLOOR"). This reuses code that already exists
and is the most "First Five Minutes"-friendly change available.
**Effort.** 1-1.5 days.

### 4. The hero moment is small: 6 cm tops on a 72 cm arena
**Benchmark.** Bricktales' bricks are "accurately sized to their real-world counterparts" [13].
Eleven puts a full-size table in your room [8]. The memorable MR moments are the ones you can see
from your chair.
**SpinSmith.** FULL-EVALUATION calls the scale "the biggest presentation risk". A ramp throw lasts a
fraction of a second, and footage will show a few pixels.
**Proposal.** (a) On the device, try the `?scale=` knob at 2.8-3.0 during fights only. Big arenas
already open out for a match, so reuse that transition. (b) For the 1.5 s after any shape hits the
rival, draw a short additive ribbon trail behind the thrown top (in the cord's style) and a ground
ring where it lands. (c) For a THROWN finish, make sure the arc clears the rim and the top skids
and falls over on the real table at real scale. That is the cold open in the video.
**Effort.** 1 day, plus the scale decision on the device.

### 5. A 10-minute session needs a clear arc with less dead time
**Benchmark.** Cubism's sessions of 10 to 20 minutes [19], Walkabout's "20-30 minutes of
satisfying" play [16], and the competition's "satisfying in ≤10 minutes".
**SpinSmith.** Rounds take about 13-15 s, but between rounds the result card, the XP bar, NEW!
cards (about 2.8 s each) and a pinch to continue stack up. The first session's arc (match, then
forge, then rematch) has never been timed with a stopwatch.
**Proposal.** Script the judge path with `scripts/drive.sh` from `?fresh` and record the time to:
first rip, first ramp, first round won, end of match 1, Spur fitted, end of the rematch. Target:
match 1 over in 4 minutes or less, the second match started in 7 minutes or less. Merge the result
card and the XP fill into one beat, and let a pinch skip any card. Write the timings in TESTING-NOTES
so judges know "two matches fit in 10 minutes".
**Effort.** 0.5 day.

### 6. The room is used as a plane; use its edge too
**Benchmark.** Laser Dance adapts to the room [4], Starship Home to the walls [5], and Demeo
matches the table's lighting [15]. Judges are told the room should "meaningfully change the
experience".
**SpinSmith.** The arena uses the table's height and its outline polygon (`room.ts`), and tops that
fly out land on the desk. But where they land changes nothing in the game.
**Proposal.** **OFF THE TABLE.** Using the table polygon `room.ts` already reads, a thrown top that
crosses the real table edge and falls to the floor scores a stamped "OFF THE TABLE!" with a bonus
XP feat and a long falling whistle. The AI's aim stays the same, so nothing needs rebalancing. On
the tray fallback (no table), the feat is simply unavailable. This also gives the video a second
"only in MR" shot.
**Effort.** 0.5-1 day.

### 7. Audio is panned but not spatial
**Benchmark.** Starship Home's 3D audio tells you where to look [6]. Thrasher's and Cubism's audio
carry the identity [12][19].
**SpinSmith.** Spin hums and clashes are stereo-panned (`x` arguments in `audio.ts`). DONE.md lists
"Spatial (HRTF) audio" as not built.
**Proposal.** Route the hums, clashes, slag sizzles and the rival's tell whine through WebAudio
`PannerNode` (`panningModel: 'HRTF'`) at the tops' world positions, with the listener updated from
the head pose each frame. That is two nodes per voice, so it is cheap. A tell that whines from
behind the rival's top teaches you to look.
**Effort.** 0.5 day, then a check on the device.

### 8. No social or sharing layer
**Benchmark.** Walkabout's multiplayer [16], Demeo and Eleven together in a room or online
[8][15], Pocket Lands' shareable captures [24], Tiny Golf's shared courses [1], and Laser Dance as
a game people watch [3].
**SpinSmith.** Single-player only. Arenas and tops live in `localStorage`, with no way to send one
to someone else.
**Proposal (no server).** **Challenge codes.** Encode a build (ring, core, tip, spin, colour) and,
optionally, a saved arena layout into a short base-36 string, shown on the champion plate and the
workshop's stamp slot as a URL (`…/?vs=K7Q2-M9`). Opening it gives a "Challenger" rival who uses
that build in that arena, and a stamped win or loss to send back. It fits the existing rival
system (rivals are just a build plus a move) and `layout.ts`, which is already plain data. Second
step: a "pass the headset" duel that alternates the two players' tops against the same rival and
compares their heat.
**Effort.** 1 day for the codes, 1 more day for pass-and-play.

### 9. Accessibility stops at the comfort dial
**Benchmark.** Laser Dance lets you set your body measurements and the game's speed [3][4].
Walkabout's putter auto-extends to the green [16]. Meta discourages repeated reaching [21].
**SpinSmith.** The comfort dial covers flashes, sound and a gentle strike. Missing: a slower game
speed, handedness, and reach. The far edge of a 1.25 m stadium is a stretch, and the tested reach
band goes up to 0.67 m, past Meta's 42-46 cm touch zone [21].
**Proposal.** Add one more dial step, **Assist**: simulation time at 0.8x (`sim.ts` already steps
at a fixed rate, so this is a scale on dt), a 1.5x catch radius on cups, and fight-time arenas
capped so their far rim stays within 0.55 m (the shrink code already exists for tables). Mirror
the home stations for left-handed players (the dock moves to the right rim).
**Effort.** 0.5-1 day, plus `report:shaping` to check the assist stays fair.

### 10. The replay hooks are deep but invisible in 10 minutes
**Benchmark.** Walkabout's hidden ball on every hole, which you spot within minutes [16], and
Thrasher's leaderboards [12].
**SpinSmith.** Orders, feats, medallions and champions only appear after the first session.
FULL-EVALUATION says the depth "mostly helps Reason to Come Back" but is invisible to judges.
**Proposal.** (a) Put **one hidden ember coin per arena** at a random spot on the floor. It is
collected when your top passes over it, and the arenas drawer shows it as a gem on the miniature.
That gives a visible "secret" in match 1. (b) At the end of match 2, a one-line teaser on the board:
"Tomorrow's order: ramp Iron Keep out", which makes the daily loop legible in the first session.
(c) A personal-best line on each order ("Best: 41 s"), since global leaderboards need a server.
**Effort.** 1 day.

**Not ranked, but required:** the trailer, the cover image and the hosted cold-start test
(SUBMISSION "Still to do"). Polish & Presentation explicitly scores the submission materials, and
Pocket Lands and Laser Dance both sell themselves on watchable footage [3][24].

---

## 4. What would get us featured

Meta's own featured MR picks share three traits. You can explain the room-native moment in one
sentence (Laser Dance: "Mission Impossible in your living room" [3]; Pencil!: a real pencil on real
paper [25]). The hands feel trustworthy (Cubism, Thrasher [9][12]). And the moment looks great when
filmed. SpinSmith's sentence is "**you reach into the arena and raise the floor under your
rival**". To be featured, that moment has to read from the chair and on camera: big enough (gap 4),
confirmed by the hand itself (gap 2), shown rather than explained (gap 3), and ending on the real
table or floor (gap 6). Add challenge codes (gap 8) so every player's top and arena can travel as a
link, and SpinSmith becomes the first spinning-top game in VR, the one shareable MR tabletop
fighter, and a browser game with no install. That is the story to lead the trailer and the
Devpost text with, plus one measured claim of 72 fps on Quest 3.

---

## 5. Risks reviewers commonly flag for hand-tracking MR games

| Risk | Example | Does SpinSmith have it? |
|---|---|---|
| Unpredictable tracking ruins precise physics | Hand Physics Lab [11] | **Partly mitigated**: gaps under 0.1 s are ignored, a lost hand cancels, direction matters more than position. **Open**: fast rips and slaps at 30 Hz overshoot [22], unmeasured. |
| Fast motion and overshoot | Quest compared with PS VR2 [22]; Thrasher plays better on controllers [12] | **Yes, by design**: the rip and the slap are the fastest moves. The release-power code already handles "tracking lost right at release" (`match-system.ts` around line 1871). Whether the Quest Browser exposes Fast Motion Mode to WebXR is unknown; assume it does not. |
| Dim rooms degrade tracking | [23] | **Unmitigated.** Add one landing-page line: "Play in a well-lit room". The dimming shell darkens only the virtual image, not the camera feed. |
| Hand occluding hand | [23] | **Low**: no gesture needs two hands, and slings are pinched with one. |
| Fatigue and reaching | Hand Physics Lab after an hour [11]; Cubism's arm twisting [19]; Meta's guidance [21] | **Medium**: reach goes up to 0.67 m, and slaps repeat every round. Short rounds and the gentle strike help. See gap 9. |
| Accidental selection when targets are packed close (Meta's "Midas touch" effect) | [21] | **Medium**: the forge has up to 6 parts on a half circle and the workshop rail 5 pieces. Check the 12 mm spacing and 22 mm targets on the device. |
| Too many gestures | Meta: "teach one core interaction" [21] | **Mitigated** by one verb per match. There are still 5 or more verbs in total, so the ghost hands (gap 3) matter. |
| Room-dependent breakage ("rooms the developer never tested") | Laser Dance's multi-room testing [4]; Home Invasion's later fixes [18] | **Partly**: the game needs a table or desk label from Space Setup, but falls back to a tray with an in-headset card. Uses a private IWSDK `_plane` field with a warning. Test in 3 or more real rooms. |
| MR that is just a backdrop | Bricktales [13] | **No**: the table is part of the game (placing, the strike, landings). Gap 6 strengthens this. |
| Thin content, gets stale | First Encounters [26], Laser Dance in early access [3] | **No**: the depth is high. The risk is the reverse, depth judges never see (gap 10). |
| Onboarding too thin or too chatty | Laser Dance [3] / Starship Home [5] | **Leans chatty**: text labels. See gap 3. |
| Frame rate in MR | GPU-bound WebXR [29][30] | **Unknown**: about 210 hub draw calls, a passthrough shell and occluders. See gap 1. |
| Comfort in passthrough (flashes, motion) | Meta MR guidance [31] | **Low**: hit-stop freezes the tops, never the view, and Calm mode removes flashes. |

---

## Sources

1. Meta, "Meet the Meta Horizon Start Developer Competition Winners" (Tiny Golf, Pocket Lands, Dun Jun, Nanauts, …): https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/
2. Tiny Golf on Devpost: https://devpost.com/software/tiny-golf (it returned 403 to the fetcher; the quote is from [1] and docs/polish/FIRST-TIME.md)
3. UploadVR, Laser Dance early access review: https://uploadvr.com/laser-dance-early-access-review
4. Road to VR, "Designing Mixed Reality Apps That Adapt to Different Spaces" (Laser Dance case study): https://roadtovr.com/designing-mixed-reality-apps-dynamic-spaces-laser-dance-case-study/
5. Road to VR, Starship Home review: https://roadtovr.com/starship-home-review-quest-3-mixed-reality/
6. Thumb Culture, Starship Home review: https://www.thumbculture.co.uk/starship-home-quest-3-review
7. Creative Bloq, First Encounters on Quest 3: https://www.creativebloq.com/news/meta-quest-3-game-changer
8. Meta success story, Eleven Table Tennis and Cubism in mixed reality: https://developers.meta.com/horizon/discover/success-stories/ariko-eleven-table-tennis-and-cubism
9. UploadVR, Cubism hand tracking update: https://uploadvr.com/cubism-hand-tracking-update-oculus-quest/
10. UploadVR, Cubism passthrough and hand tracking: https://uploadvr.com/cubism-passthrough-hand-tracking/
11. Road to VR, Hand Physics Lab review: https://roadtovr.com/hand-physics-lab-review/
12. Press Start, Thrasher review: https://press-start.com.au/reviews/2024/07/23/thrasher-review-rhythmic-gymnastic-violence/
13. Road to VR, LEGO Bricktales Quest review: https://roadtovr.com/lego-bricktales-review-quest-3-2-pro/ ; FutureFive: https://futurefive.co.nz/story/game-review-lego-bricktales-meta-quest-3
14. Mixed News, Demeo hand tracking: https://mixed-news.com/en/demeo-tabletop-vr-role-playing-game-gets-hand-tracking/
15. Road to VR, Demeo mixed reality update: https://roadtovr.com/demeo-mixed-reality-update-quest-pro/ ; hand tracking update: https://roadtovr.com/demeo-hand-tracking-update-quest-3-apple-vision-pro/
16. UploadVR, Walkabout Mini Golf review: https://www.uploadvr.com/walkabout-mini-golf-review/ ; Mighty Coconut, Quest 3 update: https://www.mightycoconut.com/blog/quest3
17. UploadVR, Drop Dead: The Cabin mixed reality: https://uploadvr.com/drop-dead-the-cabin-mixed-reality-quest-3-pro
18. Mixed News, Home Invasion hands-on: https://mixed-news.com/en/home-invasion-hands-on/
19. UploadVR, Cubism review: https://uploadvr.com/cubism-review/
20. Meta, Hands best practices: https://developers.meta.com/vr/design/hands-best-practices/
21. Meta, Hands UI best practices: https://developers.meta.com/horizon/design/hands-ui-best-practices/
22. UploadVR, PS VR2 hand tracking compared to Quest 3 (Waltz of the Wizard): https://uploadvr.com/playstation-vr2-hand-tracking-compared-to-quest-3-waltz-of-the-wizard ; Fast Motion Mode: https://uploadvr.com/quest-hand-tracking-2-4-improves-fast-motion-mode
23. Meta, hand tracking troubleshooting and limitations: https://developers.meta.com/horizon/documentation/unity/unity-handtracking-troubleshooting-limitations/
24. UploadVR, Pocket Lands early access: https://uploadvr.com/pocket-lands-early-access-launch
25. Meta blog, Pencil!: https://www.meta.com/blog/pencil-learn-to-draw-in-vr/ ; UploadVR full release: https://www.uploadvr.com/pencil-learn-to-draw-full-release/
26. TechRadar, Quest 3 guide (First Encounters "gets stale fairly quickly"): https://www.techradar.com/computing/virtual-reality-augmented-reality/i-test-vr-headsets-for-a-living-heres-my-ultimate-meta-quest-3-guide-for-newbies
27. DashFight, Beyblade X Evobattle: https://dashfight.com/news/there-s-a-beyblade-fighting-game-7984
28. Spin-Tops (mobile): https://www.bluestacks.com/apps/arcade/spin-tops-on-pc.html
29. Meta, WebXR performance: https://developers.meta.com/vr/documentation/web/webxr-perf/ ; dmnshd, WebXR vs native: https://dmnshd.gg/blog/webxr-vs-native-vr
30. Meta community forum, Quest Browser WebXR fps: https://communityforums.atmeta.com/discussions/dev-general/meta-quest-browser--babylonjs--slow-fps/1230168
31. Meta, MR design: passthrough: https://developers.meta.com/horizon/design/mr-design-passthrough/
32. UploadVR, Waltz of the Wizard on Quest: https://uploadvr.com/waltz-of-the-wizard-quest/
