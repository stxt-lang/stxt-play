import { defaultKeymap, history, historyKeymap, indentLess, indentMore } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { lintGutter } from "@codemirror/lint";
import { Compartment, EditorState, Extension } from "@codemirror/state";
import {
	Command,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from "@codemirror/view";
import { IndentMode } from "../workspace";
import { highlightField } from "./highlight";

/** What it takes to create the STXT editor. */
export interface StxtEditorConfig {
	/** Element the editor is mounted into. */
	parent: HTMLElement;
	/** Indentation mode to start with. */
	indent: IndentMode;
	/** Called after every transaction that changes the document, to re-run the analysis. */
	onDocChanged: (view: EditorView) => void;
}

/** The STXT editor: one view, and a factory for the state of every workspace document. */
export interface StxtEditor {
	/** The CodeMirror view. */
	view: EditorView;
	/**
	 * Creates the editor state of a document, with the STXT configuration. The playground keeps
	 * one state per workspace document, so switching documents preserves undo history, selection
	 * and highlighting of each. Show it with {@link showState}, which applies the indent mode.
	 *
	 * @param doc initial text of the document.
	 */
	createState(doc: string): EditorState;
	/**
	 * Puts a state in the view, bringing it up to date with the current indentation mode (a
	 * parked state may predate a switch of the header).
	 *
	 * @param state a state created by {@link createState}.
	 */
	showState(state: EditorState): void;
	/**
	 * Changes what the Tab key inserts and what the indent commands use, in the view and in every
	 * state created or shown from now on. Existing text is never converted.
	 *
	 * @param mode tabs or spaces.
	 */
	setIndentMode(mode: IndentMode): void;
}

/** The indentation string of each mode. STXT: one tab, or exactly four spaces, per level. */
const INDENT_UNITS: Record<IndentMode, string> = { tabs: "\t", spaces: "    " };

/** Slot of the state configuration that holds the indent unit, so the header can swap it. */
const indentCompartment = new Compartment();

/**
 * Tab inserts one indent unit at every cursor — a real tab or four spaces, per the header switch —
 * or indents the selected lines when there is a selection. Shift-Tab is `indentLess`, which is
 * unit-aware on its own.
 */
const insertIndentUnit: Command = (view) => {
	const { state } = view;
	if (state.selection.ranges.some((range) => !range.empty)) {
		return indentMore(view);
	}
	view.dispatch(state.update(state.replaceSelection(state.facet(indentUnit)), {
		scrollIntoView: true,
		userEvent: "input",
	}));
	return true;
};

/**
 * The extensions that make a CodeMirror state an STXT editor:
 *
 * - Indentation is structure. Tab inserts one indent unit (or indents the selection), Shift-Tab
 *   dedents; the unit is a tab by default and four spaces when the header says so.
 * - Highlighting comes from {@link highlightField}, fed by the analysis — never from a grammar.
 * - The lint gutter marks the lines with diagnostics; the app pushes them with `setDiagnostics`.
 *
 * @param onDocChanged called after every transaction that changes the document.
 * @param indent the initial indentation mode.
 */
export function createStxtExtensions(onDocChanged: (view: EditorView) => void, indent: IndentMode): Extension {
	return [
		lineNumbers(),
		highlightActiveLineGutter(),
		highlightActiveLine(),
		history(),
		indentCompartment.of(indentUnit.of(INDENT_UNITS[indent])),
		EditorState.tabSize.of(4),
		keymap.of([
			{ key: "Tab", run: insertIndentUnit, shift: indentLess },
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
	let indent = config.indent;
	const extensions = createStxtExtensions(config.onDocChanged, indent);
	const view = new EditorView({ parent: config.parent, state: EditorState.create({ doc: "", extensions }) });

	const applyIndent = (): void => {
		if (view.state.facet(indentUnit) !== INDENT_UNITS[indent]) {
			view.dispatch({ effects: indentCompartment.reconfigure(indentUnit.of(INDENT_UNITS[indent])) });
		}
	};

	return {
		view,
		// States are born with the initial mode; showState brings them to the current one
		createState: (doc) => EditorState.create({ doc, extensions }),
		showState: (state) => {
			view.setState(state);
			applyIndent();
		},
		setIndentMode: (mode) => {
			indent = mode;
			applyIndent();
		},
	};
}
