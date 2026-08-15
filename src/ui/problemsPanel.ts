import { Diagnostic, DiagnosticSource } from "../analysis";

/** Tooltip of the source tag of a row. */
const SOURCE_TITLES: Record<DiagnosticSource, string> = {
	syntax: "Syntax: the document does not parse (STXT-SPEC)",
	grammar: "Grammar: a schema or template of the workspace cannot be used",
	validation: "Validation: the document does not conform to the grammar of its namespace (STXT-SCHEMA-SPEC)",
};

/** The problems panel at the bottom of the playground, VS Code style. */
export interface ProblemsPanel {
	/** Replaces the panel content with the given diagnostics, in their order. */
	render(diagnostics: Diagnostic[]): void;
}

/**
 * Creates the problems panel inside its list and counter elements.
 *
 * The panel is plain DOM on purpose: it lists the {@link Diagnostic}s of the analysis and lets
 * the user jump to the offending line; the editor underlines come separately from the lint
 * extension. Every row says where the problem comes from — syntax, grammar or validation — so a
 * document that parses but does not validate reads differently from one that does not parse.
 *
 * @param list element the problem rows are rendered into.
 * @param counter element showing the number of problems next to the panel title.
 * @param onSelect called with the 0-based line of a problem when its row is clicked.
 */
export function createProblemsPanel(
	list: HTMLElement,
	counter: HTMLElement,
	onSelect: (line: number) => void
): ProblemsPanel {
	return {
		render(diagnostics: Diagnostic[]): void {
			list.textContent = "";
			counter.textContent = String(diagnostics.length);

			if (diagnostics.length === 0) {
				const empty = document.createElement("li");
				empty.className = "problem-none";
				empty.textContent = "No problems detected.";
				list.appendChild(empty);
				return;
			}

			for (const diagnostic of diagnostics) {
				const row = document.createElement("li");
				row.className = `problem problem-${diagnostic.severity}`;

				const severity = document.createElement("span");
				severity.className = "problem-severity";
				severity.title = diagnostic.severity;

				const source = document.createElement("span");
				source.className = `problem-source problem-source-${diagnostic.source}`;
				source.textContent = diagnostic.source;
				source.title = SOURCE_TITLES[diagnostic.source];

				const message = document.createElement("span");
				message.className = "problem-message";
				message.textContent = `[${diagnostic.code}] ${diagnostic.message}`;

				const line = document.createElement("span");
				line.className = "problem-line";
				line.textContent = `Ln ${diagnostic.line + 1}`;

				row.append(severity, source, message, line);
				row.addEventListener("click", () => onSelect(diagnostic.line));
				list.appendChild(row);
			}
		},
	};
}
