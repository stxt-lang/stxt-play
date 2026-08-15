/**
 * Public surface of the analysis layer: everything the editor, the errors panel and the future
 * highlighting library consume. Editor-agnostic on purpose — no DOM, no CodeMirror.
 */

export { Analyzer, DocumentAnalysis, GrammarInfo, GrammarKind } from "./Analyzer";
export { CompletionKind, CompletionResult, CompletionSuggestion, computeCompletions } from "./completion";
export { describeNodeAtLine, NodeDefinitionInfo, NodeInfo } from "./nodeInfo";
export { applyIndentChanges, computeIndentChanges, IndentChange, SPACES_UNIT, TAB_UNIT } from "./reindent";
export { Diagnostic, DiagnosticSeverity, DiagnosticSource } from "./Diagnostic";
export {
	DUPLICATE_NAMESPACE,
	grammarKindOf,
	GrammarIssue,
	GrammarRegistry,
	GrammarSource,
	isGrammarRoot,
	SCHEMA_NAMESPACE,
	TEMPLATE_NAMESPACE,
} from "./GrammarRegistry";
export { STXT_TOKEN_TYPES, StxtToken, StxtTokenType } from "./Tokens";
export { TokenGeneratorObserver } from "./TokenGeneratorObserver";
