import type { Diagnostic as CmDiagnostic } from "@codemirror/lint";
import { Line, Text } from "@codemirror/state";
import { Diagnostic } from "../analysis";

/**
 * The line of the document an analysis line (0-based) refers to. A line past the end (the parser
 * reports some diagnostics at the line after the last one) is the last line.
 *
 * @param doc the document, as the editor holds it.
 * @param line 0-based line of the analysis.
 */
export function lineAt(doc: Text, line: number): Line {
	return doc.line(Math.min(line + 1, doc.lines));
}

/**
 * Maps analysis diagnostics (0-based lines) to CodeMirror diagnostics: whole-line ranges of the
 * document, with the code in front of the message.
 *
 * @param doc the document the diagnostics belong to, as the editor holds it.
 * @param diagnostics the diagnostics of the analysis.
 */
export function toCmDiagnostics(doc: Text, diagnostics: Diagnostic[]): CmDiagnostic[] {
	return diagnostics.map((diagnostic) => {
		const line = lineAt(doc, diagnostic.line);
		return {
			from: line.from,
			to: line.to,
			severity: diagnostic.severity,
			message: `[${diagnostic.code}] ${diagnostic.message}`,
			source: diagnostic.source,
		};
	});
}
