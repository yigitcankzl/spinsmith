# Meta Horizon Creator Competition: Game Design (post-mortem and lessons for SpinSmith)

Researched 2026-10-07. Source: https://mhcp-game-design.devpost.com/ and its sub-pages, plus the 22
winning project pages on devpost.com/software/. Plain HTTP fetches returned a Cloudflare 403, so all
pages were rendered with headless Chrome and read as text. Every page listed below loaded.

**Status: the competition has ended.** The overview says "This hackathon has ended". Winners were
announced on July 10, 2026. We are not entering. This document records what it was, who won and why,
and what SpinSmith can take from it for the Meta VR Start Developer Competition 2026.

**The key caveat up front:** this was a *paper* competition for *mobile* games. Entrants handed in
four PDFs, with no build, no video, no VR and no engine requirement. Its lessons carry over to
SpinSmith's design, onboarding and pitch. They do not carry over to tech or video. Read every lesson
below with that in mind.

---

## 1. What the competition was

| Item | Fact | Source |
|---|---|---|
| Name | Meta Horizon Creator Competition - Game Design: "Design a production-ready mobile game. $250,000 in prizes." | overview `/` |
| Sponsor | "sponsored by Meta Platforms, Inc., 1 Hacker Way, Menlo Park" (Managed by Devpost) | `/rules` |
| What to make | "This competition challenges you to design a mobile game, not build one." A pre-production package in one of three genres: Survival & Resource Management, Simulation & Management, or Tower Defense & Strategy | `/details/design`, `/` |
| What to submit | Four PDFs: a Game Design Document (5-7 pages), a Player Journey Map (1-2 pages, "first 15 minutes"), a Visual Concept Package (up to 10 pages) and a Production Plan (1-3 pages). FAQ: "The video URL is not required for submission." | `/`, `/details/faq` |
| Visibility | "Your submission PDFs ... are only visible to judges". Only the "Project Details" text was public, and it was "not judged" | `/details/faq` |
| Dates | Submissions Jun 8 to Jun 22, 2026 (6:00 PM PDT). Judging Jun 23 to Jul 7. Winners on or after Jul 10 | `/details/dates`, `/details/faq` |
| Prizes | $250,000 in cash across 22 winners. Per genre: 1st $20k, 2nd $12.5k, 3rd $10k, two honourable mentions at $7.5k. Best Visual Direction: $15k, $12.5k, $10k. Most Innovative Design: 4 x $10k | `/` |
| Eligibility | MHCP members only, who must have joined "on or before June 1, 2026". Residents of 30 listed jurisdictions only. **Turkey is not on the list.** | `/`, `/rules` section 3 |
| Size | 566 participants, 367 gallery entries ("1 – 24 of 367") | `/`, `/project-gallery` |
| AI use | "There are no restrictions on AI usage for any artifact ... no requirement to disclose". Entries were disqualified for hidden prompt-injection text | `/details/faq`, `/rules` section 5 |

**Judging criteria (verbatim headings and weights, from `/` and `/rules`):**

- 25% **Design Innovation**: "Is the concept genuinely original? Does it push beyond a vanilla genre implementation? Is there a clear player value proposition: who is this game for, and why would they choose to play it?"
- 20% **Coherence & Feasibility**: "Do all four artifacts tell a consistent, buildable story? ... No contradictions between what's promised and what's specified."
- 20% **Design Depth & Systems Thinking**: "Are the game's systems interconnected? ... progression that sustains interest beyond the first session?"
- 20% **Production Readiness**: "Could you take this document and start building without needing to re-design core systems?"
- 15% **Visual & Creative Direction**: "Does the visual identity serve the gameplay rather than just look good in isolation? Is there a recognizable aesthetic point of view?"

**Judging process (`/rules`):** "Phase One (Eligibility + AI-Assisted Ranking) ... AI-assisted evaluation tools will be used to assist with preliminary ranking". Then "Phase Two (Meta Judges)": 19 named Meta judges scored the shortlist independently.

**Rules that would matter if SpinSmith ever went to a later MHCP competition:**
- `/rules` 5(b): "The submission must be original to the Entrant. Designs previously entered into any other competition are not eligible."
- The FAQ says the same: "It cannot have been previously entered into any other challenge, sweepstakes, promotion, or competition."
- Once SpinSmith is entered in VR Start 2026, it is barred from any MHCP competition with the same clause.
- Turkey was also not eligible here. Future MHCP editions should be expected to have the same problem unless their country list changes. We did not verify this beyond this edition.
- IP: "All Entries and Projects remain the intellectual property of the individuals or organizations that developed them". Meta still received a broad, perpetual licence for evaluation, R&D and marketing (`/rules` section 10).

---

## 2. Winners (from `/updates/44393-congratulations-to-the-winners` and each project page)

"Built with" is the Devpost tag the entrant chose. The PDFs are confidential, so engine use was
self-declared and only mattered for the optional prototypes. "Creator" is the single "Created by"
name on Devpost. The rules allowed teams of 2 to 10, but every winning page lists exactly one person,
so we cannot tell the real team sizes. Some names suggest studios ("int10h Studio", Metacrafters).

| Award | Project | Creator | Built with (tag) | Core hook |
|---|---|---|---|---|
| Sim 1st | Stock Market Tycoon | Jordan Allen | ai, typescript | Run a $10M fund; an AI analyst team with "deliberately imperfect" targets; judgment under uncertainty, seeded leaderboards |
| Sim 2nd | Kruma: Cozy German Conversational Simulator | Deepak Jadhav | meta | Public page only says "WIP" |
| Sim 3rd | Undead Bistro | 明穎 杜 | chatgpt, gemini, python, reportlab... | Undead staff automate a restaurant via Condition -> Action -> Target rules; "Error Trace" when a rule fails |
| Sim HM | Sky Cove: The Keeper's Tale | LR369 Callen | claude, krita, meshy | Carrier-pigeon postal service; match mail to birds by weather, weight, urgency |
| Sim HM | Tomo Buddy | Victor Lau | pdf | Virtual pet that learns from you; "three gestures — tap, swipe, drag" |
| Survival 1st | Hearthline | int10h Studio | ai | Day: servant Igor prepares; night: vampire feeds. One blood economy = life, currency, magic. Small in-engine camera prototype |
| Survival 2nd | Embers | Hiep Dang | horizon, meta, metaai, typescript | "every item has a use value and a burn value, and burning it costs you that use forever"; backed by "a playable browser prototype of the core loop" |
| Survival 3rd | HollowDrop | Mohitb Reddy | blender, unity | You are a droplet; every resource has 5 uses (consume, evolve, build, preserve, gift) |
| Survival HM | Fathom | Narendra Kanike | blender, claude-code, figma, meta-horizon-worlds | Light is your only resource and attracts predators; asymmetric co-op |
| Survival HM | Tide Hollow | Jay D | meta, meta-horizon | "Survive a sea that's your clock, map, enemy, and pantry" |
| TD 1st | Chonky Corgis | Tania Trevino | claude, gemini, keynote, photoshop | Each corgi's coverage radius scales with its energy bar; feed or nap them |
| TD 2nd | LanternKeep | (private user) | meta-horizon-worlds, midjourney, typescript | Defend with light; "You do not kill the enemy. You save it." Rescued enemies become towers. Had a YouTube video |
| TD 3rd | Squnchies! | Amir Mohideen Basheer Khan (XR solutions engineer) | claude | Towers are squishy fidget toys; tap-hold to squeeze, "perfect squish" timing |
| TD HM | Candleburrow | Oliver Jones | chatgpt, claude, figma, google | Six visible mice; "every pair of paws used in one place is missing somewhere else" |
| TD HM | Hold the Line: Soccer Defense TD | (private user) | markdown | Soccer defensive shapes as tower defense |
| Visual 1st | BumperBound | Arestame J | unity | Tower defense on a pinball board, with flippers |
| Visual 2nd | Grimselhorn - a goats story | Alex Ryley | blender, c4d, illustrator, gemini... | Spirit Warden of an alpine pass; capture undead goats |
| Visual 3rd | Shadefall | Bryan Thornbury | n/a | Carry light into the wild; return before dark |
| Innovative | Dead Circuit | Scott Johannes ("not a professional game designer") | chatgpt, claude, word | TD where you are inside the facility; "Every repair is a risk." |
| Innovative | Fractal Grove | Golnaz Alaee | illustrator, photoshop, ai tools | Growth Rule Cards shape a recursive tree; Night Growth plus a Morning Report |
| Innovative | Warrenhold | Joey Jay | adobe, claude-design | Goblin TD; break a door each wave to set your own risk |
| Innovative | Storm Jar | Nolan Huber (solo) | claude, midjourney, node.js, puppeteer, unity | Tornado survival where family trauma responses are the resource. Had a YouTube video |

Project URLs: `https://devpost.com/software/<slug>`. The slugs are stock-market-tycoon,
kruma-cozy-german-conversational-simulator, undead-bistro, sky-cove-the-keeper-s-tale, tomo-buddy,
hearthline, embers, hollowdrop, fathom-n5f9ph, tide-hollow, chonky-corgis, lanternkeep,
squishlings, candleburrow, hold-the-line-soccer-defense-td, bumperbound,
grimselhorn-a-goats-story, shadefall, dead-circuit, fractal-grove, warrenhold and storm-jar.

**Platform, hands and MR:**
- No winner was VR, MR or hand-tracked. The brief was mobile only.
- The 367 gallery taglines include only 2 VR entries (DrumStar, Gonki City), and neither won.
- 4 taglines target Horizon Worlds mobile.
- No entry mentions WebXR.
- Among the winners' tags, Unity appears 3 times, Horizon Worlds or TypeScript 4-5 times, and AI tools in most of them.

**Judges' comments:** there were no per-project comments. The only public statement is in the
winners update: "The judges were impressed with your designs, noting their originality and depth.
Whether it was pushing genre boundaries, crafting seamless progression, or nailing the visual
details...".

**Presentation:**
- Only 2 of the 22 winning pages embed a video (LanternKeep and Storm Jar on YouTube). Video was optional.
- Most winning pages are image galleries of concept art and UI mockups (Hearthline has about 24 images).
- Each page follows the same pattern: a one-line hook, a plain-English "what it does", what was learned, and an honest "what's next".
- At least 7 winners mention a prototype (Embers, Hearthline, Squnchies, Stock Market Tycoon, Dead Circuit, Grimselhorn, Fractal Grove). Embers says it was "backed by a playable browser prototype".

**Gallery quality:** the typical entry is a short concept tagline. Many are generic genre pitches.
Winners stand out by having a one-sentence twist that changes the genre's main verb or resource.

---

## 3. What the winners had in common

1. **One rule that does several jobs.** Hearthline's blood is life, money and magic at once. In Embers every item can be used or burned. LanternKeep's light both damages and rescues. Fathom's light is both the resource and the danger. Tide Hollow's sea is "clock, map, enemy, and pantry". The Embers author wrote: "Restraint did the heavy lifting: one currency, one gesture to move, and one light source produced deeper decisions than a wall of systems would have."
2. **A twist on the genre's main verb, stated in one line.** "You do not kill the enemy. You save it." "Every repair is a risk." "Your towers are fidget toys, and you fidget with them."
3. **The twist carries emotional weight, not just mechanics.** Storm Jar ("mechanics carry emotional weight"), Hearthline ("cozy-gothic"), Tomo Buddy ("look who it became"). Cozy or warm tones dominate, even in survival entries.
4. **A clearly named player.** For example, Squnchies is aimed at "the people who reach for something to squeeze to take the edge off the day".
5. **Coherence was treated as the hard part.** Hearthline: "It is easy to write a long document and make a pile of good-looking images. It is much harder to make four separate artifacts describe one believable game."
6. **The feel was tested first.** Squnchies' plan: "does squeezing a single toy feel good enough that people keep doing it with nothing at stake? Everything depends on that, so it gets prototyped first."
7. **Solo authors, often non-professionals, using AI heavily** (Dead Circuit: "I am not a professional game designer"). The bar was clear thinking, not production budget.

---

## 4. Lessons for SpinSmith (Meta VR Start 2026, Gaming, New Experience; freeze Nov 6, deadline Nov 18)

Both competitions are Meta-run, both use an AI-assisted first pass and then human Meta judges, and
both reward originality first (25% each). The lessons below are what transfers. Effort estimates
assume the current codebase.

**Emphasise**
1. **Lead with one rule: "You fight by reshaping the arena."**
   - Every winner's page opened with a single-sentence twist. SpinSmith's tagline already has three verbs (forge, rip, reshape).
   - In the description and the first 10 seconds of the video, make the arena-shaping the headline, and present forge and rip as setup.
   - This also answers FULL-EVALUATION.md's main criticism ("too much to teach in ten minutes", "dilutes the single legible hand verb").
   - Effort: copy only, under 1 hour.
2. **Say who it is for.**
   - Design Innovation here explicitly asked "who is this game for". VR Start's Experience Design criterion asks about the "intended audience".
   - Add one sentence to SUBMISSION.md naming the player, for example: "for seated Quest owners who want a 5-minute tabletop duel with their hands".
   - Effort: minutes.
3. **Script the first 30 seconds and the first five minutes.**
   - MHCP's guidance said "Ignoring the first 30 seconds. How the game opens determines whether the player stays."
   - VR Start has a "First Five Minutes" special award.
   - Write a beat-by-beat journey for the first match covering emotion, teaching and reward. Then check the build against it in the emulator, and cut or defer anything that is not needed by minute 5. Strike, cup and tells are already staged across later matches; verify it.
   - Effort: about half a day, including an emulator pass.
4. **Make the hand verb feel good with nothing at stake.**
   - The Squnchies test fits our rip and our ramp directly: is pinching a ramp satisfying on its own, outside a fight? Juice, sound and haptic-like feedback on the ramp rising are worth more than another arena.
   - This needs a device to verify. Effort: 1-2 days of polish before Nov 6.
5. **Show coherence: make the submission text match the build.**
   - "No contradictions between what's promised and what's specified" was 20% of the MHCP score. VR Start's AI pre-screen and judges will likewise compare the text with the build.
   - FULL-EVALUATION.md already flags docs that drifted from the code. Re-check every number in SUBMISSION.md against the build at the Nov 6 freeze: 226 builds, 15 arenas, 8/5/6 parts, and the 0.32-0.67 m reach.
   - Effort: about 2 hours at freeze.
6. **Give an honest "what's next" in the description,** with the core loop first and extras staged. Winners used this to show scoping skill. Effort: minutes.
7. **Give it an emotional or tonal hook.** The winners leaned cozy or warm with a point of view. SpinSmith's forge and smith ledger identity (the Smith's board, stamps, champions standing on the rim) is our version. Show it in the video's end beats rather than only listing features.

**Avoid**
- **Feature lists without a reason.** MHCP penalised "Feature lists without justification". The SUBMISSION.md description is currently a long feature tour of 7 bolded sections. Trim it to the hero verb, then its reason, then the two or three supporting systems.
- **Padding.** "A tight design that earns every page will always outscore a padded one." Keep the description well under 500 words.
- **Anything that looks like gaming the AI pre-screen.** MHCP disqualified hidden or embedded prompts. Keep the materials clean and simply map them to the criteria vocabulary in visible text: hands-first, seated, purposeful passthrough, first five minutes, reason to come back.
- **Beyblade-adjacent naming in public materials** (already flagged in FULL-EVALUATION.md). Both competitions require original work and Meta's VR rules ban brand names.

**Video style**
- MHCP gives little direct evidence here: video was optional and 2 of 22 winners used it.
- What does transfer is the page pattern: one hook line, then the core mechanic shown, then the identity.
- The existing storyboard in SUBMISSION.md already opens on the ramp throwing the rival. Keep that cold open, and keep the first 15 seconds to the single twist.
- VR Start penalises AI-generated video (per BRIEF.md), so the MHCP "use AI freely" approach must **not** carry over to the video.

---

## 5. Conclusion and uncertainties

- **Not enterable, and irrelevant to our schedule.** It ended in July 2026. Turkey was not eligible. It required MHCP membership by June 1. It was paper-only mobile design. Nothing changes for the Nov 6 freeze or the Nov 18 deadline.
- **Value to us:** a clear look at what Meta judges rewarded in 2026. They rewarded one sharp twist, coherence between what is promised and what is delivered, a named player, and a deliberate first session. The lessons above cost about 1-2 days in total and mostly touch copy and the first match.
- **Uncertain or not seen:**
  - The winning PDFs are confidential, so we know the winners only from their public pages.
  - Kruma's public page says only "WIP".
  - We did not watch the two winner videos.
  - The update posts were read in full only for the winners and "five days left" posts; the others were read as truncated previews.
  - Team sizes cannot be determined from Devpost.
  - Whether future MHCP competitions will include Turkey is unknown.
