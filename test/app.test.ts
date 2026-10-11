import * as assert from "assert";
import { Analyzer } from "@stxt-lang/editor";
import * as fs from "fs";
import * as path from "path";
import { ELEMENT_IDS, findElements, labelOf } from "../src/app";
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
