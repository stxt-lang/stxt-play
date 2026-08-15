import { DocumentAnalysis } from "./Analyzer";

/**
 * Re-indentation between tabs and spaces, driven by the analysis so that only the **structural**
 * indentation changes — the units that encode the level of each line — and nothing else:
 *
 * - A node line has as many structural units as its level.
 * - A text line of a block has `level of the block + 1` structural units; whatever indentation
 *   follows is part of the text (STXT keeps the relative indentation of block content) and is
 *   left exactly as it is.
 * - Comments, blank lines and lines the parser rejected have no level of their own: every full
 *   unit of their leading whitespace is converted, and any remainder is kept.
 *
 * Nothing but leading whitespace is ever touched, and only as many units as the line has, so
 * comments, values and text survive untouched, and a document with indentation errors keeps
 * them (this converts, it does not repair).
 */

/** One indent unit of each mode: STXT allows a tab or exactly four spaces per level. */
export const TAB_UNIT = "\t";
export const SPACES_UNIT = "    ";

/** A replacement of the leading whitespace of one line. Lines and columns are 0-based. */
export interface IndentChange {
	line: number;
	/** Column where the replaced run starts (always 0). */
	from: number;
	/** Column where the replaced run ends. */
	to: number;
	/** What replaces the run. */
	insert: string;
}

/**
 * Computes the changes that re-indent a document to the given unit.
 *
 * @param analysis analysis of the document (its line maps are what decide the structural units).
 * @param text the text the analysis was computed from.
 * @param unit target indent unit: {@link TAB_UNIT} or {@link SPACES_UNIT}.
 * @returns the per-line replacements, in line order; empty when nothing needs to change.
 */
export function computeIndentChanges(analysis: DocumentAnalysis, text: string, unit: string): IndentChange[] {
	const changes: IndentChange[] = [];
	const lines = text.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const leading = /^[\t ]*/.exec(lines[i])?.[0] ?? "";
		if (leading.length === 0) {
			continue;
		}

		const node = analysis.nodeByLine.get(i);
		const block = analysis.textLineByLineNumber.get(i);
		const wanted = node ? node.getLevel() : block ? block.getLevel() + 1 : Number.POSITIVE_INFINITY;

		// Consume up to `wanted` full units from the leading run, whatever mode each unit is in
		let consumed = 0;
		let units = 0;
		while (units < wanted && consumed < leading.length) {
			if (leading.startsWith(TAB_UNIT, consumed)) {
				consumed += TAB_UNIT.length;
			} else if (leading.startsWith(SPACES_UNIT, consumed)) {
				consumed += SPACES_UNIT.length;
			} else {
				break;
			}
			units++;
		}

		const insert = unit.repeat(units);
		if (consumed > 0 && leading.slice(0, consumed) !== insert) {
			changes.push({ line: i, from: 0, to: consumed, insert });
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
