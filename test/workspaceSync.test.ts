import * as assert from "assert";
import { Analyzer } from "../src/analysis";
import { Painters, WorkspaceSync } from "../src/app";
import { DocumentStates } from "../src/editor/documentStates";
import { Workspace } from "../src/workspace";
import { documentStates, FakeHost, fakeHost, sequentialIds } from "./support";

interface Bench {
	workspace: Workspace;
	analyzer: Analyzer;
	states: DocumentStates;
	host: FakeHost;
	painted: Record<keyof Painters, number>;
}

/** A workspace wired like the playground, minus the DOM: painters only count. */
function bench(): Bench {
	const host = fakeHost();
	const painted = { list: 0, panel: 0, header: 0, view: 0 };
	const workspace = new Workspace(sequentialIds());
	const analyzer = new Analyzer();
	const states = documentStates(host);
	new WorkspaceSync(workspace, analyzer, states, {
		list: () => painted.list++,
		panel: () => painted.panel++,
		header: () => painted.header++,
		view: () => painted.view++,
	}).attach();
	return { workspace, analyzer, states, host, painted };
}

describe("WorkspaceSync", () => {
	it("analyzes an added document and shows it, since adding activates", () => {
		const b = bench();

		b.workspace.addDocument("Recipe: Pancakes", "Pancakes");

		assert.ok(b.analyzer.getAnalysis("d1"), "the analyzer mirrors the workspace");
		assert.strictEqual(b.states.shownId(), "d1");
		assert.strictEqual(b.host.state.doc.toString(), "Recipe: Pancakes");
		assert.ok(b.painted.list > 0 && b.painted.view > 0 && b.painted.panel > 0 && b.painted.header > 0);
	});

	it("switches the view on activation and keeps each document's state", () => {
		const b = bench();
		b.workspace.addDocument("A: 1", "A");
		b.workspace.addDocument("B: 2", "B");
		assert.strictEqual(b.host.state.doc.toString(), "B: 2");

		b.workspace.setActive("d1");

		assert.strictEqual(b.states.shownId(), "d1");
		assert.strictEqual(b.host.state.doc.toString(), "A: 1");
	});

	it("pushes a text change of the shown document into the view and repaints it", () => {
		const b = bench();
		b.workspace.addDocument("A: 1", "A");
		const before = b.painted.view;

		b.workspace.setText("d1", "A: changed");

		assert.strictEqual(b.host.state.doc.toString(), "A: changed");
		assert.strictEqual(b.analyzer.getAnalysis("d1")?.roots[0].getName(), "A");
		assert.ok(b.painted.view > before);
	});

	it("does not dispatch again when the editor was the origin of the text", () => {
		const b = bench();
		b.workspace.addDocument("A: 1", "A");
		b.host.dispatch({ changes: { from: 4, insert: "0" } }); // typing
		const dispatches = b.host.dispatches;

		// What the editor's update listener does after every transaction
		b.workspace.setText("d1", b.host.state.doc.toString());

		assert.strictEqual(b.host.dispatches, dispatches);
		assert.strictEqual(b.analyzer.getAnalysis("d1")?.roots[0].getName(), "A");
	});

	it("updates a parked document's state without dispatching to the view", () => {
		const b = bench();
		b.workspace.addDocument("A: 1", "A");
		b.workspace.addDocument("B: 2", "B");
		const dispatches = b.host.dispatches;

		b.workspace.setText("d1", "A: parked change");

		assert.strictEqual(b.host.dispatches, dispatches, "the view shows another document");
		assert.strictEqual(b.host.state.doc.toString(), "B: 2");
		b.workspace.setActive("d1");
		assert.strictEqual(b.host.state.doc.toString(), "A: parked change");
	});

	it("re-validates the other documents when a grammar changes", () => {
		const b = bench();
		b.workspace.addDocument("Recipe (com.example.cooking): Pancakes", "Pancakes");
		const codes = (): string[] => (b.analyzer.getAnalysis("d1")?.diagnostics ?? []).map((d) => d.code);
		assert.deepStrictEqual(codes(), ["SCHEMA_NOT_FOUND"]);

		b.workspace.addDocument("Template (@stxt.template): com.example.cooking\n\tStructure >>\n\t\tRecipe (com.example.cooking):\n", "Grammar");

		assert.deepStrictEqual(codes(), [], "the recipe validates now");
	});

	it("repaints the view when a parked grammar changes: the underlines of the shown document may change", () => {
		const b = bench();
		b.workspace.addDocument("Template (@stxt.template): com.example.cooking\n\tStructure >>\n\t\tRecipe (com.example.cooking):\n", "Grammar");
		b.workspace.addDocument("Recipe (com.example.cooking): Pancakes\n", "Pancakes");
		const codes = (): string[] => (b.analyzer.getAnalysis("d2")?.diagnostics ?? []).map((d) => d.code);
		assert.deepStrictEqual(codes(), []);
		const view = b.painted.view;

		// What an open link does when it brings a different grammar for a namespace already defined
		b.workspace.setText("d1", "Template (@stxt.template): com.example.cooking\n\tStructure >>\n\t\tRecipe (com.example.cooking):\n\t\t\tServes: (1) NATURAL\n");

		assert.deepStrictEqual(codes(), ["TOO_FEW_CHILDREN"], "the shown document has a new finding");
		assert.ok(b.painted.view > view, "and the view is repainted although it shows another document");
		assert.strictEqual(b.states.shownId(), "d2");
	});

	it("forgets a removed document everywhere and shows its neighbour", () => {
		const b = bench();
		b.workspace.addDocument("A: 1", "A");
		b.workspace.addDocument("B: 2", "B");

		b.workspace.removeDocument("d2");

		assert.strictEqual(b.analyzer.getAnalysis("d2"), undefined);
		assert.strictEqual(b.states.shownId(), "d1");
		assert.strictEqual(b.host.state.doc.toString(), "A: 1");
	});

	it("repaints the list and the header on rename, and the list on move", () => {
		const b = bench();
		b.workspace.addDocument("A: 1", "A");
		b.workspace.addDocument("B: 2", "B");
		const { list, header, view } = b.painted;

		b.workspace.rename("d1", "Renamed");
		assert.strictEqual(b.painted.list, list + 1);
		assert.strictEqual(b.painted.header, header + 1);

		b.workspace.move("d1", 1);
		assert.strictEqual(b.painted.list, list + 2);
		assert.strictEqual(b.painted.view, view, "neither touches the view");
	});
});
