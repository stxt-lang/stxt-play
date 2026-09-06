/**
 * The application layer, minus its composition root: the pieces `Playground.ts` puts together.
 * None of them needs a page to be imported or, save for the two thin DOM adapters (`elements.ts`
 * looks the elements up, `status.ts` shows a message in one of them), to run, so they are tested
 * in Node like the analysis and workspace layers. The entry point of the bundle imports
 * `./Playground` directly.
 */

export { lineAt, toCmDiagnostics } from "./diagnostics";
export { ELEMENT_IDS, findElements, PlaygroundElements } from "./elements";
export { applyFragment, applyLink, applyOpenLink, applyShareLink, FragmentDialogs, FragmentLink, linkOf } from "./fragment";
export { DocumentLabel, labelOf } from "./labels";
export { createStatus, ShowStatus } from "./status";
export { Painters, WorkspaceSync } from "./workspaceSync";
