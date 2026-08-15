import * as assert from "assert";
import { Analyzer, CompletionSuggestion } from "../src/analysis";

/** A template with cardinalities, a text block, a foreign-namespace child and an ENUM. */
const TEMPLATE = [
	"Template (@stxt.template): com.example.cooking",
	"\tStructure >>",
	"\t\tRecipe (com.example.cooking):",
	"\t\t\tServes: (?) NATURAL",
	"\t\t\tDifficulty: (?) ENUM [Easy, Medium, Hard]",
	"\t\t\tIngredients: (1)",
	"\t\t\t\tIngredient: (+)",
	"\t\t\tSteps: (1) TEXT",
	"\t\t\tNote (org.example.notes): (*)",
	"",
].join("\n");

const NOTES_SCHEMA = [
	"Schema (@stxt.schema): org.example.notes",
	"\tNode: Note",
	"\t\tType: TEXT",
	"",
].join("\n");

const RECIPE = [
	"Recipe (com.example.cooking): Bread",
	"\tServes: 2",
	"\tIngredients:",
	"\t\tIngredient: Flour",
	"\tSteps >>",
	"\t\tKnead.",
	"\tDifficulty: ",
	"",
].join("\n");

function workspace(): Analyzer {
	const analyzer = new Analyzer();
	analyzer.setDocument("template", TEMPLATE);
	analyzer.setDocument("notes", NOTES_SCHEMA);
	analyzer.setDocument("recipe", RECIPE);
	return analyzer;
}

const labels = (suggestions: CompletionSuggestion[] | undefined) => (suggestions ?? []).map((s) => s.label);
const texts = (suggestions: CompletionSuggestion[] | undefined) => (suggestions ?? []).map((s) => s.text);

describe("Completion: root level", () => {
	it("offers the roots of every workspace grammar plus the meta-grammar roots", () => {
		const analyzer = workspace();
		const result = analyzer.getCompletions("recipe", 7, "");
		assert.ok(result);
		assert.strictEqual(result.from, 0);
		assert.deepStrictEqual(labels(result.suggestions).sort(), ["Note", "Recipe", "Schema", "Template"]);
		assert.ok(texts(result.suggestions).includes("Recipe (com.example.cooking): "));
		assert.ok(texts(result.suggestions).includes("Schema (@stxt.schema): "));
		assert.ok(texts(result.suggestions).includes("Note (org.example.notes) >>"), "TEXT roots are offered as blocks");
	});

	it("filters by the typed prefix with the canonical comparison, and replaces the whole name", () => {
		const analyzer = workspace();
		const result = analyzer.getCompletions("recipe", 7, "rEc");
		assert.ok(result);
		assert.deepStrictEqual(labels(result.suggestions), ["Recipe"]);
		assert.strictEqual(result.from, 0);

		const withNamespace = analyzer.getCompletions("recipe", 7, "Recipe (com.ex");
		assert.ok(withNamespace);
		assert.deepStrictEqual(labels(withNamespace.suggestions), ["Recipe"]);
		assert.strictEqual(withNamespace.from, 0, "a half-typed namespace is part of what gets replaced");
	});

	it("still offers the meta-grammar roots in a workspace without grammars", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("doc", "");
		assert.deepStrictEqual(labels(analyzer.getCompletions("doc", 0, "")?.suggestions).sort(), ["Schema", "Template"]);
	});
});

describe("Completion: children of the enclosing node", () => {
	it("offers the declared children, blocks as '>>', foreign namespaces spelled out", () => {
		const analyzer = workspace();
		// A new line at level 1 under Recipe, typed after the last child: everything declared
		// for Recipe that can still be added
		const result = analyzer.getCompletions("recipe", 7, "\t");
		assert.ok(result);
		assert.strictEqual(result.from, 1, "replacement starts after the indentation");
		assert.deepStrictEqual(labels(result.suggestions), ["Note"]);
		assert.deepStrictEqual(texts(result.suggestions), ["Note (org.example.notes) >>"]);
	});

	it("drops children already at their maximum cardinality", () => {
		const analyzer = workspace();
		const all = labels(analyzer.getCompletions("recipe", 7, "\t")?.suggestions);
		assert.ok(!all.includes("Serves"), "Serves (?) is already present once");
		assert.ok(!all.includes("Ingredients"), "Ingredients (1) is already present");
		assert.ok(!all.includes("Steps"), "Steps (1) is already present");
		assert.ok(!all.includes("Difficulty"), "Difficulty (?) is present, even with an empty value");
		assert.ok(all.includes("Note"), "Note (*) has no maximum");

		// Take Difficulty out and it is offered again
		analyzer.setDocument("recipe", RECIPE.replace("\tDifficulty: \n", ""));
		assert.deepStrictEqual(labels(analyzer.getCompletions("recipe", 6, "\t")?.suggestions), ["Difficulty", "Note"]);
	});

	it("uses the nearest node one level up as the parent", () => {
		const analyzer = workspace();
		// Level 2 right after "Ingredient: Flour": the nearest level-1 node is Ingredients
		const result = analyzer.getCompletions("recipe", 4, "\t\t");
		assert.ok(result);
		assert.deepStrictEqual(labels(result.suggestions), ["Ingredient"]);
		assert.deepStrictEqual(texts(result.suggestions), ["Ingredient: "]);

		// Level 2 at the end: the nearest level-1 node is Difficulty, which declares no children
		assert.deepStrictEqual(analyzer.getCompletions("recipe", 7, "\t\t")?.suggestions, []);
	});
});

describe("Completion: values and dead zones", () => {
	it("offers the ENUM values after the colon, replacing only the value prefix", () => {
		const analyzer = workspace();
		const result = analyzer.getCompletions("recipe", 6, "\tDifficulty: ");
		assert.ok(result);
		assert.strictEqual(result.from, "\tDifficulty: ".length);
		assert.deepStrictEqual(labels(result.suggestions), ["Easy", "Medium", "Hard"]);
		assert.deepStrictEqual(labels(analyzer.getCompletions("recipe", 6, "\tDifficulty: m")?.suggestions), ["Medium"]);
	});

	it("offers no values for a non-ENUM node", () => {
		const analyzer = workspace();
		assert.deepStrictEqual(analyzer.getCompletions("recipe", 1, "\tServes: ")?.suggestions, []);
	});

	it("offers nothing in comments, block text, or after '>>'", () => {
		const analyzer = workspace();
		assert.strictEqual(analyzer.getCompletions("recipe", 5, "\t\tKne"), null, "text line of a block");
		assert.strictEqual(analyzer.getCompletions("recipe", 4, "\tSteps >> "), null, "after the block head");
		analyzer.setDocument("c", "# a comment\n");
		assert.strictEqual(analyzer.getCompletions("c", 0, "# a com"), null, "comment");
		assert.strictEqual(analyzer.getCompletions("ghost", 0, ""), null, "unknown document");
	});
});

describe("Node info for the hover", () => {
	it("describes an inline node with its grammar definition", () => {
		const analyzer = workspace();
		const info = analyzer.describeNode("recipe", 1);
		assert.ok(info);
		assert.strictEqual(info.name, "Serves");
		assert.strictEqual(info.namespace, "com.example.cooking");
		assert.strictEqual(info.kind, "inline");
		assert.strictEqual(info.value, "2");
		assert.strictEqual(info.level, 1);
		assert.strictEqual(info.definition?.type, "NATURAL");
	});

	it("describes a block, an ENUM with its values, and a node without grammar", () => {
		const analyzer = workspace();
		const steps = analyzer.describeNode("recipe", 4);
		assert.strictEqual(steps?.kind, "block");
		assert.strictEqual(steps?.textLines, 1);

		const difficulty = analyzer.describeNode("recipe", 6);
		assert.deepStrictEqual(difficulty?.definition?.values, ["Easy", "Medium", "Hard"]);

		const recipe = analyzer.describeNode("recipe", 0);
		assert.deepStrictEqual(recipe?.definition?.children.map((c) => c.name),
			["Serves", "Difficulty", "Ingredients", "Steps", "Note"]);

		analyzer.setDocument("plain", "Free (org.nobody.knows): x\n");
		assert.strictEqual(analyzer.describeNode("plain", 0)?.definition, undefined);
		assert.strictEqual(analyzer.describeNode("recipe", 5), undefined, "a text line opens no node");
	});
});
