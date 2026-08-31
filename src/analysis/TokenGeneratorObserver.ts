import { Constants, Line, Node, Observer, Parser, TextNode } from "@stxt-lang/core";
import { StxtToken, StxtTokenType } from "./Tokens";

/**
 * Parser {@link Observer} that generates the semantic tokens and the line maps of a document in
 * a single parse, following the model of the STXT VS Code extension: one parse per change, and
 * every consumer (highlighting, hovers, completion) reads from its result.
 *
 * Port of `TokenGeneratorObserver` of `stxt-vscode`, without the VS Code dependency. The maps
 * suffixed `ByLineIndex` are keyed by 0-based line index; `ByLineNumber`, by 1-based absolute
 * line number.
 */
export class TokenGeneratorObserver implements Observer {
	private tokens: StxtToken[] = [];
	private nodeByLineIndex = new Map<number, Node>();
	private commentLines = new Set<number>();
	private textNodeByLineIndex = new Map<number, TextNode>();
	private blockLineByLineIndex = new Map<number, Line>();
	// The source Line of each text line of an open Structure/Description block, 1-based:
	// parseTemplateContent maps the inner tokens back to absolute line numbers
	private templateLineByLineNumber = new Map<number, Line>();

	onTextLine(node: TextNode, lineNumber: number, lineString: string, line: Line): void {
		// Remember the parent node of every text line, and the line itself split into
		// indentation and content (the Markdown colouring needs both). lineNumber is 1-based.
		const lineIndex = lineNumber - 1;
		this.textNodeByLineIndex.set(lineIndex, node);
		this.blockLineByLineIndex.set(lineIndex, line);

		// Remember the raw lines of template content nodes, to colour them later
		if (this.isTemplateContentNode(node)) {
			// lineNumber is 1-based and absolute within the document
			this.templateLineByLineNumber.set(lineNumber, line);
		}
	}

	onCreate(node: Node, line: string): void {
		const lineIndex = node.getLine() - 1;

		this.nodeByLineIndex.set(lineIndex, node);

		this.generateTokensForNode(node, lineIndex, line);

		// Start collecting the raw lines of a template content node
		if (this.isTemplateContentNode(node)) {
			this.templateLineByLineNumber.clear();
		}
	}

	onFinish(node: Node): void {
		// Template content is STXT too: parse it to colour it
		if (this.isTemplateContentNode(node)) {
			this.parseTemplateContent(node);
			this.templateLineByLineNumber.clear();
		}
	}

	private isTemplateContentNode(node: Node): boolean {
		if (node.getNamespace() !== "@stxt.template") {
			return false;
		}
		const normalizedName = node.getCanonicalName();
		return normalizedName === "structure" || normalizedName === "description";
	}

	private parseTemplateContent(node: Node): void {
		try {
			const content = node.getText();
			if (!content || content.trim() === "") {
				return;
			}

			// Parse the block content on its own, with an inner observer, and remap the
			// resulting tokens back to absolute document positions
			const parser = new Parser();
			const innerObserver = new TokenGeneratorObserver();
			parser.registerObserver(innerObserver);
			parser.parseResult(content);

			const lineOffset = node.getLine(); // offset of the node opening line, 1-based
			const innerTokens = innerObserver.getTokens();

			for (const token of innerTokens) {
				// token.line is 0-based within the block; the map is keyed by absolute 1-based lines
				const absoluteLineNumber = lineOffset + token.line + 1;

				// The content starts where the indentation ends
				const originalLine = this.templateLineByLineNumber.get(absoluteLineNumber);
				const offset = originalLine ? originalLine.contentStart : 0;

				this.tokens.push({
					line: token.line + lineOffset,
					startChar: token.startChar + offset,
					length: token.length,
					type: token.type,
				});
			}
		} catch {
			// If the block content does not parse, it simply gets no tokens
		}
	}

	onComment(lineNumber: number, line: string): void {
		const trimmedLine = line.trim();
		if (trimmedLine.startsWith("#")) {
			const lineIndex = lineNumber - 1;
			this.commentLines.add(lineIndex);
			this.tokens.push({
				line: lineIndex,
				startChar: 0,
				length: line.length,
				type: "comment",
			});
		}
	}

	getTokens(): StxtToken[] {
		return this.tokens;
	}

	getNodeByLineIndex(): Map<number, Node> {
		return this.nodeByLineIndex;
	}

	getCommentLines(): Set<number> {
		return this.commentLines;
	}

	getTextNodeByLineIndex(): Map<number, TextNode> {
		return this.textNodeByLineIndex;
	}

	/** @returns every text line of a block, by 0-based line index, split into indentation and content. */
	getBlockLineByLineIndex(): Map<number, Line> {
		return this.blockLineByLineIndex;
	}

	private generateTokensForNode(node: Node, lineIndex: number, line: string): void {
		if (node.isTextNode()) {
			const sepIndex = line.indexOf(Constants.SEP_TEXT_NODE);
			if (sepIndex === -1) {
				return;
			}
			this.pushHeadTokens(lineIndex, line, sepIndex, Constants.SEP_TEXT_NODE.length, line.length, "macro");
		} else {
			const sepIndex = line.indexOf(Constants.SEP_NODE);
			if (sepIndex === -1) {
				return;
			}
			this.pushHeadTokens(lineIndex, line, sepIndex, Constants.SEP_NODE.length, sepIndex + 1, "property");

			const valueStart = sepIndex + 1;
			if (valueStart < line.length) {
				this.tokens.push({ line: lineIndex, startChar: valueStart, length: line.length - valueStart, type: "string" });
			}
		}
	}

	/**
	 * The tokens of a node line's head: the name (coloured `type`), the namespace when the
	 * line declares one, and the separator. With a namespace, everything from the closing
	 * parenthesis up to `tailEnd` (the end of the line for a block, the separator inclusive
	 * for an inline node) is one token; without one, the name and the separator are two.
	 */
	private pushHeadTokens(lineIndex: number, line: string, sepIndex: number, sepLength: number,
		tailEnd: number, type: StxtTokenType): void {

		const head = line.substring(0, sepIndex);
		const nsOpen = head.indexOf("(");
		const nsClose = head.indexOf(")");

		if (nsOpen !== -1 && nsClose !== -1) {
			this.tokens.push({ line: lineIndex, startChar: 0, length: nsOpen, type });
			this.tokens.push({ line: lineIndex, startChar: nsOpen, length: nsClose - nsOpen + 1, type: "namespace" });
			this.tokens.push({ line: lineIndex, startChar: nsClose + 1, length: tailEnd - nsClose - 1, type });
		} else {
			this.tokens.push({ line: lineIndex, startChar: 0, length: sepIndex, type });
			this.tokens.push({ line: lineIndex, startChar: sepIndex, length: sepLength, type });
		}
	}
}
