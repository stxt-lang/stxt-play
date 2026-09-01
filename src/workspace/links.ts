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

/** How the workspace is to receive the grammars of an open link. */
export interface GrammarPlan {
	/** Namespace not defined in the workspace yet: the grammar is added without asking. */
	add: LinkedGrammar[];
	/** Namespace already defined with a different text: that document is replaced, after asking. */
	replace: { grammar: LinkedGrammar; documentId: string }[];
	/** Namespace already defined with the very same text: nothing to change in that document. */
	keep: { grammar: LinkedGrammar; documentId: string }[];
}

/**
 * Decides what to do with the grammars of an open link, against the grammars the workspace
 * already has. Namespaces follow the workspace discovery rule (one definition per namespace),
 * so the plan never adds a second definition: an unknown namespace is an addition, a known one
 * with a different text is a replacement — of the first document that defines it — for the
 * caller to confirm, and a known one with the very same text is a keep, pointing at the
 * document that already holds it. A payload that is not a grammar, or repeats a namespace
 * already brought by this same link, is ignored.
 *
 * @param workspace the workspace the link opens into.
 * @param grammarTexts texts of the grammars the link carried, in order.
 * @returns the additions, replacements and keeps, one entry per grammar of the link.
 */
export function planGrammars(workspace: Workspace, grammarTexts: readonly string[]): GrammarPlan {
	const plan: GrammarPlan = { add: [], replace: [], keep: [] };
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
		} else {
			plan.keep.push({ grammar: { text, namespace }, documentId: existing.id });
		}
	}
	return plan;
}

/**
 * Whether a text is a grammar document: it parses, it has at least one root, every root is a
 * grammar (a schema or a template), and at least one declares its namespace. This is what
 * decides that the document of an open link gets the one-definition-per-namespace treatment of
 * {@link planGrammars} instead of entering as a plain document; the mixed form — a document
 * sharing the file with its grammars — is a plain document.
 *
 * @param text the full text of the linked document.
 */
export function isGrammarDocument(text: string): boolean {
	const roots = parseRoots(text);
	return roots !== undefined && roots.length > 0
		&& roots.every(isGrammarRoot)
		&& namespacesOfGrammarRoots(roots).length > 0;
}

/** The roots of a text, or undefined when it does not parse. */
function parseRoots(text: string): ReadonlyArray<Node> | undefined {
	try {
		// Same policy as the share decode: the workspace judges each document once loaded
		return new Parser({ maxNesting: -1, maxLineLength: -1, maxInputSize: -1 }).parse(text);
	} catch {
		return undefined;
	}
}

/** Namespaces defined by the grammar roots of a text, in order; empty when it does not parse. */
function grammarNamespacesOf(text: string): string[] {
	const roots = parseRoots(text);
	return roots === undefined ? [] : namespacesOfGrammarRoots(roots);
}

/** Namespaces defined by the grammar roots among the given roots, in order. */
function namespacesOfGrammarRoots(roots: ReadonlyArray<Node>): string[] {
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
