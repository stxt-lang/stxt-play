import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { Analyzer } from "../src/analysis";

/** The seed files as they are on disk (the app bundles them as text; here we read them). */
const SEED_DIR = path.join(__dirname, "..", "..", "seed");

describe("Seed workspace", () => {
	it("parses and validates cleanly as one workspace, with schemas and templates in it", () => {
		const files = fs.readdirSync(SEED_DIR).filter((name) => name.endsWith(".stxt")).sort();
		assert.ok(files.length >= 4, "the seed has several documents");

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

	it("uses tabs for indentation, like every .stxt file of the ecosystem", () => {
		for (const file of fs.readdirSync(SEED_DIR).filter((name) => name.endsWith(".stxt"))) {
			const text = fs.readFileSync(path.join(SEED_DIR, file), "utf8");
			assert.ok(!/^ +\S/m.test(text), `${file} does not indent with spaces`);
		}
	});
});
