import * as assert from "assert";
import { Analyzer } from "../src/analysis";

/** A template whose Structure declares nested nodes and a foreign-namespace child. */
const TEMPLATE = [
	"Template (@stxt.template): com.example.cooking",
	"\tStructure >>",
	"\t\tRecipe (com.example.cooking):",
	"\t\t\tServes: (?) NATURAL",
	"\t\t\tIngredients: (1)",
	"\t\t\t\tIngredient: (+)",
	"\t\t\tNote (org.example.notes): (*)",
	"",
].join("\n");

/** A schema for the foreign namespace, declared with `Node:` entries. */
const NOTES_SCHEMA = [
	"# Notes",
	"Schema (@stxt.schema): org.example.notes",
	"\tNode: Note",
	"\t\tType: TEXT",
	"\tNode: Extra",
	"\t\tType: TEXT",
	"",
].join("\n");

const RECIPE = [
	"Recipe (com.example.cooking): Bread",
	"\tServes: 2",
	"\tIngredients:",
	"\t\tIngredient: Flour",
	"\tNote (org.example.notes) >>",
	"\t\tKeep warm.",
	"\tUnknown: nothing declares me",
	"",
].join("\n");

function workspace(): Analyzer {
	const analyzer = new Analyzer();
	analyzer.setDocument("template", TEMPLATE);
	analyzer.setDocument("notes", NOTES_SCHEMA);
	analyzer.setDocument("recipe", RECIPE);
	return analyzer;
}

describe("Go to definition", () => {
	it("lands on the node's line inside a template Structure", () => {
		const analyzer = workspace();
		// `Serves` (line 1, on the name) is declared at line 3 of the template
		assert.deepStrictEqual(analyzer.findDefinition("recipe", 1, 2), { documentId: "template", line: 3 });
		// Nested nodes are found depth-first
		assert.deepStrictEqual(analyzer.findDefinition("recipe", 3, 4), { documentId: "template", line: 5 });
	});

	it("lands on the `Node:` line of a schema, following the node's own namespace", () => {
		const analyzer = workspace();
		// `Note (org.example.notes)` belongs to the schema, not to the template that references it
		assert.deepStrictEqual(analyzer.findDefinition("recipe", 4, 2), { documentId: "notes", line: 2 });
	});

	it("lands on the grammar root when the position is over the namespace", () => {
		const analyzer = workspace();
		// `Recipe (com.example.cooking): Bread` — column 10 is inside the namespace
		assert.deepStrictEqual(analyzer.findDefinition("recipe", 0, 10), { documentId: "template", line: 0 });
		// Column 8 is inside `(org.example.notes)` of the Note line
		assert.deepStrictEqual(analyzer.findDefinition("recipe", 4, 8), { documentId: "notes", line: 1 });
	});

	it("falls back to the grammar root when the grammar does not declare the node", () => {
		const analyzer = workspace();
		assert.deepStrictEqual(analyzer.findDefinition("recipe", 6, 2), { documentId: "template", line: 0 });
	});

	it("resolves nothing over the value, on text lines, without namespace, or without grammar", () => {
		const analyzer = workspace();
		// Past the head of `Recipe (com.example.cooking): Bread`
		assert.strictEqual(analyzer.findDefinition("recipe", 0, 32), undefined);
		// A text line of a block opens no node
		assert.strictEqual(analyzer.findDefinition("recipe", 5, 2), undefined);

		analyzer.setDocument("plain", "Free: x\nOther (org.nobody.knows): y\n");
		assert.strictEqual(analyzer.findDefinition("plain", 0, 1), undefined, "no namespace");
		assert.strictEqual(analyzer.findDefinition("plain", 1, 1), undefined, "no grammar in the workspace");
		assert.strictEqual(analyzer.findDefinition("missing", 0, 0), undefined, "unknown document");
	});

	it("resolves nothing for the reserved namespaces and for conflicted ones", () => {
		const analyzer = workspace();
		// A grammar root itself lives in @stxt.template, which is built-in
		assert.strictEqual(analyzer.findDefinition("template", 0, 2), undefined);

		analyzer.setDocument("notes2", NOTES_SCHEMA);
		assert.strictEqual(analyzer.findDefinition("recipe", 4, 2), undefined, "duplicated namespace");
		analyzer.removeDocument("notes2");
		assert.deepStrictEqual(analyzer.findDefinition("recipe", 4, 2), { documentId: "notes", line: 2 });
	});
});
