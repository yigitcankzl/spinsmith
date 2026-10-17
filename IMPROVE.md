# SpinSmith competition sprint — verified 2026-10-17

This is the current source of truth after reconciling six review agents with the code. Constraints:
no Quest is available, public hosting happens after the game is locked, and emulated evidence must
always be labelled as IWER footage.

## Position

- Strongest qualities: original hand-authored arena combat, a clear physical rip, deep build and
  arena systems, async Echo challenges, daily orders and persistent champions.
- Best award targets: **Reason to Come Back**, then **Boldest Original Concept**.
- Main unresolved risk: there is still no proof from a physical Quest. IWER proves logic and visual
  flow, not real hand-tracking quality, thermals, passthrough quality or headset frame rate.
- Do not add live multiplayer, an LLM rival or another large mode before submission.

## Completed and verified

| Change | Commit / evidence |
|---|---|
| `hitTest` and `depthSensing` are optional; XR launch rejection recovers the entry button | `5321d8f` |
| Two-hand forge grips are inside seated reach | `c1d3d00` |
| Challenge codes carry an opponent's recorded rips and arena forges | `c6549f3` |
| Depth occlusion uses `MinMaxSoftOcclusion`; XR framebuffer scale is 0.85 | `762da0f` |
| A cup requires a deliberate downward press (0.35 m/s) | `64df48e` |
| 280 ms tracking-loss grace covers rip, shaping, arena forge, ultimate seal, Outer Ring, hub, forge and workshop carries | `0cb4cf9` |
| Cup/sling/rim spring/palm brace stay hidden for the first two completed matches | `0cb4cf9` |
| Rim spring waits 250 ms for a possible second forge hand; passive brace requires a low, flat palm | `0cb4cf9` |
| Echo arena forges telegraph 0.8 s early with a ghost hand and warning | `77fae4c` |
| Palm placement raises the smithy where the real table is pressed; strikes leave molten prints | existing, runtime verified |
| A thrown player top can use the real table and Outer Ring rescue; table-edge failure ends the round | existing |
| Room imprints, scars, daily orders and the last three champion tops persist | existing |

Verification run after the changes:

- `npm run typecheck`: pass.
- `npm run check:sim`: pass.
- `npm run build` and public-release check: pass.
- IWER immersive-AR session: active; `DepthSensingSystem` active with three occludables; no application
  error in the browser console.
- Screenshot: `artifacts/occlusion-perf-final.png`.

## Remaining work, in order

1. **Physical Quest smoke test through another person.** Host the locked build, ask one Quest 3/3S
   owner to complete placement, rip, ramp and forge, then report the lowest FPS and any lost gesture.
   No code claim can replace this evidence.
2. **Submission video story.** In a labelled IWER room: palm placement → rip → two-hand forge →
   table/Outer Ring moment → reload to show orders, scars and champions. Put “Captured in Meta IWER
   emulator — no headset used” on the footage.
3. **Make the opponent's off-desk landing a clearer verdict.** It currently awards the feat and a
   moment after an `over` finish, but is presentation layered on the existing score rather than a
   separate heat rule. Prefer a `DESK KO` verdict/bonus only if simulation tests can keep the match
   result deterministic.
4. **Come-back copy.** Add a short board line such as “2 orders waiting · last champion: …”; use
   existing persisted data and do not introduce background timers or fake offline progress.
5. **Measured performance only.** Do not globally cache `topPlastic` (each `TopView.dispose()` owns
   that material) or convert soft shadows/glows to alpha-test blindly. Optimize further only after a
   headset trace identifies a real bottleneck.
6. **Optional polish:** fight-target hover audio/lighting and a between-round hand-rest prompt. These
   are lower value than the video and device proof.

## Submission framing

Pitch the game as: **“Rip a top, then forge the battlefield with your hands while it fights.”** The
new experience is not a virtual top alone; it is the combination of a familiar physical rip, live
two-hand deformation, and the real table becoming a recoverable part of combat.

The footage must never claim native Quest FPS, passthrough quality or headset-tested interactions.
The repository and Devpost description should say exactly which checks were performed in IWER.
