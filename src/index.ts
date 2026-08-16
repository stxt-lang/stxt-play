import { Diagnostic as CmDiagnostic, setDiagnostics } from "@codemirror/lint";
import { ChangeSpec, EditorState, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Analyzer, applyIndentChanges, Diagnostic, DocumentAnalysis, IndentChange, SPACES_UNIT, TAB_UNIT } from "./analysis";
import { setTokensEffect } from "./editor/highlight";
import { createStxtEditor } from "./editor/stxtEditor";
import { SEED_DOCUMENTS } from "./seed";
import { createDocumentList, DocumentListEntry, DocumentListKind } from "./ui/documentList";
import { createProblemsPanel } from "./ui/problemsPanel";
import {
	decodeOpen,
	decodeShare,
	encodeShare,
	IndentMode,
	isOpenLink,
	KeyValueStorage,
	loadSettings,
	loadWorkspace,
	PlaygroundSettings,
	saveSettings,
	saveWorkspace,
	SHARE_PARAM,
	sharePayloadOf,
	Workspace,
	WorkspaceDocument,
	WorkspaceSnapshot,
} from "./workspace";

/**
 * Entry point of the playground (phase 6: seed content, reset, share links, finish).
 *
 * The wiring keeps a single flow of data: the workspace model is the source of truth for the
 * documents, the analyzer mirrors it (one cached parse per document), and everything visible —
 * highlighting, underlines, the problems panel, the document list, the header — reads from the
 * analysis. The editor shows one document at a time; every workspace document keeps its own
 * CodeMirror state, so switching preserves undo history and selection. The two header switches
 * — indentation mode and validation on/off — are settings, persisted apart from the workspace.
 */

/** How long after the last change the workspace is written to localStorage. */
const PERSIST_DELAY_MS = 300;

/** How long a status message stays on screen. */
const STATUS_MS = 2500;

/** How a document presents itself in the list and the header. */
interface DocumentLabel {
	label: string;
	kind: DocumentListKind;
	renamable: boolean;
}

/** Maps re-indentation changes (0-based line and columns) to CodeMirror change specs. */
function toCmChanges(doc: Text, changes: IndentChange[]): ChangeSpec[] {
	return changes.map((change) => {
		const line = doc.line(change.line + 1);
		return { from: line.from + change.from, to: line.from + change.to, insert: change.insert };
	});
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
	const indentTabs = document.getElementById("indent-tabs");
	const indentSpaces = document.getElementById("indent-spaces");
	const validationToggle = document.getElementById("validation-toggle");
	const docReset = document.getElementById("doc-reset");
	const shareButton = document.getElementById("share");
	const status = document.getElementById("status");
	if (!editorHost || !docTitle || !docList || !docNew || !problemsList || !problemsCount
		|| !indentTabs || !indentSpaces || !validationToggle || !docReset || !shareButton || !status) {
		return;
	}

	// --- Status messages ----------------------------------------------------------------------

	let statusTimer: number | undefined;
	const showStatus = (message: string): void => {
		status.textContent = message;
		status.classList.add("status-visible");
		if (statusTimer !== undefined) {
			window.clearTimeout(statusTimer);
		}
		statusTimer = window.setTimeout(() => status.classList.remove("status-visible"), STATUS_MS);
	};

	const analyzer = new Analyzer();
	const workspace = new Workspace();
	const storage = browserStorage();
	const settings: PlaygroundSettings = storage ? loadSettings(storage) : { indent: "tabs", validation: true };
	analyzer.setValidation(settings.validation);

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
		indent: settings.indent,
		onDocChanged: (view) => {
			if (shownId !== null) {
				workspace.setText(shownId, view.state.doc.toString());
			}
		},
		completions: (line, linePrefix) => (shownId === null ? null : analyzer.getCompletions(shownId, line, linePrefix)),
		describeNode: (line) => (shownId === null ? undefined : analyzer.describeNode(shownId, line)),
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
		onMove: (id, toIndex) => workspace.move(id, toIndex),
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
		editor.showState(state);
		refreshView();
	};

	// --- Header switches ----------------------------------------------------------------------

	const renderSwitches = (): void => {
		indentTabs.setAttribute("aria-pressed", String(settings.indent === "tabs"));
		indentSpaces.setAttribute("aria-pressed", String(settings.indent === "spaces"));
		validationToggle.setAttribute("aria-checked", String(settings.validation));
	};

	const persistSettings = (): void => {
		if (storage) {
			saveSettings(storage, settings);
		}
	};

	/**
	 * Re-indents every document of the workspace to the unit of a mode. Only structural
	 * indentation changes (see `analysis/reindent.ts`); comments and block content stay as they
	 * are. The document in the view goes through a transaction, parked documents through their
	 * own state, so the change is undoable everywhere; documents never shown are rewritten in
	 * the model.
	 */
	const reindentAll = (mode: IndentMode): void => {
		const unit = mode === "tabs" ? TAB_UNIT : SPACES_UNIT;
		for (const document of workspace.getDocuments()) {
			const changes = analyzer.getIndentChanges(document.id, unit);
			if (changes.length === 0) {
				continue;
			}
			if (document.id === shownId) {
				// The update listener pushes the new text into the workspace
				view.dispatch({ changes: toCmChanges(view.state.doc, changes), userEvent: "reindent" });
				continue;
			}
			const parked = states.get(document.id);
			if (parked) {
				const next = parked.update({ changes: toCmChanges(parked.doc, changes), userEvent: "reindent" }).state;
				states.set(document.id, next);
				workspace.setText(document.id, next.doc.toString());
			} else {
				workspace.setText(document.id, applyIndentChanges(document.text, changes));
			}
		}
	};

	/** Changes what Tab inserts from now on, and re-indents the workspace to match. */
	const setIndent = (mode: IndentMode): void => {
		if (settings.indent !== mode) {
			settings.indent = mode;
			editor.setIndentMode(mode);
			reindentAll(mode);
			renderSwitches();
			persistSettings();
		}
		view.focus();
	};
	indentTabs.addEventListener("click", () => setIndent("tabs"));
	indentSpaces.addEventListener("click", () => setIndent("spaces"));

	/** Switches schema validation on or off for the whole workspace and repaints everything. */
	validationToggle.addEventListener("click", () => {
		settings.validation = !settings.validation;
		analyzer.setValidation(settings.validation);
		refreshView();
		renderPanel();
		renderList();
		renderSwitches();
		persistSettings();
		view.focus();
	});
	renderSwitches();

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
			case "moved":
				renderList();
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

	// --- Seed and reset -----------------------------------------------------------------------

	/** Replaces every document with the seed and activates the first one. */
	const loadSeed = (): void => {
		for (const document of workspace.getDocuments()) {
			workspace.removeDocument(document.id);
		}
		for (const seed of SEED_DOCUMENTS) {
			workspace.addDocument(seed.text, seed.title);
		}
		const first = workspace.getDocuments()[0];
		if (first) {
			workspace.setActive(first.id);
		}
	};

	docReset.addEventListener("click", () => {
		if (window.confirm("Reset the workspace? Every document is replaced by the examples. This cannot be undone.")) {
			loadSeed();
			showStatus("Workspace reset to the examples.");
			view.focus();
		}
	});

	// --- Share links --------------------------------------------------------------------------

	shareButton.addEventListener("click", () => {
		void encodeShare(workspace.toSnapshot()).then(async (payload) => {
			const url = `${location.origin}${location.pathname}#${SHARE_PARAM}=${payload}`;
			try {
				await navigator.clipboard.writeText(url);
				showStatus("Link copied to the clipboard.");
			} catch {
				// No clipboard (insecure context, permissions): hand the link over the old way
				window.prompt("Copy this link:", url);
			}
		});
	});

	/** Loads a snapshot that came in a share link, with fresh ids so it cannot collide with local ones. */
	const loadShared = (snapshot: WorkspaceSnapshot): void => {
		for (const document of workspace.getDocuments()) {
			workspace.removeDocument(document.id);
		}
		let activeId: string | undefined;
		for (const document of snapshot.documents) {
			const added = workspace.addDocument(document.text, document.title);
			if (document.id === snapshot.active) {
				activeId = added.id;
			}
		}
		const first = workspace.getDocuments()[0];
		workspace.setActive(activeId ?? first?.id ?? "");
	};

	// --- Start: a share link, the stored workspace, or the seed ------------------------------

	const stored = storage ? loadWorkspace(storage) : undefined;
	if (stored && stored.documents.length > 0) {
		workspace.load(stored);
	} else {
		loadSeed();
	}

	/** Forgets the fragment: a link is consumed once, so a reload must not act on it again. */
	const consumeFragment = (): void => {
		history.replaceState(null, "", `${location.pathname}${location.search}`);
	};

	/** First title among "title", "title (2)", "title (3)"… not taken by any document. */
	const freeTitle = (title: string): string => {
		const titles = new Set(workspace.getDocuments().map((document) => document.title));
		let candidate = title;
		for (let n = 2; titles.has(candidate); n++) {
			candidate = `${title} (${n})`;
		}
		return candidate;
	};

	/**
	 * Adds a document that came in an open link and selects it. Nothing is replaced and nothing
	 * is asked: the link carries one document, not a workspace. If the same text is already in
	 * the workspace, that document is selected instead, so opening a link twice does not
	 * duplicate it.
	 */
	const openLinked = (text: string, title: string | undefined): void => {
		const existing = workspace.getDocuments().find((document) => document.text === text);
		if (existing) {
			workspace.setActive(existing.id);
			showStatus("The document of the link was already in the workspace.");
			return;
		}
		const added = workspace.addDocument(text, title ? freeTitle(title) : undefined);
		workspace.setActive(added.id);
		showStatus("Document opened from the link.");
	};

	/**
	 * Acts on the fragment of the current URL: a share link (`#w=`) or an open link (`#d=`).
	 * Runs at start and again on every `hashchange`, because a page that reuses this tab
	 * (the "Open in the playground" links of stxt.dev share a window name) only changes the
	 * fragment, and the browser does not reload on that. `consumeFragment` uses
	 * `replaceState`, which fires no `hashchange`, so there is no loop.
	 *
	 * @param ownContent whether the workspace holds the user's own documents (as opposed to the
	 * seed): a share link then asks before replacing them.
	 */
	const handleFragment = (ownContent: boolean): void => {
		const payload = sharePayloadOf(location.hash);
		if (payload) {
			void decodeShare(payload).then((shared) => {
				consumeFragment();
				if (!shared || shared.documents.length === 0) {
					showStatus("The link does not carry a valid workspace.");
					return;
				}
				const replace = !ownContent || window.confirm(
					"This link carries a workspace. Load it? Your current documents in this browser are replaced.");
				if (replace) {
					loadShared(shared);
					showStatus("Shared workspace loaded.");
				}
			});
		} else if (isOpenLink(location.hash)) {
			void decodeOpen(location.hash).then((linked) => {
				consumeFragment();
				if (!linked) {
					showStatus("The link does not carry a valid document.");
					return;
				}
				openLinked(linked.text, linked.title);
			});
		}
	};

	handleFragment(stored !== undefined);
	// Once running, whatever is in the workspace is the user's: a later share link always asks
	window.addEventListener("hashchange", () => handleFragment(true));
}

document.addEventListener("DOMContentLoaded", main);
