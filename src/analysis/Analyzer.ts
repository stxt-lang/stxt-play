import {
	InlineNode,
	Line,
	Node,
	Parser,
	SchemaValidator,
	StringUtils,
	TextNode,
} from "@stxt-lang/core";
import { CompletionResult, computeCompletions } from "./completion";
import { DefinitionLocation, findDefinition } from "./definition";
import { Diagnostic } from "./Diagnostic";
import { GrammarRegistry, grammarKindOf, isGrammarRoot } from "./GrammarRegistry";
import { MarkdownState, newMarkdownState, tokenizeMarkdownLine } from "./MarkdownTokenizer";
import { describeNodeAtLine, NodeInfo } from "./nodeInfo";
import { computeIndentChanges, IndentChange } from "./reindent";
import { StxtToken } from "./Tokens";
import { TokenGeneratorObserver } from "./TokenGeneratorObserver";

/** Schema type whose block content is coloured as Markdown (STXT-SCHEMA-SPEC 9.7). */
const MARKDOWN = "MARKDOWN";

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
	/**
	 * Semantic tokens for highlighting, in document order: those of the language, plus the
	 * Markdown ones of the blocks the workspace grammars declare as `MARKDOWN`.
	 */
	tokens: StxtToken[];
	/** Root nodes of the document, as far as it parsed. */
	roots: Node[];
	/** Node opened at each line. */
	nodeByLine: Map<number, Node>;
	/** Lines that are comments. */
	commentLines: Set<number>;
	/** For each text line of a block, the BLOCK node it belongs to. */
	textLineByLineNumber: Map<number, TextNode>;
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
	textLineByLineNumber: Map<number, TextNode>;
	blockLineByLineNumber: Map<number, Line>;
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
	 * The changes that re-indent a document to a unit, with the formatter of the core (see
	 * `reindent.ts`).
	 *
	 * @param id identifier of the document.
	 * @param unit target indent unit: a tab or four spaces.
	 * @returns the per-line replacements; empty if the document is unknown or already there.
	 */
	getIndentChanges(id: string, unit: string): IndentChange[] {
		const parsed = this.parsed.get(id);
		return parsed ? computeIndentChanges(parsed.text, unit) : [];
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

	/**
	 * Where the node at a position of a document is defined, for "go to definition" (see
	 * `definition.ts`).
	 *
	 * @param id identifier of the document.
	 * @param line 0-based line of the position.
	 * @param character 0-based column of the position.
	 * @returns the workspace document and line of the definition, or undefined if there is none.
	 */
	findDefinition(id: string, line: number, character: number): DefinitionLocation | undefined {
		const analysis = this.analyses.get(id);
		return analysis ? findDefinition(analysis, this.registry, line, character) : undefined;
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
			blockLineByLineNumber: observer.getBlockLineByLineNumber(),
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
			tokens: this.withMarkdownTokens(parsed),
			roots: parsed.roots,
			nodeByLine: parsed.nodeByLine,
			commentLines: parsed.commentLines,
			textLineByLineNumber: parsed.textLineByLineNumber,
			grammars: parsed.grammarRoots.map((root) => ({
				// A grammar root is `Name (@stxt.schema): namespace`; a block form is a broken grammar
				// the registry reports on its own, and declares no namespace here.
				namespace: root instanceof InlineNode ? StringUtils.lowerCase(root.getValue().trim()) : "",
				kind: grammarKindOf(root),
				line: root.getLine() - 1,
			})),
			diagnostics,
		};
	}

	/**
	 * The tokens of the language plus those of the MARKDOWN blocks, sorted in document order.
	 *
	 * The Markdown ones are computed here and not while parsing because they depend on the
	 * workspace grammars, which change without the document changing; the parse products are
	 * cached per text, the analysis is recomposed whenever a grammar changes.
	 */
	private withMarkdownTokens(parsed: ParsedDocument): StxtToken[] {
		const tokens = [...parsed.tokens];
		let current: TextNode | undefined;
		let state: MarkdownState | null = null;

		// Map iteration follows insertion order, that is, document order
		for (const [lineIndex, line] of parsed.blockLineByLineNumber) {
			const node = parsed.textLineByLineNumber.get(lineIndex);
			if (node !== current) {
				current = node;
				state = node && this.isMarkdown(node) ? newMarkdownState() : null;
			}
			if (!state) {
				continue;
			}
			// The content starts where the indentation ends
			const offset = line.contentStart;
			for (const span of tokenizeMarkdownLine(line.content, state)) {
				tokens.push({ line: lineIndex, startChar: offset + span.startChar, length: span.length, type: span.type });
			}
		}

		return tokens.sort((a, b) => a.line - b.line || a.startChar - b.startChar);
	}

	/** @returns whether the grammar of the node's namespace declares it as MARKDOWN. */
	private isMarkdown(node: TextNode): boolean {
		if (!node.getNamespace()) {
			return false;
		}
		try {
			return this.registry.getSchema(node.getNamespace())?.getNodeDefinition(node.getName())?.getType() === MARKDOWN;
		} catch {
			return false;
		}
	}

	/**
	 * Validates every node of a document against the workspace grammars, replicating the parser:
	 * the parser hands each node to its validators when the node closes, so the walk here is
	 * post-order (children before their parent) over the already parsed tree.
	 */
	private validateRoots(roots: Node[]): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const validator = new SchemaValidator(this.registry);

		// Validation is on because the user switched it on, so "no grammar covers this
		// namespace" is a finding like any other (STXT-SCHEMA-SPEC §13: SCHEMA_NOT_FOUND),
		// whether the workspace has other grammars or none at all. Until 0.4.2 the code was
		// silenced when the workspace had no grammar, which made the verdict on a document
		// depend on whether an unrelated grammar happened to be open beside it.

		const walk = (node: Node): void => {
			if (node instanceof InlineNode) {
				node.getChildren().forEach(walk);
			}

			try {
				for (const error of validator.validate(node)) {
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
					code: "UNEXPECTED_ERROR",
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
