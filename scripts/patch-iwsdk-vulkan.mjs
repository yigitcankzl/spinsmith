import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(
  new URL('../node_modules/@iwsdk/vite-plugin-dev/dist/index.js', import.meta.url),
);

const replacements = [
  [
    "const VALID_GPU_VALUES = ['auto', 'gpu', 'swiftshader'];",
    "const VALID_GPU_VALUES = ['auto', 'gpu', 'vulkan', 'swiftshader'];",
  ],
  [
    ' *   - "gpu"         force hardware GL (fails if no GPU)\n' +
      ' *   - "swiftshader" force CPU-based SwiftShader rendering',
    ' *   - "gpu"         force hardware GL (fails if no GPU)\n' +
      ' *   - "vulkan"      force hardware Vulkan through ANGLE\n' +
      ' *   - "swiftshader" force CPU-based SwiftShader rendering',
  ],
  [
    "'Valid values: auto, gpu, swiftshader. Falling back to auto-detect.');",
    "'Valid values: auto, gpu, vulkan, swiftshader. Falling back to auto-detect.');",
  ],
  [
    "    const platform = os.platform();",
    "    if (envOverride === 'vulkan') {\n" +
      '        return {\n' +
      "            kind: 'hardware',\n" +
      "            useGl: 'angle',\n" +
      "            useAngle: 'vulkan',\n" +
      "            reason: 'env-override',\n" +
      '        };\n' +
      '    }\n' +
      '    const platform = os.platform();',
  ],
  [
    '        `--use-angle=${backend.useAngle}`,\n' +
      "        '--disable-background-timer-throttling',",
    '        `--use-angle=${backend.useAngle}`,\n' +
      "        ...(backend.useAngle === 'vulkan'\n" +
      '            ? [\n' +
      "                '--enable-gpu',\n" +
      "                '--ignore-gpu-blocklist',\n" +
      "                '--disable-gpu-driver-bug-workaround',\n" +
      "                '--enable-features=Vulkan,DefaultANGLEVulkan,VulkanFromANGLE',\n" +
      "                '--use-cmd-decoder=passthrough',\n" +
      "                '--force_high_performance_gpu',\n" +
      '            ]\n' +
      '            : []),\n' +
      "        '--disable-background-timer-throttling',",
  ],
];

let source = await readFile(target, 'utf8');
let changed = false;

for (const [before, after] of replacements) {
  if (source.includes(after)) continue;
  if (!source.includes(before)) {
    throw new Error(
      `IWSDK Vulkan patch no longer matches ${target}. Review the installed plugin before running it.`,
    );
  }
  source = source.replace(before, after);
  changed = true;
}

if (changed) {
  await writeFile(target, source);
  console.log('Patched IWSDK managed Chromium to support IWSDK_GPU=vulkan.');
}
