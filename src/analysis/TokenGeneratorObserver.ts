import { Line, Node, Observer, Parser, TextNode } from "@stxt-lang/core";
import { StxtToken } from "./Tokens";

/**
 * Parser {@link Observer} that generates the semantic tokens and the line maps of a document in
 * a single parse, following the model of the STXT VS Code extension: one parse per change, and
 * every consumer (highlighting, hovers, completion) reads from its result.
 *
 * Port of `TokenGeneratorObserver` of `stxt-vscode`, without the VS Code dependency.
 */
export class TokenGeneratorObserver implements Observer {
	private tokens: StxtToken[] = [];
	private nodeByLine = new Map<number, Node>();
	private commentLines = new Set<number>();
	private textLineByLineNumber = new Map<number, TextNode>();
	private blockLineByLineNumber = new Map<number, Line>();
	private templateNodeByLine = new Map<number, Line>();

	onTextLine(node: TextNode, lineNumber: number, lineString: string, line: Line): void {
		// Remember the parent node of every text line, and the line itself split into
		// indentation and content (the Markdown colouring needs both). lineNumber is 1-based.
		const lineIndex = lineNumber - 1;
		this.textLineByLineNumber.set(lineIndex, node);
		this.blockLineByLineNumber.set(lineIndex, line);

		// Remember the raw lines of template content nodes, to colour them later
		if (this.isTemplateContentNode(node)) {
			// lineNumber is 1-based and absolute within the document
			this.templateNodeByLine.set(lineNumber, line);
		}
	}

	onCreate(node: Node, line: string): void {
		const lineIndex = node.getLine() - 1;

		this.nodeByLine.set(lineIndex, node);

		this.generateTokensForNode(node, lineIndex, line);

		// Start collecting the raw lines of a template content node
		if (this.isTemplateContentNode(node)) {
			this.templateNodeByLine.clear();
		}
	}

	onFinish(node: Node): void {
		// Template content is STXT too: parse it to colour it
		if (this.isTemplateContentNode(node)) {
			this.parseTemplateContent(node);
			this.templateNodeByLine.clear();
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
				const originalLine = this.templateNodeByLine.get(absoluteLineNumber);
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

	getNodeByLine(): Map<number, Node> {
		return this.nodeByLine;
	}

	getCommentLines(): Set<number> {
		return this.commentLines;
	}

	getTextLineByLineNumber(): Map<number, TextNode> {
		return this.textLineByLineNumber;
	}

	/** @returns every text line of a block, by 0-based line, split into indentation and content. */
	getBlockLineByLineNumber(): Map<number, Line> {
		return this.blockLineByLineNumber;
	}

	private generateTokensForNode(node: Node, lineIndex: number, line: string): void {
		if (node.isTextNode()) {
			const sepIndx = line.indexOf(">>");
			if (sepIndx === -1) {
				return;
			}

			const head = line.substring(0, sepIndx);
			const nsOpen = head.indexOf("(");
			const nsClose = head.indexOf(")");

			if (nsOpen !== -1 && nsClose !== -1) {
				this.tokens.push({ line: lineIndex, startChar: 0, length: nsOpen, type: "macro" });
				this.tokens.push({ line: lineIndex, startChar: nsOpen, length: nsClose - nsOpen + 1, type: "namespace" });
				this.tokens.push({ line: lineIndex, startChar: nsClose + 1, length: line.length - nsClose - 1, type: "macro" });
			} else {
				this.tokens.push({ line: lineIndex, startChar: 0, length: sepIndx, type: "macro" });
				this.tokens.push({ line: lineIndex, startChar: sepIndx, length: 2, type: "macro" });
			}
		} else {
			const colon = line.indexOf(":");
			if (colon === -1) {
				return;
			}

			const head = line.substring(0, colon);
			const nsOpen = head.indexOf("(");
			const nsClose = head.indexOf(")");

			if (nsOpen !== -1 && nsClose !== -1) {
				this.tokens.push({ line: lineIndex, startChar: 0, length: nsOpen, type: "property" });
				this.tokens.push({ line: lineIndex, startChar: nsOpen, length: nsClose - nsOpen + 1, type: "namespace" });
				this.tokens.push({ line: lineIndex, startChar: nsClose + 1, length: colon - (nsClose + 1) + 1, type: "property" });
			} else {
				this.tokens.push({ line: lineIndex, startChar: 0, length: colon, type: "property" });
				this.tokens.push({ line: lineIndex, startChar: colon, length: 1, type: "property" });
			}

			const valueStart = colon + 1;
			if (valueStart < line.length) {
				this.tokens.push({ line: lineIndex, startChar: valueStart, length: line.length - valueStart, type: "string" });
			}
		}
	}
}
