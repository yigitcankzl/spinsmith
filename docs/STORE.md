# SpinSmith on the Meta Horizon Store

The path from the competition build to a store listing. Details and sources:
`docs/polish/STORE-READY.md`.

## Done in the build

- Immersive WebXR PWA: `public/manifest.webmanifest` (`name`, `short_name`, `id`, `start_url`,
  `scope`, `display: standalone`, `lang`, `categories`, 192 and 512 icons, a maskable 512).
- Launches straight into XR when installed (standalone display mode); a browser tab keeps the
  landing page with ENTER.
- Works offline after the first load (`public/sw.js`, production builds only).
- Privacy policy page: `public/privacy.html` (no data collected; progress in local storage only).
- Pause on focus loss (fight and sound stop, nothing left on the hands), recenter re-places the
  arena, a frame-rate guard (under 62 fps for 3 s: lighter rendering), visible start failure,
  guarded saves, comfort options (sound, flashes, gentle strike, Assist at 80% speed).
- No brand ids in the bundle (parts renamed; old saves migrated).

## Needs the owner

1. **Hosting** on a fixed HTTPS origin (for example Vercel or Netlify). The competition requires
   the URL not to change after Nov 18.
2. **Packaging** with `@meta-quest/bubblewrap-cli`:
   `bubblewrap init --manifest=https://<origin>/manifest.webmanifest --metaquest` (app mode
   `immersive`), a stable package id (for example `com.spinsmith.game`), a signing key kept safe,
   then `bubblewrap build`. Put `/.well-known/assetlinks.json` (package name and the key's SHA-256
   fingerprint) on the origin. Rebuild when permissions or the icon change.
3. **Developer dashboard:** the app's metadata (below), the privacy URL
   (`https://<origin>/privacy.html`), a support email, the free IARC questionnaire (expected
   Everyone 10+ / PEGI 7), then upload the APK.
4. **Device checks** before submitting: 72 fps on Quest 3 and 3S, the slap and press thresholds,
   pause with the Meta button, recenter, hand tracking off, a room without a labelled table.

## Listing copy

- **Name:** SpinSmith
- **Short description:** A seated, hands-only spinning-top battler on your real table. Forge a top
  from parts, rip it into the arena with a pull of your hand, then reshape the arena floor
  mid-fight to throw your rival out.
- **Long description:** You fight by reshaping the arena. Pinch the floor and a ramp rises under
  your rival; press a cup in and sling what it catches; slap your real desk for a shockwave that
  leaves a molten handprint. Rivals arrive through portals in your room, thrown tops skate off
  your real table, and every sound comes from where it happens. Forge your top from 226
  combinations of ring, core and tip, each changing the physics. Climb seven rivals in three
  circuits across fifteen arenas, earn feats, beat your bests, take the daily Smith Order, and
  build arenas of your own. Share your top as a code and a friend fights it. Seated, hands only,
  no account, works offline. Comfort options: sound, flashes, a gentle strike and an Assist speed.
- **Keywords:** spinning top, tops, battle, arena, hand tracking, hands only, mixed reality,
  passthrough, tabletop, seated, forge, crafting, physics, daily challenge.
- **Category:** Games (Action, Casual). **Modes:** single player. **Input:** hands.
  **Play area:** seated. **Comfort:** comfortable. **Internet:** first load only. **Language:**
  English.

## Art

Placeholders from the emulator (photo mode, no UI) are in `~/Desktop/spinsmith-videos/store/`:
`cover-landscape-2560x1440.png`, `cover-square-1440.png`, `cover-portrait-1008x1440.png`,
`hero-3000x900.png`, `logo-transparent.png` (Rajdhani Bold, the forge orange bar),
`icon-512-opaque.png`, and gameplay frames. For the store, re-shoot the gameplay on a Quest in
passthrough on a real table: screenshots must be real first-person gameplay with no added text.
The dev hand driver has a photo mode (`["photo"]` hides cards, buttons and hands) for clean
frames, and `scripts/trailer.sh` cuts a rough trailer.
