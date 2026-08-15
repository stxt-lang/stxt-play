import * as assert from "assert";
import { Analyzer, DUPLICATE_NAMESPACE } from "../src/analysis";

/** A schema for the com.example.demo namespace declaring a single Root node. */
const DEMO_SCHEMA = [
	"Schema (@stxt.schema): com.example.demo",
	"\tNode: Root",
	"\t\tType: TEXT",
	"",
].join("\n");

/** A template for the same namespace, as the alternative authoring form. */
const DEMO_TEMPLATE = [
	"Template (@stxt.template): com.example.demo",
	"\tStructure >>",
	"\t\tRoot:",
	"",
].join("\n");

const VALID_DOC = "Root (com.example.demo): hello\n";
const UNKNOWN_ROOT_DOC = "Other (com.example.demo): hello\n";

describe("Analyzer: parsing products", () => {
	it("emits tokens, line maps and comment lines, all 0-based", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("doc", [
			"# A comment",
			"Greeting (dev.stxt.play): hola!",
			"\tNote >>",
			"\t\tLiteral text",
			"",
		].join("\n"));

		const analysis = analyzer.getAnalysis("doc");
		assert.ok(analysis, "the document must be analyzed");

		assert.ok(analysis.commentLines.has(0), "line 0 is a comment");
		assert.ok(analysis.nodeByLine.has(1), "line 1 opens the Greeting node");
		assert.ok(analysis.nodeByLine.has(2), "line 2 opens the Note block");
		assert.strictEqual(analysis.textLineByLineNumber.get(3)?.getName(), "Note",
			"line 3 is a text line of the Note block");

		const typesAt = (line: number) => analysis.tokens.filter((t) => t.line === line).map((t) => t.type);
		assert.deepStrictEqual(typesAt(0), ["comment"]);
		assert.ok(typesAt(1).includes("namespace"), "the namespace of line 1 gets its own token");
		assert.ok(typesAt(1).includes("string"), "the value of line 1 is a string token");
		assert.ok(typesAt(2).includes("macro"), "the '>>' head of line 2 is a macro token");

		assert.strictEqual(analysis.diagnostics.length, 0, "a clean document has no diagnostics");
		assert.deepStrictEqual(analysis.grammarNamespaces, [], "a plain document defines no grammar");
	});

	it("reports syntax errors with their stable code and 0-based line", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("doc", "Doc: x\n\tBadLineWithoutColon\n");

		const analysis = analyzer.getAnalysis("doc");
		assert.ok(analysis);

		assert.strictEqual(analysis.diagnostics.length, 1);
		const [error] = analysis.diagnostics;
		assert.strictEqual(error.code, "INVALID_LINE");
		assert.strictEqual(error.line, 1, "lines are 0-based in the analysis output");
		assert.strictEqual(error.severity, "error");
		assert.strictEqual(error.source, "syntax");
	});
});

describe("Analyzer: validation against the workspace grammars", () => {
	it("does not report SCHEMA_NOT_FOUND when the workspace has no grammar at all", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("doc", VALID_DOC);

		assert.strictEqual(analyzer.getAnalysis("doc")?.diagnostics.length, 0,
			"schemas are optional: a namespaced document without grammars is not wrong");
	});

	it("validates a document against a schema of the workspace", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("schema", DEMO_SCHEMA);
		analyzer.setDocument("good", VALID_DOC);
		analyzer.setDocument("bad", UNKNOWN_ROOT_DOC);

		assert.strictEqual(analyzer.getAnalysis("schema")?.diagnostics.length, 0, "the schema itself is clean");
		assert.strictEqual(analyzer.getAnalysis("good")?.diagnostics.length, 0, "the valid document is clean");

		const bad = analyzer.getAnalysis("bad");
		assert.ok(bad);
		assert.strictEqual(bad.diagnostics.length, 1);
		assert.strictEqual(bad.diagnostics[0].code, "NODE_NOT_EXIST_IN_SCHEMA");
		assert.strictEqual(bad.diagnostics[0].severity, "warning");
		assert.strictEqual(bad.diagnostics[0].source, "validation");
	});

	it("validates against a template exactly like against a schema", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("template", DEMO_TEMPLATE);
		analyzer.setDocument("bad", UNKNOWN_ROOT_DOC);

		const bad = analyzer.getAnalysis("bad");
		assert.ok(bad);
		assert.ok(bad.diagnostics.some((d) => d.code === "NODE_NOT_EXIST_IN_SCHEMA"),
			"a template compiles to a schema and validates the same way");
	});

	it("reports SCHEMA_NOT_FOUND when grammars exist but none covers the namespace", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("schema", DEMO_SCHEMA);
		analyzer.setDocument("doc", "Root (org.other.ns): hello\n");

		const analysis = analyzer.getAnalysis("doc");
		assert.ok(analysis);
		assert.ok(analysis.diagnostics.some((d) => d.code === "SCHEMA_NOT_FOUND" && d.severity === "warning"));
	});

	it("can be switched off, keeping syntax diagnostics", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("schema", DEMO_SCHEMA);
		analyzer.setDocument("bad", UNKNOWN_ROOT_DOC + "\tNoColonHere\n");

		analyzer.setValidation(false);
		const analysis = analyzer.getAnalysis("bad");
		assert.ok(analysis);
		assert.deepStrictEqual(analysis.diagnostics.map((d) => d.source), ["syntax"],
			"only the syntax error remains with validation off");

		analyzer.setValidation(true);
		assert.strictEqual(analyzer.getAnalysis("bad")?.diagnostics.length, 2,
			"switching validation back on restores the validation warning");
	});
});

describe("Analyzer: grammars in the workspace", () => {
	it("marks grammar documents through their declared namespaces", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("schema", DEMO_SCHEMA);
		analyzer.setDocument("doc", VALID_DOC);

		assert.deepStrictEqual(analyzer.getAnalysis("schema")?.grammarNamespaces, ["com.example.demo"]);
		assert.deepStrictEqual(analyzer.getAnalysis("doc")?.grammarNamespaces, []);
	});

	it("flags duplicate namespaces on every definer and leaves the namespace undefined", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("schema", DEMO_SCHEMA);
		analyzer.setDocument("template", DEMO_TEMPLATE);
		analyzer.setDocument("doc", VALID_DOC);

		for (const id of ["schema", "template"]) {
			const analysis = analyzer.getAnalysis(id);
			assert.ok(analysis);
			assert.ok(analysis.diagnostics.some((d) => d.code === DUPLICATE_NAMESPACE && d.severity === "error"),
				`the ${id} document must report the duplicate namespace`);
		}

		const doc = analyzer.getAnalysis("doc");
		assert.ok(doc);
		assert.ok(doc.diagnostics.some((d) => d.code === "SCHEMA_NOT_FOUND"),
			"a conflicted namespace has no active definition, mirroring DISCOVERY");
	});

	it("reports the meta-validation of a broken grammar on its own document", () => {
		const analyzer = new Analyzer();
		// Parses and transforms, but Type: FOO violates the meta-schema ENUM
		analyzer.setDocument("schema", [
			"Schema (@stxt.schema): com.example.demo",
			"\tNode: Root",
			"\t\tType: FOO",
			"",
		].join("\n"));
		analyzer.setDocument("doc", VALID_DOC);

		const schema = analyzer.getAnalysis("schema");
		assert.ok(schema);
		assert.ok(schema.diagnostics.some((d) => d.source === "validation"),
			"the grammar document reports its own meta-schema violations");

		const doc = analyzer.getAnalysis("doc");
		assert.ok(doc);
		assert.ok(doc.diagnostics.some((d) => d.code === "SCHEMA_NOT_FOUND"),
			"an invalid grammar is not registered, so its namespace stays unresolved");
	});
});

describe("Analyzer: workspace updates", () => {
	it("re-validates every document when a grammar changes", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("schema", DEMO_SCHEMA);
		analyzer.setDocument("doc", VALID_DOC);
		assert.strictEqual(analyzer.getAnalysis("doc")?.diagnostics.length, 0);

		// Rename the declared node: the document stops validating without being touched
		analyzer.setDocument("schema", DEMO_SCHEMA.replace("Node: Root", "Node: Other"));
		assert.ok(analyzer.getAnalysis("doc")?.diagnostics.some((d) => d.code === "NODE_NOT_EXIST_IN_SCHEMA"));
	});

	it("stops validating when the last grammar leaves the workspace", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("schema", DEMO_SCHEMA);
		analyzer.setDocument("doc", UNKNOWN_ROOT_DOC);
		assert.strictEqual(analyzer.getAnalysis("doc")?.diagnostics.length, 1);

		analyzer.removeDocument("schema");
		assert.strictEqual(analyzer.getAnalysis("schema"), undefined);
		assert.strictEqual(analyzer.getAnalysis("doc")?.diagnostics.length, 0,
			"without grammars there is nothing to validate against");
	});

	it("keeps the cached analysis when a document is set to the same text", () => {
		const analyzer = new Analyzer();
		analyzer.setDocument("doc", VALID_DOC);
		const first = analyzer.getAnalysis("doc");

		analyzer.setDocument("doc", VALID_DOC);
		assert.strictEqual(analyzer.getAnalysis("doc"), first, "same text, same analysis object");
	});
});
