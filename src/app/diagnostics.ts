import type { Diagnostic as CmDiagnostic } from "@codemirror/lint";
import { Text } from "@codemirror/state";
import { Diagnostic } from "../analysis";

/**
 * Maps analysis diagnostics (0-based lines) to CodeMirror diagnostics: whole-line ranges of the
 * document, with the code in front of the message. A diagnostic past the last line (the parser
 * reports some at the line after the end) lands on the last line.
 *
 * @param doc the document the diagnostics belong to, as the editor holds it.
 * @param diagnostics the diagnostics of the analysis.
 */
export function toCmDiagnostics(doc: Text, diagnostics: Diagnostic[]): CmDiagnostic[] {
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
