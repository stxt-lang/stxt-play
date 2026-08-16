import { fromWorkspaceSnapshot, toWorkspaceSnapshot } from "./storage";
import { WorkspaceSnapshot } from "./Workspace";

/**
 * Links that carry content in the URL fragment, compressed, so nothing needs a server — the
 * fragment never leaves the browser. Two kinds:
 *
 * - Share links, `#w=` followed by the base64url of the raw-deflate of the same versioned JSON
 *   the local store uses: the whole workspace travels, and whoever opens the link gets it loaded
 *   in place of their own (after confirming).
 * - Open links, `#d=` followed by the base64url of the raw-deflate of the UTF-8 text of one STXT
 *   document, plus an optional `&t=` with its title: the document is added to whatever workspace
 *   the browser already has and selected. This is what "Open in the playground" on stxt.dev
 *   uses, and anyone can build one to hand a snippet to the playground.
 */

/** Parameter name of the workspace inside the URL fragment. */
export const SHARE_PARAM = "w";

/** Parameter name of a single document to open inside the URL fragment. */
export const OPEN_PARAM = "d";

/** Parameter name of the title that may accompany {@link OPEN_PARAM}. */
export const OPEN_TITLE_PARAM = "t";

/** A document that came in an open link. */
export interface OpenLinkDocument {
	/** Full text of the document. */
	text: string;
	/** Title, if the link carried one; undefined otherwise. */
	title?: string;
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

/**
 * Builds the fragment payload of a workspace.
 *
 * @param snapshot the workspace to share.
 * @returns the payload to put after `#w=`.
 */
export async function encodeShare(snapshot: WorkspaceSnapshot): Promise<string> {
	const json = JSON.stringify(fromWorkspaceSnapshot(snapshot));
	const compressed = await pipe(new TextEncoder().encode(json), new CompressionStream("deflate-raw"));
	return toBase64Url(compressed);
}

/**
 * Reads a workspace back from a fragment payload.
 *
 * @param payload what follows `#w=`.
 * @returns the snapshot, or undefined if the payload is not a workspace. Never throws.
 */
export async function decodeShare(payload: string): Promise<WorkspaceSnapshot | undefined> {
	try {
		const bytes = await pipe(fromBase64Url(payload), new DecompressionStream("deflate-raw"));
		return toWorkspaceSnapshot(JSON.parse(new TextDecoder().decode(bytes)));
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
 * @returns the fragment without the leading `#`: `d=<payload>` or `d=<payload>&t=<title>`.
 */
export async function encodeOpen(text: string, title?: string): Promise<string> {
	const compressed = await pipe(new TextEncoder().encode(text), new CompressionStream("deflate-raw"));
	const params = new URLSearchParams();
	params.set(OPEN_PARAM, toBase64Url(compressed));
	if (title && title.trim().length > 0) {
		params.set(OPEN_TITLE_PARAM, title.trim());
	}
	// Form encoding leaves the base64url alphabet untouched and escapes whatever the title needs
	return params.toString();
}

/**
 * Reads the document of an open link back from a URL fragment.
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
	try {
		const bytes = await pipe(fromBase64Url(payload), new DecompressionStream("deflate-raw"));
		const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
		const title = nonEmpty(params.get(OPEN_TITLE_PARAM)?.trim());
		return title === undefined ? { text } : { text, title };
	} catch {
		return undefined;
	}
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
