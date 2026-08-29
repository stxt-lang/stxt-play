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

/** Key the playground settings are stored under. */
export const SETTINGS_STORAGE_KEY = "stxt-play.settings";

/** How the editor indents: a real tab per level, or four spaces. STXT accepts both. */
export type IndentMode = "tabs" | "spaces";

/** The user preferences of the playground: the two switches of the header. */
export interface PlaygroundSettings {
	/** What the Tab key inserts; switching re-indents the structural indentation of the workspace. */
	indent: IndentMode;
	/** Whether documents are validated against the workspace grammars. */
	validation: boolean;
}

/** Settings of a fresh playground. */
export const DEFAULT_SETTINGS: PlaygroundSettings = { indent: "tabs", validation: true };

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
	return toWorkspaceSnapshot(parsed);
}

/**
 * Writes the workspace to the store.
 *
 * @param storage the store to write to.
 * @param snapshot the workspace to save.
 * @returns true if the write succeeded; false if the store refused it (quota, private mode…).
 */
export function saveWorkspace(storage: KeyValueStorage, snapshot: WorkspaceSnapshot): boolean {
	try {
		storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(fromWorkspaceSnapshot(snapshot)));
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

/**
 * Reads the settings back from the store. Fields that are missing or malformed take their default,
 * so a partial or older record still yields usable settings.
 *
 * @param storage the store to read from.
 * @returns the settings, complete; the defaults if nothing usable is stored. Never throws.
 */
export function loadSettings(storage: KeyValueStorage): PlaygroundSettings {
	let parsed: unknown;
	try {
		const raw = storage.getItem(SETTINGS_STORAGE_KEY);
		parsed = raw === null ? undefined : JSON.parse(raw);
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
	if (typeof parsed !== "object" || parsed === null) {
		return { ...DEFAULT_SETTINGS };
	}
	const candidate = parsed as Record<string, unknown>;
	return {
		indent: candidate.indent === "spaces" || candidate.indent === "tabs" ? candidate.indent : DEFAULT_SETTINGS.indent,
		validation: typeof candidate.validation === "boolean" ? candidate.validation : DEFAULT_SETTINGS.validation,
	};
}

/**
 * Writes the settings to the store.
 *
 * @param storage the store to write to.
 * @param settings the settings to save.
 * @returns true if the write succeeded.
 */
export function saveSettings(storage: KeyValueStorage, settings: PlaygroundSettings): boolean {
	try {
		storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
		return true;
	} catch {
		return false;
	}
}

/**
 * Turns a parsed JSON value into a workspace snapshot, if it has the stored shape and version.
 * Shared by the local store and the share links made before they carried STXT, whose payload
 * was this same JSON.
 *
 * @param value anything that came out of `JSON.parse`.
 * @returns the snapshot, or undefined if the value is not a stored workspace.
 */
export function toWorkspaceSnapshot(value: unknown): WorkspaceSnapshot | undefined {
	return isStoredWorkspace(value) ? { active: value.active, documents: value.documents } : undefined;
}

/**
 * The stored form of a snapshot: the documents and the active id, plus the format version.
 *
 * @param snapshot the workspace to serialize.
 * @returns a plain object ready for `JSON.stringify`.
 */
export function fromWorkspaceSnapshot(snapshot: WorkspaceSnapshot): object {
	const stored: StoredWorkspace = {
		version: WORKSPACE_STORAGE_VERSION,
		active: snapshot.active,
		documents: snapshot.documents.map(({ id, title, text }) => ({ id, title, text })),
	};
	return stored;
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
