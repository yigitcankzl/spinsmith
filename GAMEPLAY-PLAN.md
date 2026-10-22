# Gameplay implementation report — 2026-10-18

The gameplay audit is now implemented. This file records what changed, what the automated
measurements show, and what still cannot be proved without a physical Quest. It deliberately avoids
claims based only on a screenshot.

## Outcome

The launch still creates an advantage, but it no longer decides the whole round. The player now has
several readable decisions after the rip: spend or save a shaping charge, turn an existing ramp into
a one-use dash rail, catch a nearby top, brace a threatened rim with an open palm, forge the arena
with two hands, interrupt the rival, or use the once-per-round table knock.

The game also has visible return reasons beyond a score counter: one hidden shard in every campaign
bout, a persistent 15-shard collection, and a harder Night Circuit unlocked by finishing the main
circuit and finding every shard.

## Measured before and after

The after sample is 1,560 deterministic headless rounds: 13 duel bouts × 3 starter builds × 40
runs. It measures the core simulation without player hand interventions, so it is a conservative
check of the base fight rather than a claim about final player win rate.

| Metric | Before | After |
|---|---:|---:|
| Median round | 21.7 s | 18.8 s |
| Spin-out finishes | 69% in the no-intervention baseline | 45.6% |
| Pocket finishes | minority / about 5 s | 39.2% |
| Rounds reaching the 45 s cap | present | 0% |
| Strike bar median fill | 10.9 s | 7.7 s |
| Winner changes from +0.005 launch power | about 20% | 4.4% |
| Winner changes from +0.005 rad aim noise | 26.2% | 2.7% |
| Winner changes from deliberate +0.03 rad aim | 28.1% | 16.9% |
| Starter win rates | one defensive family dominated | Striker 46%, Anvil 54%, Halo 37% |
| Previously weak drain rival | about 33% rival win | player 49%, close to even |

Launch direction is committed in approximately 2.9° slots. This filters sub-degree hand-tracking
jitter while preserving visible, deliberate aim changes. Launch power is quantised and its speed and
spin ranges are narrower; a strong rip matters without becoming an invisible coin flip.

## Implemented core changes

1. **Late-round pressure.** At 15 seconds the pockets progressively widen and the effective outer
   rim lowers. The arena announces the pressure phase, and passive spin-outs no longer dominate.
2. **Earlier, teachable strike.** The bar begins at 45%; a well-timed rival interruption refunds
   half the bar, and a cue identifies the valuable near-rim window.
3. **Real charge economy.** Passive refill takes six seconds. Only a collision caused by the
   player's own arena shape can refund a charge.
4. **Stable rip input.** Launch power and aim resist tracking noise, with deterministic tests for
   both the filter and the fight simulation.
5. **Build balance.** The former height/tip dominant family was reduced, drain/grind was improved,
   and every campaign bout has a forgeable counter in the automated matchup sweep.
6. **Reactive rival.** Rivals can feint, act early, and brace when the player visibly prepares a
   forge action. The old instruction that gave away the solved strategy was removed.
7. **Unambiguous hand targets.** Before a pinch closes, the arena previews `RAMP`, `RIM`, `CATCH`,
   or `SLING`. The old empty-air cup became a magnetic catch beside a live top. Arena tilt requires
   a deliberate height split and shows the classified action before release.
8. **Comeback scoring.** A single highlighted Crucible pocket is worth three points; matches are
   first to four. Ordinary ring-outs still matter, while one aimed play can reverse the score.
9. **Asymmetric arena forge.** The player's own top receives only 40% of the forge impulse, making
   the physical move tactical instead of equally random for both sides.
10. **Less waiting.** The opening protection is 1.8 seconds, spin finishes move on quickly, and
    simultaneous finishes use a deterministic position/damage tie-break instead of replaying.

## Implemented table and hand tactics

- **Dash rail:** re-pinching the player's existing ramp spends one charge and arms a one-use boost.
- **Open-palm brace:** a low, flat palm at the arena edge becomes a visible temporary wall; releasing
  one rim pinch no longer spends a charge by accident.
- **Knuckle quake:** two deliberate table contacts from the same hand send one directional shock per
  round. It uses tracked contact, not microphone audio.
- **Two-hand arena forge:** squeeze, stretch, twist, and tilt visibly deform the bowl, spring back on
  release, briefly slow the impact, and apply different impulses to the tops.
- **Magnetic catch and sling:** the press must happen near a live top; the caught top can then be
  redirected with a physical pull.

## Implemented modes and retention

- **Secret deck:** online and passed challenges present three role-level choices. Exact parts stay
  hidden until both players rip, then both builds reveal together. Network protocol version 2 carries
  and validates the selected builds.
- **Brawls:** Last Spin, King of Pocket, and Crucible Race use explicit win conditions and last-hit
  credit instead of treating every multi-top match as the same survival mode.
- **Hidden shards:** each of the 15 campaign bouts has one discoverable, pinchable shard and persistent
  collection state.
- **Night Circuit:** completing the circuit and finding 15/15 shards unlocks shifted arenas, stronger
  rivals, faster rival shaping, and guaranteed arena interaction.

## Verification completed

- `npm run typecheck`
- `npm run check:sim`
- `npm run check:sim-n` — crowded rounds deterministic; 4 tops × 45 simulated seconds in 24 ms
- `npm run check:net` — packet, interpolation, event sanitisation, build reveal, direction, catch and
  sling checks pass
- Real two-browser WebRTC smoke test — peers connected and exchanged `hello`
- IWER immersive session — two-hand rip, two-hand arena squeeze, and open-palm brace probes pass
- Desktop IWER fight render snapshot — median 152 draw submissions total, approximately 76 per eye;
  this is comparative emulator evidence, not a headset FPS result
- `npm run build` and the public-release check pass

## Remaining hardware-only risk

No physical Quest is available. The browser emulator proves game state, geometry, hand paths, network
protocol, and deterministic simulation; it cannot prove real Quest hand-loss behaviour, thermal
performance, passthrough depth quality, or sustained 60/72 FPS. Those remain explicit submission
risks and must not be described as tested.

## Commits

- `e0a059b` — mid-fight decisions, pacing, scoring, balance and rival behaviour
- `845d988` — gesture clarity and table tactics
- `437aac8` — shards and Night Circuit
- `177fda6` — target-based brawl modes
- `75ffe81` — secret deck and reveal protocol
- `3fc33b1` — launch aim stabilisation

## Hands and room pass — 2026-10-21 evening

Headless sweep with the HUMAN reaction/aim model, 20 arenas x 9 type pairings x 6 rounds, win
points over doing nothing (none = 51.1%); about +-1.5 points is noise. Emulator checks are IWER.

| Verb | Before | After | Change |
|---|---:|---:|---|
| Flick (new, fingertip collider) | — | +16.7 | swing through a top; one charge; tired tops fly |
| Spin Rub (new) | — | +5.9 | rub your own top's rim with its spin; one charge per 1.2 s window |
| Forge Gust | +0.1 | +8.9 | never pushes your own top; aimed at a pocket: x2 push and a lift |
| Rim Spring | -1.6 | +10.0 | your top pulled in and rim-held 1 s; the rival slung toward its pocket |
| Arena Forge squeeze | -1.0 | +7.4 | exposed rival x3, mid-bowl x0.2; squeeze throws the rival out |
| Arena Forge stretch | +3.3 | +6.9 | same aim rule |
| Arena Forge tilt | +0.1 | +5.6 | same aim rule |
| Arena Forge twist | +0.3 | +3.4 | same aim rule |
| Rush strike | -5.1 | +0.8 | the rim holds your rushing top: no more self-knockouts (13.4% -> 2.6%) |
| Crossguard | -0.6 | +5.1 | rail stays live 0.8 s; saves refund the charge; an escaping rival is sent to its pocket |
| Ember rivet | -0.8 | +7.4 | the planted rivet is a 3 s post that kicks the rival outward |

Random mashing of each reworked verb gains about +2 or less (forge +2.8).

Still dead weight under human lag: palm brace (about 0; a wall that stays after the hand lifts
adds under a point, a wider one helps random use as much). The no-lag brace reaches +12.

Room: the emulator now loads IWER's `office_small` capture, whose desk is a real labelled
plane, so DESK KO, the rival's desk guard and the new red real-edge arcs on the rim run through
the production table path (desk KO proof: 3 heat). Fresh starts clear every saved key; the
first match's lessons can now win rounds (IWER: YOUR RAMP -> SLAG at 3.7 s).

## Night pass, 2026-10-22 (measurements; details in NIGHT-LOG.md)

| What | Before | After | How measured |
|---|---|---|---|
| Real-edge drop side (rim under each red arc, `DESK_DROP_ESCAPE` 0.55) | — | masher +0.5 win; ramp aimed at the arc beats the same habit at the wrong rim by +3.0 win / +0.18 heat (side desk), +2.4 / +0.10 (far desk); over-the-wall ≤ 20% of finishes; plain-ramp median round 14.8 → 11.2 s | `reportShaping`, HUMAN timing, 24 rounds per pair |
| First session (fresh save, scripted newcomer, IWER office_small) | first KO 46 s (round 2), match 133 s, 55 prompts / 258 words | first KO 15.6–23.1 s, first DESK KO 36–38 s, match 57–64 s, 20 prompts / 72–74 words | `npm run check:first-five` |
| First-match prompt copy (static) | 359 words | 152 words (cap 5 per prompt) | sim-check 14d |
| Hub copy at rest | 45 words, longest 9 | 18 words, longest 4 | sim-check 15b |
| Crowded bouts, best build last spinning | 2-3: 88%, 3-3: 100% | 50%, 50% (assert ≤ 65%) | sim-check |
| One-Euro on aim/hover points | — | still-hand jitter −67%; 1.5 m/s sweep lag 13.8 mm | sim-check |
| Draw calls per eye (IWER) | `?demo` quoted as 172–200 (both eyes) | fresh fight 102, `?demo` hub 98 / fight 103 | `report:render-budget` |
| Game update CPU per frame (laptop, IWER) | — | p50 0.6–0.7 ms, p95 1.0–1.2 ms | `report:runtime-performance` |
| `check:hands` sequential | ~1 clean run in 2 | 5 clean runs in a row (after the double-charge fixes) | IWER |
| Room matrix | — | 10/10 cases (labelled, living room, none, small, unlabelled, tilted, two desks, coffee table, far table, control) | `check:room-matrix`, synthesised planes |
