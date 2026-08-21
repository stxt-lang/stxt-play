/**
 * Diagnostic model of the analysis layer: what the errors panel and the editor underlines
 * consume. Plain data, no editor types involved.
 */

/** How serious a diagnostic is. Errors block; warnings inform. */
export type DiagnosticSeverity = "error" | "warning";

/**
 * Which layer produced the diagnostic:
 *
 * - `syntax`: the document does not parse (STXT-SPEC errors).
 * - `grammar`: a schema or template of the workspace cannot be used (it does not transform, or
 *   its namespace is defined more than once).
 * - `validation`: a parsed document does not validate against the active grammars
 *   (STXT-SCHEMA-SPEC errors).
 */
export type DiagnosticSource = "syntax" | "grammar" | "validation";

/** A problem found in one document. Lines are 0-based, like everything the analysis emits. */
export interface Diagnostic {
	/** Line of the document the problem was detected at, 0-based. */
	line: number;
	/** Stable UPPERCASE error code (e.g. `INDENTATION_MIXED`, `SCHEMA_NOT_FOUND`). */
	code: string;
	/** Human readable message, in English like every message of the ecosystem. */
	message: string;
	/** Severity: syntax and grammar problems are errors, validation problems are warnings. */
	severity: DiagnosticSeverity;
	/** Layer that produced the diagnostic. */
	source: DiagnosticSource;
}
