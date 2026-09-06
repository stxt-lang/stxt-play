import { setDiagnostics } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { Analyzer, DocumentAnalysis } from "../analysis";
import { DocumentStates } from "../editor/documentStates";
import { setTokensEffect } from "../editor/highlight";
import { createStxtEditor, StxtEditor } from "../editor/stxtEditor";
import { SEED_DOCUMENTS } from "../seed";
import { confirmDialog, linkDialog } from "../ui/dialog";
import { createDocumentList, DocumentList, DocumentListEntry } from "../ui/documentList";
import { setupHeaderSwitches } from "../ui/headerSwitches";
import { createProblemsPanel, ProblemsPanel } from "../ui/problemsPanel";
import { setupSplitter } from "../ui/splitter";
import { createViewTabs, ViewTabs } from "../ui/viewTabs";
import {
	createWorkspacePersistence,
	DEFAULT_SETTINGS,
	encodeShare,
	KeyValueStorage,
	loadSettings,
	loadWorkspace,
	PlaygroundSettings,
	saveSettings,
	SHARE_PARAM,
	Workspace,
} from "../workspace";
import { lineAt, toCmDiagnostics } from "./diagnostics";
import { findElements, PlaygroundElements } from "./elements";
import { applyLink, FragmentDialogs, linkOf } from "./fragment";
import { labelOf } from "./labels";
import { createStatus, ShowStatus } from "./status";
import { WorkspaceSync } from "./workspaceSync";

/**
 * The playground application: the composition root that puts the layers together on the page.
 *
 * The wiring keeps a single flow of data: the workspace model is the source of truth for the
 * documents, the analyzer mirrors it (one cached parse per document), and everything visible —
 * highlighting, underlines, the problems panel, the document list, the header — reads from the
 * analysis ({@link WorkspaceSync} carries each workspace event there). The editor shows one
 * document at a time; every workspace document keeps its own CodeMirror state
 * ({@link DocumentStates}), so switching preserves undo history and selection. The two header
 * switches — indentation mode and validation on/off — and the width of the document list are
 * settings, persisted apart from the workspace.
 *
 * What is decided here is only what needs the page: which dialog asks what, which element is
 * repainted with which data, and which browser event triggers what. The decisions that need no
 * page live in the other modules of `src/app/`, with their tests.
 */
export class Playground {
	private readonly analyzer = new Analyzer();
	private readonly workspace = new Workspace();
	private readonly settings: PlaygroundSettings;
	private readonly showStatus: ShowStatus;
	private readonly editor: StxtEditor;
	private readonly states: DocumentStates;
	private readonly tabs: ViewTabs;
	private readonly panel: ProblemsPanel;
	private readonly list: DocumentList;
	private readonly persistNow: () => void;

	/** The questions a link may ask, as the playground's dialogs. */
	private readonly dialogs: FragmentDialogs = {
		loadSharedWorkspace: (count) => confirmDialog({
			title: "Load the shared workspace?",
			message: `The link carries ${count} document${count === 1 ? "" : "s"}. `
				+ "Your current documents in this browser are replaced.",
			confirmLabel: "Load",
			cancelLabel: "Keep mine",
			danger: true,
		}),
		// A replacement overwrites a document of this browser, so it asks
		replaceGrammar: (namespace) => confirmDialog({
			title: "Replace the grammar?",
			message: `The link brings a grammar for '${namespace}', `
				+ "and the workspace already has a different one for that namespace.",
			confirmLabel: "Replace",
			cancelLabel: "Keep mine",
			danger: true,
		}),
	};

	/**
	 * Builds the application on the page: creates the editor and the panels, and wires them to
	 * the workspace. Nothing is loaded yet: {@link start} does that.
	 *
	 * @param elements the page elements.
	 * @param storage where the workspace and the settings persist; undefined when the browser
	 * gives none.
	 */
	constructor(
		private readonly elements: PlaygroundElements,
		private readonly storage: KeyValueStorage | undefined,
	) {
		this.settings = storage ? loadSettings(storage) : { ...DEFAULT_SETTINGS };
		this.analyzer.setValidation(this.settings.validation);
		this.showStatus = createStatus(elements.status);

		// --- Editor: one view, one state per document ---------------------------------------

		this.editor = createStxtEditor({
			parent: elements.editor,
			indent: this.settings.indent,
			onDocChanged: (view) => {
				const shown = this.states.shownId();
				if (shown !== null) {
					this.workspace.setText(shown, view.state.doc.toString());
				}
			},
			completions: (line, linePrefix) => {
				const shown = this.states.shownId();
				return shown === null ? null : this.analyzer.getCompletions(shown, line, linePrefix);
			},
			describeNode: (line) => {
				const shown = this.states.shownId();
				return shown === null ? undefined : this.analyzer.describeNode(shown, line);
			},
			goToDefinition: (line, character) => this.goToDefinition(line, character),
		});
		const view = this.editor.view;
		this.states = new DocumentStates(
			{
				get state() {
					return view.state;
				},
				setState: (state) => this.editor.showState(state),
				dispatch: (spec) => view.dispatch(spec),
			},
			(text) => this.editor.createState(text),
		);

		// --- Panels ---------------------------------------------------------------------------

		// Narrow screens show one pane at a time: picking a document or a problem lands in the editor
		this.tabs = createViewTabs(elements.viewTabs, (shown) => {
			if (shown === "editor") {
				view.requestMeasure();
			}
		});

		this.panel = createProblemsPanel(elements.problemsList, elements.problemsCount, (line) => {
			this.showEditorPane();
			this.goToLine(line);
		});

		this.list = createDocumentList(elements.docList, elements.docNew, {
			onSelect: (id) => {
				this.workspace.setActive(id);
				this.showEditorPane();
				view.focus();
			},
			onCreate: () => {
				this.workspace.addDocument();
				this.showEditorPane();
				view.focus();
			},
			onRename: (id, title) => this.workspace.rename(id, title),
			onDelete: (id) => this.confirmDelete(id),
			onMove: (id, toIndex) => this.workspace.move(id, toIndex),
		});

		setupSplitter({
			handle: elements.splitter,
			sidebar: elements.sidebar,
			width: this.settings.sidebarWidth,
			onWidthChange: (width) => {
				if (width === undefined) {
					delete this.settings.sidebarWidth;
				} else {
					this.settings.sidebarWidth = width;
				}
				this.persistSettings();
				view.requestMeasure();
			},
		});

		setupHeaderSwitches({
			elements: {
				indentTabs: elements.indentTabs,
				indentSpaces: elements.indentSpaces,
				validationToggle: elements.validationToggle,
			},
			settings: this.settings,
			workspace: this.workspace,
			analyzer: this.analyzer,
			editor: this.editor,
			states: this.states,
			persistSettings: () => this.persistSettings(),
			refreshAfterValidation: () => {
				this.paintView();
				this.paintPanel();
				this.paintList();
			},
		});

		// --- Wiring: the workspace drives everything ------------------------------------------

		new WorkspaceSync(this.workspace, this.analyzer, this.states, {
			list: () => this.paintList(),
			panel: () => this.paintPanel(),
			header: () => this.paintHeader(),
			view: () => this.paintView(),
		}).attach();

		// Persistence: debounced after every change, immediate when the page goes away
		const persistence = createWorkspacePersistence(this.workspace, storage);
		this.persistNow = persistence.persistNow;
		this.workspace.subscribe(() => persistence.schedulePersist());

		elements.docReset.addEventListener("click", () => this.confirmReset());
		elements.docClear.addEventListener("click", () => this.confirmClear());
		elements.share.addEventListener("click", () => this.share());
	}

	/** Loads the workspace — a share link, the stored one, or the seed — and starts listening. */
	start(): void {
		window.addEventListener("pagehide", this.persistNow);
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") {
				this.persistNow();
			}
		});

		const stored = this.storage ? loadWorkspace(this.storage) : undefined;
		if (stored && stored.documents.length > 0) {
			this.workspace.load(stored);
		} else {
			this.loadSeed();
		}

		void this.handleFragment(stored !== undefined);
		// Once running, whatever is in the workspace is the user's: a later share link always asks
		window.addEventListener("hashchange", () => void this.handleFragment(true));
	}

	// --- Painting: everything visible reads the workspace and the analysis --------------------

	private get view(): EditorView {
		return this.editor.view;
	}

	private activeAnalysis(): DocumentAnalysis | undefined {
		const id = this.workspace.getActiveId();
		return id === null ? undefined : this.analyzer.getAnalysis(id);
	}

	private paintHeader(): void {
		const active = this.workspace.getActiveDocument();
		this.elements.docTitle.textContent = active ? labelOf(active, this.analyzer.getAnalysis(active.id)).label : "";
	}

	private paintList(): void {
		const activeId = this.workspace.getActiveId();
		const entries: DocumentListEntry[] = this.workspace.getDocuments().map((document) => {
			const analysis = this.analyzer.getAnalysis(document.id);
			const diagnostics = analysis?.diagnostics ?? [];
			return {
				id: document.id,
				...labelOf(document, analysis),
				active: document.id === activeId,
				errors: diagnostics.filter((d) => d.severity === "error").length,
				warnings: diagnostics.filter((d) => d.severity === "warning").length,
			};
		});
		this.list.render(entries);
	}

	private paintPanel(): void {
		const diagnostics = this.activeAnalysis()?.diagnostics ?? [];
		this.panel.render(diagnostics);
		this.tabs.setProblemCount(diagnostics.length);
	}

	/** Pushes the analysis of the shown document into the view: highlighting and underlines. */
	private paintView(): void {
		const analysis = this.activeAnalysis();
		if (!analysis) {
			return;
		}
		// One transaction carries both the fresh diagnostics and the fresh highlighting.
		// It changes no text, so it does not re-trigger the analysis.
		this.view.dispatch(setDiagnostics(this.view.state, toCmDiagnostics(this.view.state.doc, analysis.diagnostics)), {
			effects: setTokensEffect.of(analysis.tokens),
		});
	}

	// --- Navigation -----------------------------------------------------------------------------

	private showEditorPane(): void {
		if (this.tabs.isActive()) {
			this.tabs.show("editor");
		}
	}

	private goToLine(line: number): void {
		this.view.dispatch({ selection: { anchor: lineAt(this.view.state.doc, line).from }, scrollIntoView: true });
		this.view.focus();
	}

	/**
	 * "Go to definition" from a position of the shown document: the analysis says which
	 * workspace document and line define the node; activating that document puts it in the view
	 * (through the workspace event), and then the cursor goes to the line.
	 */
	private goToDefinition(line: number, character: number): boolean {
		const shown = this.states.shownId();
		const location = shown === null ? undefined : this.analyzer.findDefinition(shown, line, character);
		if (!location) {
			return false;
		}
		this.workspace.setActive(location.documentId);
		if (this.states.shownId() !== location.documentId) {
			return false;
		}
		this.goToLine(location.line);
		return true;
	}

	// --- Actions with confirmation --------------------------------------------------------------

	private confirmDelete(id: string): void {
		const doc = this.workspace.getDocument(id);
		if (!doc) {
			return;
		}
		const { label } = labelOf(doc, this.analyzer.getAnalysis(id));
		void confirmDialog({
			title: `Delete "${label}"?`,
			message: "The document is removed from the workspace. This cannot be undone.",
			confirmLabel: "Delete",
			danger: true,
		}).then((confirmed) => {
			if (!confirmed || !this.workspace.getDocument(id)) {
				return;
			}
			this.workspace.removeDocument(id);
			if (this.workspace.getDocuments().length === 0) {
				// The playground always has something to edit
				this.workspace.addDocument();
			}
		});
	}

	private confirmReset(): void {
		void confirmDialog({
			title: "Reset the workspace?",
			message: "Every document is replaced by the examples. This cannot be undone.",
			confirmLabel: "Reset",
			danger: true,
		}).then((confirmed) => {
			if (confirmed) {
				this.loadSeed();
				this.showStatus("Workspace reset to the examples.");
				this.view.focus();
			}
		});
	}

	private confirmClear(): void {
		void confirmDialog({
			title: "Clear the workspace?",
			message: "Every document is removed and you start from an empty one. This cannot be undone.",
			confirmLabel: "Clear",
			danger: true,
		}).then((confirmed) => {
			if (confirmed) {
				// Every document goes, and a single empty one stays: the playground always has something to edit
				this.workspace.replaceAll([{}]);
				this.showStatus("Workspace cleared.");
				this.view.focus();
			}
		});
	}

	/** Replaces every document with the seed and activates the first one. */
	private loadSeed(): void {
		this.workspace.replaceAll(SEED_DOCUMENTS.map((seed) => ({ title: seed.title, text: seed.text })));
	}

	// --- Links --------------------------------------------------------------------------------

	private share(): void {
		void encodeShare(this.workspace.toSnapshot()).then(async (payload) => {
			const url = `${location.origin}${location.pathname}#${SHARE_PARAM}=${payload}`;
			try {
				await navigator.clipboard.writeText(url);
				this.showStatus("Link copied to the clipboard.");
			} catch {
				// No clipboard (insecure context, permissions): hand the link over in a dialog
				await linkDialog({
					title: "Share this workspace",
					message: "The link carries every document of the workspace. Copy it from here:",
					url,
				});
			}
		});
	}

	/**
	 * Acts on the fragment of the current URL: a share link (`#w=`) or an open link (`#d=`).
	 * Runs at start and again on every `hashchange`, because a page that reuses this tab
	 * (the "Open in the playground" links of stxt.dev share a window name) only changes the
	 * fragment, and the browser does not reload on that.
	 *
	 * @param ownContent whether the workspace holds the user's own documents (as opposed to the
	 * seed): a share link then asks before replacing them.
	 */
	private async handleFragment(ownContent: boolean): Promise<void> {
		const link = linkOf(location.hash);
		if (!link) {
			return;
		}
		// A link is consumed once, so a reload must not act on it again. `replaceState` fires no
		// `hashchange`, so there is no loop.
		history.replaceState(null, "", `${location.pathname}${location.search}`);
		const status = await applyLink(link, this.workspace, ownContent, this.dialogs);
		if (status !== undefined) {
			this.showStatus(status);
		}
	}

	private persistSettings(): void {
		if (this.storage) {
			saveSettings(this.storage, this.settings);
		}
	}
}

/** localStorage, or nothing when the browser refuses access (sandboxed frames, some private modes). */
function browserStorage(): KeyValueStorage | undefined {
	try {
		return window.localStorage;
	} catch {
		return undefined;
	}
}

/** Starts the playground on the current page, if the page is the playground's. */
export function startPlayground(): void {
	const elements = findElements(document);
	if (!elements) {
		return;
	}
	new Playground(elements, browserStorage()).start();
}
