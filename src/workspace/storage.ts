import { WorkspaceSnapshot } from "./Workspace";

/**
 * Persistence of the workspace in a key/value store — `localStorage` in the browser, anything
 * with the same two methods in tests. One key holds the whole workspace as versioned JSON, so
 * a future format change can migrate or discard old data explicitly instead of misreading it.
 */

/** Key the workspace is stored under. */
export const WORKSPACE_STORAGE_KEY = "stxt-play.workspace";

/** Version of the stored format. Bump on any incompatible change of {@link StoredWorkspace}. */
export const WORKSPACE_STORAGE_VERSION = 1;

/** The subset of the Web Storage API the playground uses. */
export interface KeyValueStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

/** What is actually written: the snapshot plus its format version. */
interface StoredWorkspace extends WorkspaceSnapshot {
	version: number;
}

/**
 * Reads the workspace back from the store.
 *
 * @param storage the store to read from.
 * @returns the snapshot, or undefined if nothing usable is stored (absent, corrupt, or another
 * version). Never throws: a broken store must not keep the playground from starting.
 */
export function loadWorkspace(storage: KeyValueStorage): WorkspaceSnapshot | undefined {
	let raw: string | null;
	try {
		raw = storage.getItem(WORKSPACE_STORAGE_KEY);
	} catch {
		return undefined;
	}
	if (raw === null) {
		return undefined;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return undefined;
	}
	return isStoredWorkspace(parsed) ? { active: parsed.active, documents: parsed.documents } : undefined;
}

/**
 * Writes the workspace to the store.
 *
 * @param storage the store to write to.
 * @param snapshot the workspace to save.
 * @returns true if the write succeeded; false if the store refused it (quota, private mode…).
 */
export function saveWorkspace(storage: KeyValueStorage, snapshot: WorkspaceSnapshot): boolean {
	const stored: StoredWorkspace = {
		version: WORKSPACE_STORAGE_VERSION,
		active: snapshot.active,
		documents: snapshot.documents.map(({ id, title, text }) => ({ id, title, text })),
	};
	try {
		storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(stored));
		return true;
	} catch {
		return false;
	}
}

/**
 * Forgets the stored workspace.
 *
 * @param storage the store to clear.
 */
export function clearWorkspace(storage: KeyValueStorage): void {
	try {
		storage.removeItem(WORKSPACE_STORAGE_KEY);
	} catch {
		// Nothing to do: if the store is unavailable there is nothing to forget
	}
}

/** Structural check of what came out of the store, field by field. */
function isStoredWorkspace(value: unknown): value is StoredWorkspace {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const candidate = value as Record<string, unknown>;
	if (candidate.version !== WORKSPACE_STORAGE_VERSION) {
		return false;
	}
	if (candidate.active !== null && typeof candidate.active !== "string") {
		return false;
	}
	if (!Array.isArray(candidate.documents)) {
		return false;
	}
	return candidate.documents.every((document: unknown) => {
		if (typeof document !== "object" || document === null) {
			return false;
		}
		const fields = document as Record<string, unknown>;
		return typeof fields.id === "string" && typeof fields.title === "string" && typeof fields.text === "string";
	});
}
