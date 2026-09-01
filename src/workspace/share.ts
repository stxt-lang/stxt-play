import { InlineNode, Node, NodeWriter, Parser, TextNode } from "@stxt-lang/core";
import { WorkspaceDocument, WorkspaceSnapshot } from "./Workspace";

/**
 * Links that carry content in the URL fragment, compressed, so nothing needs a server — the
 * fragment never leaves the browser. Two kinds:
 *
 * - Share links, `#w=` followed by the base64url of the raw-deflate of the whole workspace
 *   written as one STXT document (see {@link toShareDocument}): whoever opens the link gets it
 *   loaded in place of their own workspace (after confirming). STXT sharing STXT — inflating
 *   the payload shows a document anyone can read, edit and compress again.
 * - Open links, `#d=` followed by the base64url of the raw-deflate of the UTF-8 text of one STXT
 *   document, plus an optional `&t=` with its title: the document is added to whatever workspace
 *   the browser already has and selected. This is what "Open in the playground" on stxt.dev
 *   uses, and anyone can build one to hand a snippet to the playground. Zero or more `&g=`
 *   parameters may come along, each one a grammar document (a schema or a template) encoded like
 *   the `d=` payload: the grammars the document needs to validate, which the workspace receives
 *   as separate documents (see `links.ts` for how an already-defined namespace is handled).
 */

/** Parameter name of the workspace inside the URL fragment. */
export const SHARE_PARAM = "w";

/** Namespace of the share envelope. The `stxt.play.*` family is the playground's own. */
export const SHARE_NAMESPACE = "stxt.play.share";

/** Version of the share envelope, the value of its `Version` node. Bump on incompatible change. */
export const SHARE_VERSION = "1";

/** Comment that heads the share document, for whoever inflates a payload out of curiosity. */
const SHARE_HEADER = "# STXT Playground workspace — https://play.stxt.dev\n";

/** Parameter name of a single document to open inside the URL fragment. */
export const OPEN_PARAM = "d";

/** Parameter name of the title that may accompany {@link OPEN_PARAM}. */
export const OPEN_TITLE_PARAM = "t";

/** Parameter name, repeatable, of a grammar that may accompany {@link OPEN_PARAM}. */
export const OPEN_GRAMMAR_PARAM = "g";

/** A document that came in an open link. */
export interface OpenLinkDocument {
	/** Full text of the document. */
	text: string;
	/** Title, if the link carried one; undefined otherwise. */
	title?: string;
	/** Texts of the grammars the link carried, in order; undefined when it carried none. */
	grammars?: string[];
}

/** Encodes bytes as base64url (RFC 4648 §5, no padding), safe inside a URL fragment. */
function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
	const base64 = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4);
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
	const response = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
	return new Uint8Array(await response.arrayBuffer());
}

/** Deflates a text and encodes it as base64url: the payload form every parameter here uses. */
async function compressText(text: string): Promise<string> {
	return toBase64Url(await pipe(new TextEncoder().encode(text), new CompressionStream("deflate-raw")));
}

/** The reverse of {@link compressText}. Throws on garbage; callers turn that into undefined. */
async function decompressText(payload: string): Promise<string> {
	const bytes = await pipe(fromBase64Url(payload), new DecompressionStream("deflate-raw"));
	return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/**
 * Writes a workspace as one STXT document, the form that travels in a share link:
 *
 * ```stxt
 * # STXT Playground workspace — https://play.stxt.dev
 * Workspace (stxt.play.share):
 * 	Version: 1
 * 	Document: Recipe
 * 		Active: true
 * 		Text >>
 * 			Recipe (stxt.play.cooking): Pancakes
 * 			...
 * ```
 *
 * One `Document` per workspace document, in order, with its title as the value; the active one
 * carries `Active: true`, and the full text goes in the `Text` block, literal. Document ids are
 * not part of the format: they only mean something inside one browser, and {@link fromShareDocument}
 * mints fresh ones. Two STXT normalizations apply to the text (both harmless in an editor, and
 * both applied anyway by the formatter): blank-trim removes trailing whitespace of every line,
 * and a block drops its final empty lines — decoding closes every non-empty text with a single
 * newline, so a document that ends with one (the usual case) round-trips exactly.
 *
 * @param snapshot the workspace to write.
 * @returns the share document, ready to compress.
 */
export function toShareDocument(snapshot: WorkspaceSnapshot): string {
	const root = new InlineNode("Workspace", SHARE_NAMESPACE, null);
	root.addChild(new InlineNode("Version", SHARE_VERSION));
	for (const document of snapshot.documents) {
		const entry = new InlineNode("Document", document.title);
		if (document.id === snapshot.active) {
			entry.addChild(new InlineNode("Active", "true"));
		}
		entry.addChild(new TextNode("Text", document.text));
		root.addChild(entry);
	}
	return SHARE_HEADER + NodeWriter.toSTXT(root);
}

/**
 * Reads a workspace back from a share document. The counterpart of {@link toShareDocument},
 * lenient enough for hand-written envelopes: indentation style is free (it is STXT), the header
 * comment is optional, a `Document` without `Text` is an empty document, and `Active` is
 * compared case-insensitively. The first root named `Workspace (stxt.play.share)` with
 * `Version: 1` is the workspace; without one there is no workspace.
 *
 * @param text the share document.
 * @returns the snapshot, with fresh sequential ids, or undefined when the text is not a share
 * document. Never throws.
 */
export function fromShareDocument(text: string): WorkspaceSnapshot | undefined {
	let roots: ReadonlyArray<Node>;
	try {
		// The envelope itself nests two levels; the limits exist to guard the editor, and what
		// each document allows is judged there once loaded, so none applies to the decode
		roots = new Parser({ maxNesting: -1, maxLineLength: -1, maxInputSize: -1 }).parse(text);
	} catch {
		return undefined;
	}

	const root = roots.find(
		(node) => node instanceof InlineNode && node.getCanonicalName() === "workspace" && node.getNamespace() === SHARE_NAMESPACE,
	) as InlineNode | undefined;
	if (!root || firstValue(root, "Version") !== SHARE_VERSION) {
		return undefined;
	}

	const documents: WorkspaceDocument[] = [];
	let active: string | null = null;
	for (const child of root.getChildrenByName("Document")) {
		if (!(child instanceof InlineNode)) {
			continue;
		}
		const id = `s${documents.length + 1}`;
		documents.push({ id, title: child.getValue(), text: textOf(child) });
		if (active === null && firstValue(child, "Active")?.toLowerCase() === "true") {
			active = id;
		}
	}
	return { active: active ?? documents[0]?.id ?? null, documents };
}

/** Value of the first inline child with that name, or undefined when there is none. */
function firstValue(node: InlineNode, name: string): string | undefined {
	const child = node.getChildrenByName(name).find((candidate) => candidate instanceof InlineNode);
	return child === undefined ? undefined : (child as InlineNode).getValue();
}

/** Text of the `Text` block of a document entry; empty without one. Non-empty text ends in `\n`. */
function textOf(entry: InlineNode): string {
	const block = entry.getChildrenByName("Text").find((candidate) => candidate instanceof TextNode);
	const lines = block === undefined ? [] : (block as TextNode).getTextLines();
	return lines.length === 0 ? "" : lines.join("\n") + "\n";
}

/**
 * Builds the fragment payload of a workspace.
 *
 * @param snapshot the workspace to share.
 * @returns the payload to put after `#w=`.
 */
export async function encodeShare(snapshot: WorkspaceSnapshot): Promise<string> {
	return compressText(toShareDocument(snapshot));
}

/**
 * Reads a workspace back from a fragment payload: the compressed STXT share document.
 *
 * @param payload what follows `#w=`.
 * @returns the snapshot, or undefined if the payload is not a workspace. Never throws.
 */
export async function decodeShare(payload: string): Promise<WorkspaceSnapshot | undefined> {
	try {
		return fromShareDocument(await decompressText(payload));
	} catch {
		return undefined;
	}
}

/**
 * Extracts the share payload of a URL fragment.
 *
 * @param hash `location.hash`, with or without the leading `#`.
 * @returns the payload, or undefined when the fragment carries no workspace.
 */
export function sharePayloadOf(hash: string): string | undefined {
	return nonEmpty(fragmentParams(hash).get(SHARE_PARAM));
}

/**
 * Builds the fragment of an open link for one document.
 *
 * @param text the full text of the document.
 * @param title optional title; omitted when blank.
 * @param grammars optional grammar documents that go along, one `g=` parameter each.
 * @returns the fragment without the leading `#`: `d=<payload>`, plus `&t=` and `&g=` as given.
 */
export async function encodeOpen(text: string, title?: string, grammars: readonly string[] = []): Promise<string> {
	const params = new URLSearchParams();
	params.set(OPEN_PARAM, await compressText(text));
	if (title && title.trim().length > 0) {
		params.set(OPEN_TITLE_PARAM, title.trim());
	}
	for (const grammar of grammars) {
		params.append(OPEN_GRAMMAR_PARAM, await compressText(grammar));
	}
	// Form encoding leaves the base64url alphabet untouched and escapes whatever the title needs
	return params.toString();
}

/**
 * Reads the document of an open link back from a URL fragment. A `g=` grammar that does not
 * decode is skipped, so a damaged grammar never loses the document of the link.
 *
 * @param hash `location.hash`, with or without the leading `#`.
 * @returns the document, or undefined when the fragment carries no valid document. Never throws.
 */
export async function decodeOpen(hash: string): Promise<OpenLinkDocument | undefined> {
	const params = fragmentParams(hash);
	const payload = nonEmpty(params.get(OPEN_PARAM));
	if (!payload) {
		return undefined;
	}
	let text: string;
	try {
		text = await decompressText(payload);
	} catch {
		return undefined;
	}

	const grammars: string[] = [];
	for (const grammarPayload of params.getAll(OPEN_GRAMMAR_PARAM)) {
		try {
			grammars.push(await decompressText(grammarPayload));
		} catch {
			// Skipped: see above
		}
	}

	const title = nonEmpty(params.get(OPEN_TITLE_PARAM)?.trim());
	const document: OpenLinkDocument = { text };
	if (title !== undefined) {
		document.title = title;
	}
	if (grammars.length > 0) {
		document.grammars = grammars;
	}
	return document;
}

/**
 * Tells whether a URL fragment carries an open link, without decoding it.
 *
 * @param hash `location.hash`, with or without the leading `#`.
 */
export function isOpenLink(hash: string): boolean {
	return nonEmpty(fragmentParams(hash).get(OPEN_PARAM)) !== undefined;
}

function fragmentParams(hash: string): URLSearchParams {
	return new URLSearchParams(hash.replace(/^#/, ""));
}

function nonEmpty(value: string | null | undefined): string | undefined {
	return value && value.length > 0 ? value : undefined;
}
