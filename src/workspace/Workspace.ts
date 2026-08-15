/**
 * The in-memory workspace of the playground: an ordered list of documents plus the active one.
 *
 * Everything is a document here — plain STXT, schemas and templates alike. Whether a document is
 * a grammar is not stored: it is a fact of its content, and the analysis layer reports it. The
 * model knows nothing about the DOM, CodeMirror or storage; it just holds state and tells its
 * subscribers what changed, so the app can keep the analyzer, the editor and the panels in sync.
 */

/** One document of the workspace. Instances are immutable snapshots: mutations produce new ones. */
export interface WorkspaceDocument {
	/** Stable identifier within the workspace; never shown to the user. */
	readonly id: string;
	/** Title chosen by the user. Grammars are labeled by their namespace instead, but keep one. */
	readonly title: string;
	/** Full text of the document. */
	readonly text: string;
}

/** What changed in the workspace. */
export type WorkspaceEvent =
	| { kind: "added"; id: string }
	| { kind: "removed"; id: string }
	| { kind: "text"; id: string }
	| { kind: "renamed"; id: string }
	| { kind: "moved"; id: string }
	| { kind: "activated"; id: string };

/** Receives every {@link WorkspaceEvent}, in the order they happen. */
export type WorkspaceListener = (event: WorkspaceEvent) => void;

/** Serializable picture of the whole workspace, what persistence reads and writes. */
export interface WorkspaceSnapshot {
	/** Identifier of the active document, or null when the workspace is empty. */
	active: string | null;
	/** Every document, in list order. */
	documents: WorkspaceDocument[];
}

/** Title given to new documents; a counter is appended to keep titles unique. */
export const UNTITLED = "Untitled";

/** Default identifier generator: time-based plus a random tail, unique enough for one browser. */
function defaultIdGenerator(): string {
	return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** The workspace model. See the module comment. */
export class Workspace {
	private readonly documents: WorkspaceDocument[] = [];
	private readonly listeners = new Set<WorkspaceListener>();
	private active: string | null = null;

	/**
	 * @param generateId produces identifiers for new documents; injectable for deterministic tests.
	 */
	constructor(private readonly generateId: () => string = defaultIdGenerator) {}

	/**
	 * Subscribes to workspace changes.
	 *
	 * @param listener called after every change.
	 * @returns a function that unsubscribes the listener.
	 */
	subscribe(listener: WorkspaceListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** @returns the documents in list order. The array is a copy; the documents are immutable. */
	getDocuments(): WorkspaceDocument[] {
		return [...this.documents];
	}

	/**
	 * @param id identifier of a document.
	 * @returns the document, or undefined if the workspace does not hold it.
	 */
	getDocument(id: string): WorkspaceDocument | undefined {
		return this.documents.find((document) => document.id === id);
	}

	/** @returns the identifier of the active document, or null when the workspace is empty. */
	getActiveId(): string | null {
		return this.active;
	}

	/** @returns the active document, or undefined when the workspace is empty. */
	getActiveDocument(): WorkspaceDocument | undefined {
		return this.active === null ? undefined : this.getDocument(this.active);
	}

	/**
	 * Makes a document the active one. Ignored if the document is not in the workspace or is
	 * already active.
	 *
	 * @param id identifier of the document to activate.
	 */
	setActive(id: string): void {
		if (id !== this.active && this.getDocument(id)) {
			this.active = id;
			this.emit({ kind: "activated", id });
		}
	}

	/**
	 * Adds a document at the end of the list and makes it active.
	 *
	 * @param text initial text; empty by default.
	 * @param title title; by default the next free "Untitled N".
	 * @returns the new document.
	 */
	addDocument(text = "", title?: string): WorkspaceDocument {
		const document: WorkspaceDocument = {
			id: this.generateId(),
			title: title?.trim() || this.nextUntitled(),
			text,
		};
		this.documents.push(document);
		this.emit({ kind: "added", id: document.id });
		this.setActive(document.id);
		return document;
	}

	/**
	 * Replaces the text of a document. Ignored if the text is unchanged or the document unknown.
	 *
	 * @param id identifier of the document.
	 * @param text new full text.
	 */
	setText(id: string, text: string): void {
		const index = this.indexOf(id);
		if (index >= 0 && this.documents[index].text !== text) {
			this.documents[index] = { ...this.documents[index], text };
			this.emit({ kind: "text", id });
		}
	}

	/**
	 * Renames a document. A blank title is ignored: a document always has one, even if grammars
	 * do not show it.
	 *
	 * @param id identifier of the document.
	 * @param title new title; trimmed.
	 * @returns true if the title changed.
	 */
	rename(id: string, title: string): boolean {
		const trimmed = title.trim();
		const index = this.indexOf(id);
		if (index < 0 || trimmed.length === 0 || this.documents[index].title === trimmed) {
			return false;
		}
		this.documents[index] = { ...this.documents[index], title: trimmed };
		this.emit({ kind: "renamed", id });
		return true;
	}

	/**
	 * Moves a document to another position of the list. Out-of-range positions are clamped.
	 *
	 * @param id identifier of the document.
	 * @param toIndex final position of the document, 0-based.
	 * @returns true if the order changed.
	 */
	move(id: string, toIndex: number): boolean {
		const from = this.indexOf(id);
		if (from < 0) {
			return false;
		}
		const to = Math.max(0, Math.min(Math.trunc(toIndex), this.documents.length - 1));
		if (to === from) {
			return false;
		}
		const [document] = this.documents.splice(from, 1);
		this.documents.splice(to, 0, document);
		this.emit({ kind: "moved", id });
		return true;
	}

	/**
	 * Removes a document. If it was the active one, the next document in the list takes over (or
	 * the previous one when it was the last), so the editor always shows a neighbour.
	 *
	 * @param id identifier of the document to remove.
	 * @returns true if a document was removed.
	 */
	removeDocument(id: string): boolean {
		const index = this.indexOf(id);
		if (index < 0) {
			return false;
		}

		this.documents.splice(index, 1);
		const wasActive = this.active === id;
		if (wasActive) {
			// Do not go through setActive: the removed document must be reported first
			this.active = null;
		}
		this.emit({ kind: "removed", id });

		if (wasActive && this.documents.length > 0) {
			const neighbour = this.documents[Math.min(index, this.documents.length - 1)];
			this.setActive(neighbour.id);
		}
		return true;
	}

	/** @returns a serializable copy of the workspace. */
	toSnapshot(): WorkspaceSnapshot {
		return { active: this.active, documents: this.getDocuments() };
	}

	/**
	 * Replaces the whole workspace with a snapshot, reporting the change document by document.
	 * A snapshot whose active id is missing activates the first document instead.
	 *
	 * @param snapshot the workspace to load.
	 */
	load(snapshot: WorkspaceSnapshot): void {
		for (const document of this.getDocuments()) {
			this.removeDocument(document.id);
		}
		for (const document of snapshot.documents) {
			this.documents.push({ id: document.id, title: document.title, text: document.text });
			this.emit({ kind: "added", id: document.id });
		}
		const first = this.documents[0];
		const active = snapshot.active !== null && this.getDocument(snapshot.active) ? snapshot.active : first?.id;
		if (active !== undefined) {
			this.setActive(active);
		}
	}

	private indexOf(id: string): number {
		return this.documents.findIndex((document) => document.id === id);
	}

	/** First "Untitled N" not taken by any document, starting at 1. */
	private nextUntitled(): string {
		const titles = new Set(this.documents.map((document) => document.title));
		for (let n = 1; ; n++) {
			const candidate = `${UNTITLED} ${n}`;
			if (!titles.has(candidate)) {
				return candidate;
			}
		}
	}

	private emit(event: WorkspaceEvent): void {
		for (const listener of this.listeners) {
			listener(event);
		}
	}
}
