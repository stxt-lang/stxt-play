import { InlineNode, Node, Parser, StringUtils } from "@stxt-lang/core";
import { isGrammarRoot } from "../analysis/GrammarRegistry";
import { Workspace, WorkspaceDocument, WorkspaceSnapshot } from "./Workspace";

/**
 * What a link does to the workspace once its payload is decoded: a share link (`#w=`) replaces
 * the documents, an open link (`#d=`) adds one, along with the grammars it may carry. The
 * decoding itself lives in `share.ts`; this module is the workspace side, DOM-free so it is
 * testable in Node.
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

/** A grammar that came in an open link: its text and the namespace its first grammar root defines. */
export interface LinkedGrammar {
	/** Full text of the grammar document. */
	text: string;
	/** Namespace it defines, trimmed and lowercased. */
	namespace: string;
}

/**
 * How the workspace is to receive the grammars of an open link. A grammar whose namespace is
 * already defined by a document with the very same text is left out: there is nothing to do.
 */
export interface GrammarPlan {
	/** Namespace not defined in the workspace yet: the grammar is added without asking. */
	add: LinkedGrammar[];
	/** Namespace already defined with a different text: that document is replaced, after asking. */
	replace: { grammar: LinkedGrammar; documentId: string }[];
}

/**
 * Decides what to do with the grammars of an open link, against the grammars the workspace
 * already has. Namespaces follow the workspace discovery rule (one definition per namespace),
 * so the plan never adds a second definition: an unknown namespace is an addition, a known one
 * with a different text is a replacement — of the first document that defines it — for the
 * caller to confirm. A payload that is not a grammar, or repeats a namespace already brought by
 * this same link, is ignored.
 *
 * @param workspace the workspace the link opens into.
 * @param grammarTexts texts of the grammars the link carried, in order.
 * @returns the additions and replacements to perform.
 */
export function planGrammars(workspace: Workspace, grammarTexts: readonly string[]): GrammarPlan {
	const plan: GrammarPlan = { add: [], replace: [] };
	if (grammarTexts.length === 0) {
		return plan;
	}

	const defined = new Map<string, WorkspaceDocument>();
	for (const document of workspace.getDocuments()) {
		for (const namespace of grammarNamespacesOf(document.text)) {
			if (!defined.has(namespace)) {
				defined.set(namespace, document);
			}
		}
	}

	const brought = new Set<string>();
	for (const text of grammarTexts) {
		const namespace = grammarNamespacesOf(text)[0];
		if (namespace === undefined || brought.has(namespace)) {
			continue;
		}
		brought.add(namespace);

		const existing = defined.get(namespace);
		if (!existing) {
			plan.add.push({ text, namespace });
		} else if (existing.text !== text) {
			plan.replace.push({ grammar: { text, namespace }, documentId: existing.id });
		}
	}
	return plan;
}

/** Namespaces defined by the grammar roots of a text, in order; empty when it does not parse. */
function grammarNamespacesOf(text: string): string[] {
	let roots: ReadonlyArray<Node>;
	try {
		// Same policy as the share decode: the workspace judges each document once loaded
		roots = new Parser({ maxNesting: -1, maxLineLength: -1, maxInputSize: -1 }).parse(text);
	} catch {
		return [];
	}

	const namespaces: string[] = [];
	for (const root of roots) {
		if (isGrammarRoot(root) && root instanceof InlineNode) {
			const namespace = StringUtils.lowerCase(root.getValue().trim());
			if (namespace.length > 0) {
				namespaces.push(namespace);
			}
		}
	}
	return namespaces;
}
