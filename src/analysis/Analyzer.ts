import {
	ConditionalValidator,
	Node,
	Parser,
	SchemaValidator,
	StringUtils,
} from "@stxt-lang/core";
import { CompletionResult, computeCompletions } from "./completion";
import { Diagnostic } from "./Diagnostic";
import { GrammarRegistry, grammarKindOf, isGrammarRoot } from "./GrammarRegistry";
import { describeNodeAtLine, NodeInfo } from "./nodeInfo";
import { StxtToken } from "./Tokens";
import { TokenGeneratorObserver } from "./TokenGeneratorObserver";

/** Code SchemaValidator emits when it cannot resolve the schema of a namespace. */
const SCHEMA_NOT_FOUND = "SCHEMA_NOT_FOUND";

/** Kind of grammar a root node defines. */
export type GrammarKind = "schema" | "template";

/** A grammar (schema or template) defined by a root node of a document. */
export interface GrammarInfo {
	/** Namespace the grammar defines: its declared value, trimmed and lowercased. */
	namespace: string;
	/** Whether the root is a `@stxt.schema` or a `@stxt.template`. */
	kind: GrammarKind;
	/** Line of the root node, 0-based. */
	line: number;
}

/** Everything the analysis knows about one document. All line numbers are 0-based. */
export interface DocumentAnalysis {
	/** Semantic tokens for highlighting. */
	tokens: StxtToken[];
	/** Root nodes of the document, as far as it parsed. */
	roots: Node[];
	/** Node opened at each line. */
	nodeByLine: Map<number, Node>;
	/** Lines that are comments. */
	commentLines: Set<number>;
	/** For each text line of a block, the BLOCK node it belongs to. */
	textLineByLineNumber: Map<number, Node>;
	/**
	 * Grammars this document defines, in document order. Empty for plain documents; non-empty
	 * marks the document as a schema/template in the document list, where its namespace — not a
	 * title — identifies it.
	 */
	grammars: GrammarInfo[];
	/** Problems of the document, ordered by line. */
	diagnostics: Diagnostic[];
}

/** A parsed document of the workspace, cached until its text changes. */
interface ParsedDocument {
	text: string;
	roots: Node[];
	tokens: StxtToken[];
	nodeByLine: Map<number, Node>;
	commentLines: Set<number>;
	textLineByLineNumber: Map<number, Node>;
	syntaxDiagnostics: Diagnostic[];
	grammarRoots: Node[];
}

/**
 * The analysis core of the playground, following the model of the STXT VS Code extension: one
 * parse per document change, cached, and every consumer (highlighting, errors panel, completion)
 * reads from its {@link DocumentAnalysis}.
 *
 * It holds the whole workspace because validation is a workspace affair: the grammars found in
 * any document feed a single {@link GrammarRegistry}, and every document validates against it.
 * Editing a grammar therefore re-validates every document; editing a plain document only
 * re-analyzes that one.
 *
 * This module touches no DOM and no editor API on purpose: it is the seed of the reusable
 * highlighting library.
 */
export class Analyzer {
	private readonly parsed = new Map<string, ParsedDocument>();
	private readonly analyses = new Map<string, DocumentAnalysis>();
	private readonly registry = new GrammarRegistry();
	private validation = true;

	/**
	 * Enables or disables schema validation (the header switch of the playground). Syntax and
	 * grammar diagnostics are not affected.
	 *
	 * @param enabled whether documents are validated against the workspace grammars.
	 */
	setValidation(enabled: boolean): void {
		if (this.validation !== enabled) {
			this.validation = enabled;
			this.refreshAll();
		}
	}

	/** @returns whether schema validation is enabled. */
	isValidationEnabled(): boolean {
		return this.validation;
	}

	/**
	 * Adds a document to the workspace, or replaces its text. Re-parses only that document, and
	 * re-analyzes the rest only when the change involves a grammar.
	 *
	 * @param id identifier of the document within the workspace.
	 * @param text full text of the document.
	 */
	setDocument(id: string, text: string): void {
		const previous = this.parsed.get(id);
		if (previous && previous.text === text) {
			return;
		}

		const parsed = Analyzer.parseDocument(text);
		this.parsed.set(id, parsed);

		const grammarsInvolved =
			(previous !== undefined && previous.grammarRoots.length > 0) || parsed.grammarRoots.length > 0;
		if (grammarsInvolved) {
			this.refreshAll();
		} else {
			this.refreshOne(id);
		}
	}

	/**
	 * Removes a document from the workspace.
	 *
	 * @param id identifier of the document to remove.
	 */
	removeDocument(id: string): void {
		const previous = this.parsed.get(id);
		if (!previous) {
			return;
		}

		this.parsed.delete(id);
		this.analyses.delete(id);

		if (previous.grammarRoots.length > 0) {
			this.refreshAll();
		}
	}

	/**
	 * @param id identifier of the document.
	 * @returns the analysis of the document, or undefined if it is not in the workspace.
	 */
	getAnalysis(id: string): DocumentAnalysis | undefined {
		return this.analyses.get(id);
	}

	/** @returns the identifiers of every document of the workspace, in insertion order. */
	getDocumentIds(): string[] {
		return Array.from(this.parsed.keys());
	}

	/**
	 * Grammar-driven completions for a cursor position of a document (see `completion.ts`).
	 *
	 * @param id identifier of the document.
	 * @param line 0-based line of the cursor.
	 * @param linePrefix text of the line up to the cursor.
	 * @returns the suggestions and where they apply, or null when there is nothing to offer.
	 */
	getCompletions(id: string, line: number, linePrefix: string): CompletionResult | null {
		const analysis = this.analyses.get(id);
		return analysis ? computeCompletions(analysis, this.registry, line, linePrefix) : null;
	}

	/**
	 * Describes the node opened at a line of a document, for the hover (see `nodeInfo.ts`).
	 *
	 * @param id identifier of the document.
	 * @param line 0-based line.
	 * @returns the description, or undefined when the line opens no node.
	 */
	describeNode(id: string, line: number): NodeInfo | undefined {
		const analysis = this.analyses.get(id);
		return analysis ? describeNodeAtLine(analysis, this.registry, line) : undefined;
	}

	/** Parses a document once, collecting tokens, line maps and syntax errors. */
	private static parseDocument(text: string): ParsedDocument {
		const observer = new TokenGeneratorObserver();
		const parser = new Parser();
		parser.registerObserver(observer);

		// No validator here: validation runs afterwards, node by node, against the registry
		const result = parser.parseResult(text);
		const roots = result.getNodes();

		const syntaxDiagnostics: Diagnostic[] = result.getErrors().map((error) => ({
			line: error.line > 0 ? error.line - 1 : 0,
			code: error.code,
			message: error.message,
			severity: "error",
			source: "syntax",
		}));

		return {
			text,
			roots,
			tokens: observer.getTokens(),
			nodeByLine: observer.getNodeByLine(),
			commentLines: observer.getCommentLines(),
			textLineByLineNumber: observer.getTextLineByLineNumber(),
			syntaxDiagnostics,
			grammarRoots: roots.filter(isGrammarRoot),
		};
	}

	/** Rebuilds the grammar registry and recomputes the analysis of every document. */
	private refreshAll(): void {
		this.registry.load(
			Array.from(this.parsed, ([documentId, parsed]) => ({ documentId, roots: parsed.grammarRoots }))
		);

		this.analyses.clear();
		for (const [id, parsed] of this.parsed) {
			this.analyses.set(id, this.compose(id, parsed));
		}
	}

	/** Recomputes the analysis of a single document, with the registry as it is. */
	private refreshOne(id: string): void {
		const parsed = this.parsed.get(id);
		if (parsed) {
			this.analyses.set(id, this.compose(id, parsed));
		}
	}

	/** Builds the public analysis of a document: parse products plus grammar and validation diagnostics. */
	private compose(id: string, parsed: ParsedDocument): DocumentAnalysis {
		const diagnostics: Diagnostic[] = [...parsed.syntaxDiagnostics];

		for (const issue of this.registry.getIssues()) {
			if (issue.documentId === id) {
				diagnostics.push({
					line: issue.line,
					code: issue.code,
					message: issue.message,
					severity: "error",
					source: "grammar",
				});
			}
		}

		if (this.validation) {
			diagnostics.push(...this.validateRoots(parsed.roots));
		}

		// Stable sort: line order, and within a line, syntax before grammar before validation
		diagnostics.sort((a, b) => a.line - b.line);

		return {
			tokens: parsed.tokens,
			roots: parsed.roots,
			nodeByLine: parsed.nodeByLine,
			commentLines: parsed.commentLines,
			textLineByLineNumber: parsed.textLineByLineNumber,
			grammars: parsed.grammarRoots.map((root) => ({
				namespace: StringUtils.lowerCase(root.getValue().trim()),
				kind: grammarKindOf(root),
				line: root.getLine() - 1,
			})),
			diagnostics,
		};
	}

	/**
	 * Validates every node of a document against the workspace grammars, replicating the parser:
	 * the parser hands each node to its validators when the node closes, so the walk here is
	 * post-order (children before their parent) over the already parsed tree.
	 */
	private validateRoots(roots: Node[]): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const validator = new ConditionalValidator(new SchemaValidator(this.registry));

		// STXT-SPEC: schemas are a separate, optional layer. If the workspace has no grammar at
		// all, a namespaced document is not wrong, it just cannot be validated: reporting
		// SCHEMA_NOT_FOUND on every node would flood the panel.
		const hasGrammarSources = Array.from(this.parsed.values()).some((p) => p.grammarRoots.length > 0);

		const walk = (node: Node): void => {
			if (!node.isTextNode()) {
				node.getChildren().forEach(walk);
			}

			try {
				for (const error of validator.validate(node)) {
					if (!hasGrammarSources && error.code === SCHEMA_NOT_FOUND) {
						continue;
					}
					diagnostics.push({
						line: error.line > 0 ? error.line - 1 : 0,
						code: error.code,
						message: error.message,
						severity: "warning",
						source: "validation",
					});
				}
			} catch (e: unknown) {
				diagnostics.push({
					line: node.getLine() - 1,
					code: "VALIDATION_ERROR",
					message: e instanceof Error ? e.message : String(e),
					severity: "error",
					source: "validation",
				});
			}
		};

		roots.forEach(walk);
		return diagnostics;
	}
}
