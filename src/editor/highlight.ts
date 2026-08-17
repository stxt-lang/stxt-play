import { Range, StateEffect, StateField, Text } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { StxtToken, StxtTokenType } from "../analysis";

/**
 * STXT highlighting for CodeMirror.
 *
 * There is no Lezer grammar here on purpose: a hand-written grammar would be a second definition
 * of the language, which the ecosystem forbids. The single source of truth is the core parser —
 * the analysis layer turns its parse into {@link StxtToken}s, and this field turns those tokens
 * into mark decorations. The app pushes fresh tokens through {@link setTokensEffect} after every
 * analysis.
 */

/** Effect that replaces the current highlighting with the tokens of a fresh analysis. */
export const setTokensEffect = StateEffect.define<StxtToken[]>();

/** One reusable mark per token type, styled from the SCSS palette. */
const MARKS: Record<StxtTokenType, Decoration> = {
	comment: Decoration.mark({ class: "stxt-tok-comment" }),
	namespace: Decoration.mark({ class: "stxt-tok-namespace" }),
	property: Decoration.mark({ class: "stxt-tok-property" }),
	macro: Decoration.mark({ class: "stxt-tok-macro" }),
	string: Decoration.mark({ class: "stxt-tok-string" }),
	// Content of MARKDOWN blocks
	markdownHeading: Decoration.mark({ class: "stxt-tok-md-heading" }),
	markdownBold: Decoration.mark({ class: "stxt-tok-md-bold" }),
	markdownItalic: Decoration.mark({ class: "stxt-tok-md-italic" }),
	markdownCode: Decoration.mark({ class: "stxt-tok-md-code" }),
	markdownList: Decoration.mark({ class: "stxt-tok-md-list" }),
	markdownQuote: Decoration.mark({ class: "stxt-tok-md-quote" }),
	markdownLink: Decoration.mark({ class: "stxt-tok-md-link" }),
};

/** Turns analysis tokens (0-based lines and columns) into decoration ranges of the document. */
function buildDecorations(tokens: StxtToken[], doc: Text): DecorationSet {
	const ranges: Range<Decoration>[] = [];

	for (const token of tokens) {
		// Tokens come from an analysis of this same text, but stay defensive about ranges
		if (token.line < 0 || token.line + 1 > doc.lines) {
			continue;
		}
		const line = doc.line(token.line + 1);
		const from = line.from + token.startChar;
		const to = Math.min(from + token.length, line.to);
		if (from >= to || from < line.from) {
			continue;
		}
		ranges.push(MARKS[token.type].range(from, to));
	}

	// The analysis sorts its tokens, but let Decoration.set sort them anyway, to be safe
	return Decoration.set(ranges, true);
}

/**
 * Field holding the current highlighting. Between analyses (i.e. while a transaction is being
 * applied) the existing decorations are mapped through the change, so the colours do not flicker
 * before the fresh tokens arrive.
 */
export const highlightField = StateField.define<DecorationSet>({
	create: () => Decoration.none,
	update(decorations, tr) {
		decorations = decorations.map(tr.changes);
		for (const effect of tr.effects) {
			if (effect.is(setTokensEffect)) {
				decorations = buildDecorations(effect.value, tr.state.doc);
			}
		}
		return decorations;
	},
	provide: (field) => EditorView.decorations.from(field),
});
