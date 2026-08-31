import { ChangeSpec, EditorState, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Analyzer, applyIndentChanges, IndentChange, SPACES_UNIT, TAB_UNIT } from "../analysis";
import { IndentMode, PlaygroundSettings, Workspace } from "../workspace";

/**
 * The two header switches: Tabs/Spaces (what Tab inserts, re-indenting the whole workspace to
 * match) and Schema validation. They own the settings mutations; the app hands in how to
 * persist them and what to repaint.
 */
export interface HeaderSwitchesOptions {
	/** The three buttons of the header. */
	elements: {
		indentTabs: HTMLElement;
		indentSpaces: HTMLElement;
		validationToggle: HTMLElement;
	};
	/** The live settings object; the switches mutate it. */
	settings: PlaygroundSettings;
	workspace: Workspace;
	analyzer: Analyzer;
	/** The editor: its view, and the knob for what Tab inserts. */
	editor: { view: EditorView; setIndentMode(mode: IndentMode): void };
	/** The parked editor state of each workspace document not in the view. */
	states: Map<string, EditorState>;
	/** Identifier of the document currently in the view, if any. */
	shownId(): string | null;
	/** Saves the settings to the store. */
	persistSettings(): void;
	/** Repaints what the validation switch changes: the view, the panel and the list. */
	refreshAfterValidation(): void;
}

/** Maps re-indentation changes (0-based line and columns) to CodeMirror change specs. */
function toCmChanges(doc: Text, changes: IndentChange[]): ChangeSpec[] {
	return changes.map((change) => {
		const line = doc.line(change.line + 1);
		return { from: line.from + change.from, to: line.from + change.to, insert: change.insert };
	});
}

/** Wires the header switches and paints their initial state. */
export function setupHeaderSwitches(options: HeaderSwitchesOptions): void {
	const { elements, settings, workspace, analyzer, editor, states } = options;
	const view = editor.view;

	const renderSwitches = (): void => {
		elements.indentTabs.setAttribute("aria-pressed", String(settings.indent === "tabs"));
		elements.indentSpaces.setAttribute("aria-pressed", String(settings.indent === "spaces"));
		elements.validationToggle.setAttribute("aria-checked", String(settings.validation));
	};

	/**
	 * Re-indents every document of the workspace to the unit of a mode. Only structural
	 * indentation changes (see `analysis/reindent.ts`); comments and block content stay as they
	 * are. The document in the view goes through a transaction, parked documents through their
	 * own state, so the change is undoable everywhere; documents never shown are rewritten in
	 * the model.
	 */
	const reindentAll = (mode: IndentMode): void => {
		const unit = mode === "tabs" ? TAB_UNIT : SPACES_UNIT;
		for (const document of workspace.getDocuments()) {
			const changes = analyzer.getIndentChanges(document.id, unit);
			if (changes.length === 0) {
				continue;
			}
			if (document.id === options.shownId()) {
				// The update listener pushes the new text into the workspace
				view.dispatch({ changes: toCmChanges(view.state.doc, changes), userEvent: "reindent" });
				continue;
			}
			const parked = states.get(document.id);
			if (parked) {
				const next = parked.update({ changes: toCmChanges(parked.doc, changes), userEvent: "reindent" }).state;
				states.set(document.id, next);
				workspace.setText(document.id, next.doc.toString());
			} else {
				workspace.setText(document.id, applyIndentChanges(document.text, changes));
			}
		}
	};

	/** Changes what Tab inserts from now on, and re-indents the workspace to match. */
	const setIndent = (mode: IndentMode): void => {
		if (settings.indent !== mode) {
			settings.indent = mode;
			editor.setIndentMode(mode);
			reindentAll(mode);
			renderSwitches();
			options.persistSettings();
		}
		view.focus();
	};
	elements.indentTabs.addEventListener("click", () => setIndent("tabs"));
	elements.indentSpaces.addEventListener("click", () => setIndent("spaces"));

	/** Switches schema validation on or off for the whole workspace and repaints everything. */
	elements.validationToggle.addEventListener("click", () => {
		settings.validation = !settings.validation;
		analyzer.setValidation(settings.validation);
		options.refreshAfterValidation();
		renderSwitches();
		options.persistSettings();
		view.focus();
	});

	renderSwitches();
}
