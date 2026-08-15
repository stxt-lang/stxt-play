import { Diagnostic as CmDiagnostic, setDiagnostics } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Analyzer, Diagnostic, DocumentAnalysis } from "./analysis";
import { setTokensEffect } from "./editor/highlight";
import { createStxtEditor } from "./editor/stxtEditor";
import { SEED_DOCUMENTS } from "./seed";
import { createDocumentList, DocumentListEntry, DocumentListKind } from "./ui/documentList";
import { createProblemsPanel } from "./ui/problemsPanel";
import { KeyValueStorage, loadWorkspace, saveWorkspace, Workspace, WorkspaceDocument } from "./workspace";

/**
 * Entry point of the playground (phase 3: a workspace of documents).
 *
 * The wiring keeps a single flow of data: the workspace model is the source of truth for the
 * documents, the analyzer mirrors it (one cached parse per document), and everything visible —
 * highlighting, underlines, the problems panel, the document list, the header — reads from the
 * analysis. The editor shows one document at a time; every workspace document keeps its own
 * CodeMirror state, so switching preserves undo history and selection.
 */

/** How long after the last change the workspace is written to localStorage. */
const PERSIST_DELAY_MS = 300;

/** How a document presents itself in the list and the header. */
interface DocumentLabel {
	label: string;
	kind: DocumentListKind;
	renamable: boolean;
}

/** Maps analysis diagnostics (0-based lines) to CodeMirror diagnostics (whole-line ranges). */
function toCmDiagnostics(view: EditorView, diagnostics: Diagnostic[]): CmDiagnostic[] {
	const doc = view.state.doc;
	return diagnostics.map((diagnostic) => {
		const line = doc.line(Math.min(diagnostic.line + 1, doc.lines));
		return {
			from: line.from,
			to: line.to,
			severity: diagnostic.severity,
			message: `[${diagnostic.code}] ${diagnostic.message}`,
			source: diagnostic.source,
		};
	});
}

/**
 * Documents are labeled by their title; grammars, by the namespaces they define (a title makes no
 * sense for them: the namespace already is their name). A grammar whose namespace is still blank
 * falls back to its title so the row is never empty.
 */
function labelOf(document: WorkspaceDocument, analysis: DocumentAnalysis | undefined): DocumentLabel {
	const grammars = analysis?.grammars ?? [];
	if (grammars.length === 0) {
		return { label: document.title, kind: "document", renamable: true };
	}
	const namespaces = Array.from(new Set(grammars.map((g) => g.namespace).filter((ns) => ns.length > 0)));
	return {
		label: namespaces.length > 0 ? namespaces.join(", ") : document.title,
		kind: grammars[0].kind,
		renamable: false,
	};
}

/** localStorage, or nothing when the browser refuses access (sandboxed frames, some private modes). */
function browserStorage(): KeyValueStorage | undefined {
	try {
		return window.localStorage;
	} catch {
		return undefined;
	}
}

function main(): void {
	const editorHost = document.getElementById("editor");
	const docTitle = document.getElementById("doc-title");
	const docList = document.getElementById("doc-list");
	const docNew = document.getElementById("doc-new");
	const problemsList = document.getElementById("problems-list");
	const problemsCount = document.getElementById("problems-count");
	if (!editorHost || !docTitle || !docList || !docNew || !problemsList || !problemsCount) {
		return;
	}

	const analyzer = new Analyzer();
	const workspace = new Workspace();
	const storage = browserStorage();

	/** One editor state per workspace document. */
	const states = new Map<string, EditorState>();
	/** Identifier of the document currently in the view, if any. */
	let shownId: string | null = null;

	// --- Persistence -------------------------------------------------------------------------

	let persistTimer: number | undefined;
	const persistNow = (): void => {
		if (persistTimer !== undefined) {
			window.clearTimeout(persistTimer);
			persistTimer = undefined;
		}
		if (storage) {
			saveWorkspace(storage, workspace.toSnapshot());
		}
	};
	const schedulePersist = (): void => {
		if (!storage) {
			return;
		}
		if (persistTimer !== undefined) {
			window.clearTimeout(persistTimer);
		}
		persistTimer = window.setTimeout(persistNow, PERSIST_DELAY_MS);
	};
	window.addEventListener("pagehide", persistNow);
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") {
			persistNow();
		}
	});

	// --- Editor -------------------------------------------------------------------------------

	const editor = createStxtEditor({
		parent: editorHost,
		onDocChanged: (view) => {
			if (shownId !== null) {
				workspace.setText(shownId, view.state.doc.toString());
			}
		},
	});
	const view = editor.view;

	const goToLine = (line: number): void => {
		const docLine = view.state.doc.line(Math.min(line + 1, view.state.doc.lines));
		view.dispatch({ selection: { anchor: docLine.from }, scrollIntoView: true });
		view.focus();
	};

	// --- Rendering ----------------------------------------------------------------------------

	const panel = createProblemsPanel(problemsList, problemsCount, goToLine);

	const list = createDocumentList(docList, docNew, {
		onSelect: (id) => {
			workspace.setActive(id);
			view.focus();
		},
		onCreate: () => {
			workspace.addDocument();
			view.focus();
		},
		onRename: (id, title) => workspace.rename(id, title),
		onDelete: (id) => {
			const document = workspace.getDocument(id);
			if (!document) {
				return;
			}
			const { label } = labelOf(document, analyzer.getAnalysis(id));
			if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) {
				return;
			}
			workspace.removeDocument(id);
			if (workspace.getDocuments().length === 0) {
				// The playground always has something to edit
				workspace.addDocument();
			}
		},
	});

	const activeAnalysis = (): DocumentAnalysis | undefined => {
		const id = workspace.getActiveId();
		return id === null ? undefined : analyzer.getAnalysis(id);
	};

	const renderHeader = (): void => {
		const document = workspace.getActiveDocument();
		docTitle.textContent = document ? labelOf(document, analyzer.getAnalysis(document.id)).label : "";
	};

	const renderList = (): void => {
		const activeId = workspace.getActiveId();
		const entries: DocumentListEntry[] = workspace.getDocuments().map((document) => {
			const analysis = analyzer.getAnalysis(document.id);
			const diagnostics = analysis?.diagnostics ?? [];
			return {
				id: document.id,
				...labelOf(document, analysis),
				active: document.id === activeId,
				errors: diagnostics.filter((d) => d.severity === "error").length,
				warnings: diagnostics.filter((d) => d.severity === "warning").length,
			};
		});
		list.render(entries);
	};

	const renderPanel = (): void => {
		panel.render(activeAnalysis()?.diagnostics ?? []);
	};

	/** Pushes the analysis of the shown document into the view: highlighting and underlines. */
	const refreshView = (): void => {
		const analysis = activeAnalysis();
		if (!analysis) {
			return;
		}
		// One transaction carries both the fresh diagnostics and the fresh highlighting.
		// It changes no text, so it does not re-trigger the analysis.
		view.dispatch(setDiagnostics(view.state, toCmDiagnostics(view, analysis.diagnostics)), {
			effects: setTokensEffect.of(analysis.tokens),
		});
	};

	/** Puts a document in the view, parking the state of the one that was there. */
	const showDocument = (id: string): void => {
		if (shownId !== null && shownId !== id) {
			states.set(shownId, view.state);
		}
		const document = workspace.getDocument(id);
		if (!document) {
			return;
		}
		const state = states.get(id) ?? editor.createState(document.text);
		states.set(id, state);
		shownId = id;
		view.setState(state);
		refreshView();
	};

	// --- Wiring: the workspace drives everything ----------------------------------------------

	workspace.subscribe((event) => {
		switch (event.kind) {
			case "added": {
				const document = workspace.getDocument(event.id);
				if (document) {
					analyzer.setDocument(event.id, document.text);
				}
				renderList();
				break;
			}
			case "removed":
				analyzer.removeDocument(event.id);
				states.delete(event.id);
				if (shownId === event.id) {
					shownId = null;
				}
				renderList();
				renderPanel();
				renderHeader();
				break;
			case "text": {
				const document = workspace.getDocument(event.id);
				if (document) {
					analyzer.setDocument(event.id, document.text);
				}
				if (event.id === shownId) {
					refreshView();
				}
				// A change may turn a document into a grammar or back, and a grammar change
				// re-validates the whole workspace: the list and the header may all change
				renderPanel();
				renderList();
				renderHeader();
				break;
			}
			case "renamed":
				renderList();
				renderHeader();
				break;
			case "activated":
				showDocument(event.id);
				renderPanel();
				renderList();
				renderHeader();
				break;
		}
		schedulePersist();
	});

	// --- Start: the stored workspace, or the seed ---------------------------------------------

	const stored = storage ? loadWorkspace(storage) : undefined;
	if (stored && stored.documents.length > 0) {
		workspace.load(stored);
	} else {
		for (const seed of SEED_DOCUMENTS) {
			workspace.addDocument(seed.text, seed.title);
		}
		const first = workspace.getDocuments()[0];
		if (first) {
			workspace.setActive(first.id);
		}
	}
}

document.addEventListener("DOMContentLoaded", main);
