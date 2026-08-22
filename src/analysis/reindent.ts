import { Formatter, IndentStyle } from "@stxt-lang/core";

/**
 * Re-indentation between tabs and spaces, as the edits of `Formatter` of `@stxt-lang/core` —
 * the same formatter `stxt format` of the CLI and the VS Code extension use, so the playground's
 * tabs/spaces switch produces the document the other tools would. Only the **structural**
 * indentation is what the switch is about, but the formatter's other rules come with it (one
 * space after the colon, no trailing blanks, the blank lines of a block indented to the block):
 * a node line is rewritten in canonical form at its level; a text line of a block gets `level of
 * the block + 1` units and keeps whatever indentation follows, which is content (STXT keeps the
 * relative indentation of block content); comments, blank lines and lines the parser rejected
 * have their whole indentation units converted and the rest kept. A document with errors keeps
 * them (this converts, it does not repair).
 */

/** One indent unit of each mode: STXT allows a tab or exactly four spaces per level. */
export const TAB_UNIT = "\t";
export const SPACES_UNIT = "    ";

/** A replacement of one whole line. Lines and columns are 0-based. */
export interface IndentChange {
	line: number;
	/** Column where the replaced run starts (always 0). */
	from: number;
	/** Column where the replaced run ends (the end of the line). */
	to: number;
	/** What replaces the run. */
	insert: string;
}

/**
 * Computes the changes that re-indent a document to the given unit.
 *
 * @param text the document.
 * @param unit target indent unit: {@link TAB_UNIT} or {@link SPACES_UNIT}.
 * @returns the per-line replacements, in line order; empty when nothing needs to change.
 */
export function computeIndentChanges(text: string, unit: string): IndentChange[] {
	const style = unit === SPACES_UNIT ? IndentStyle.SPACES_4 : IndentStyle.TABS;
	const lines = text.split("\n");
	const formatted = Formatter.format(text, style).text.split("\n");

	const changes: IndentChange[] = [];
	for (let i = 0; i < lines.length; i++) {
		if (formatted[i] !== lines[i]) {
			changes.push({ line: i, from: 0, to: lines[i].length, insert: formatted[i] });
		}
	}
	return changes;
}

/**
 * Applies {@link computeIndentChanges} to a text. Convenience for callers without an editor
 * (and for tests); the app applies the changes through CodeMirror instead, to keep undo history.
 */
export function applyIndentChanges(text: string, changes: IndentChange[]): string {
	if (changes.length === 0) {
		return text;
	}
	const lines = text.split("\n");
	for (const change of changes) {
		const line = lines[change.line];
		lines[change.line] = line.slice(0, change.from) + change.insert + line.slice(change.to);
	}
	return lines.join("\n");
}
