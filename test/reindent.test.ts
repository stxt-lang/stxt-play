import * as assert from "assert";
import { toCanonicalJson } from "@stxt-lang/core";
import { Analyzer, applyIndentChanges, SPACES_UNIT, TAB_UNIT } from "../src/analysis";

/** Tabs everywhere, with the traps: relative indentation inside a block, comments, blank lines. */
const TABBED = [
	"# Root comment",
	"Doc (com.example.x): title",
	"\t# Indented comment",
	"\tName: value\twith a tab inside",
	"\tItems:",
	"\t\tItem: one",
	"",
	"\tCode >>",
	"\t\tplain line",
	"\t\t\tindented one level more, which is content",
	"\t\t\t\t\tdeep content",
	"\t\t",
	"\t\t  two spaces of content",
	"\tAfter: block",
	"",
].join("\n");

/** The same document with the structural units as four spaces; content untouched. */
const SPACED = [
	"# Root comment",
	"Doc (com.example.x): title",
	"    # Indented comment",
	"    Name: value\twith a tab inside",
	"    Items:",
	"        Item: one",
	"",
	"    Code >>",
	"        plain line",
	"        \tindented one level more, which is content",
	"        \t\t\tdeep content",
	"        ",
	"          two spaces of content",
	"    After: block",
	"",
].join("\n");

function reindent(text: string, unit: string): string {
	const analyzer = new Analyzer();
	analyzer.setDocument("d", text);
	return applyIndentChanges(text, analyzer.getIndentChanges("d", unit));
}

describe("Re-indentation between tabs and spaces", () => {
	it("converts only the structural units: levels, block base indentation, comments", () => {
		assert.strictEqual(reindent(TABBED, SPACES_UNIT), SPACED);
	});

	it("goes back the same way, leaving the content of the block alone", () => {
		assert.strictEqual(reindent(SPACED, TAB_UNIT), TABBED,
			"the relative indentation of the block content is not structural and is preserved");
	});

	it("is a no-op on a document already in the target unit", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("d", TABBED);
		assert.deepStrictEqual(analyzer.getIndentChanges("d", TAB_UNIT), []);
		assert.deepStrictEqual(analyzer.getIndentChanges("ghost", TAB_UNIT), []);
	});

	it("keeps the tree identical across a round trip", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("a", TABBED);
		analyzer.setDocument("b", reindent(TABBED, SPACES_UNIT));
		const dump = (id: string) => toCanonicalJson(analyzer.getAnalysis(id)?.roots ?? []);
		const textOf = (id: string) => analyzer.getAnalysis(id)?.roots[0].getChildren().find((c) => c.getName() === "Code")?.getText();
		assert.strictEqual(textOf("a"), textOf("b"), "the block text is byte-identical");
		assert.strictEqual(analyzer.getAnalysis("b")?.diagnostics.length, 0);
		assert.strictEqual(dump("a"), dump("b"));
	});

	it("converts what it can on broken lines and leaves the rest, without repairing", () => {
		// A mixed line the parser rejects, and a line with a two-space remainder
		const text = "Doc: x\n\t  Mixed: y\n\t\t\tJump: z\n";
		const analyzer = new Analyzer();
		analyzer.setDocument("d", text);
		const out = applyIndentChanges(text, analyzer.getIndentChanges("d", SPACES_UNIT));
		assert.strictEqual(out, "Doc: x\n      Mixed: y\n            Jump: z\n");
		assert.ok(analyzer.getAnalysis("d")?.diagnostics.length, "the document was and stays invalid");
	});
});
