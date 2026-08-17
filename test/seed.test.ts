import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { Analyzer } from "../src/analysis";

/** The seed files as they are on disk (the app bundles them as text; here we read them). */
const SEED_DIR = path.join(__dirname, "..", "..", "seed");

describe("Seed workspace", () => {
	it("parses and validates cleanly as one workspace, with schemas and templates in it", () => {
		const files = fs.readdirSync(SEED_DIR).filter((name) => name.endsWith(".stxt")).sort();
		assert.strictEqual(files.length, 12, "the seed is three grammars with three documents each");

		const analyzer = new Analyzer();
		for (const file of files) {
			analyzer.setDocument(file, fs.readFileSync(path.join(SEED_DIR, file), "utf8"));
		}

		const kinds = new Set<string>();
		for (const file of files) {
			const analysis = analyzer.getAnalysis(file);
			assert.ok(analysis, `${file} is analyzed`);
			assert.deepStrictEqual(analysis.diagnostics.map((d) => `${d.code}: ${d.message}`), [],
				`${file} has no problems`);
			for (const grammar of analysis.grammars) {
				kinds.add(grammar.kind);
			}
		}
		assert.deepStrictEqual(Array.from(kinds).sort(), ["schema", "template"],
			"the seed shows both ways of writing a grammar");
	});

	it("keeps every grammar under stxt.play.*, the family the portal never uses", () => {
		// So that any example opened from stxt.dev can join a fresh workspace without a duplicate namespace.
		const analyzer = new Analyzer();
		const files = fs.readdirSync(SEED_DIR).filter((name) => name.endsWith(".stxt")).sort();
		for (const file of files) {
			analyzer.setDocument(file, fs.readFileSync(path.join(SEED_DIR, file), "utf8"));
		}
		const namespaces = files.flatMap((file) => analyzer.getAnalysis(file)!.grammars.map((g) => g.namespace));
		assert.deepStrictEqual(namespaces.sort(), ["stxt.play.config", "stxt.play.cooking", "stxt.play.library"]);
	});

	it("shows Markdown highlighting: the recipes' Notes and the books' Summary are MARKDOWN blocks", () => {
		const analyzer = new Analyzer();
		const files = fs.readdirSync(SEED_DIR).filter((name) => name.endsWith(".stxt")).sort();
		for (const file of files) {
			analyzer.setDocument(file, fs.readFileSync(path.join(SEED_DIR, file), "utf8"));
		}
		const markdownTypes = (file: string) =>
			new Set(analyzer.getAnalysis(file)!.tokens.filter((t) => t.type.startsWith("markdown")).map((t) => t.type));

		assert.ok(markdownTypes("recipe-bolognese.stxt").has("markdownBold"), "the bolognese Notes have bold text");
		assert.ok(markdownTypes("book-handbook.stxt").has("markdownLink"), "the handbook Summary has a link");
		assert.strictEqual(markdownTypes("config-development.stxt").size, 0, "the config Notes are TEXT, not Markdown");
	});

	it("uses tabs for indentation, like every .stxt file of the ecosystem", () => {
		for (const file of fs.readdirSync(SEED_DIR).filter((name) => name.endsWith(".stxt"))) {
			const text = fs.readFileSync(path.join(SEED_DIR, file), "utf8");
			assert.ok(!/^ +\S/m.test(text), `${file} does not indent with spaces`);
		}
	});
});
