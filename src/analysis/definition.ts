import { InlineNode, Node, Parser, StringUtils, TextNode } from "@stxt-lang/core";
import { DocumentAnalysis } from "./Analyzer";
import { GrammarRegistry, SCHEMA_NAMESPACE, TEMPLATE_NAMESPACE } from "./GrammarRegistry";

/** Where "go to definition" lands: a document of the workspace and a line of it. */
export interface DefinitionLocation {
	/** Identifier of the workspace document that holds the grammar. */
	documentId: string;
	/** Line of that document, 0-based. */
	line: number;
}

/**
 * "Go to definition" over a position of a document, the same rule as the STXT VS Code extension:
 * over the head of a node line (name, namespace, separator — not the value) it resolves to the
 * grammar of the workspace that defines the node's namespace, placed on the line that declares
 * the node — `Node: Name` in a schema, the node's own line inside `Structure >>` in a template.
 * Over the namespace itself it resolves to the grammar root.
 *
 * Which document defines the namespace is answered by the registry (the workspace is the
 * discovery mechanism of the playground); the line comes from the parsed grammar root the
 * registry keeps, because the compiled schema has no source positions.
 *
 * @param analysis analysis of the document.
 * @param registry the workspace grammars.
 * @param line 0-based line of the position.
 * @param character 0-based column of the position.
 * @returns where the definition is, or undefined when there is nothing to go to.
 */
export function findDefinition(
	analysis: DocumentAnalysis,
	registry: GrammarRegistry,
	line: number,
	character: number
): DefinitionLocation | undefined {
	const node = analysis.nodeByLine.get(line);
	if (!node) {
		return undefined;
	}

	// Only the head of the line is a reference; the value (a `string` token) is not
	const headTokens = analysis.tokens.filter((token) => token.line === line && token.type !== "string");
	if (headTokens.length === 0) {
		return undefined;
	}
	const headEnd = Math.max(...headTokens.map((token) => token.startChar + token.length));
	if (character > headEnd) {
		return undefined;
	}

	const namespace = node.getNamespace();
	if (!namespace) {
		return undefined;
	}

	const definition = registry.getDefinition(namespace);
	if (!definition) {
		return undefined;
	}

	const onNamespace = headTokens.some(
		(token) =>
			token.type === "namespace" && character >= token.startChar && character <= token.startChar + token.length
	);
	const rootLine = definition.root.getLine() - 1;

	return {
		documentId: definition.documentId,
		line: onNamespace ? rootLine : (definitionLine(definition.root, node.getName(), namespace) ?? rootLine),
	};
}

/**
 * Zero-based line where a grammar root declares a node.
 *
 * @param root the schema or template root, as parsed.
 * @param nodeName the name of the node whose declaration is wanted.
 * @param namespace the namespace of the node, to tell apart same-named nodes in a template.
 * @returns the 0-based line, or undefined when the grammar does not declare the node.
 */
export function definitionLine(root: Node, nodeName: string, namespace: string): number | undefined {
	if (!(root instanceof InlineNode)) {
		return undefined;
	}
	const wanted = StringUtils.normalize(nodeName);

	if (root.getNamespace() === SCHEMA_NAMESPACE) {
		// `Node: Name` children of the schema root
		for (const child of root.getChildren()) {
			if (
				child instanceof InlineNode &&
				child.getCanonicalName() === "node" &&
				StringUtils.normalize(child.getValue()) === wanted
			) {
				return child.getLine() - 1;
			}
		}
	} else if (root.getNamespace() === TEMPLATE_NAMESPACE) {
		// The `Structure >>` block is STXT itself: its inner lines are absolute lines of the
		// document offset by the line of the `Structure` header (same rule as the tokens of
		// `TokenGeneratorObserver`)
		for (const child of root.getChildren()) {
			if (child instanceof TextNode && child.getCanonicalName() === "structure") {
				const inner = findNode(parseStructure(child.getText()), wanted, namespace);
				if (inner) {
					return child.getLine() + inner.getLine() - 1;
				}
			}
		}
	}

	return undefined;
}

/** Parses the text of a `Structure >>` block; one that does not parse just yields no roots. */
function parseStructure(text: string): Node[] {
	try {
		return new Parser().parseResult(text).getNodes();
	} catch {
		return [];
	}
}

/** Depth-first search of a node by canonical name, preferring a match in the same namespace. */
function findNode(nodes: ReadonlyArray<Node>, canonicalName: string, namespace: string): Node | undefined {
	const target = StringUtils.lowerCase(namespace);
	let byNameOnly: Node | undefined;

	const walk = (list: ReadonlyArray<Node>): Node | undefined => {
		for (const node of list) {
			if (node.getCanonicalName() === canonicalName) {
				if (StringUtils.lowerCase(node.getNamespace()) === target) {
					return node;
				}
				byNameOnly ??= node;
			}
			if (node instanceof InlineNode) {
				const found = walk(node.getChildren());
				if (found) {
					return found;
				}
			}
		}
		return undefined;
	};

	return walk(nodes) ?? byNameOnly;
}
