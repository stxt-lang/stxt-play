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
	 * before comes back with its parked state; a new one gets a fresh state from its text; the
	 * document already in the view stays as it is.
	 *
	 * @param id identifier of the document.
	 * @param text its text, used only when it has no state yet.
	 */
	show(id: string, text: string): void {
		if (this.shown === id) {
			return;
		}
		if (this.shown !== null) {
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
		const doc = id === this.shown ? this.host.state.doc : this.parked.get(id)?.doc;
		if (!doc || doc.toString() === text) {
			return false;
		}
		this.change(id, (current) => [{ from: 0, to: current.length, insert: text }]);
		return true;
	}

	/**
	 * Applies changes to the state of a document, wherever it is: through the view when shown
	 * (the view's own listeners see the transaction), through its parked state otherwise. Either
	 * way the change is undoable in that document.
	 *
	 * @param id identifier of the document.
	 * @param changes builds the change specs from the document as the state holds it.
	 * @param userEvent the user event annotation of the transaction, if any.
	 * @returns the text of the document after the changes, or undefined if it was never shown:
	 * there is no state to change.
	 */
	change(id: string, changes: (doc: Text) => ChangeSpec[], userEvent?: string): string | undefined {
		if (id === this.shown) {
			this.host.dispatch({ changes: changes(this.host.state.doc), userEvent });
			return this.host.state.doc.toString();
		}
		const parked = this.parked.get(id);
		if (!parked) {
			return undefined;
		}
		const next = parked.update({ changes: changes(parked.doc), userEvent }).state;
		this.parked.set(id, next);
		return next.doc.toString();
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
