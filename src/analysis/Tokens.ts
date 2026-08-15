/**
 * Semantic token model of the analysis layer.
 *
 * Mirror of the token types used by the STXT VS Code extension, minus the VS Code types: the
 * playground has no SemanticTokensLegend, consumers map these names to CSS classes or editor
 * decorations themselves.
 */

/** Every token type the analysis can emit. */
export const STXT_TOKEN_TYPES = [
	"comment",
	"namespace",
	"property",
	"macro",
	"string",
] as const;

/** One of the token type names of {@link STXT_TOKEN_TYPES}. */
export type StxtTokenType = (typeof STXT_TOKEN_TYPES)[number];

/** A semantic token: a run of characters of one line with a type. Lines and columns are 0-based. */
export interface StxtToken {
	/** Line of the document, 0-based. */
	line: number;
	/** First character of the token in the line, 0-based. */
	startChar: number;
	/** Length of the token in characters. */
	length: number;
	/** Token type, used to pick the color. */
	type: StxtTokenType;
}
