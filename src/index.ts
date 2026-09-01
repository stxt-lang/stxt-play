import { Diagnostic as CmDiagnostic, setDiagnostics } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Analyzer, Diagnostic, DocumentAnalysis } from "./analysis";
import { setTokensEffect } from "./editor/highlight";
import { createStxtEditor } from "./editor/stxtEditor";
import { SEED_DOCUMENTS } from "./seed";
import { createDocumentList, DocumentListEntry, DocumentListKind } from "./ui/documentList";
import { confirmDialog, linkDialog } from "./ui/dialog";
import { setupHeaderSwitches } from "./ui/headerSwitches";
import { createProblemsPanel } from "./ui/problemsPanel";
import { setupSplitter } from "./ui/splitter";
import { createViewTabs } from "./ui/viewTabs";
import {
	createWorkspacePersistence,
	decodeOpen,
	decodeShare,
	DEFAULT_SETTINGS,
	encodeShare,
	isGrammarDocument,
	isOpenLink,
	KeyValueStorage,
	loadSettings,
	loadSharedSnapshot,
	loadWorkspace,
	openLinked,
	planGrammars,
	PlaygroundSettings,
	saveSettings,
	SHARE_PARAM,
	sharePayloadOf,
	Workspace,
	WorkspaceDocument,
} from "./workspace";

/**
 * Entry point of the playground.
 *
 * The wiring keeps a single flow of data: the workspace model is the source of truth for the
 * documents, the analyzer mirrors it (one cached parse per document), and everything visible —
 * highlighting, underlines, the problems panel, the document list, the header — reads from the
 * analysis. The editor shows one document at a time; every workspace document keeps its own
 * CodeMirror state, so switching preserves undo history and selection. The two header switches
 * — indentation mode and validation on/off — and the width of the document list are settings,
 * persisted apart from the workspace.
 */

/** How long a status message stays on screen. */
const STATUS_MS = 2500;

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
	const indentTabs = document.getElementById("indent-tabs");
	const indentSpaces = document.getElementById("indent-spaces");
	const validationToggle = document.getElementById("validation-toggle");
	const docReset = document.getElementById("doc-reset");
	const docClear = document.getElementById("doc-clear");
	const shareButton = document.getElementById("share");
	const status = document.getElementById("status");
	const viewTabsNav = document.getElementById("view-tabs");
	const sidebar = document.getElementById("sidebar");
	const splitter = document.getElementById("splitter");
	if (!editorHost || !docTitle || !docList || !docNew || !problemsList || !problemsCount
		|| !indentTabs || !indentSpaces || !validationToggle || !docReset || !docClear || !shareButton
		|| !status || !viewTabsNav || !sidebar || !splitter) {
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
	const settings: PlaygroundSettings = storage ? loadSettings(storage) : { ...DEFAULT_SETTINGS };
	analyzer.setValidation(settings.validation);

	/** One editor state per workspace document. */
	const states = new Map<string, EditorState>();
	/** Identifier of the document currently in the view, if any. */
	let shownId: string | null = null;

	// --- Persistence: debounced after every change, immediate when the page goes away --------

	const { persistNow, schedulePersist } = createWorkspacePersistence(workspace, storage);
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
		goToDefinition: (line, character) => goToDefinition(line, character),
	});
	const view = editor.view;

	const goToLine = (line: number): void => {
		const docLine = view.state.doc.line(Math.min(line + 1, view.state.doc.lines));
		view.dispatch({ selection: { anchor: docLine.from }, scrollIntoView: true });
		view.focus();
	};

	/**
	 * "Go to definition" from a position of the shown document: the analysis says which
	 * workspace document and line define the node; activating that document puts it in the view
	 * (through the workspace event), and then the cursor goes to the line.
	 */
	const goToDefinition = (line: number, character: number): boolean => {
		const location = shownId === null ? undefined : analyzer.findDefinition(shownId, line, character);
		if (!location) {
			return false;
		}
		workspace.setActive(location.documentId);
		if (shownId !== location.documentId) {
			return false;
		}
		goToLine(location.line);
		return true;
	};

	// --- Rendering ----------------------------------------------------------------------------

	// Narrow screens show one pane at a time: picking a document or a problem lands in the editor
	const tabs = createViewTabs(viewTabsNav, (shown) => {
		if (shown === "editor") {
			view.requestMeasure();
		}
	});
	const showEditor = (): void => {
		if (tabs.isActive()) {
			tabs.show("editor");
		}
	};

	const panel = createProblemsPanel(problemsList, problemsCount, (line) => {
		showEditor();
		goToLine(line);
	});

	const list = createDocumentList(docList, docNew, {
		onSelect: (id) => {
			workspace.setActive(id);
			showEditor();
			view.focus();
		},
		onCreate: () => {
			workspace.addDocument();
			showEditor();
			view.focus();
		},
		onRename: (id, title) => workspace.rename(id, title),
		onDelete: (id) => {
			const document = workspace.getDocument(id);
			if (!document) {
				return;
			}
			const { label } = labelOf(document, analyzer.getAnalysis(id));
			void confirmDialog({
				title: `Delete "${label}"?`,
				message: "The document is removed from the workspace. This cannot be undone.",
				confirmLabel: "Delete",
				danger: true,
			}).then((confirmed) => {
				if (!confirmed || !workspace.getDocument(id)) {
					return;
				}
				workspace.removeDocument(id);
				if (workspace.getDocuments().length === 0) {
					// The playground always has something to edit
					workspace.addDocument();
				}
			});
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
		const diagnostics = activeAnalysis()?.diagnostics ?? [];
		panel.render(diagnostics);
		tabs.setProblemCount(diagnostics.length);
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

	// --- Splitter: the divider between the document list and the editor -----------------------

	setupSplitter({
		handle: splitter,
		sidebar,
		width: settings.sidebarWidth,
		onWidthChange: (width) => {
			if (width === undefined) {
				delete settings.sidebarWidth;
			} else {
				settings.sidebarWidth = width;
			}
			if (storage) {
				saveSettings(storage, settings);
			}
			view.requestMeasure();
		},
	});

	// --- Header switches ----------------------------------------------------------------------

	setupHeaderSwitches({
		elements: { indentTabs, indentSpaces, validationToggle },
		settings,
		workspace,
		analyzer,
		editor,
		states,
		shownId: () => shownId,
		persistSettings: () => {
			if (storage) {
				saveSettings(storage, settings);
			}
		},
		refreshAfterValidation: () => {
			refreshView();
			renderPanel();
			renderList();
		},
	});

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

	// --- Seed, reset and clear ----------------------------------------------------------------

	/** Replaces every document with the seed and activates the first one. */
	const loadSeed = (): void => {
		workspace.replaceAll(SEED_DOCUMENTS.map((seed) => ({ title: seed.title, text: seed.text })));
	};

	docReset.addEventListener("click", () => {
		void confirmDialog({
			title: "Reset the workspace?",
			message: "Every document is replaced by the examples. This cannot be undone.",
			confirmLabel: "Reset",
			danger: true,
		}).then((confirmed) => {
			if (confirmed) {
				loadSeed();
				showStatus("Workspace reset to the examples.");
				view.focus();
			}
		});
	});

	/** Removes every document and leaves a single empty one: the playground always has something to edit. */
	const clearDocuments = (): void => {
		workspace.replaceAll([{}]);
	};

	docClear.addEventListener("click", () => {
		void confirmDialog({
			title: "Clear the workspace?",
			message: "Every document is removed and you start from an empty one. This cannot be undone.",
			confirmLabel: "Clear",
			danger: true,
		}).then((confirmed) => {
			if (confirmed) {
				clearDocuments();
				showStatus("Workspace cleared.");
				view.focus();
			}
		});
	});

	// --- Share links --------------------------------------------------------------------------

	shareButton.addEventListener("click", () => {
		void encodeShare(workspace.toSnapshot()).then(async (payload) => {
			const url = `${location.origin}${location.pathname}#${SHARE_PARAM}=${payload}`;
			try {
				await navigator.clipboard.writeText(url);
				showStatus("Link copied to the clipboard.");
			} catch {
				// No clipboard (insecure context, permissions): hand the link over in a dialog
				await linkDialog({
					title: "Share this workspace",
					message: "The link carries every document of the workspace. Copy it from here:",
					url,
				});
			}
		});
	});

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
			void decodeShare(payload).then(async (shared) => {
				consumeFragment();
				if (!shared || shared.documents.length === 0) {
					showStatus("The link does not carry a valid workspace.");
					return;
				}
				const replace = !ownContent || await confirmDialog({
					title: "Load the shared workspace?",
					message: `The link carries ${shared.documents.length} document${shared.documents.length === 1 ? "" : "s"}. `
						+ "Your current documents in this browser are replaced.",
					confirmLabel: "Load",
					cancelLabel: "Keep mine",
					danger: true,
				});
				if (replace) {
					loadSharedSnapshot(workspace, shared);
					showStatus("Shared workspace loaded.");
				}
			});
		} else if (isOpenLink(location.hash)) {
			void decodeOpen(location.hash).then(async (linked) => {
				consumeFragment();
				if (!linked) {
					showStatus("The link does not carry a valid document.");
					return;
				}

				// A replacement overwrites a document of this browser, so it asks
				const askReplace = (namespace: string): Promise<boolean> => confirmDialog({
					title: "Replace the grammar?",
					message: `The link brings a grammar for '${namespace}', `
						+ "and the workspace already has a different one for that namespace.",
					confirmLabel: "Replace",
					cancelLabel: "Keep mine",
					danger: true,
				});

				// The grammars come first, so the document handled last is the one left active;
				// an identical grammar is kept as it is
				const plan = planGrammars(workspace, linked.grammars ?? []);
				let grammars = 0;
				for (const grammar of plan.add) {
					workspace.addDocument(grammar.text, grammar.namespace);
					grammars++;
				}
				for (const { grammar, documentId } of plan.replace) {
					if (await askReplace(grammar.namespace)) {
						workspace.setText(documentId, grammar.text);
						grammars++;
					}
				}

				let base: string;
				if (isGrammarDocument(linked.text)) {
					// A grammar follows the one-definition-per-namespace rule instead of
					// entering as a plain document, and ends up selected either way
					const main = planGrammars(workspace, [linked.text]);
					if (main.add.length > 0) {
						workspace.addDocument(main.add[0].text, main.add[0].namespace);
						base = "Grammar opened from the link.";
					} else if (main.keep.length > 0) {
						workspace.setActive(main.keep[0].documentId);
						base = "The grammar of the link was already in the workspace.";
					} else {
						const { grammar, documentId } = main.replace[0];
						const replace = await askReplace(grammar.namespace);
						if (replace) {
							workspace.setText(documentId, grammar.text);
						}
						workspace.setActive(documentId);
						base = replace ? "Grammar replaced from the link." : "Your grammar was kept.";
					}
				} else {
					const outcome = openLinked(workspace, linked.text, linked.title);
					base = outcome === "existing"
						? "The document of the link was already in the workspace."
						: "Document opened from the link.";
				}
				showStatus(grammars === 0 ? base
					: `${base} The link also brought ${grammars} grammar${grammars === 1 ? "" : "s"}.`);
			});
		}
	};

	handleFragment(stored !== undefined);
	// Once running, whatever is in the workspace is the user's: a later share link always asks
	window.addEventListener("hashchange", () => handleFragment(true));
}

document.addEventListener("DOMContentLoaded", main);
