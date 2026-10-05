import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { MatchSystem } from './game/match-system.js';
import { PanelSystem } from './panel.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(MatchSystem);
  world.registerSystem(PanelSystem);
});
