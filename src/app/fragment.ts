import {
	decodeOpen,
	decodeShare,
	isGrammarDocument,
	isOpenLink,
	LinkedGrammar,
	loadSharedSnapshot,
	openLinked,
	OpenLinkDocument,
	planGrammars,
	sharePayloadOf,
	Workspace,
	WorkspaceSnapshot,
} from "../workspace";

/**
 * What a link in the URL fragment does to the workspace, and what it tells the user. A share
 * link (`#w=`) replaces the documents; an open link (`#d=`) adds one, along with the grammars it
 * may carry (`&g=`), one definition per namespace. The decoding lives in `workspace/share.ts`
 * and the workspace rules in `workspace/links.ts`; this module is the flow between them, with
 * the questions to the user handed in, so it runs without a DOM.
 */

/** The questions applying a link may ask. The application answers them with its dialogs. */
export interface FragmentDialogs {
	/**
	 * A share link arrived while the workspace holds the user's own documents: replace them?
	 *
	 * @param count number of documents the link carries.
	 */
	loadSharedWorkspace(count: number): Promise<boolean>;
	/**
	 * A link brings a grammar for a namespace the workspace defines differently: replace it?
	 *
	 * @param namespace the namespace in question.
	 */
	replaceGrammar(namespace: string): Promise<boolean>;
}

/** A link found in a URL fragment, still encoded: what kind it is, and what to decode. */
export type FragmentLink =
	| { kind: "share"; payload: string }
	| { kind: "open"; hash: string };

/**
 * Tells what link a URL fragment carries, without decoding it. If a share link and an open link
 * come together, the share link wins.
 *
 * @param hash `location.hash`, with or without the leading `#`.
 * @returns the link, or undefined when the fragment carries none.
 */
export function linkOf(hash: string): FragmentLink | undefined {
	const payload = sharePayloadOf(hash);
	if (payload !== undefined) {
		return { kind: "share", payload };
	}
	return isOpenLink(hash) ? { kind: "open", hash } : undefined;
}

/**
 * Acts on a link: decodes it and applies it to the workspace.
 *
 * @param link the link, from {@link linkOf}.
 * @param workspace the workspace the link opens into.
 * @param ownContent whether the workspace holds the user's own documents (as opposed to the
 * seed): a share link then asks before replacing them.
 * @param dialogs how to ask the user.
 * @returns the status message to show, or undefined when there is nothing to say: the user
 * kept their workspace.
 */
export async function applyLink(
	link: FragmentLink,
	workspace: Workspace,
	ownContent: boolean,
	dialogs: FragmentDialogs,
): Promise<string | undefined> {
	return link.kind === "share"
		? applyShareLink(workspace, await decodeShare(link.payload), ownContent, dialogs)
		: applyOpenLink(workspace, await decodeOpen(link.hash), dialogs);
}

/**
 * Acts on the link of a URL fragment, if it carries one: {@link linkOf} then {@link applyLink}.
 *
 * @returns the status message, or undefined when the fragment carries no link or there is
 * nothing to say.
 */
export async function applyFragment(
	hash: string,
	workspace: Workspace,
	ownContent: boolean,
	dialogs: FragmentDialogs,
): Promise<string | undefined> {
	const link = linkOf(hash);
	return link === undefined ? undefined : applyLink(link, workspace, ownContent, dialogs);
}

/**
 * Loads the workspace of a share link in place of the current one, asking first when the current
 * one is the user's.
 *
 * @param workspace the workspace to replace.
 * @param shared the decoded link; undefined when it did not decode.
 * @param ownContent whether the workspace holds the user's own documents.
 * @param dialogs how to ask the user.
 * @returns the status message, or undefined when the user kept their workspace.
 */
export async function applyShareLink(
	workspace: Workspace,
	shared: WorkspaceSnapshot | undefined,
	ownContent: boolean,
	dialogs: FragmentDialogs,
): Promise<string | undefined> {
	if (!shared || shared.documents.length === 0) {
		return "The link does not carry a valid workspace.";
	}
	const replace = !ownContent || await dialogs.loadSharedWorkspace(shared.documents.length);
	if (!replace) {
		return undefined;
	}
	loadSharedSnapshot(workspace, shared);
	return "Shared workspace loaded.";
}

/**
 * Adds the document of an open link to the workspace and selects it, after receiving the
 * grammars it carries. The grammars come first, so the document handled last is the one left
 * active: a namespace the workspace does not define is added without asking, an identical
 * definition is kept as it is, and a different one is replaced after asking. A document that is
 * itself a grammar follows that same rule instead of entering as a plain document, so no link can
 * leave the workspace with two definitions of one namespace.
 *
 * @param workspace the workspace the link opens into.
 * @param linked the decoded link; undefined when it did not decode.
 * @param dialogs how to ask the user.
 * @returns the status message.
 */
export async function applyOpenLink(
	workspace: Workspace,
	linked: OpenLinkDocument | undefined,
	dialogs: FragmentDialogs,
): Promise<string> {
	if (!linked) {
		return "The link does not carry a valid document.";
	}

	// A replacement overwrites a grammar of this browser, so it asks first
	const replaceAfterAsking = async (grammar: LinkedGrammar, documentId: string): Promise<boolean> => {
		const replace = await dialogs.replaceGrammar(grammar.namespace);
		if (replace) {
			workspace.setText(documentId, grammar.text);
		}
		return replace;
	};

	const plan = planGrammars(workspace, linked.grammars ?? []);
	let grammars = 0;
	for (const grammar of plan.add) {
		workspace.addDocument(grammar.text, grammar.namespace);
		grammars++;
	}
	for (const { grammar, documentId } of plan.replace) {
		if (await replaceAfterAsking(grammar, documentId)) {
			grammars++;
		}
	}

	let base: string;
	if (isGrammarDocument(linked.text)) {
		const main = planGrammars(workspace, [linked.text]);
		if (main.add.length > 0) {
			workspace.addDocument(main.add[0].text, main.add[0].namespace);
			base = "Grammar opened from the link.";
		} else if (main.keep.length > 0) {
			workspace.setActive(main.keep[0].documentId);
			base = "The grammar of the link was already in the workspace.";
		} else {
			const { grammar, documentId } = main.replace[0];
			const replaced = await replaceAfterAsking(grammar, documentId);
			workspace.setActive(documentId);
			base = replaced ? "Grammar replaced from the link." : "Your grammar was kept.";
		}
	} else {
		const outcome = openLinked(workspace, linked.text, linked.title);
		base = outcome === "existing"
			? "The document of the link was already in the workspace."
			: "Document opened from the link.";
	}
	return grammars === 0 ? base : `${base} The link also brought ${grammars} grammar${grammars === 1 ? "" : "s"}.`;
}
