import { Diagnostic as CmDiagnostic, setDiagnostics } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { Analyzer, Diagnostic } from "./analysis";
import { setTokensEffect } from "./editor/highlight";
import { createStxtEditor } from "./editor/stxtEditor";
import { createProblemsPanel } from "./ui/problemsPanel";

/**
 * Entry point of the playground (phase 2: one document).
 *
 * The wiring follows the model of the analysis layer: every document change triggers one
 * analysis, and everything — highlighting, underlines, the problems panel — reads from that
 * single result.
 */

const DOC_ID = "document";

const SAMPLE = [
	"# Welcome to the STXT playground.",
	"# Everything runs in your browser: edit the document and watch the analysis react.",
	"Recipe (com.example.cooking): Pa amb tomàquet",
	"\tServes: 2",
	"\tIngredients:",
	"\t\tIngredient: Bread",
	"\t\tIngredient: Ripe tomato",
	"\t\tIngredient: Olive oil and salt",
	"\tSteps >>",
	"\t\tRub the tomato on the bread.",
	"\t\tAdd olive oil and a pinch of salt.",
	"\t\tEverything in this block is literal text: # : >> are not parsed.",
	"",
].join("\n");

/** Maps analysis diagnostics (0-based lines) to CodeMirror diagnostics (whole-line ranges). */
function toCmDiagnostics(view: EditorView, diagnostics: Diagnostic[]): CmDiagnostic[] {
	const doc = view.state.doc;
	return diagnostics.map((diagnostic) => {
		const line = doc.line(Math.min(diagnostic.line + 1, doc.lines));
		return {
			from: line.from,
			to: line.to,
			severity: diagnostic.severity,
			message: `[${diagnostic.code}] ${diagnostic.message}`,
			source: diagnostic.source,
		};
	});
}

function main(): void {
	const editorHost = document.getElementById("editor");
	const problemsList = document.getElementById("problems-list");
	const problemsCount = document.getElementById("problems-count");
	if (!editorHost || !problemsList || !problemsCount) {
		return;
	}

	const analyzer = new Analyzer();

	const goToLine = (line: number): void => {
		const docLine = view.state.doc.line(Math.min(line + 1, view.state.doc.lines));
		view.dispatch({ selection: { anchor: docLine.from }, scrollIntoView: true });
		view.focus();
	};
	const panel = createProblemsPanel(problemsList, problemsCount, goToLine);

	const refresh = (v: EditorView): void => {
		analyzer.setDocument(DOC_ID, v.state.doc.toString());
		const analysis = analyzer.getAnalysis(DOC_ID);
		if (!analysis) {
			return;
		}

		// One transaction carries both the fresh diagnostics and the fresh highlighting.
		// It changes no text, so it does not re-trigger the analysis.
		v.dispatch(setDiagnostics(v.state, toCmDiagnostics(v, analysis.diagnostics)), {
			effects: setTokensEffect.of(analysis.tokens),
		});
		panel.render(analysis.diagnostics);
	};

	const view = createStxtEditor({ parent: editorHost, doc: SAMPLE, onDocChanged: refresh });
	refresh(view);
}

document.addEventListener("DOMContentLoaded", main);
