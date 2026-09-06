import * as assert from "assert";
import { EditorState, TransactionSpec } from "@codemirror/state";
import { DocumentStates, StateHost } from "../src/editor/documentStates";

/** A view stand-in: holds one state and counts what goes through it. */
function fakeHost(): StateHost & { sets: number; dispatches: number; lastUserEvent?: string } {
	let state = EditorState.create({ doc: "" });
	const host = {
		sets: 0,
		dispatches: 0,
		lastUserEvent: undefined as string | undefined,
		get state() {
			return state;
		},
		setState(next: EditorState): void {
			state = next;
			host.sets++;
		},
		dispatch(spec: TransactionSpec): void {
			state = state.update(spec).state;
			host.dispatches++;
			host.lastUserEvent = typeof spec.userEvent === "string" ? spec.userEvent : undefined;
		},
	};
	return host;
}

function states(host: StateHost): DocumentStates {
	return new DocumentStates(host, (text) => EditorState.create({ doc: text }));
}

describe("DocumentStates.show", () => {
	it("starts with nothing shown and shows a document from its text", () => {
		const host = fakeHost();
		const s = states(host);
		assert.strictEqual(s.shownId(), null);

		s.show("a", "A: 1");

		assert.strictEqual(s.shownId(), "a");
		assert.strictEqual(host.state.doc.toString(), "A: 1");
		assert.strictEqual(host.sets, 1);
	});

	it("parks the state of the document that was in the view and restores it later", () => {
		const host = fakeHost();
		const s = states(host);
		s.show("a", "A: 1");
		host.dispatch({ changes: { from: 4, insert: "0" } }); // the user typed: A: 10

		s.show("b", "B: 2");
		assert.strictEqual(host.state.doc.toString(), "B: 2");

		s.show("a", "stale text the model would hand in");
		assert.strictEqual(host.state.doc.toString(), "A: 10", "the parked state wins over the text");
		assert.strictEqual(s.shownId(), "a");
	});

	it("showing the shown document again does not park or replace anything", () => {
		const host = fakeHost();
		const s = states(host);
		s.show("a", "A: 1");
		s.show("a", "A: 1");
		assert.strictEqual(host.sets, 2);
		assert.strictEqual(host.state.doc.toString(), "A: 1");
	});
});

describe("DocumentStates.syncText", () => {
	it("replaces the text of the shown document when the model differs", () => {
		const host = fakeHost();
		const s = states(host);
		s.show("a", "A: 1");

		assert.strictEqual(s.syncText("a", "A: 2"), true);
		assert.strictEqual(host.state.doc.toString(), "A: 2");
		assert.strictEqual(host.dispatches, 1);
	});

	it("moves nothing when the texts already match: the editor was the origin", () => {
		const host = fakeHost();
		const s = states(host);
		s.show("a", "A: 1");
		host.dispatch({ changes: { from: 4, insert: "0" } });

		assert.strictEqual(s.syncText("a", "A: 10"), false);
		assert.strictEqual(host.dispatches, 1);
	});

	it("updates a parked document without touching the view", () => {
		const host = fakeHost();
		const s = states(host);
		s.show("a", "A: 1");
		s.show("b", "B: 2");

		assert.strictEqual(s.syncText("a", "A: replaced"), true);
		assert.strictEqual(host.state.doc.toString(), "B: 2");
		assert.strictEqual(host.dispatches, 0);

		s.show("a", "");
		assert.strictEqual(host.state.doc.toString(), "A: replaced");
	});

	it("does nothing for a document never shown", () => {
		const host = fakeHost();
		const s = states(host);
		assert.strictEqual(s.syncText("never", "text"), false);
		assert.strictEqual(host.dispatches, 0);
	});
});

describe("DocumentStates.change", () => {
	it("goes through the view for the shown document, with the user event", () => {
		const host = fakeHost();
		const s = states(host);
		s.show("a", "A: 1");

		const outcome = s.change("a", (doc) => [{ from: 0, to: doc.length, insert: "changed" }], "reindent");

		assert.deepStrictEqual(outcome, { where: "view" });
		assert.strictEqual(host.state.doc.toString(), "changed");
		assert.strictEqual(host.lastUserEvent, "reindent");
	});

	it("goes through the parked state otherwise and returns the new text", () => {
		const host = fakeHost();
		const s = states(host);
		s.show("a", "A: 1");
		s.show("b", "B: 2");

		const outcome = s.change("a", () => [{ from: 0, insert: "\t" }]);

		assert.deepStrictEqual(outcome, { where: "parked", text: "\tA: 1" });
		assert.strictEqual(host.state.doc.toString(), "B: 2");
		s.show("a", "");
		assert.strictEqual(host.state.doc.toString(), "\tA: 1");
	});

	it("reports a document never shown", () => {
		const s = states(fakeHost());
		assert.deepStrictEqual(s.change("never", () => []), { where: "none" });
	});
});

describe("DocumentStates.drop", () => {
	it("forgets the shown document and its parked state alike", () => {
		const host = fakeHost();
		const s = states(host);
		s.show("a", "A: 1");
		s.show("b", "B: 2");

		s.drop("b");
		assert.strictEqual(s.shownId(), null);
		assert.strictEqual(s.syncText("b", "gone"), false, "nothing is attributed to it any more");

		s.drop("a");
		s.show("a", "fresh");
		assert.strictEqual(host.state.doc.toString(), "fresh", "a dropped document comes back from its text");
	});
});
