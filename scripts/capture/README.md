# Cinematic IWER capture

Run `npm run capture:cinematic` to restart the managed GPU-backed browser, enter IWER hand mode,
apply a repeatable seated camera, and save a clean 1920×1080 frame under
`artifacts/capture/`.

The capture setup mutes game audio only for that automated IWER session. It does not change the
player's saved comfort mode or disable sound in production.

The capture always labels itself as emulator footage. The bundled background is
**Comfy Cafe** by Sergej Majboroda from Poly Haven, licensed CC0:
https://polyhaven.com/a/comfy_cafe

This rig is for presentation and regression comparison. It is not evidence of
Quest performance, real passthrough, or physical-device hand tracking.
