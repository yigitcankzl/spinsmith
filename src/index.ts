import { VisibilityState, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { MatchSystem } from './game/match-system.js';
import { loadFonts } from './game/ui.js';
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
    world.registerSystem(MatchSystem);
    // The landing page (index.html): Enter starts the session; the page hides while in XR.
    const landing = document.getElementById('landing');
    const enter = document.getElementById('enter');
    enter?.addEventListener('click', async () => {
      // Without immersive AR (a desktop browser) the launch fails silently: say where the game runs.
      const ar = await navigator.xr?.isSessionSupported('immersive-ar').catch(() => false);
      if (ar) world.launchXR();
      else if (enter) enter.textContent = 'Open this page on a Meta Quest';
    });
    world.visibilityState.subscribe((v) => landing?.classList.toggle('hidden', v !== VisibilityState.NonImmersive));
    // Emulator helper: move one hand at a time with the mouse (dev builds only).
    if (import.meta.env.DEV) void import('./dev-hands.js').then((m) => m.installDevHands());
  });
