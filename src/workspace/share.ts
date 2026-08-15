import { fromWorkspaceSnapshot, toWorkspaceSnapshot } from "./storage";
import { WorkspaceSnapshot } from "./Workspace";

/**
 * Share links: the whole workspace travels in the URL fragment, compressed, so nothing needs a
 * server — the fragment never leaves the browser, and whoever opens the link gets the documents
 * loaded into their own playground. Format: `#w=` followed by the base64url of the raw-deflate
 * of the same versioned JSON the local store uses.
 */

/** Parameter name of the workspace inside the URL fragment. */
export const SHARE_PARAM = "w";

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
	const params = new URLSearchParams(hash.replace(/^#/, ""));
	const payload = params.get(SHARE_PARAM);
	return payload && payload.length > 0 ? payload : undefined;
}
