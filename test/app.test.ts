import * as assert from "assert";
import { Text } from "@codemirror/state";
import { Analyzer } from "../src/analysis";
import * as fs from "fs";
import * as path from "path";
import { ELEMENT_IDS, findElements, labelOf, lineAt, toCmDiagnostics } from "../src/app";
import { WorkspaceDocument } from "../src/workspace";

describe("labelOf", () => {
	const document: WorkspaceDocument = { id: "d1", title: "My title", text: "" };

	it("labels a plain document by its title, renamable", () => {
		assert.deepStrictEqual(labelOf(document, undefined), { label: "My title", kind: "document", renamable: true });
		const analyzer = new Analyzer();
		analyzer.setDocument("d1", "Recipe: Pancakes");
		assert.deepStrictEqual(labelOf(document, analyzer.getAnalysis("d1")), { label: "My title", kind: "document", renamable: true });
	});

	it("labels a grammar by the namespaces it defines, not renamable", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("d1", "Schema (@stxt.schema): com.example.library\n\tNode: Book\n"
			+ "Template (@stxt.template): com.example.cooking\n\tStructure >>\n\t\tRecipe (com.example.cooking):\n");
		assert.deepStrictEqual(labelOf(document, analyzer.getAnalysis("d1")),
			{ label: "com.example.library, com.example.cooking", kind: "schema", renamable: false });
	});

	it("falls back to the title while a grammar's namespace is blank", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("d1", "Schema (@stxt.schema):\n");
		assert.deepStrictEqual(labelOf(document, analyzer.getAnalysis("d1")), { label: "My title", kind: "schema", renamable: false });
	});
});

describe("toCmDiagnostics", () => {
	it("maps each diagnostic to the whole range of its line, code first", () => {
		const doc = Text.of(["first", "second"]);
		const mapped = toCmDiagnostics(doc, [
			{ line: 1, code: "SCHEMA_NOT_FOUND", message: "No schema", severity: "warning", source: "validation" },
			{ line: 0, code: "INVALID_LINE", message: "Bad", severity: "error", source: "syntax" },
		]);
		assert.deepStrictEqual(mapped, [
			{ from: 6, to: 12, severity: "warning", message: "[SCHEMA_NOT_FOUND] No schema", source: "validation" },
			{ from: 0, to: 5, severity: "error", message: "[INVALID_LINE] Bad", source: "syntax" },
		]);
	});

	it("lands a diagnostic past the end on the last line", () => {
		const doc = Text.of(["only"]);
		const [mapped] = toCmDiagnostics(doc, [{ line: 7, code: "X", message: "m", severity: "error", source: "syntax" }]);
		assert.strictEqual(mapped.from, 0);
		assert.strictEqual(mapped.to, 4);
	});
});

describe("lineAt", () => {
	it("maps a 0-based analysis line to the document line, clamping past the end to the last line", () => {
		const doc = Text.of(["first", "second"]);
		assert.strictEqual(lineAt(doc, 0).number, 1);
		assert.strictEqual(lineAt(doc, 1).number, 2);
		assert.strictEqual(lineAt(doc, 9).number, 2);
	});
});

describe("findElements", () => {
	/** A document stand-in that knows some ids. */
	function documentWith(ids: string[]): Document {
		return { getElementById: (id: string) => (ids.includes(id) ? { id } : null) } as unknown as Document;
	}

	const ALL = Object.values(ELEMENT_IDS);

	it("expects exactly the ids the page has: every one of them is in web/index.html", () => {
		const html = fs.readFileSync(path.join(__dirname, "..", "..", "web", "index.html"), "utf8");
		for (const id of ALL) {
			assert.ok(html.includes(`id="${id}"`), `web/index.html has no element with id="${id}"`);
		}
	});

	it("finds every element by its id in the page", () => {
		const elements = findElements(documentWith(ALL));
		assert.ok(elements);
		assert.strictEqual((elements.docTitle as unknown as { id: string }).id, ELEMENT_IDS.docTitle);
		assert.strictEqual(Object.keys(elements).length, ALL.length);
	});

	it("finds nothing when any element is missing", () => {
		assert.strictEqual(findElements(documentWith(ALL.filter((id) => id !== ELEMENT_IDS.splitter))), undefined);
		assert.strictEqual(findElements(documentWith([])), undefined);
	});
});
