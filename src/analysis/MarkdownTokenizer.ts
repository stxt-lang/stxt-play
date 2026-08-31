/**
 * Line-by-line tokenizer for the content of `MARKDOWN` blocks (STXT-SCHEMA-SPEC 9.7).
 *
 * Editor layer only: `MARKDOWN` validates exactly like `TEXT`, so nothing here touches the
 * language. It recognises the handful of constructs worth colouring —headings, fenced code,
 * list markers, block quotes, inline code, bold, italic and links— and ignores the rest
 * (tables, HTML, reference links, setext headings, thematic breaks). It is deliberately small
 * and dependency-free: the same file lives in the VS Code extension and in the playground.
 *
 * Positions are relative to the content string handed in, so the caller adds the offset of
 * the content within its document line.
 */

/** Every token type a MARKDOWN block can produce. */
export const MARKDOWN_TOKEN_TYPES = [
	'markdownHeading',
	'markdownBold',
	'markdownItalic',
	'markdownCode',
	'markdownList',
	'markdownQuote',
	'markdownLink'
] as const;

/** One of the token type names of {@link MARKDOWN_TOKEN_TYPES}. */
export type MarkdownTokenType = typeof MARKDOWN_TOKEN_TYPES[number];

/** A run of characters of one line, relative to the content handed to the tokenizer. */
export interface MarkdownSpan {
	startChar: number;
	length: number;
	type: MarkdownTokenType;
}

/** State carried from one line of a block to the next: the fence of the open code block, if any. */
export interface MarkdownState {
	fence: string | null;
}

/** @returns the state to start tokenizing a block with. */
export function newMarkdownState(): MarkdownState {
	return { fence: null };
}

// Opening or closing fence of a code block: three or more backticks or tildes.
const FENCE = /^\s*(`{3,}|~{3,})/;
// ATX heading: one to six `#` followed by whitespace or the end of the line.
const HEADING = /^\s*#{1,6}(?=\s|$)/;
// Block quote markers, possibly nested (`> > text`).
const QUOTE = /^\s*(?:>[ \t]?)+/;
// List item marker: bullet or ordered, followed by whitespace or the end of the line.
const LIST = /^(\s*)([-*+]|\d{1,9}[.)])(?:\s+|$)/;

// Inline constructs, tried in this order at every position. `escape` consumes a backslash escape
// so that `\*` never opens emphasis; it produces no token.
const INLINE = new RegExp([
	'(?<escape>\\\\[\\\\`*_\\[\\]()<>#!~-])',
	'(?<code>(?<fence>`+)(?!`)[\\s\\S]*?(?<!`)\\k<fence>(?!`))',
	'(?<link>!?\\[[^\\]]*\\]\\([^)]*\\)|<(?:https?://|mailto:)[^>\\s]+>)',
	'(?<bold>\\*\\*\\*(?=\\S)[^*]+?(?<=\\S)\\*\\*\\*|\\*\\*(?=\\S)(?:[^*]|\\*(?!\\*))+?(?<=\\S)\\*\\*|(?<![\\p{L}\\p{N}_])__(?=\\S)(?:[^_]|_(?!_))+?(?<=\\S)__(?![\\p{L}\\p{N}_]))',
	'(?<italic>\\*(?=[^\\s*])[^*]*?(?<=[^\\s*])\\*|(?<![\\p{L}\\p{N}_])_(?=[^\\s_])[^_]*?(?<=[^\\s_])_(?![\\p{L}\\p{N}_]))'
].join('|'), 'gu');

/**
 * Tokenizes one line of a MARKDOWN block.
 *
 * @param content the line without the indentation of the block (extra indentation is kept).
 * @param state the state of the block, updated by this call; use a fresh one per block.
 * @returns the spans of the line, in order and without overlaps.
 */
export function tokenizeMarkdownLine(content: string, state: MarkdownState): MarkdownSpan[] {
	const spans: MarkdownSpan[] = [];
	const fence = FENCE.exec(content);

	// Inside a fenced code block everything is code, including the closing fence
	if (state.fence !== null) {
		if (fence && fence[1][0] === state.fence[0] && fence[1].length >= state.fence.length
				&& content.slice(fence[0].length).trim() === '') {
			state.fence = null;
		}
		pushWholeLine(spans, content, 'markdownCode');
		return spans;
	}

	if (fence) {
		state.fence = fence[1];
		pushWholeLine(spans, content, 'markdownCode');
		return spans;
	}

	let pos = 0;

	const quote = QUOTE.exec(content);
	if (quote) {
		const start = quote[0].search(/\S/);
		spans.push({ startChar: start, length: quote[0].trimEnd().length - start, type: 'markdownQuote' });
		pos = quote[0].length;
	}

	const rest = content.slice(pos);

	if (HEADING.test(rest)) {
		pushWholeLine(spans, rest, 'markdownHeading', pos);
		return spans;
	}

	const list = LIST.exec(rest);
	if (list) {
		spans.push({ startChar: pos + list[1].length, length: list[2].length, type: 'markdownList' });
		pos += list[0].length;
	}

	tokenizeInline(spans, content.slice(pos), pos);
	return spans;
}

/** Adds one span covering the line from its first non-blank character to its end, if any. */
function pushWholeLine(spans: MarkdownSpan[], content: string, type: MarkdownTokenType, offset = 0): void {
	const start = content.search(/\S/);
	if (start !== -1) {
		spans.push({ startChar: offset + start, length: content.trimEnd().length - start, type });
	}
}

/** Adds the spans of the inline constructs of a text, shifted by the offset of the text in its line. */
function tokenizeInline(spans: MarkdownSpan[], text: string, offset: number): void {
	INLINE.lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = INLINE.exec(text)) !== null) {
		const groups = match.groups ?? {};
		const type: MarkdownTokenType | undefined =
			groups.code !== undefined ? 'markdownCode' :
				groups.link !== undefined ? 'markdownLink' :
					groups.bold !== undefined ? 'markdownBold' :
						groups.italic !== undefined ? 'markdownItalic' :
							undefined;

		if (type !== undefined) {
			spans.push({ startChar: offset + match.index, length: match[0].length, type });
		}
	}
}
