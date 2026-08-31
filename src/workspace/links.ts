import { Workspace, WorkspaceSnapshot } from "./Workspace";

/**
 * What a link does to the workspace once its payload is decoded: a share link (`#w=`) replaces
 * the documents, an open link (`#d=`) adds one. The decoding itself lives in `share.ts`; this
 * module is the workspace side, DOM-free so it is testable in Node.
 */

/**
 * Loads a snapshot that came in a share link, with fresh ids so it cannot collide with the ids
 * of this browser. The document that was active in the shared workspace ends up active.
 *
 * @param workspace the workspace to replace.
 * @param snapshot the decoded share payload.
 */
export function loadSharedSnapshot(workspace: Workspace, snapshot: WorkspaceSnapshot): void {
	const activeIndex = snapshot.documents.findIndex((document) => document.id === snapshot.active);
	workspace.replaceAll(
		snapshot.documents.map((document) => ({ title: document.title, text: document.text })),
		activeIndex >= 0 ? activeIndex : 0,
	);
}

/**
 * First title among "title", "title (2)", "title (3)"… not taken by any document.
 *
 * @param workspace the workspace whose titles are taken.
 * @param title the wanted title.
 * @returns the title, suffixed if something already uses it.
 */
export function freeTitle(workspace: Workspace, title: string): string {
	const titles = new Set(workspace.getDocuments().map((document) => document.title));
	let candidate = title;
	for (let n = 2; titles.has(candidate); n++) {
		candidate = `${title} (${n})`;
	}
	return candidate;
}

/** What {@link openLinked} did: selected a document already there, or added the linked one. */
export type OpenLinkedResult = "existing" | "added";

/**
 * Adds a document that came in an open link and selects it. Nothing is replaced: the link
 * carries one document, not a workspace. If the same text is already in the workspace, that
 * document is selected instead, so opening a link twice does not duplicate it; a taken title
 * is suffixed with {@link freeTitle}.
 *
 * @param workspace the workspace to add to.
 * @param text full text of the linked document.
 * @param title its title, when the link carries one.
 * @returns whether an existing document was selected or the linked one was added.
 */
export function openLinked(workspace: Workspace, text: string, title: string | undefined): OpenLinkedResult {
	const existing = workspace.getDocuments().find((document) => document.text === text);
	if (existing) {
		workspace.setActive(existing.id);
		return "existing";
	}
	const added = workspace.addDocument(text, title ? freeTitle(workspace, title) : undefined);
	workspace.setActive(added.id);
	return "added";
}
