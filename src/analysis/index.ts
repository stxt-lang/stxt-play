/**
 * Public surface of the analysis layer: everything the editor, the errors panel and the future
 * highlighting library consume. Editor-agnostic on purpose — no DOM, no CodeMirror.
 */

export { Analyzer, DocumentAnalysis } from "./Analyzer";
export { Diagnostic, DiagnosticSeverity, DiagnosticSource } from "./Diagnostic";
export {
	DUPLICATE_NAMESPACE,
	GrammarIssue,
	GrammarRegistry,
	GrammarSource,
	isGrammarRoot,
	SCHEMA_NAMESPACE,
	TEMPLATE_NAMESPACE,
} from "./GrammarRegistry";
export { STXT_TOKEN_TYPES, StxtToken, StxtTokenType } from "./Tokens";
export { TokenGeneratorObserver } from "./TokenGeneratorObserver";
