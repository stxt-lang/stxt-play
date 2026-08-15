import {
	Node,
	ParseException,
	Schema,
	SchemaProvider,
	SchemaValidator,
	StringUtils,
	transformNodeToSchema,
	transformTemplateNodeToSchema,
	UnifiedSchemaProvider,
} from "@stxt-lang/core";

/** Namespace of schema definition documents. */
export const SCHEMA_NAMESPACE = "@stxt.schema";
/** Namespace of template definition documents. */
export const TEMPLATE_NAMESPACE = "@stxt.template";

/**
 * Code of the diagnostic emitted when two grammars of the workspace define the same namespace.
 * Same code and same rule as STXT-DISCOVERY-SPEC for two definitions at the same level: it is an
 * error and that namespace is left with no active definition.
 */
export const DUPLICATE_NAMESPACE = "DISCOVERY_DUPLICATE_NAMESPACE";

/** Fallback code for a grammar that fails to transform with something other than a ParseException. */
const GRAMMAR_ERROR = "GRAMMAR_ERROR";

/** The grammar-defining root nodes of one workspace document. */
export interface GrammarSource {
	/** Identifier of the document within the workspace. */
	documentId: string;
	/** Root nodes of the document (the registry picks the schema/template ones itself). */
	roots: Node[];
}

/** A problem that prevents a grammar of the workspace from being used. */
export interface GrammarIssue {
	/** Document the problem belongs to. */
	documentId: string;
	/** Line of the document, 0-based. */
	line: number;
	/** Stable UPPERCASE error code. */
	code: string;
	/** Human readable message. */
	message: string;
}

/** @returns true when the root node defines a grammar (a schema or a template). */
export function isGrammarRoot(node: Node): boolean {
	const namespace = node.getNamespace();
	return namespace === SCHEMA_NAMESPACE || namespace === TEMPLATE_NAMESPACE;
}

/**
 * @param node a grammar root (see {@link isGrammarRoot}).
 * @returns which kind of grammar the root defines.
 */
export function grammarKindOf(node: Node): "schema" | "template" {
	return node.getNamespace() === TEMPLATE_NAMESPACE ? "template" : "schema";
}

/**
 * The {@link SchemaProvider} of the playground workspace.
 *
 * STXT-DISCOVERY-SPEC resolves grammars through a chain of directories, but the browser has no
 * file system: here the workspace itself is the discovery mechanism (decision of 2026-08-15).
 * Every grammar present in the document list feeds this single provider, and a document is
 * validated against the grammar whose namespace it belongs to. Two grammars defining the same
 * namespace are an error, and that namespace is left with no active definition, mirroring the
 * same-level rule of DISCOVERY.
 *
 * The provider also serves the meta-schemas of `@stxt.schema` and `@stxt.template`, so grammar
 * documents get validated against their meta-schema like any other document.
 */
export class GrammarRegistry implements SchemaProvider {
	/** Empty unified provider, used only for the meta-schemas it serves built-in. */
	private readonly metas = new UnifiedSchemaProvider();

	private readonly schemas = new Map<string, Schema>();
	private readonly conflicted = new Set<string>();
	private issues: GrammarIssue[] = [];

	/**
	 * Rebuilds the registry from the grammar roots of the workspace documents.
	 *
	 * A grammar that does not validate against its meta-schema is skipped silently: its own
	 * document already reports the meta-validation errors through the normal validation pass.
	 * A grammar that fails to transform produces a {@link GrammarIssue} instead.
	 *
	 * @param sources root nodes of every workspace document, with their document id.
	 */
	load(sources: GrammarSource[]): void {
		this.schemas.clear();
		this.conflicted.clear();
		this.issues = [];

		// Which documents define each namespace, to detect duplicates
		const owners = new Map<string, { documentId: string; line: number }[]>();

		for (const { documentId, roots } of sources) {
			for (const root of roots) {
				if (!isGrammarRoot(root)) {
					continue;
				}

				try {
					// Same policy as UnifiedSchemaProvider: a grammar that does not validate
					// against its meta-schema must not be registered
					const metaErrors = new SchemaValidator(this.metas, true).validate(root);
					if (metaErrors.length > 0) {
						continue;
					}

					const schema = root.getNamespace() === TEMPLATE_NAMESPACE
						? transformTemplateNodeToSchema(root)
						: transformNodeToSchema(root);
					const key = StringUtils.lowerCase(schema.getNamespace());

					const list = owners.get(key) ?? [];
					list.push({ documentId, line: root.getLine() - 1 });
					owners.set(key, list);

					this.schemas.set(key, schema);
				} catch (e: unknown) {
					this.issues.push(GrammarRegistry.toIssue(documentId, root, e));
				}
			}
		}

		for (const [key, list] of owners) {
			if (list.length > 1) {
				this.conflicted.add(key);
				this.schemas.delete(key);

				for (const owner of list) {
					this.issues.push({
						documentId: owner.documentId,
						line: owner.line,
						code: DUPLICATE_NAMESPACE,
						message: `Namespace '${key}' is defined by more than one grammar in the workspace; it has no active definition`,
					});
				}
			}
		}
	}

	/**
	 * Resolves the schema of a namespace: the meta-schemas for the two reserved namespaces, and
	 * the workspace grammars for everything else. A conflicted namespace resolves to nothing.
	 *
	 * @param namespace namespace whose schema is wanted.
	 * @returns the schema, or null/undefined if the namespace has no active definition.
	 */
	getSchema(namespace: string): Schema | null | undefined {
		if (namespace === SCHEMA_NAMESPACE || namespace === TEMPLATE_NAMESPACE) {
			return this.metas.getSchema(namespace);
		}

		const key = StringUtils.lowerCase(namespace);
		if (this.conflicted.has(key)) {
			return undefined;
		}
		return this.schemas.get(key);
	}

	/** @returns the problems found while loading, in workspace order. */
	getIssues(): ReadonlyArray<GrammarIssue> {
		return this.issues;
	}

	/** @returns the active grammars of the workspace (conflicted namespaces excluded), in load order. */
	getWorkspaceSchemas(): Schema[] {
		return Array.from(this.schemas.values());
	}

	/** @returns the meta-schemas of `@stxt.schema` and `@stxt.template`, always available. */
	getMetaSchemas(): Schema[] {
		const metas: Schema[] = [];
		for (const namespace of [SCHEMA_NAMESPACE, TEMPLATE_NAMESPACE]) {
			const schema = this.metas.getSchema(namespace);
			if (schema) {
				metas.push(schema);
			}
		}
		return metas;
	}

	private static toIssue(documentId: string, root: Node, e: unknown): GrammarIssue {
		if (e instanceof ParseException) {
			return {
				documentId,
				line: e.line > 0 ? e.line - 1 : root.getLine() - 1,
				code: e.code,
				message: e.message,
			};
		}
		return {
			documentId,
			line: root.getLine() - 1,
			code: GRAMMAR_ERROR,
			message: e instanceof Error ? e.message : String(e),
		};
	}
}
