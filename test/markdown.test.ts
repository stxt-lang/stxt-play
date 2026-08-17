import * as assert from "assert";
import { Analyzer, MarkdownSpan, newMarkdownState, StxtToken, tokenizeMarkdownLine } from "../src/analysis";

/** Compact representation of a span: its type without the prefix and the text it covers. */
function spansOf(line: string, state = newMarkdownState()): string[] {
	return tokenizeMarkdownLine(line, state).map(
		(span: MarkdownSpan) => `${span.type.replace("markdown", "").toLowerCase()}[${line.substring(span.startChar, span.startChar + span.length)}]`
	);
}

/** Compact representation of a token: position and type. */
function describeToken(token: StxtToken): string {
	return `${token.line}:${token.startChar}+${token.length} ${token.type}`;
}

describe("MarkdownTokenizer", () => {
	it("colours a heading line as a whole", () => {
		assert.deepStrictEqual(spansOf("# Título"), ["heading[# Título]"]);
		assert.deepStrictEqual(spansOf("###### h6 con **negrita**"), ["heading[###### h6 con **negrita**]"]);
		assert.deepStrictEqual(spansOf("#sin espacio"), [], "a # without whitespace is not a heading");
	});

	it("colours the inline constructs: bold, italic, code and links", () => {
		assert.deepStrictEqual(spansOf("Texto con **negrita**, *cursiva*, `código` y [enlace](https://x.y)."), [
			"bold[**negrita**]", "italic[*cursiva*]", "code[`código`]", "link[[enlace](https://x.y)]",
		]);
		assert.deepStrictEqual(spansOf("__bold__ _it_ ***fuerte*** ![img](p.png) <https://a.b>"), [
			"bold[__bold__]", "italic[_it_]", "bold[***fuerte***]", "link[![img](p.png)]", "link[<https://a.b>]",
		]);
	});

	it("does not take underscores inside words or escaped markers as emphasis", () => {
		assert.deepStrictEqual(spansOf("snake_case_name y otro_nombre_así"), []);
		assert.deepStrictEqual(spansOf("\\*no\\* es cursiva"), []);
		assert.deepStrictEqual(spansOf("un * suelto y otro *"), []);
	});

	it("colours list and quote markers and keeps parsing the rest of the line", () => {
		assert.deepStrictEqual(spansOf("- item con **x**"), ["list[-]", "bold[**x**]"]);
		assert.deepStrictEqual(spansOf("  1. ordenado"), ["list[1.]"]);
		assert.deepStrictEqual(spansOf("> cita con *x*"), ["quote[>]", "italic[*x*]"]);
		assert.deepStrictEqual(spansOf("> > # título citado"), ["quote[> >]", "heading[# título citado]"]);
		assert.deepStrictEqual(spansOf("-x"), [], "a marker needs whitespace after it");
	});

	it("colours a fenced code block as code, from fence to fence, ignoring the markup inside", () => {
		const state = newMarkdownState();
		assert.deepStrictEqual(spansOf("```js", state), ["code[```js]"]);
		assert.deepStrictEqual(spansOf("const a = **1**; // # no heading", state), ["code[const a = **1**; // # no heading]"]);
		assert.deepStrictEqual(spansOf("", state), []);
		assert.deepStrictEqual(spansOf("```", state), ["code[```]"]);
		assert.deepStrictEqual(spansOf("ya fuera **x**", state), ["bold[**x**]"]);
	});

	it("does not close a fence with a shorter one or with a different character", () => {
		const state = newMarkdownState();
		spansOf("````", state);
		spansOf("```", state);
		spansOf("~~~~", state);
		assert.deepStrictEqual(spansOf("**x**", state), ["code[**x**]"], "still inside the fence");
		spansOf("`````", state);
		assert.deepStrictEqual(spansOf("**x**", state), ["bold[**x**]"], "closed by a longer fence of the same character");
	});
});

describe("Analyzer: MARKDOWN blocks", () => {
	// A template declaring Notes as MARKDOWN and Steps as TEXT, as the seed's stxt.play.cooking does
	const TEMPLATE = [
		"Template (@stxt.template): com.example.md",
		"\tStructure >>",
		"\t\tRecipe (com.example.md):",
		"\t\t\tNotes: (?) MARKDOWN",
		"\t\t\tSteps: (?) TEXT",
		"",
	].join("\n");

	const DOC = [
		"Recipe (com.example.md):",
		"\tNotes >>",
		"\t\t# Título",
		"\t\tCon **negrita** y `código`.",
		"\t\t\t- indentado",
		"\tSteps >>",
		"\t\tCon **negrita** que no se colorea.",
		"",
	].join("\n");

	function markdownTokens(analyzer: Analyzer, id: string): string[] {
		return analyzer.getAnalysis(id)!.tokens.filter((t) => t.type.startsWith("markdown")).map(describeToken);
	}

	it("colours the content of a MARKDOWN block at the position of each line, and not that of a TEXT block", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("grammar", TEMPLATE);
		analyzer.setDocument("doc", DOC);

		assert.deepStrictEqual(markdownTokens(analyzer, "doc"), [
			"2:2+8 markdownHeading",
			"3:6+11 markdownBold",
			"3:20+8 markdownCode",
			"4:3+1 markdownList",
		]);
	});

	it("keeps every token in document order", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("grammar", TEMPLATE);
		analyzer.setDocument("doc", DOC);

		const tokens = analyzer.getAnalysis("doc")!.tokens;
		for (let i = 1; i < tokens.length; i++) {
			const previous = tokens[i - 1];
			const token = tokens[i];
			assert.ok(token.line > previous.line || (token.line === previous.line && token.startChar >= previous.startChar + previous.length),
				`${describeToken(token)} comes after ${describeToken(previous)}`);
		}
	});

	it("colours nothing without a grammar, and recolours when the grammar changes without touching the document", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("doc", DOC);
		assert.deepStrictEqual(markdownTokens(analyzer, "doc"), [], "no grammar in the workspace: no Markdown");

		analyzer.setDocument("grammar", TEMPLATE);
		assert.strictEqual(markdownTokens(analyzer, "doc").length, 4, "the grammar arrives: the block is coloured");

		analyzer.setDocument("grammar", TEMPLATE.replace("Notes: (?) MARKDOWN", "Notes: (?) TEXT"));
		assert.deepStrictEqual(markdownTokens(analyzer, "doc"), [], "Notes is TEXT now: no Markdown");

		analyzer.setDocument("grammar", TEMPLATE.replace("Notes: (?) MARKDOWN", "Notes: (?) TEXT").replace("Steps: (?) TEXT", "Steps: (?) MARKDOWN"));
		assert.deepStrictEqual(markdownTokens(analyzer, "doc"), ["6:6+11 markdownBold"], "and now Steps is the Markdown one");
	});
});
