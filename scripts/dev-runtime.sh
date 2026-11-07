#!/usr/bin/env bash
# The IWSDK CLI launches this script in a fresh background process, so GPU selection must live here.
set -euo pipefail

# The installed NVIDIA driver currently exposes CUDA but no Vulkan/WebGL device. ANGLE silently
# falls back to SwiftShader there; the Vulkan path below keeps captures on the working hardware GPU.
export IWSDK_GPU=vulkan
export DRI_PRIME=1

exec vite
