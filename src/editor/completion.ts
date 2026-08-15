import {
	autocompletion,
	Completion,
	CompletionContext,
	CompletionResult as CmCompletionResult,
} from "@codemirror/autocomplete";
import { indentUnit } from "@codemirror/language";
import { Extension } from "@codemirror/state";
import { CompletionResult, CompletionSuggestion } from "../analysis";

/** Asks the app for the completions of a position: 0-based line and the text before the cursor. */
export type CompletionProvider = (line: number, linePrefix: string) => CompletionResult | null;

/** CodeMirror completion type per suggestion kind: it picks the icon of the row. */
const CM_TYPES: Record<CompletionSuggestion["kind"], string> = {
	node: "property",
	block: "text",
	value: "enum",
};

/**
 * Autocompletion for STXT, driven by the analysis (see `analysis/completion.ts`), never by a
 * grammar of its own. The provider is asked on every keystroke and on Ctrl-Space; results are
 * shown as they come (`filter: false`), because the analysis already matches names the STXT
 * way — canonical form, accents kept, separators folded — which CodeMirror's fuzzy filter would
 * not.
 *
 * A block suggestion inserts its head plus a line break and the indentation of the body: the
 * current line's indentation plus one indent unit, whatever the header switch says it is.
 *
 * @param provide the app's hook into the analyzer for the document in the view.
 */
export function stxtCompletion(provide: CompletionProvider): Extension {
	const source = (context: CompletionContext): CmCompletionResult | null => {
		const line = context.state.doc.lineAt(context.pos);
		const linePrefix = line.text.slice(0, context.pos - line.from);

		const result = provide(line.number - 1, linePrefix);
		if (!result || result.suggestions.length === 0) {
			return null;
		}

		// While typing, only pop up once there is something typed to complete; on Ctrl-Space,
		// always. Otherwise every empty line would open the list.
		const from = line.from + result.from;
		if (!context.explicit && context.pos === from) {
			return null;
		}

		const unit = context.state.facet(indentUnit);
		const indentation = /^[\t ]*/.exec(line.text)?.[0] ?? "";
		const options: Completion[] = result.suggestions.map((suggestion) => ({
			label: suggestion.label,
			detail: suggestion.detail,
			type: CM_TYPES[suggestion.kind],
			apply: suggestion.kind === "block" ? `${suggestion.text}\n${indentation}${unit}` : suggestion.text,
		}));
		return { from, options, filter: false };
	};

	return autocompletion({ override: [source], icons: true });
}
