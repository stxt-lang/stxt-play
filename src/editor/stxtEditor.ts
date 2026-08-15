import { defaultKeymap, history, historyKeymap, indentLess, insertTab } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { lintGutter } from "@codemirror/lint";
import { EditorState, Extension } from "@codemirror/state";
import {
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from "@codemirror/view";
import { highlightField } from "./highlight";

/** What it takes to create the STXT editor. */
export interface StxtEditorConfig {
	/** Element the editor is mounted into. */
	parent: HTMLElement;
	/** Called after every transaction that changes the document, to re-run the analysis. */
	onDocChanged: (view: EditorView) => void;
}

/** The STXT editor: one view, and a factory for the state of every workspace document. */
export interface StxtEditor {
	/** The CodeMirror view. Swap documents with `view.setState(...)`. */
	view: EditorView;
	/**
	 * Creates the editor state of a document, with the STXT configuration. The playground keeps
	 * one state per workspace document, so switching documents preserves undo history, selection
	 * and highlighting of each.
	 *
	 * @param doc initial text of the document.
	 */
	createState(doc: string): EditorState;
}

/**
 * The extensions that make a CodeMirror state an STXT editor:
 *
 * - Indentation is structure, and tabs are the first-class unit: Tab inserts a real tab (or
 *   indents the selection), Shift-Tab dedents, and the indent unit is a tab.
 * - Highlighting comes from {@link highlightField}, fed by the analysis — never from a grammar.
 * - The lint gutter marks the lines with diagnostics; the app pushes them with `setDiagnostics`.
 *
 * @param onDocChanged called after every transaction that changes the document.
 */
export function createStxtExtensions(onDocChanged: (view: EditorView) => void): Extension {
	return [
		lineNumbers(),
		highlightActiveLineGutter(),
		highlightActiveLine(),
		history(),
		indentUnit.of("\t"),
		EditorState.tabSize.of(4),
		keymap.of([
			{ key: "Tab", run: insertTab, shift: indentLess },
			...defaultKeymap,
			...historyKeymap,
		]),
		lintGutter(),
		highlightField,
		EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				onDocChanged(update.view);
			}
		}),
	];
}

/**
 * Creates the CodeMirror view of the playground, empty, plus the state factory the app uses to
 * give every workspace document its own state.
 */
export function createStxtEditor(config: StxtEditorConfig): StxtEditor {
	const extensions = createStxtExtensions(config.onDocChanged);
	const createState = (doc: string): EditorState => EditorState.create({ doc, extensions });
	const view = new EditorView({ parent: config.parent, state: createState("") });
	return { view, createState };
}
