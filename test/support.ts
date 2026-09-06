import { EditorState, TransactionSpec } from "@codemirror/state";
import { DocumentStates, StateHost } from "../src/editor/documentStates";
import { KeyValueStorage } from "../src/workspace";

/** Deterministic ids: d1, d2, d3… */
export function sequentialIds(): () => string {
	let n = 0;
	return () => `d${++n}`;
}

/** In-memory stand-in for localStorage. */
export function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
	const data = new Map<string, string>();
	return {
		data,
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => void data.set(key, value),
		removeItem: (key) => void data.delete(key),
	};
}

/** A view stand-in: holds one state and counts what goes through it. */
export interface FakeHost extends StateHost {
	sets: number;
	dispatches: number;
	lastUserEvent?: string;
}

export function fakeHost(): FakeHost {
	let state = EditorState.create({ doc: "" });
	const host: FakeHost = {
		sets: 0,
		dispatches: 0,
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

/** Document states over a host, with bare CodeMirror states (no extensions). */
export function documentStates(host: StateHost): DocumentStates {
	return new DocumentStates(host, (text) => EditorState.create({ doc: text }));
}
