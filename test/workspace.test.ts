import * as assert from "assert";
import {
	decodeOpen,
	decodeShare,
	DEFAULT_SETTINGS,
	encodeOpen,
	encodeShare,
	isOpenLink,
	sharePayloadOf,
	KeyValueStorage,
	loadSettings,
	loadWorkspace,
	saveSettings,
	saveWorkspace,
	SETTINGS_STORAGE_KEY,
	toShareDocument,
	Workspace,
	WORKSPACE_STORAGE_KEY,
	WorkspaceEvent,
} from "../src/workspace";

/** Deterministic ids: d1, d2, d3… */
function sequentialIds(): () => string {
	let n = 0;
	return () => `d${++n}`;
}

/** Records every event of a workspace as "kind:id" strings. */
function record(workspace: Workspace): string[] {
	const events: string[] = [];
	workspace.subscribe((event: WorkspaceEvent) => events.push(`${event.kind}:${event.id}`));
	return events;
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

describe("Workspace: documents and activation", () => {
	it("starts empty and activates the first document added", () => {
		const workspace = new Workspace(sequentialIds());
		assert.deepStrictEqual(workspace.getDocuments(), []);
		assert.strictEqual(workspace.getActiveId(), null);

		const events = record(workspace);
		const document = workspace.addDocument("Root: x\n");

		assert.strictEqual(document.id, "d1");
		assert.strictEqual(document.title, "Untitled 1");
		assert.strictEqual(workspace.getActiveId(), "d1");
		assert.deepStrictEqual(events, ["added:d1", "activated:d1"]);
	});

	it("keeps generated titles unique and honours a given one", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument();
		workspace.addDocument("", "  My doc  ");
		workspace.addDocument();

		assert.deepStrictEqual(workspace.getDocuments().map((d) => d.title), ["Untitled 1", "My doc", "Untitled 2"]);
	});

	it("changes text and title, ignoring no-ops and blank titles", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("a");
		const events = record(workspace);

		workspace.setText("d1", "a");
		workspace.setText("d1", "b");
		assert.strictEqual(workspace.getDocument("d1")?.text, "b");

		assert.strictEqual(workspace.rename("d1", "   "), false, "a document always keeps a title");
		assert.strictEqual(workspace.rename("d1", "Untitled 1"), false, "same title is not a change");
		assert.strictEqual(workspace.rename("d1", " Recipe "), true);
		assert.strictEqual(workspace.getDocument("d1")?.title, "Recipe");

		workspace.setText("missing", "x");
		assert.deepStrictEqual(events, ["text:d1", "renamed:d1"]);
	});

	it("documents are immutable snapshots", () => {
		const workspace = new Workspace(sequentialIds());
		const before = workspace.addDocument("a");
		workspace.setText("d1", "b");
		assert.strictEqual(before.text, "a", "the instance handed out earlier does not change");
		assert.strictEqual(workspace.getDocument("d1")?.text, "b");
	});

	it("activates only known documents and reports the change once", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument();
		workspace.addDocument();
		const events = record(workspace);

		workspace.setActive("d2");
		workspace.setActive("nope");
		workspace.setActive("d1");
		assert.deepStrictEqual(events, ["activated:d1"]);
	});
});

describe("Workspace: order", () => {
	it("moves a document to a final position, clamping and ignoring no-ops", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument();
		workspace.addDocument();
		workspace.addDocument();
		const events = record(workspace);
		const order = () => workspace.getDocuments().map((d) => d.id);

		assert.strictEqual(workspace.move("d1", 2), true);
		assert.deepStrictEqual(order(), ["d2", "d3", "d1"]);
		assert.strictEqual(workspace.move("d1", 99), false, "already last: clamped, no change");
		assert.strictEqual(workspace.move("d3", -5), true, "clamped to the first position");
		assert.deepStrictEqual(order(), ["d3", "d2", "d1"]);
		assert.strictEqual(workspace.move("ghost", 0), false);
		assert.deepStrictEqual(events, ["moved:d1", "moved:d3"]);
		assert.strictEqual(workspace.getActiveId(), "d3", "moving does not change the active document");
	});
});

describe("Workspace: removal", () => {
	it("hands activation to the next document, or the previous when the last one goes", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument();
		workspace.addDocument();
		workspace.addDocument();
		workspace.setActive("d2");
		const events = record(workspace);

		assert.strictEqual(workspace.removeDocument("d2"), true);
		assert.strictEqual(workspace.getActiveId(), "d3", "the next one in the list takes over");
		assert.deepStrictEqual(events, ["removed:d2", "activated:d3"],
			"the removal is reported before the new activation");

		workspace.removeDocument("d3");
		assert.strictEqual(workspace.getActiveId(), "d1", "the last one falls back to the previous");
	});

	it("does not touch activation when a non-active document is removed", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument();
		workspace.addDocument();
		workspace.setActive("d1");
		const events = record(workspace);

		workspace.removeDocument("d2");
		assert.strictEqual(workspace.getActiveId(), "d1");
		assert.deepStrictEqual(events, ["removed:d2"]);
		assert.strictEqual(workspace.removeDocument("d2"), false, "removing twice is a no-op");
	});

	it("leaves the workspace empty when the only document is removed", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument();
		workspace.removeDocument("d1");
		assert.deepStrictEqual(workspace.getDocuments(), []);
		assert.strictEqual(workspace.getActiveId(), null);
		assert.strictEqual(workspace.getActiveDocument(), undefined);
	});
});

describe("Workspace: snapshots and persistence", () => {
	it("round-trips through a snapshot, keeping order and the active document", () => {
		const source = new Workspace(sequentialIds());
		source.addDocument("one", "One");
		source.addDocument("two", "Two");
		source.setActive("d1");

		const target = new Workspace(sequentialIds());
		target.addDocument("stale");
		const events = record(target);
		target.load(source.toSnapshot());

		assert.deepStrictEqual(target.getDocuments().map((d) => [d.id, d.title, d.text]),
			[["d1", "One", "one"], ["d2", "Two", "two"]]);
		assert.strictEqual(target.getActiveId(), "d1");
		assert.deepStrictEqual(events, ["removed:d1", "added:d1", "added:d2", "activated:d1"],
			"the previous content is removed first, then every document is added, then activated");
	});

	it("falls back to the first document when the stored active id is missing", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.load({ active: "ghost", documents: [{ id: "x", title: "X", text: "" }] });
		assert.strictEqual(workspace.getActiveId(), "x");
	});

	it("saves and loads through a key/value store", () => {
		const storage = memoryStorage();
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("Root: x\n", "Doc");

		assert.strictEqual(saveWorkspace(storage, workspace.toSnapshot()), true);
		assert.ok(storage.data.has(WORKSPACE_STORAGE_KEY));

		const loaded = loadWorkspace(storage);
		assert.deepStrictEqual(loaded, { active: "d1", documents: [{ id: "d1", title: "Doc", text: "Root: x\n" }] });
	});

	it("returns nothing for an absent, corrupt or foreign store, without throwing", () => {
		const storage = memoryStorage();
		assert.strictEqual(loadWorkspace(storage), undefined, "nothing stored");

		storage.setItem(WORKSPACE_STORAGE_KEY, "{not json");
		assert.strictEqual(loadWorkspace(storage), undefined, "corrupt JSON");

		storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ version: 99, active: null, documents: [] }));
		assert.strictEqual(loadWorkspace(storage), undefined, "another format version");

		storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ version: 1, active: null, documents: [{ id: 1 }] }));
		assert.strictEqual(loadWorkspace(storage), undefined, "documents with the wrong shape");

		const broken: KeyValueStorage = {
			getItem: () => { throw new Error("quota"); },
			setItem: () => { throw new Error("quota"); },
			removeItem: () => { throw new Error("quota"); },
		};
		assert.strictEqual(loadWorkspace(broken), undefined, "a throwing store reads as empty");
		assert.strictEqual(saveWorkspace(broken, { active: null, documents: [] }), false, "and refuses writes quietly");
	});
});

describe("Settings persistence", () => {
	it("round-trips the settings and defaults field by field", () => {
		const storage = memoryStorage();
		assert.deepStrictEqual(loadSettings(storage), DEFAULT_SETTINGS, "nothing stored: defaults");
		assert.notStrictEqual(loadSettings(storage), DEFAULT_SETTINGS, "and a copy, not the shared object");

		assert.strictEqual(saveSettings(storage, { indent: "spaces", validation: false }), true);
		assert.deepStrictEqual(loadSettings(storage), { indent: "spaces", validation: false });

		assert.strictEqual(saveSettings(storage, { indent: "spaces", validation: false, sidebarWidth: 300 }), true);
		assert.deepStrictEqual(loadSettings(storage), { indent: "spaces", validation: false, sidebarWidth: 300 });

		storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ indent: "elephants", validation: false }));
		assert.deepStrictEqual(loadSettings(storage), { indent: "tabs", validation: false },
			"a malformed field falls back to its default, the rest is kept");

		storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ indent: "tabs", validation: true, sidebarWidth: "wide" }));
		assert.deepStrictEqual(loadSettings(storage), DEFAULT_SETTINGS,
			"a malformed width is dropped: its default is the stylesheet's, not a number");

		storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ indent: "tabs", validation: true, sidebarWidth: -5 }));
		assert.deepStrictEqual(loadSettings(storage), DEFAULT_SETTINGS, "so is a width that is not positive");

		storage.setItem(SETTINGS_STORAGE_KEY, "{oops");
		assert.deepStrictEqual(loadSettings(storage), DEFAULT_SETTINGS, "corrupt JSON: defaults");
	});
});

describe("Share links", () => {
	/** Compresses a text the way a share payload is compressed, to feed decodeShare directly. */
	async function compress(text: string): Promise<string> {
		const stream = new Blob([new TextEncoder().encode(text) as BlobPart]).stream()
			.pipeThrough(new CompressionStream("deflate-raw"));
		const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
		let binary = "";
		for (const byte of bytes) {
			binary += String.fromCharCode(byte);
		}
		return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	}

	it("round-trips a workspace through the compressed fragment payload", async () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("Recipe (com.example.cooking): Pa amb tomàquet\n\tServes: 2\n", "Recipe");
		workspace.addDocument("Template (@stxt.template): com.example.cooking\n", "Grammar");
		workspace.setActive("d1");

		const payload = await encodeShare(workspace.toSnapshot());
		assert.ok(/^[A-Za-z0-9_-]+$/.test(payload), "base64url, safe in a fragment");
		// Ids are minted on decode (s1, s2…): they only mean something inside one browser
		assert.deepStrictEqual(await decodeShare(payload), {
			active: "s1",
			documents: [
				{ id: "s1", title: "Recipe", text: "Recipe (com.example.cooking): Pa amb tomàquet\n\tServes: 2\n" },
				{ id: "s2", title: "Grammar", text: "Template (@stxt.template): com.example.cooking\n" },
			],
		});
		assert.strictEqual(sharePayloadOf(`#w=${payload}`), payload);
	});

	it("carries the workspace as a readable STXT document", () => {
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument("Recipe (com.example.cooking): Pancakes\n", "Recipe");

		const stxt = toShareDocument(workspace.toSnapshot());
		assert.strictEqual(stxt, [
			"# STXT Playground workspace — https://play.stxt.dev",
			"Workspace (stxt.play.share):",
			"\tVersion: 1",
			"\tDocument: Recipe",
			"\t\tActive: true",
			"\t\tText >>",
			"\t\t\tRecipe (com.example.cooking): Pancakes",
			"",
		].join("\n"));
	});

	it("keeps documents literal inside the envelope: comments, blocks, blank lines, any indent", async () => {
		const tricky = "Doc (com.example.docs): A >> B\n" // ">>" after ":" stays inline
			+ "    Note >>\n"
			+ "        # not a comment\n"
			+ "\n"
			+ "        indented >> literal: yes\n";
		const workspace = new Workspace(sequentialIds());
		workspace.addDocument(tricky, "Spaces: a tricky one");
		workspace.addDocument("", "Empty");
		workspace.setActive("d1");

		const decoded = await decodeShare(await encodeShare(workspace.toSnapshot()));
		assert.deepStrictEqual(decoded, {
			active: "s1",
			documents: [
				{ id: "s1", title: "Spaces: a tricky one", text: tricky },
				{ id: "s2", title: "Empty", text: "" },
			],
		});
	});

	it("decodes a hand-written envelope, whatever its indentation and without the comment", async () => {
		const stxt = [
			"Workspace (stxt.play.share):",
			"    Version: 1",
			"    Document: Hello",
			"        Text >>",
			"            Greeting (com.example.hello): World",
			"    Document: Chosen",
			"        Active: TRUE",
			"        Text >>",
			"            Other (com.example.hello): One",
			"",
		].join("\n");

		assert.deepStrictEqual(await decodeShare(await compress(stxt)), {
			active: "s2",
			documents: [
				{ id: "s1", title: "Hello", text: "Greeting (com.example.hello): World\n" },
				{ id: "s2", title: "Chosen", text: "Other (com.example.hello): One\n" },
			],
		});
	});

	it("reads nothing from garbage or from STXT that is not a share envelope", async () => {
		assert.strictEqual(await decodeShare("not-a-payload"), undefined);
		assert.strictEqual(await decodeShare(""), undefined);
		assert.strictEqual(await decodeShare(await compress('{"version":1,"active":null,"documents":[]}')),
			undefined, "JSON is not a workspace: the share document is STXT");
		assert.strictEqual(sharePayloadOf(""), undefined);
		assert.strictEqual(sharePayloadOf("#other=1"), undefined);

		assert.strictEqual(await decodeShare(await compress("Root (com.example.docs): not a workspace\n")),
			undefined, "valid STXT, wrong root");
		assert.strictEqual(await decodeShare(await compress("Workspace (stxt.play.share):\n\tVersion: 99\n")),
			undefined, "unknown envelope version");
	});
});

describe("Open links", () => {
	const text = "Recipe (com.example.cooking): Pa amb tomàquet\n\tServes: 2\n\tNotes >>\n\t\t# not a comment\n";

	it("round-trips one document with its title through the fragment", async () => {
		const fragment = await encodeOpen(text, "STXT Tutorial");
		assert.ok(fragment.startsWith("d="), `starts with the document parameter: ${fragment}`);
		assert.ok(fragment.includes("&t=STXT+Tutorial"), `carries the title: ${fragment}`);
		assert.ok(isOpenLink(`#${fragment}`));
		assert.deepStrictEqual(await decodeOpen(`#${fragment}`), { text, title: "STXT Tutorial" });
		assert.deepStrictEqual(await decodeOpen(fragment), { text, title: "STXT Tutorial" }, "with or without #");
	});

	it("carries no title when none is given, or when it is blank", async () => {
		assert.deepStrictEqual(await decodeOpen(await encodeOpen(text)), { text });
		assert.deepStrictEqual(await decodeOpen(await encodeOpen(text, "  ")), { text });
		assert.strictEqual((await encodeOpen(text)).includes("&t="), false);
	});

	it("uses only the base64url alphabet for the payload", async () => {
		const fragment = await encodeOpen(text);
		assert.ok(/^d=[A-Za-z0-9_-]+$/.test(fragment), fragment);
	});

	it("reads nothing from garbage, from an empty payload or from other fragments", async () => {
		assert.strictEqual(await decodeOpen("#d=not-a-payload"), undefined);
		assert.strictEqual(await decodeOpen("#d="), undefined);
		assert.strictEqual(await decodeOpen("#w=abc"), undefined);
		assert.strictEqual(await decodeOpen(""), undefined);
		assert.strictEqual(isOpenLink("#d="), false);
		assert.strictEqual(isOpenLink("#w=abc"), false);
		assert.strictEqual(isOpenLink(""), false);
	});

	it("does not mistake an open link for a share link", async () => {
		const fragment = await encodeOpen(text);
		assert.strictEqual(sharePayloadOf(`#${fragment}`), undefined);
	});
});
