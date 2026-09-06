import * as assert from "assert";
import { applyFragment, applyOpenLink, applyShareLink, carriesLink, FragmentDialogs } from "../src/app";
import { encodeOpen, encodeShare, OpenLinkDocument, Workspace } from "../src/workspace";

function sequentialIds(): () => string {
	let n = 0;
	return () => `d${++n}`;
}

const COOKING = "Template (@stxt.template): com.example.cooking\n\tStructure >>\n\t\tRecipe (com.example.cooking):\n";
const COOKING_V2 = "Template (@stxt.template): com.example.cooking\n\tStructure >>\n\t\tRecipe (com.example.cooking):\n\t\t\tServes: (?) NATURAL\n";
const LIBRARY = "Schema (@stxt.schema): com.example.library\n\tNode: Book\n";
const RECIPE = "Recipe (com.example.cooking): Pancakes\n";

/** Dialogs that answer as told and remember what they were asked. */
function dialogs(answer: boolean): FragmentDialogs & { asked: string[] } {
	const asked: string[] = [];
	return {
		asked,
		loadSharedWorkspace: async (count) => {
			asked.push(`load ${count}`);
			return answer;
		},
		replaceGrammar: async (namespace) => {
			asked.push(`replace ${namespace}`);
			return answer;
		},
	};
}

function titles(workspace: Workspace): string[] {
	return workspace.getDocuments().map((d) => d.title);
}

describe("applyOpenLink", () => {
	it("says so when the link did not decode", async () => {
		const workspace = new Workspace(sequentialIds());
		const status = await applyOpenLink(workspace, undefined, dialogs(true));
		assert.strictEqual(status, "The link does not carry a valid document.");
		assert.deepStrictEqual(titles(workspace), []);
	});

	it("adds a plain document and selects it; a second time it selects the existing one", async () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("Other: 1", "Other");
		const linked: OpenLinkDocument = { text: RECIPE, title: "Pancakes" };

		assert.strictEqual(await applyOpenLink(workspace, linked, dialogs(true)), "Document opened from the link.");
		assert.deepStrictEqual(titles(workspace), ["Other", "Pancakes"]);
		assert.strictEqual(workspace.getActiveId(), "d2");

		workspace.setActive("d1");
		assert.strictEqual(await applyOpenLink(workspace, linked, dialogs(true)),
			"The document of the link was already in the workspace.");
		assert.deepStrictEqual(titles(workspace), ["Other", "Pancakes"]);
		assert.strictEqual(workspace.getActiveId(), "d2");
	});

	it("brings the grammars first, each as its own document, and leaves the document active", async () => {
		const workspace = new Workspace(sequentialIds());
		const ask = dialogs(true);

		const status = await applyOpenLink(workspace, { text: RECIPE, title: "Pancakes", grammars: [COOKING, LIBRARY] }, ask);

		assert.strictEqual(status, "Document opened from the link. The link also brought 2 grammars.");
		assert.deepStrictEqual(titles(workspace), ["com.example.cooking", "com.example.library", "Pancakes"]);
		assert.strictEqual(workspace.getActiveDocument()?.title, "Pancakes");
		assert.deepStrictEqual(ask.asked, [], "unknown namespaces are added without asking");
	});

	it("keeps an identical grammar silently and does not count it", async () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument(COOKING, "Mine");

		const status = await applyOpenLink(workspace, { text: RECIPE, grammars: [COOKING] }, dialogs(true));

		assert.strictEqual(status, "Document opened from the link.");
		assert.deepStrictEqual(titles(workspace), ["Mine", "Untitled 1"]);
	});

	it("asks before replacing a different grammar, and honours the answer", async () => {
		for (const answer of [true, false]) {
			const workspace = new Workspace(sequentialIds());
			workspace.addDocument(COOKING, "Mine");
			const ask = dialogs(answer);

			const status = await applyOpenLink(workspace, { text: RECIPE, grammars: [COOKING_V2] }, ask);

			assert.deepStrictEqual(ask.asked, ["replace com.example.cooking"]);
			assert.strictEqual(workspace.getDocument("d1")?.text, answer ? COOKING_V2 : COOKING);
			assert.strictEqual(status, answer
				? "Document opened from the link. The link also brought 1 grammar."
				: "Document opened from the link.");
		}
	});

	it("treats a document that is a grammar by the one-definition-per-namespace rule", async () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("Other: 1", "Other");

		// New namespace: added, titled by it, and active
		assert.strictEqual(await applyOpenLink(workspace, { text: COOKING, title: "ignored" }, dialogs(true)),
			"Grammar opened from the link.");
		assert.deepStrictEqual(titles(workspace), ["Other", "com.example.cooking"]);
		assert.strictEqual(workspace.getActiveId(), "d2");

		// Identical: the existing one is selected
		workspace.setActive("d1");
		assert.strictEqual(await applyOpenLink(workspace, { text: COOKING }, dialogs(true)),
			"The grammar of the link was already in the workspace.");
		assert.strictEqual(workspace.getActiveId(), "d2");
		assert.strictEqual(workspace.getDocuments().length, 2);

		// Different, declined: kept, and selected anyway
		workspace.setActive("d1");
		const declined = dialogs(false);
		assert.strictEqual(await applyOpenLink(workspace, { text: COOKING_V2 }, declined), "Your grammar was kept.");
		assert.deepStrictEqual(declined.asked, ["replace com.example.cooking"]);
		assert.strictEqual(workspace.getDocument("d2")?.text, COOKING);
		assert.strictEqual(workspace.getActiveId(), "d2");

		// Different, accepted: replaced in place
		workspace.setActive("d1");
		assert.strictEqual(await applyOpenLink(workspace, { text: COOKING_V2 }, dialogs(true)), "Grammar replaced from the link.");
		assert.strictEqual(workspace.getDocument("d2")?.text, COOKING_V2);
		assert.strictEqual(workspace.getActiveId(), "d2");
		assert.strictEqual(workspace.getDocuments().length, 2, "never two definitions of one namespace");
	});
});

describe("applyShareLink", () => {
	const shared = { active: "s2", documents: [{ id: "s1", title: "A", text: "A: 1\n" }, { id: "s2", title: "B", text: "B: 2\n" }] };

	it("says so when the link did not decode or is empty", async () => {
		const workspace = new Workspace(sequentialIds());
		assert.strictEqual(await applyShareLink(workspace, undefined, false, dialogs(true)), "The link does not carry a valid workspace.");
		assert.strictEqual(await applyShareLink(workspace, { active: null, documents: [] }, false, dialogs(true)),
			"The link does not carry a valid workspace.");
	});

	it("loads over the seed without asking", async () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("Seed: 1", "Seed");
		const ask = dialogs(false);

		assert.strictEqual(await applyShareLink(workspace, shared, false, ask), "Shared workspace loaded.");

		assert.deepStrictEqual(ask.asked, []);
		assert.deepStrictEqual(titles(workspace), ["A", "B"]);
		assert.strictEqual(workspace.getActiveDocument()?.title, "B");
	});

	it("asks over the user's own documents, and keeps them when declined", async () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("Mine: 1", "Mine");
		const declined = dialogs(false);

		assert.strictEqual(await applyShareLink(workspace, shared, true, declined), undefined);
		assert.deepStrictEqual(declined.asked, ["load 2"]);
		assert.deepStrictEqual(titles(workspace), ["Mine"]);

		assert.strictEqual(await applyShareLink(workspace, shared, true, dialogs(true)), "Shared workspace loaded.");
		assert.deepStrictEqual(titles(workspace), ["A", "B"]);
	});
});

describe("applyFragment", () => {
	it("acts on nothing when the fragment carries no link", async () => {
		const workspace = new Workspace(sequentialIds());
		for (const hash of ["", "#", "#x=1", "#w=", "#d="]) {
			assert.strictEqual(carriesLink(hash), false, hash);
			assert.strictEqual(await applyFragment(hash, workspace, true, dialogs(true)), undefined, hash);
		}
		assert.deepStrictEqual(titles(workspace), []);
	});

	it("opens an encoded open link, grammars included", async () => {
		const workspace = new Workspace(sequentialIds());
		const hash = `#${await encodeOpen(RECIPE, "Pancakes", [COOKING])}`;
		assert.strictEqual(carriesLink(hash), true);

		const status = await applyFragment(hash, workspace, true, dialogs(true));

		assert.strictEqual(status, "Document opened from the link. The link also brought 1 grammar.");
		assert.deepStrictEqual(titles(workspace), ["com.example.cooking", "Pancakes"]);
	});

	it("loads an encoded share link, and the share link wins over an open link", async () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("Old: 1", "Old");
		const share = await encodeShare({ active: "x", documents: [{ id: "x", title: "Shared", text: "S: 1\n" }] });
		const open = await encodeOpen(RECIPE, "Pancakes");
		const hash = `#w=${share}&${open}`;
		assert.strictEqual(carriesLink(hash), true);

		const status = await applyFragment(hash, workspace, false, dialogs(true));

		assert.strictEqual(status, "Shared workspace loaded.");
		assert.deepStrictEqual(titles(workspace), ["Shared"]);
	});

	it("reports a link that does not decode", async () => {
		const workspace = new Workspace(sequentialIds());
		assert.strictEqual(await applyFragment("#d=!!!", workspace, true, dialogs(true)), "The link does not carry a valid document.");
		assert.strictEqual(await applyFragment("#w=!!!", workspace, true, dialogs(true)), "The link does not carry a valid workspace.");
	});
});
