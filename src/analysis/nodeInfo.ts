import { InlineNode } from "@stxt-lang/core";
import { DocumentAnalysis } from "./Analyzer";
import { GrammarRegistry } from "./GrammarRegistry";

/**
 * What the hover shows about a node: the facts of the parse, plus what the grammar of its
 * namespace says about it, when there is one. Plain data; the editor renders it.
 */
export interface NodeInfo {
	name: string;
	/** Canonical name, as the language compares it. */
	canonicalName: string;
	/** Effective namespace, possibly empty. */
	namespace: string;
	/** Inline node or text block. */
	kind: "inline" | "block";
	/** Indentation level of the node, 0 for roots. */
	level: number;
	/** Value of an inline node (possibly empty); undefined for blocks. */
	value?: string;
	/** Number of text lines of a block; undefined for inline nodes. */
	textLines?: number;
	/** What the grammar declares for this node, when a grammar covers its namespace and name. */
	definition?: NodeDefinitionInfo;
}

/** The grammar side of a {@link NodeInfo}. */
export interface NodeDefinitionInfo {
	/** Namespace of the grammar that defines the node. */
	namespace: string;
	/** Type name, e.g. `TEXT`, `NUMBER`, `ENUM`. */
	type: string;
	/** Allowed values of an ENUM, in declaration order; empty otherwise. */
	values: string[];
	/** Declared children, as `name (namespace)` when the namespace differs, with cardinality. */
	children: { name: string; namespace: string; min: number | null; max: number | null }[];
	description?: string;
}

/**
 * Describes the node opened at a line.
 *
 * @param analysis analysis of the document.
 * @param registry the workspace grammars.
 * @param line 0-based line.
 * @returns the description, or undefined when the line opens no node.
 */
export function describeNodeAtLine(analysis: DocumentAnalysis, registry: GrammarRegistry, line: number): NodeInfo | undefined {
	const node = analysis.nodeByLine.get(line);
	if (!node) {
		return undefined;
	}

	const info: NodeInfo = {
		name: node.getName(),
		canonicalName: node.getCanonicalName(),
		namespace: node.getNamespace(),
		kind: node.isTextNode() ? "block" : "inline",
		level: node.getLevel(),
	};
	if (node instanceof InlineNode) {
		info.value = node.getValue();
	} else {
		info.textLines = node.getText().length === 0 ? 0 : node.getText().split("\n").length;
	}

	if (node.getNamespace()) {
		const schema = registry.getSchema(node.getNamespace());
		const definition = schema?.getNodeDefinition(node.getName());
		if (schema && definition) {
			info.definition = {
				namespace: schema.getNamespace(),
				type: definition.getType(),
				values: Array.from(definition.getValues()),
				children: Array.from(definition.getChildren().values()).map((child) => ({
					name: child.getName(),
					namespace: child.getNamespace(),
					min: child.getMin(),
					max: child.getMax(),
				})),
				description: definition.getDescription(),
			};
		}
	}
	return info;
}
