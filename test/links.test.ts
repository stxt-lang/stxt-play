import * as assert from "assert";
import {
	createWorkspacePersistence,
	freeTitle,
	loadSharedSnapshot,
	loadWorkspace,
	KeyValueStorage,
	openLinked,
	planGrammars,
	Workspace,
	WorkspaceSnapshot,
} from "../src/workspace";

/** Deterministic ids: d1, d2, d3… */
function sequentialIds(): () => string {
	let n = 0;
	return () => `d${++n}`;
}

/** In-memory stand-in for localStorage. */
function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
	const data = new Map<string, string>();
	return {
		data,
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => void data.set(key, value),
		removeItem: (key) => void data.delete(key),
	};
}

describe("Workspace.replaceAll", () => {
	it("replaces every document and activates the first by default", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("old", "Old");

		const added = workspace.replaceAll([{ title: "A", text: "a" }, { title: "B", text: "b" }]);

		assert.deepStrictEqual(workspace.getDocuments().map((d) => d.title), ["A", "B"]);
		assert.strictEqual(workspace.getActiveId(), added[0].id);
	});

	it("activates the document at activeIndex, clamped", () => {
		const workspace = new Workspace(sequentialIds());

		const added = workspace.replaceAll([{ text: "a" }, { text: "b" }], 1);
		assert.strictEqual(workspace.getActiveId(), added[1].id);

		const again = workspace.replaceAll([{ text: "c" }], 5);
		assert.strictEqual(workspace.getActiveId(), again[0].id);
	});

	it("generates fresh ids unless one is given, and defaults blank titles", () => {
		const workspace = new Workspace(sequentialIds());

		const added = workspace.replaceAll([{ id: "kept", title: "A", text: "a" }, { title: "  ", text: "b" }]);

		assert.strictEqual(added[0].id, "kept");
		assert.notStrictEqual(added[1].id, "kept");
		assert.strictEqual(added[1].title, "Untitled 1");
	});
});

describe("loadSharedSnapshot", () => {
	const snapshot: WorkspaceSnapshot = {
		active: "s2",
		documents: [
			{ id: "s1", title: "One", text: "One: 1\n" },
			{ id: "s2", title: "Two", text: "Two: 2\n" },
		],
	};

	it("replaces the workspace with fresh ids and keeps the shared active document", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("mine", "Mine");

		loadSharedSnapshot(workspace, snapshot);

		const documents = workspace.getDocuments();
		assert.deepStrictEqual(documents.map((d) => d.title), ["One", "Two"]);
		assert.ok(documents.every((d) => d.id !== "s1" && d.id !== "s2"), "share ids never enter the workspace");
		assert.strictEqual(workspace.getActiveDocument()?.title, "Two");
	});

	it("activates the first document when the active id is not in the snapshot", () => {
		const workspace = new Workspace(sequentialIds());

		loadSharedSnapshot(workspace, { ...snapshot, active: "missing" });

		assert.strictEqual(workspace.getActiveDocument()?.title, "One");
	});
});

describe("freeTitle", () => {
	it("keeps a free title and suffixes a taken one", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("", "Recipe");
		workspace.addDocument("", "Recipe (2)");

		assert.strictEqual(freeTitle(workspace, "Notes"), "Notes");
		assert.strictEqual(freeTitle(workspace, "Recipe"), "Recipe (3)");
	});
});

describe("openLinked", () => {
	it("adds the linked document, with its title made free, and selects it", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("other", "Doc");

		const outcome = openLinked(workspace, "Linked: yes\n", "Doc");

		assert.strictEqual(outcome, "added");
		assert.strictEqual(workspace.getActiveDocument()?.title, "Doc (2)");
		assert.strictEqual(workspace.getActiveDocument()?.text, "Linked: yes\n");
	});

	it("selects the existing document when the same text is already there", () => {
		const workspace = new Workspace(sequentialIds());
		const existing = workspace.addDocument("Linked: yes\n", "Already");
		workspace.addDocument("other", "Other");

		const outcome = openLinked(workspace, "Linked: yes\n", "Doc");

		assert.strictEqual(outcome, "existing");
		assert.strictEqual(workspace.getActiveId(), existing.id);
		assert.strictEqual(workspace.getDocuments().length, 2, "nothing is added");
	});
});

describe("planGrammars", () => {
	const template = "Template (@stxt.template): com.acme.book\n"
		+ "\tStructure >>\n\t\tBook:\n\t\t\tTitle: (1)\n";
	const schema = "Schema (@stxt.schema): com.acme.book\n"
		+ "\tNode: Book\n\t\tChildren:\n\t\t\tChild: Title\n";

	it("adds a grammar whose namespace nothing defines yet", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("Book (com.acme.book): One\n", "Doc");

		const plan = planGrammars(workspace, [template]);

		assert.deepStrictEqual(plan.replace, []);
		assert.deepStrictEqual(plan.add, [{ text: template, namespace: "com.acme.book" }]);
	});

	it("drops a grammar identical to the one already defining its namespace", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument(template, "Grammar");

		const plan = planGrammars(workspace, [template]);

		assert.deepStrictEqual(plan, { add: [], replace: [] });
	});

	it("plans a replacement when the namespace is defined with a different text", () => {
		const workspace = new Workspace(sequentialIds());
		const existing = workspace.addDocument(template, "Grammar");

		const plan = planGrammars(workspace, [schema]);

		assert.deepStrictEqual(plan.add, []);
		assert.deepStrictEqual(plan.replace, [
			{ grammar: { text: schema, namespace: "com.acme.book" }, documentId: existing.id },
		]);
	});

	it("matches namespaces case-insensitively, as the language does", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument(template, "Grammar");

		const upper = "Template (@stxt.template): COM.ACME.BOOK\n\tStructure >>\n\t\tBook:\n";
		const plan = planGrammars(workspace, [upper]);

		assert.strictEqual(plan.add.length, 0, "same namespace: never a second definition");
		assert.strictEqual(plan.replace.length, 1);
		assert.strictEqual(plan.replace[0].grammar.namespace, "com.acme.book");
	});

	it("ignores payloads that are not grammars, do not parse, or repeat a namespace of the link", () => {
		const workspace = new Workspace(sequentialIds());

		const plan = planGrammars(workspace, [
			"Book (com.acme.book): not a grammar\n",
			"\tbroken: indentation\n",
			template,
			schema, // same namespace as the template above: the first one of the link wins
		]);

		assert.deepStrictEqual(plan.replace, []);
		assert.deepStrictEqual(plan.add, [{ text: template, namespace: "com.acme.book" }]);
	});
});

describe("createWorkspacePersistence", () => {
	it("persistNow writes the workspace, schedulePersist debounces to one write", async () => {
		const storage = memoryStorage();
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("One: 1\n", "One");
		const persistence = createWorkspacePersistence(workspace, storage, 5);

		persistence.schedulePersist();
		persistence.schedulePersist();
		assert.strictEqual(storage.data.size, 0, "nothing is written before the delay");

		await new Promise((resolve) => setTimeout(resolve, 20));
		assert.deepStrictEqual(loadWorkspace(storage), workspace.toSnapshot());
	});

	it("persistNow cancels a scheduled write and writes immediately", async () => {
		const storage = memoryStorage();
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("One: 1\n", "One");
		const persistence = createWorkspacePersistence(workspace, storage, 5);

		persistence.schedulePersist();
		persistence.persistNow();
		const written = storage.data.size;
		assert.ok(written > 0, "persistNow writes without waiting");

		workspace.addDocument("Two: 2\n", "Two");
		await new Promise((resolve) => setTimeout(resolve, 20));
		// The cancelled timer did not fire later: the store still holds the first snapshot
		assert.strictEqual(loadWorkspace(storage)?.documents.length, 1);
	});

	it("does nothing without a store", () => {
		const workspace = new Workspace(sequentialIds());
		const persistence = createWorkspacePersistence(workspace, undefined, 5);
		persistence.schedulePersist();
		persistence.persistNow();
	});
});
