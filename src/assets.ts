/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineAssets } from '@iwsdk/core';
import forgeArenaShell from './scene-assets/forge-arena-shell.scene-asset.js';
import forgeWheel from './scene-assets/forge-wheel.scene-asset.js';

export default defineAssets({
  'forge-arena-shell': forgeArenaShell,
  'forge-wheel': forgeWheel,
});
