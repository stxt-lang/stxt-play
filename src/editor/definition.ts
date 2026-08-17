import { Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

/**
 * Asks the app to go to the definition of what is at a 0-based line and column of the document
 * in the view. Returns whether there was somewhere to go: the app resolves the location through
 * the analysis and, if it is in another workspace document, switches to it.
 */
export type DefinitionNavigator = (line: number, character: number) => boolean;

/**
 * "Go to definition" for STXT, the gestures of VS Code that a browser leaves free: Ctrl+Click
 * (Cmd+Click on macOS) over the head of a node line, or Ctrl+B / Cmd+B with the cursor on it.
 * F12 is not bound because browsers keep it for their developer tools. Nothing here knows what a
 * definition is: the navigator does.
 *
 * @param goTo the app's hook into the analyzer and the workspace.
 */
export function stxtGoToDefinition(goTo: DefinitionNavigator): Extension {
	const goToAt = (view: EditorView, pos: number): boolean => {
		const line = view.state.doc.lineAt(pos);
		return goTo(line.number - 1, pos - line.from);
	};

	return [
		keymap.of([{ key: "Mod-b", run: (view) => goToAt(view, view.state.selection.main.head) }]),
		EditorView.domEventHandlers({
			mousedown(event, view) {
				if (!(event.ctrlKey || event.metaKey) || event.button !== 0) {
					return false;
				}
				const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
				if (pos === null || !goToAt(view, pos)) {
					return false;
				}
				// Handled: keep CodeMirror from moving the selection to the click
				event.preventDefault();
				return true;
			},
		}),
	];
}
