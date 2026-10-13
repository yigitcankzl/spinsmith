# Full showcase capture

`scripts/showcase.sh` records a reusable 1080p60 footage library in the visible IWER browser. It drives the same articulated emulator hands used by the gameplay trailer; it does not replace interactions with direct game-state edits.

Run it from the repository root:

```bash
scripts/showcase.sh /home/kizil/Desktop/spinsmith-videos/full-showcase
```

The script starts an automation-enabled visible IWSDK browser, enters the XR session, records the clips, labels the arena tour, and creates `spinsmith-full-showcase.mp4`. To reuse a browser that is already running with automation enabled:

```bash
CAPTURE_USE_RUNNING=1 scripts/showcase.sh /home/kizil/Desktop/spinsmith-videos/full-showcase
```

The `shots/` directory keeps the editable source clips:

1. progression hub, order board, and champion challenge;
2. Striker, Anvil, and Halo silhouette lineup;
3. forge customization across rings, core, tip, spin, paint, emblem, and strike;
4. the forged top fighting in Ember Ring;
5. arena workshop construction and resizing;
6. a fight in the saved custom arena;
7. all 15 built-in arenas, both raw and name-labelled;
8. Zero-G Dish fight;
9. Sumo Square fight;
10. Neon Speedway fight;
11. Hookjaw tell, cup defence, and counter-strike.

This proves the browser-emulated flow and produces submission footage. It does not prove physical Quest hand tracking, passthrough, depth occlusion, or headset performance.
