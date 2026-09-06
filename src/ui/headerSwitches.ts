import { ChangeSpec, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Analyzer, applyIndentChanges, IndentChange, SPACES_UNIT, TAB_UNIT } from "../analysis";
import { DocumentStates } from "../editor/documentStates";
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
	/** The editor states of the workspace documents: the one in the view and the parked ones. */
	states: DocumentStates;
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
			const outcome = states.change(document.id, (doc) => toCmChanges(doc, changes), "reindent");
			if (outcome.where === "parked") {
				workspace.setText(document.id, outcome.text);
			} else if (outcome.where === "none") {
				workspace.setText(document.id, applyIndentChanges(document.text, changes));
			}
			// In the view: the update listener pushes the new text into the workspace
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
