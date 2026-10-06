/**
 * The icons the app actually uses. @drawcall/uikitml imports the whole @pmndrs/uikit-lucide set
 * (about 1,600 icons, two thirds of the bundle) to register them for UIKitML; vite.config.ts points
 * that package here instead. Add an icon here before using it in a .uikitml file.
 */
// Used by public/ui/welcome.uikitml.
export * from '@pmndrs/uikit-lucide/dist/RectangleGoggles.js';
export * from '@pmndrs/uikit-lucide/dist/LogIn.js';
// Used by @pmndrs/uikit-horizon's checkbox and select.
export * from '@pmndrs/uikit-lucide/dist/Check.js';
export * from '@pmndrs/uikit-lucide/dist/ChevronDown.js';
