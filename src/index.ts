import { startPlayground } from "./app/Playground";

/**
 * Entry point of the bundle: starts the playground once the page is parsed. The application
 * itself lives in `src/app/` — `Playground.ts` is the composition root on the page, and the
 * rest of the folder is the DOM-free logic it composes — on top of the analysis, workspace,
 * editor and ui layers.
 */
document.addEventListener("DOMContentLoaded", startPlayground);
