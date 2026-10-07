# SpinSmith: store and competition readiness audit

Oct 8, 2026. Read-only audit by a "Meta store reviewer + competition judge" pass. No source was
edited and no emulator was run. Line numbers are from the working tree on Oct 8.

Two different bars apply, and they should not be mixed up:

- **The competition** (BRIEF.md) needs only a **public HTTPS URL**, a **public video under 3:00**
  and the Devpost form. It does not require a Horizon Store listing, a PWA package, an IARC rating
  or VRC review. But the judges score "performant (min 60 fps), solid and bug-free", "clean
  pause/resume", "fast cold start", "FoV-aware", and "high-quality submission materials", which
  are mostly the same things the VRCs check.
- **The Meta Horizon Store** (later, optional) takes **immersive WebXR PWAs only**, packaged with
  Bubblewrap into an APK and reviewed against the Quest VRCs.

So the VRCs below are used as a judge-proofing checklist now and a store checklist later.

---

## 1. What Meta requires (official sources)

### 1.1 Web app manifest and PWA packaging

| Item | Requirement | Source |
|---|---|---|
| Distribution scope | The store "currently supports only immersive WebXR PWA distributions" (2D and hybrid later). | https://developers.meta.com/horizon/documentation/web/pwa-overview/ , https://developer.oculus.com/documentation/web/pwa-submit-app |
| `name` | Required; "we only support left-to-right languages for the name." | https://developers.meta.com/horizon/documentation/web/pwa-gs/ |
| `display` | "must be `standalone` or `minimal-ui`". | same |
| `start_url` | At least one of `start_url` / manifest URL; "should provide direct access to your App's functionality or a login screen", no marketing/info pages. | https://developers.meta.com/horizon/documentation/web/pwa-webxr-gs |
| `short_name` | Optional, max 12 characters. | https://developers.meta.com/horizon/documentation/web/pwa-overview-gs/ |
| `scope`, `icons` | Optional. Bubblewrap picks `any`, `maskable` and `monochrome` icons and uses a 512 px or larger icon. Other fields are "not currently supported and are ignored" by the Horizon OS PWA shell (so `orientation`, `categories` do nothing there). | pwa-gs, pwa-packaging |
| HTTPS | "Host the web app and its manifest over HTTPS." | https://developers.meta.com/horizon/documentation/web/pwa-overview-gs/ |
| Launch | "WebXR PWAs should behave like native immersive apps ... launching directly into immersive mode right after launch **without a 2D landing page**." "Clicking the PWA app icon is considered user action to create a WebXR session." Detect the PWA context (Digital Goods service) before calling `requestSession`. | https://developers.meta.com/horizon/documentation/web/pwa-webxr/ |
| Packaging | `@meta-quest/bubblewrap-cli` (`bubblewrap init --manifest=<url> --metaquest`, app mode `immersive`), a stable Android package id, a signing key, and `/.well-known/assetlinks.json` (package name + SHA-256 cert fingerprint) on the origin. A new build is needed when permissions or the icon change. | https://developers.meta.com/horizon/documentation/web/pwa-packaging |
| Service worker / offline | Not mentioned by Meta's PWA docs. But VRC.Quest.Functional.7 (below) requires telling the user when a needed connection is missing. | — |

### 1.2 Store metadata and art

Metadata (https://developers.meta.com/horizon/resources/publish-app-metadata): name max 40
characters; short description max 500; long description max 1500; optional search keywords;
category and genres; game modes; supported controllers (hands); play area (seated); player
modes; comfort level; internet connection; supported languages; publisher name, website,
**privacy policy link (required)**, optional support and ToS links; developer contact email;
**IARC rating** (questionnaire in the dashboard, free, instant).

Art (https://developers.meta.com/horizon/resources/asset-guidelines/):

| Asset | Size | Format |
|---|---|---|
| Hero cover | 3000 x 900 (10:3) | 24-bit PNG |
| Cover landscape | 2560 x 1440 (16:9) | 24-bit PNG |
| Cover square | 1440 x 1440 | 24-bit PNG |
| Cover portrait | 1008 x 1440 (7:10) | 24-bit PNG |
| Logo, transparent | up to 9000 x 1440 | 32-bit PNG |
| Icon | 512 x 512 | 24-bit PNG |
| Screenshots | 5 (no duplicates), 2560 x 1440 | 24-bit PNG, real first-person gameplay |
| Trailer | 30 s to 2 min, 1080p to 2K | MP4 / H.264 / AAC |
| Trailer cover | 2560 x 1440 | 24-bit PNG |

Rules that most often fail (https://developers.meta.com/horizon/resources/publish-common-vrc-failures/):
VRC.Quest.Asset.2 "Store cover art images must have clear branding without extraneous text,
taglines, or banners"; VRC.Quest.Asset.5 screenshots "not contain any additional logos, text, or
iconography"; no text bigger than the title; nothing in the corners; keep the title in the safe
area of Meta's templates.

### 1.3 VRCs that apply to a WebXR PWA

From https://developers.meta.com/horizon/resources/publish-quest-req/ and
https://developers.meta.com/horizon/resources/vrc-quest-performance-1/ (native-only VRCs such as
APK signing, 64-bit, entitlement check and platform SDK are handled by Bubblewrap or do not apply
to a free web build):

| VRC | Requirement (short) |
|---|---|
| Performance.1 | Interactive apps at 72/80/90/120 Hz refresh, at least 60 fps rendering; exempt during loading screens/fades. Test with OVR Metrics Tool. |
| Performance.3 | Head-tracked graphics within 4 s of launch, or a loading indicator in VR. |
| Performance.4 | Keep at least 85% render scaling during most gameplay. |
| Functional.1 | Run without crashes, freezes or extended unresponsive states. |
| Functional.2 | Single-player apps pause when the headset is removed or the system menu opens. |
| Functional.3 | Must not trap users in any state. |
| Functional.4 | Must not lose the user's data. |
| Functional.7 | Apps that need the internet must tell the user when it is not available. |
| Functional.9 | Users must be able to reset forward orientation (recenter). |
| Functional.14 | Apps launched in passthrough show passthrough loading screens from MR Home. |
| Input.4 | Focus-aware: keep rendering when focus is lost, hide the user's hands/controllers, ignore input. |
| Input.7 | With hand tracking, respect switches between controllers and hands. |
| Input.8 | The system gesture is reserved and must not trigger other actions. In Quest Browser WebXR the palm pinch is reserved (left palm pinch = menu, leaves the session). https://developers.meta.com/horizon/documentation/web/webxr-hands/ |
| Tracking.1 / .2 | Metadata must match the play mode (seated) and the inputs (hands). |
| Security.2 | Request the minimum permissions. |
| Privacy.1-5 | A privacy policy that covers collection, use and deletion. |
| Audio.1 (rec.) | 3D spatialized audio. |
| Accessibility.1-9 (rec.) | Playable without audio, legible text, single-hand play, display settings, colorblind support, etc. |

Hands design guidance: keep the gesture set small and reliable, show visual instructions for
poses (https://developers.meta.com/vr/design/hands-gesture-design/).

---

## 2. What SpinSmith already satisfies, and what is missing

Legend: OK = satisfied in code; PARTIAL; MISSING; RISK = present but unverified or fragile.

### 2.1 Manifest, icons, install, offline

| Check | Status | Evidence |
|---|---|---|
| Manifest linked | OK | `index.html:10` `<link rel="manifest" href="./manifest.webmanifest">` |
| `name`, `short_name` (9 chars), `start_url "./"`, `scope "./"`, `display "standalone"`, colors, description | OK | `public/manifest.webmanifest:2-9` |
| Icons 192 and 512 | OK | `public/manifest.webmanifest:10-13`; `public/icons/icon-192.png`, `icon-512.png` (PNG 192x192, 512x512, RGBA) |
| Maskable / monochrome icon | MISSING | No `purpose` field. The current icon has rounded transparent corners and the blades reach near the edge, so it would crop badly as a maskable icon. |
| `id` field | MISSING | Not required by Meta, but without it the install identity is the `start_url`; add `"id": "./"` before the first public install so it never changes. |
| `orientation`, `categories`, `lang`, `dir` | MISSING (harmless) | Ignored by the Horizon OS PWA shell; useful only to other browsers/stores. `index.html:2` has no `lang="en"` (minor a11y/language signal). |
| HTTPS hosting | MISSING | No hosted URL yet (SUBMISSION.md "Still to do"; ACTION-PLAN.md F6/WP15). `vite.config.ts:49` `base: './'` makes any sub-path host work. |
| Service worker / offline cache | MISSING | No service worker anywhere in `src/` or `public/`. The game needs no server once loaded (no `fetch`, no analytics: grep finds no network calls in `src/`), so a precache SW would make it fully offline and remove VRC Functional.7 risk. Bundle is about 3.3 MB (`dist/assets/index-*.js` 2.58 MB, msdf worker 0.46 MB). |
| Launch straight into XR when installed | MISSING | `src/index.ts:37-42`: always shows the HTML landing page and waits for ENTER. Fine in the browser (judges), but a store PWA must "launch directly into immersive mode ... without a 2D landing page". |
| Bubblewrap package, `assetlinks.json`, package id | MISSING | Only needed for a store submission, not for the competition. |
| Dev tooling stripped from production | OK | Dev keys, gaze pointer, `window.__game`, `dev-hands`, `dev-drive` are all behind `import.meta.env.DEV` (`src/index.ts:45-47`, `src/game/match-system.ts:504-510, 554`); `Backquote` (wipe save) is absent from `dist/assets/index-ClASwycD.js`. |
| Source maps | OK | `vite.config.ts:16` only when not `NODE_ENV=production`; make sure the deploy build sets it (or accept public maps). |

### 2.2 Permissions and first-run consent

| Check | Status | Evidence |
|---|---|---|
| Minimal WebXR features (Security.2) | OK | `iwsdk.config.json:12-16`: `handTracking`, `planeDetection` only. IWSDK adds `local-floor`, `bounded-floor`, `layers` as optional (`node_modules/@iwsdk/core/dist/init/xr.js:25`). All optional, so the session starts even if spatial data is refused. The earlier judge report's "anchors/mesh/hitTest requested but unused" is no longer true. |
| Explains the spatial-data prompt before it appears | OK | `index.html:52-56` "Allow spatial data for your table"; TESTING-NOTES "Before you start" step 3. |
| Works if spatial data is refused / no table | OK | Floats on a tray after 8 s and says so: `src/game/match-system.ts:1406-1407` "No table found: the arena floats here / Move it by its brass handle". |
| Camera / microphone / location | OK (none) | No other permissions requested. |
| Persistent-storage or analytics consent | N/A | Only `localStorage`; nothing leaves the device. |

### 2.3 Performance and loading

| Check | Status | Evidence |
|---|---|---|
| 60 fps minimum (judging), 72 Hz (VRC) | RISK (unmeasured) | README "Known limits": "nothing has been measured on a headset yet". Mitigations in code: fixed foveation 0.5 (`src/index.ts:27`), synthesized audio, no textures/GLTF (`public/gltf`, `public/textures` empty). |
| Loading indicator before XR | OK | ENTER disabled with "HEATING THE FORGE..." until fonts and world are ready (`index.html:57`, `src/index.ts:31-35`). |
| Head-tracked graphics within 4 s in XR (Performance.3) | RISK | Inside XR the arena is hidden while placing (palm print ring shown); the passthrough room is visible at once, so the user sees head-tracked content. Verify on a device that nothing is blank for > 4 s on first entry over a slow network (3.3 MB, uncached without a SW). |
| Compression on host | RISK | Depends on host; Vercel/Netlify gzip/brotli by default; GitHub Pages too. Check `content-encoding` after deploy. |

### 2.4 Pause, focus, recenter, exit

| Check | Status | Evidence |
|---|---|---|
| Pause on system menu / headset off (Functional.2) | OK | `src/game/match-system.ts:658-664`: any visibility state other than `Visible` pauses the fight and suspends audio (`setAudioPaused`, `src/game/audio.ts:113-117`); paused time is not simulated. |
| Hide own hand visuals and ignore input while blurred (Input.4) | PARTIAL | Input is ignored (the whole `update` returns), but any app-drawn hand-attached visuals (reticles, the rip cord, the forge-bar ring on the back of the hand, the hand occluder) stay frozen where they were. Add a hide on pause. Verify what IWSDK's own hand visuals do in `visible-blurred`. |
| Recenter (Functional.9) | OK | `src/game/match-system.ts:687-697`: a new session or the reference space's `reset` event re-places the arena in front; a pull cut short is cleaned up (`:1736`). Plus the brass handle to move it. |
| Not trapping the user (Functional.3) | OK | Menu button in a match (`match-system.ts:505-508, 780`); the Meta button exits; leaving XR shows the landing page again (`src/index.ts:43`). |
| System gesture not reused (Input.8) | RISK | The game uses many pinches; a palm-up pinch is the reserved system gesture and would leave the session (left hand) mid-rip. Nothing in code rejects a palm-facing-head pinch. Verify on device; if the rip is often done palm-up, consider ignoring pinches whose palm faces the head. |
| Controllers vs hands switching (Input.7) | PARTIAL | `src/game/hands.ts:92-93` reads both articulated hands and controller select (grip position as fingertip), so a controller is a working fallback for pinch/pull. Table press and the palm strike have no controller equivalent (fine: competition is hands-first, but a store listing must then declare hands only). |
| Hand tracking off | MISSING copy | If the judge's hand tracking is disabled in Settings, the session starts with controllers and the palm strike cannot be done. The landing says "Hands only" but there is no in-headset hint "turn on hand tracking" when no hand input source appears. |

### 2.5 Stability, errors, data

| Check | Status | Evidence |
|---|---|---|
| `launchXR` failure surfaced | PARTIAL | `src/index.ts:39-41` handles "no immersive-ar" (says "Open this page on a Meta Quest") but `world.launchXR()` has no catch: a refused or failed session leaves ENTER doing nothing. |
| Startup failure surfaced | MISSING | `src/index.ts:21-23` chain has no `.catch`: if `World.create` throws (WebGL context, module load on a flaky network), the page stays on "HEATING THE FORGE..." forever. No `window.onerror` / `unhandledrejection` fallback message. |
| WebGL context loss | MISSING | No `webglcontextlost` handling (rare on Quest, but a reload message is cheap). |
| Save robustness (Functional.4) | PARTIAL | Reads are guarded (`progress.ts:243`, `forge.ts:52`, `builder.ts:70`); a corrupt save silently resets. Writes `forge.ts:67` and `builder.ts:80` call `localStorage.setItem` unguarded (throws when storage is full/blocked, which would break the frame). `comfort.ts:46` is guarded. |
| Settings persistence | OK | Comfort dial stored in `spinsmith.comfort.v1` (`src/game/comfort.ts:13, 41-47`); top, arenas and progress persist. |
| Reset progress in-headset | OK | Hold the level plate 2 s then pinch (`src/game/hub.ts:255, 291`); `?fresh` / `?demo` URL flags (`src/index.ts:8-18`). |
| Deterministic sim tests | OK | `npm run check:sim` and the balance reports (`package.json` scripts). |

### 2.6 Comfort, legibility, audio, accessibility

| Check | Status | Evidence |
|---|---|---|
| Seated, no locomotion | OK | `iwsdk.config.json:36` `locomotion: false`; reach check 0.32-0.67 m (SUBMISSION "Seated"). Store metadata: Play area "Seated", Comfort "Comfortable". |
| No camera shake / forced motion | OK | Hit-stop shakes the tops, "never the view" (DONE.md "Game feel"). |
| Flash safety | OK | Comfort dial "Calm" removes hit flashes (`comfort.ts:18`); rival tells capped at 3 flashes/s (DONE.md "Strikes"). |
| Playable without audio (Accessibility) | OK | Quiet mode (`comfort.ts:19-20`); all calls are also stamped as text (DONE.md "Fight framing"). |
| Gentle input option | OK | Press-and-hold strike instead of a slap (`comfort.ts:9-10`). |
| Text legibility on device | RISK | Not checked on a headset (DONE.md "Not built": board legibility, card sizes wait for a Quest). Meta's legibility VRC is a recommendation, but judges will notice. |
| Spatial audio (Audio.1, rec.) | PARTIAL | Stereo panning by arena x (`audio.ts:19`), no HRTF. |
| Colorblind | PARTIAL | Teams are orange vs cyan (safe for the common red-green types) and also marked by rings and position; no explicit option. Fine. |
| One-handed play | OK (mostly) | Every verb is one hand; strike with either palm. |
| Language | OK | All in-game text is English (competition rule). |

### 2.7 About, credits, privacy, how to play

| Need | Status | Assessment |
|---|---|---|
| Privacy policy URL | MISSING | Required for a store listing (metadata form, Privacy VRCs). Not required by the competition, but cheap: one static page `privacy.html` in `public/`. Content is short and true: no account, no network calls, no analytics; progress and settings live only in this browser's localStorage; clear it with `?fresh` or the browser's site data; spatial data (planes, hand joints) is processed on the device by the browser and never stored or sent. |
| Credits / licenses | MISSING | Rajdhani font is OFL; `public/fonts/OFL-Rajdhani.txt` ships, but nothing in-app or on the landing credits it. IWSDK and three.js are MIT. There is no `LICENSE` file in the repo (only matters if the repo or source becomes public). A one-line footer on the landing page ("Made by Yigitcan Kizil · Rajdhani font, SIL OFL · Privacy") covers it; an in-headset credits panel is not needed. |
| About screen in XR | Not needed | The landing page already says what the game is (`index.html:49-56`). A judge does not need an in-headset About. |
| How to play | OK in-game, PARTIAL outside | The first five minutes teach each verb in context (README "First session"; TESTING-NOTES). Missing: a short "How to play" on the landing page (3 verbs with tiny icons) for a judge who reads before entering, and the shared-headset tips (`?fresh`, level plate) visible somewhere other than docs. |
| Support contact | MISSING | Store needs a contact email; Devpost has team emails. Optional link on landing. |

### 2.8 Competition submission (BRIEF.md) gaps

| Requirement | Status |
|---|---|
| Public hosted URL, free, stable and unchanged until Dec 11 | MISSING (plan in ACTION-PLAN WP15: Vercel/Netlify immutable deployment URL, protection off). |
| Video < 3:00, public on YouTube/Vimeo, real Quest or emulator footage, no AI-generated video | MISSING (storyboard ready in SUBMISSION.md, 2:50). |
| Cover image / logo for Devpost | MISSING (SUBMISSION "Still to do"). |
| Tagline <= 140 chars | OK (99 chars, SUBMISSION.md). |
| Description <= 500 words (suggested) | OVER: about 730 words (SUBMISSION "Project description"). Cut to ~480. |
| Hands-first end to end, no controller ever needed | OK by design; RISK until verified on a device (table press and slap). |
| Track + Division (Gaming - New Experience), team names/emails/roles, Meta VR Start membership and Developer Access on the account | Not visible in repo; confirm before Nov 18. |
| English | OK. |
| No branding / commercial artwork | RISK: Beyblade X naming residue in shipped ids, `src/game/parts.ts:179-182` core ids `'3-50' '4-60' '9-60' '5-80'` and tip ids `flat/rush/taper/ball/needle/orb` (`:188-193`). Not visible to players, but they ship in the bundle and in localStorage; "Beyblade" mentions remain in docs. Rename ids with a save migration and keep the docs out of any public repo. |
| Content rating 10+/13+/18+ | OK (cartoon object combat, no violence to people); state "10+" in the form if asked. |
| Released tools only | OK (IWSDK 1.0.1, public). |
| Freeze | Make the submitted URL an immutable deployment, not an alias. |
| Testing notes for judges | DRAFT exists (`docs/TESTING-NOTES.md`); must be pasted into the form / README top with the real link. |

---

## 3. Ranked fixes

Effort: S < 2 h, M half a day to a day, L more. "Headless" = can be done and checked without a
headset.

| # | What | Where | Effort | Headless | Why |
|---|---|---|---|---|---|
| 1 | Deploy the production build to an immutable HTTPS URL (Vercel/Netlify), cold-start test in a private window and another network; record the URL in README top, SUBMISSION, TESTING-NOTES. | hosting, `README.md:11-13` | S | Yes | Without it judges cannot start (hard requirement). |
| 2 | Measure on a Quest 3 and 3S: fps (OVR Metrics Tool) through home, forge, a 15-arena fight, Colossus Bowl; pause via Meta button; recenter; palm pinch; hand tracking off. | device | M | No | 60 fps is a stated judging bar; pause/recenter/system-gesture are the top VRC failures. |
| 3 | Error surfaces: `.catch` on the `loadFonts().then(World.create)` chain and on `launchXR()` with a visible message on the landing ("Could not start the forge. Reload."); a global `unhandledrejection` fallback. | `src/index.ts:21-42` | S | Yes | A judge stuck on "HEATING THE FORGE..." is a Stage One fail. |
| 4 | Guard the two unguarded `localStorage.setItem` writes (try/catch). | `src/game/forge.ts:67`, `src/game/builder.ts:80` | S | Yes | Functional.1/4: an exception in a frame on a full or blocked storage. |
| 5 | Service worker with precache of `dist/` (a ~30-line hand-written SW, or `vite-plugin-pwa` with `injectManifest`); show "Needs a connection for the first load" if offline and uncached. | new `public/sw.js`, register in `src/index.ts` | S-M | Yes | Instant second launch (judges re-enter many times), offline after first play, removes Functional.7 risk, and makes the PWA install feel native. Version the cache by build hash so the frozen deploy stays coherent. |
| 6 | Landing footer: "How to play" in three lines (pinch the top in, pinch and pull back to rip, pinch the floor to ramp), the `?fresh`/level-plate tip, credits (author, Rajdhani OFL), and a Privacy link. Add `lang="en"`. | `index.html:48-58` | S | Yes | Experience Design "clear onboarding from the moment of entry"; Polish; store needs privacy URL. |
| 7 | `public/privacy.html` (content in 2.7). | new file | S | Yes | Store-required; also good form on Devpost. |
| 8 | Hide hand-attached visuals (reticles, cord, forge-bar ring, occluder) while paused. | `src/game/match-system.ts:658-664` | S | Partly (emulator can toggle visibility) | VRC Input.4. |
| 9 | "Turn on hand tracking" hint in XR when the only input sources are controllers for > 3 s. | `src/game/hands.ts` / match-system label | S | Yes (emulator controllers) | Judges who start with controllers in hand; hands-first requirement. |
| 10 | Rename Beyblade-derived part ids with a save migration. | `src/game/parts.ts:179-193`, `progress.ts`/`forge.ts` loaders | M | Yes (`check:sim`) | No-branding rule; low visibility but cheap insurance. |
| 11 | Cut the Devpost description to <= 500 words; keep the hands-first section. | `docs/SUBMISSION.md` | S | Yes | Form guidance. |
| 12 | Manifest polish: add `"id": "./"`, a maskable 512 icon (full-bleed dark square, top in the inner 80%), `"purpose"` on each icon, `"categories": ["games"]`, `"orientation": "landscape"`, `"lang": "en"`. | `public/manifest.webmanifest`, `public/icons/` | S | Yes | Install quality; Bubblewrap picks maskable icons. |
| 13 | Store-mode launch: if running as an installed PWA (`matchMedia('(display-mode: standalone)')` or Digital Goods present), call `world.launchXR()` on load and skip the landing. | `src/index.ts:31-42` | S | Partly | Required only for a Horizon Store PWA; harmless for the competition. |
| 14 | Store art and video (see 4.2); real Quest capture, daylight table. | assets | L | Partly (logo, key art yes; screenshots and trailer need a device or IWER) | Polish 25%; Asset VRCs. |
| 15 | Bubblewrap package, package id, `assetlinks.json`, IARC questionnaire, metadata form. | post-competition | M | Yes (packaging), sideload test needs a device | Only for an actual store listing after Dec 11. |

Do not change the hosted build after Nov 18 (freeze), so 1-11 must land before the final deploy.

---

## 4. Store listing needs

### 4.1 Copy (drafts; English)

- **Name** (<= 40): SpinSmith
- **Short description** (<= 500 chars, keep ~200):
  "A seated, hands-only spinning-top battler on your real table. Forge a top from parts, rip it
  into the arena with a pull of your hand, then raise ramps and press cups into the floor mid-fight
  to throw your rival out."
- **Long description** (<= 1500 chars): reuse SUBMISSION.md, compressed to five short paragraphs:
  Forge (three parts, 226 builds), Rip (pull to launch, white-hot pull), Reshape (ramps and cups,
  "YOUR RAMP -> SLAG"), Strike the table (six strikes, comfort option), Come back (daily Smith
  Order, circuits, champions). End with: seated, hands only, runs in passthrough on your table,
  no account, works offline after the first load (once item 5 is done).
- **Keywords**: spinning top, tops, battle, arena, hand tracking, hands only, mixed reality,
  passthrough, tabletop, seated, forge, crafting, casual, physics, daily challenge, WebXR.
- **Category / genre**: Games; Action, Casual, Sports-like/Arcade.
- **Specs**: Game modes single player; Supported controllers: hands (controllers optional only if
  item 9 copy says so); Play area: seated; Comfort: Comfortable; Internet: required for first
  load only (after SW); Languages: English.
- **Publisher**: name, website (the landing URL), privacy policy URL, support email.
- **Rating**: IARC; expected Everyone 10+ / PEGI 7 (cartoon objects colliding, no characters hurt).

### 4.2 Art list

| Asset | Size | Notes |
|---|---|---|
| Icon | 512 x 512 | Exists (`public/icons/icon-512.png`); export a 24-bit (no alpha) version with a solid background for the store; plus a maskable variant for the manifest. |
| Hero cover | 3000 x 900 | Arena on a wooden table, sparks, title in the safe area, no tagline. |
| Cover landscape / square / portrait | 2560x1440, 1440x1440, 1008x1440 | Same key art, recomposed; title is the biggest text, nothing in corners. |
| Transparent logo | up to 9000 x 1440 | "SPINSMITH" in Rajdhani Bold with the orange bar (matches `index.html:34-35`). |
| Screenshots x5 | 2560 x 1440, no overlays | Forge with parts, a rip with the molten cord, a ramp throw, the Smith's board, a knockout replay. Real first-person (headset capture or IWER). |
| Trailer | 30 s to 2 min, 1080p+ | Store cut of the competition video (which is up to 3:00). |
| Trailer cover | 2560 x 1440 | Frame from the cold open. |
| Devpost | cover image (3:2 works), same key art | Plus the YouTube thumbnail. |

Art style must be original (no brand look-alikes) and must not be AI-generated video for the
competition trailer (BRIEF Polish criterion).

### 4.3 In-app About / Credits / Privacy / How to play: verdict

- **How to play**: in-game teaching is strong; add the three-line version to the landing (item 6).
  No separate in-headset tutorial screen needed.
- **About / Credits**: landing footer only (item 6). No XR panel.
- **Privacy**: static page plus landing link (item 7). No in-headset consent dialog is needed:
  nothing is collected, and the browser's own spatial-data prompt is already explained.
- **Settings**: the comfort dial is enough; consider showing its current mode name on first visit
  (it shows only when pointed at, DONE.md "Arrival").

---

## Sources

- https://developers.meta.com/horizon/documentation/web/pwa-overview/
- https://developers.meta.com/horizon/documentation/web/pwa-overview-gs/
- https://developers.meta.com/horizon/documentation/web/pwa-gs/
- https://developers.meta.com/horizon/documentation/web/pwa-webxr-gs
- https://developers.meta.com/horizon/documentation/web/pwa-webxr/
- https://developers.meta.com/horizon/documentation/web/pwa-packaging
- https://developer.oculus.com/documentation/web/pwa-submit-app
- https://developers.meta.com/horizon/resources/publish-quest-req/
- https://developers.meta.com/horizon/resources/vrc-quest-performance-1/
- https://developers.meta.com/horizon/resources/publish-common-vrc-failures/
- https://developers.meta.com/horizon/resources/publish-app-metadata
- https://developers.meta.com/horizon/resources/asset-guidelines/
- https://developers.meta.com/horizon/documentation/web/webxr-hands/
- https://developers.meta.com/vr/design/hands-gesture-design/
- BRIEF.md (Devpost rules, fetched 2026-10-07)
