import { ChangeSpec, EditorState, Text, TransactionSpec } from "@codemirror/state";

/**
 * What the states need of the editor view: the state on screen, and the two ways to change it.
 * `EditorView` satisfies it; tests use a stand-in, since this module never touches the DOM.
 */
export interface StateHost {
	/** The state in the view right now. */
	readonly state: EditorState;
	/** Puts a state in the view. */
	setState(state: EditorState): void;
	/** Applies a transaction to the state in the view. */
	dispatch(spec: TransactionSpec): void;
}

/** Where {@link DocumentStates.change} applied the changes. */
export type ChangeOutcome =
	/** The document is in the view: the transaction went through it, and the view's own listeners see it. */
	| { where: "view" }
	/** The document is parked: its state was updated, and this is its text now. */
	| { where: "parked"; text: string }
	/** The document was never shown: there is no state to change. */
	| { where: "none" };

/**
 * One editor state per workspace document. The view shows one document at a time; every other
 * document that has been shown keeps its state parked here, so switching back restores its
 * undo history, selection and highlighting. The model is the source of truth for the text: when
 * it changes outside the editor (a grammar replaced by an open link, a reindent of a parked
 * document), the state has to follow, as a regular change so it stays undoable.
 */
export class DocumentStates {
	private readonly parked = new Map<string, EditorState>();
	private shown: string | null = null;

	/**
	 * @param host the view the states go in and out of.
	 * @param createState makes the state of a document shown for the first time.
	 */
	constructor(
		private readonly host: StateHost,
		private readonly createState: (text: string) => EditorState,
	) {}

	/** @returns the identifier of the document in the view, or null when none is. */
	shownId(): string | null {
		return this.shown;
	}

	/**
	 * Puts a document in the view, parking the state of the one that was there. A document shown
	 * before comes back with its parked state; a new one gets a fresh state from its text.
	 *
	 * @param id identifier of the document.
	 * @param text its text, used only when it has no state yet.
	 */
	show(id: string, text: string): void {
		if (this.shown !== null && this.shown !== id) {
			this.parked.set(this.shown, this.host.state);
		}
		const state = this.parked.get(id) ?? this.createState(text);
		this.parked.delete(id);
		this.shown = id;
		this.host.setState(state);
	}

	/**
	 * Brings the state of a document up to date with a text that changed in the model. When the
	 * texts already match — the editor itself was the origin: typing, or a reindent, which
	 * updates the state first — nothing moves. A document never shown has no state to update.
	 *
	 * @param id identifier of the document.
	 * @param text the text the model holds now.
	 * @returns whether a state changed.
	 */
	syncText(id: string, text: string): boolean {
		if (id === this.shown) {
			const doc = this.host.state.doc;
			if (doc.toString() === text) {
				return false;
			}
			this.host.dispatch({ changes: { from: 0, to: doc.length, insert: text } });
			return true;
		}
		const parked = this.parked.get(id);
		if (!parked || parked.doc.toString() === text) {
			return false;
		}
		this.parked.set(id, parked.update({ changes: { from: 0, to: parked.doc.length, insert: text } }).state);
		return true;
	}

	/**
	 * Applies changes to the state of a document, wherever it is: through the view when shown,
	 * through its parked state otherwise. Either way the change is undoable in that document.
	 *
	 * @param id identifier of the document.
	 * @param changes builds the change specs from the document as the state holds it.
	 * @param userEvent the user event annotation of the transaction, if any.
	 * @returns where the changes went; for a parked document, its new text.
	 */
	change(id: string, changes: (doc: Text) => ChangeSpec[], userEvent?: string): ChangeOutcome {
		if (id === this.shown) {
			this.host.dispatch({ changes: changes(this.host.state.doc), userEvent });
			return { where: "view" };
		}
		const parked = this.parked.get(id);
		if (!parked) {
			return { where: "none" };
		}
		const next = parked.update({ changes: changes(parked.doc), userEvent }).state;
		this.parked.set(id, next);
		return { where: "parked", text: next.doc.toString() };
	}

	/**
	 * Forgets a document. If it was the one in the view, the view keeps showing its state until
	 * another document is shown, but nothing is attributed to it any more.
	 *
	 * @param id identifier of the document.
	 */
	drop(id: string): void {
		this.parked.delete(id);
		if (this.shown === id) {
			this.shown = null;
		}
	}
}
