import { VisibilityState, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { MatchSystem } from './game/match-system.js';
import { loadFonts } from './game/ui.js';
import { forgeEnvironment } from './game/visuals.js';
import { demoSave, freshSave } from './game/demo-save.js';

// For shared headsets: ?fresh starts as a new player (the first session again), ?demo as a prepared
// level-8 smith. The flag is then dropped from the address, so a reload keeps the progress made.
const params = new URLSearchParams(location.search);
if (params.has('fresh') || params.has('demo')) {
  if (params.has('fresh')) freshSave(localStorage);
  else demoSave(localStorage);
  params.delete('fresh');
  params.delete('demo');
  const query = params.toString();
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
}

// Panels are drawn into canvases as the game starts, so the display font must be loaded first.
loadFonts()
  .then(() => World.create(document.getElementById('scene-container') as HTMLDivElement, projectOptions))
  .then((world) => {
    // Metal reflects the forge's light (a warm and a cool highlight), and the view's edges are
    // rendered at lower resolution (fixed foveation) to pay for it on the headset.
    world.scene.environment = forgeEnvironment(world.renderer);
    world.renderer.xr.setFoveation?.(0.5);
    world.registerSystem(MatchSystem);
    // The landing page (index.html): Enter starts the session; the page hides while in XR.
    const landing = document.getElementById('landing');
    const enter = document.getElementById('enter') as HTMLButtonElement | null;
    // Ready: the button wakes up (it waits while the fonts and the world load).
    if (enter) {
      enter.disabled = false;
      enter.textContent = 'ENTER';
    }
    enter?.addEventListener('click', async () => {
      // Without immersive AR (a desktop browser) the launch fails silently: say where the game runs.
      const ar = await navigator.xr?.isSessionSupported('immersive-ar').catch(() => false);
      if (ar) world.launchXR();
      else if (enter) enter.textContent = 'Open this page on a Meta Quest';
    });
    world.visibilityState.subscribe((v) => landing?.classList.toggle('hidden', v !== VisibilityState.NonImmersive));
    // Emulator helper: move one hand at a time with the mouse (dev builds only).
    if (import.meta.env.DEV) void import('./dev-hands.js').then((m) => m.installDevHands());
    // A hand driver for agents and demo shots: window.drive (dev builds only, see src/dev-drive.ts).
    if (import.meta.env.DEV) void import('./dev-drive.js').then((m) => m.installDriver());
  });
