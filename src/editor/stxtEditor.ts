import { defaultKeymap, history, historyKeymap, indentLess, insertTab } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { lintGutter } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
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
	/** Initial text of the document. */
	doc: string;
	/** Called after every transaction that changes the document, to re-run the analysis. */
	onDocChanged: (view: EditorView) => void;
}

/**
 * Creates the CodeMirror view of the playground, configured for STXT:
 *
 * - Indentation is structure, and tabs are the first-class unit: Tab inserts a real tab (or
 *   indents the selection), Shift-Tab dedents, and the indent unit is a tab.
 * - Highlighting comes from {@link highlightField}, fed by the analysis — never from a grammar.
 * - The lint gutter marks the lines with diagnostics; the app pushes them with `setDiagnostics`.
 */
export function createStxtEditor(config: StxtEditorConfig): EditorView {
	return new EditorView({
		parent: config.parent,
		state: EditorState.create({
			doc: config.doc,
			extensions: [
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
						config.onDocChanged(update.view);
					}
				}),
			],
		}),
	});
}
