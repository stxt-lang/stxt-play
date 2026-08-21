import { ChildDefinition, Constants, InlineNode, Node, NodeDefinition, parseLine, Schema, StringUtils } from "@stxt-lang/core";
import { DocumentAnalysis } from "./Analyzer";
import { GrammarRegistry } from "./GrammarRegistry";

/**
 * Grammar-driven completion, ported from the CompletionProvider of the STXT VS Code extension
 * to an editor-agnostic form: it takes the analysis of a document and the workspace grammars,
 * and returns plain suggestions. The editor layer decides how to show and insert them.
 *
 * Three situations are covered, exactly as in the extension:
 *
 * - **Root level**: the root nodes of every grammar (those no other node of the same grammar
 *   references as a child), plus the meta-grammar roots `Schema (@stxt.schema)` and
 *   `Template (@stxt.template)`, so a fresh document can start a grammar with two keystrokes.
 * - **Under a parent**: the children the grammar declares for the enclosing node, minus those
 *   already at their maximum cardinality.
 * - **After the colon** of an `ENUM` node: its allowed values.
 *
 * Nothing is offered inside the text of a block, in comments, or after `>>`.
 */

/** What kind of thing a suggestion inserts. */
export type CompletionKind = "node" | "block" | "value";

/** One suggestion. */
export interface CompletionSuggestion {
	/** Text shown to the user: the node name or the value. */
	label: string;
	/**
	 * Text that replaces the typed prefix on the line: `Name: `, `Name (ns): `, `Name >>`,
	 * `Name (ns) >>` or the bare value. For a `block` the editor adds the line break and the
	 * indentation of the block body, which depend on the indent unit it is configured with.
	 */
	text: string;
	/** Short secondary text: the qualified name, or what the value belongs to. */
	detail: string;
	kind: CompletionKind;
}

/** The suggestions for a position, and where on the line they start replacing. */
export interface CompletionResult {
	/** Column (0-based) of the first character the suggestions replace. */
	from: number;
	suggestions: CompletionSuggestion[];
}

/** Type names of the core that make a node a text block. */
const BLOCK_TYPES = new Set(["TEXT", "BLOCK"]);

/**
 * Computes the completions for a cursor position.
 *
 * @param analysis analysis of the document being edited (up to date with its text).
 * @param registry the workspace grammars.
 * @param line 0-based line of the cursor.
 * @param linePrefix text of the line up to the cursor.
 * @returns the suggestions and where they apply, or null when there is nothing to offer here.
 */
export function computeCompletions(
	analysis: DocumentAnalysis,
	registry: GrammarRegistry,
	line: number,
	linePrefix: string
): CompletionResult | null {
	// Whether the cursor sits in block text is decided from the typed prefix (see
	// getCompletionContext), not from the analysis of the line: a blank line right after a
	// block still belongs to it in the parse, yet the user may be dedenting to add a sibling
	const lastNode = getLastNode(analysis, line);
	const context = getCompletionContext(linePrefix, lastNode?.isTextNode() ?? false, lastNode?.getLevel() ?? 0);
	if (!context) {
		return null;
	}

	if (context.isValue) {
		const node = analysis.nodeByLine.get(line);
		return node ? { from: context.from, suggestions: findEnumValues(registry, node, context.prefix) } : null;
	}

	if (context.level === 0) {
		return { from: context.from, suggestions: findRootLevelSuggestions(registry, context.prefix) };
	}

	const parent = getParentNode(analysis, line, context.level);
	if (!parent) {
		return null;
	}
	return { from: context.from, suggestions: findSuggestionsByParent(registry, parent, context.prefix) };
}

/** The first node opened at a line before the given one. */
function getLastNode(analysis: DocumentAnalysis, line: number): Node | undefined {
	for (let search = line - 1; search >= 0; search--) {
		const node = analysis.nodeByLine.get(search);
		if (node) {
			return node;
		}
	}
	return undefined;
}

/**
 * The nearest node before the given line whose level is `level - 1`: the would-be parent. Only an
 * inline node can have children: when that node is a text block, the line is inside its text and
 * there is no parent to suggest for.
 */
function getParentNode(analysis: DocumentAnalysis, line: number, level: number): InlineNode | undefined {
	for (let search = line - 1; search >= 0; search--) {
		const node = analysis.nodeByLine.get(search);
		if (node?.getLevel() === level - 1) {
			return node instanceof InlineNode ? node : undefined;
		}
	}
	return undefined;
}

interface CompletionContext {
	level: number;
	prefix: string;
	from: number;
	isValue: boolean;
}

/**
 * Reads what is being typed: at which level, whether it is a node name or a value, the prefix
 * typed so far and where it starts. Uses the line parser of the core (without validation, since
 * the line is by definition incomplete), so indentation rules are the language's, not a copy.
 */
function getCompletionContext(linePrefix: string, lastNodeBlock: boolean, lastLevel: number): CompletionContext | null {
	const trimmed = linePrefix.trimStart();
	if (trimmed.startsWith(Constants.COMMENT_CHAR)) {
		return null;
	}

	let level: number;
	let indentLength: number;
	try {
		const parsed = parseLine(linePrefix, lastNodeBlock, lastLevel, 0, false);
		const blank = parsed.content.length === 0;
		// Text inside a block is literal: nothing to complete. A blank prefix after a block is
		// block text too for the parser, but if its indentation does not go deeper than the
		// block, the user is dedenting to add a sibling (or a root), and that we do complete.
		if (parsed.isBlock && (!blank || parsed.level > lastLevel)) {
			return null;
		}
		level = parsed.level;
		indentLength = blank ? linePrefix.length : parsed.contentStart;
	} catch {
		return null;
	}

	const sepIndex = trimmed.indexOf(Constants.SEP_NODE);
	const textSepIndex = trimmed.indexOf(Constants.SEP_TEXT_NODE);

	if (sepIndex !== -1 && (textSepIndex === -1 || sepIndex < textSepIndex)) {
		// After ':', completing an inline value
		const afterSep = trimmed.substring(sepIndex + 1);
		const valuePrefix = afterSep.trimStart();
		const from = linePrefix.length - valuePrefix.length;
		return { level, prefix: valuePrefix, from, isValue: true };
	}
	if (textSepIndex !== -1) {
		// After '>>': the block header takes nothing else
		return null;
	}

	// Completing a node name; a namespace typed after it is part of the replaced prefix
	const rawNodePrefix = linePrefix.slice(indentLength);
	const prefix = rawNodePrefix.replace(/\s*\(.*$/, "").trimEnd();
	return { level, prefix, from: indentLength, isValue: false };
}

/** Whether a normalized name matches the typed prefix (STXT canonical comparison). */
function matches(name: string, normalizedPrefix: string): boolean {
	return normalizedPrefix.length === 0 || StringUtils.normalize(name).startsWith(normalizedPrefix);
}

/** Builds the suggestion of a node, with or without its namespace spelled out. */
function nodeSuggestion(name: string, namespace: string, includeNamespace: boolean, isBlock: boolean): CompletionSuggestion {
	const head = includeNamespace ? `${name} (${namespace})` : name;
	return {
		label: name,
		text: isBlock ? `${head} ${Constants.SEP_TEXT_NODE}` : `${head}${Constants.SEP_NODE} `,
		detail: includeNamespace ? `${namespace}:${StringUtils.normalize(name)}` : StringUtils.normalize(name),
		kind: isBlock ? "block" : "node",
	};
}

function isBlockTypeDefinition(definition: NodeDefinition): boolean {
	return BLOCK_TYPES.has(definition.getType());
}

/** Whether a child is a text block, according to the grammar of the child's namespace. */
function isBlockChild(registry: GrammarRegistry, child: ChildDefinition): boolean {
	const definition = registry.getSchema(child.getNamespace())?.getNodeDefinition(child.getName());
	return definition ? isBlockTypeDefinition(definition) : false;
}

/** The children the grammar declares for a parent, minus those already at their maximum. */
export function findSuggestionsByParent(registry: GrammarRegistry, parent: InlineNode, prefix: string): CompletionSuggestion[] {
	const definition = registry.getSchema(parent.getNamespace())?.getNodeDefinition(parent.getName());
	if (!definition) {
		return [];
	}

	const normalizedPrefix = StringUtils.normalize(prefix);
	const suggestions: CompletionSuggestion[] = [];
	for (const child of definition.getChildren().values()) {
		if (!matches(child.getName(), normalizedPrefix)) {
			continue;
		}
		const max = child.getMax();
		if (max !== null && max >= 0 && parent.getChildrenByName(child.getName(), child.getNamespace()).length >= max) {
			continue;
		}
		const sameNamespace = child.getNamespace() === parent.getNamespace();
		suggestions.push(nodeSuggestion(child.getName(), child.getNamespace(), !sameNamespace, isBlockChild(registry, child)));
	}
	return suggestions;
}

/** The nodes of a grammar that no other node of the same grammar declares as a child. */
function getRootNodeDefinitions(schema: Schema): NodeDefinition[] {
	const referenced = new Set<string>();
	for (const definition of schema.getNodes().values()) {
		for (const child of definition.getChildren().values()) {
			if (child.getNamespace() === schema.getNamespace()) {
				referenced.add(child.getCanonicalName());
			}
		}
	}
	const roots = Array.from(schema.getNodes().values()).filter((d) => !referenced.has(d.getCanonicalName()));
	// A grammar where every node is referenced (recursion everywhere): offer them all
	return roots.length > 0 ? roots : Array.from(schema.getNodes().values());
}

/** Root nodes of every grammar of the workspace, plus the two meta-grammar roots. */
export function findRootLevelSuggestions(registry: GrammarRegistry, prefix: string): CompletionSuggestion[] {
	const normalizedPrefix = StringUtils.normalize(prefix);
	const suggestions: CompletionSuggestion[] = [];
	const seen = new Set<string>();

	for (const schema of [...registry.getWorkspaceSchemas(), ...registry.getMetaSchemas()]) {
		for (const definition of getRootNodeDefinitions(schema)) {
			if (!matches(definition.getName(), normalizedPrefix)) {
				continue;
			}
			const key = `${schema.getNamespace()}:${definition.getCanonicalName()}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			suggestions.push(nodeSuggestion(definition.getName(), schema.getNamespace(), true, isBlockTypeDefinition(definition)));
		}
	}
	return suggestions;
}

/** The allowed values of an ENUM node, filtered by the typed prefix. */
export function findEnumValues(registry: GrammarRegistry, node: Node, prefix: string): CompletionSuggestion[] {
	const definition = registry.getSchema(node.getNamespace())?.getNodeDefinition(node.getName());
	if (!definition || definition.getType() !== "ENUM") {
		return [];
	}

	const normalizedPrefix = StringUtils.normalize(prefix);
	const suggestions: CompletionSuggestion[] = [];
	for (const value of definition.getValues()) {
		if (matches(value, normalizedPrefix)) {
			suggestions.push({ label: value, text: value, detail: `ENUM value of ${node.getName()}`, kind: "value" });
		}
	}
	return suggestions;
}
