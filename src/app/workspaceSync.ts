import { Analyzer } from "../analysis";
import { DocumentStates } from "../editor/documentStates";
import { Workspace, WorkspaceEvent } from "../workspace";

/** What the application repaints. Each one reads the workspace and the analysis as they are. */
export interface Painters {
	/** The document list. */
	list(): void;
	/** The problems panel. */
	panel(): void;
	/** The header: the label of the active document. */
	header(): void;
	/** The editor view: highlighting and underlines of the document in it. */
	view(): void;
}

/**
 * The single flow of data of the playground: the workspace is the source of truth for the
 * documents, and every event it emits is carried to the analyzer (one cached parse per
 * document), to the editor states, and to whatever is visible. Nothing here touches the DOM:
 * the painters do, and the tests count them.
 */
export class WorkspaceSync {
	/**
	 * @param workspace the model.
	 * @param analyzer mirrors the model, one analysis per document.
	 * @param states the editor states of the documents.
	 * @param paint what to repaint after each event.
	 */
	constructor(
		private readonly workspace: Workspace,
		private readonly analyzer: Analyzer,
		private readonly states: DocumentStates,
		private readonly paint: Painters,
	) {}

	/**
	 * Subscribes to the workspace.
	 *
	 * @returns a function that unsubscribes.
	 */
	attach(): () => void {
		return this.workspace.subscribe((event) => this.handle(event));
	}

	/**
	 * Carries one workspace event to the analyzer, the states and the painters.
	 *
	 * @param event what changed.
	 */
	handle(event: WorkspaceEvent): void {
		switch (event.kind) {
			case "added": {
				const document = this.workspace.getDocument(event.id);
				if (document) {
					this.analyzer.setDocument(event.id, document.text);
				}
				this.paint.list();
				break;
			}
			case "removed":
				this.analyzer.removeDocument(event.id);
				this.states.drop(event.id);
				this.paint.list();
				this.paint.panel();
				this.paint.header();
				break;
			case "text": {
				const document = this.workspace.getDocument(event.id);
				if (document) {
					this.analyzer.setDocument(event.id, document.text);
					this.states.syncText(event.id, document.text);
				}
				// A change may turn a document into a grammar or back, and a grammar change
				// re-validates the whole workspace: the view (a parked grammar replaced by a
				// link changes the underlines of the document on screen), the list and the
				// header may all change
				this.paint.view();
				this.paint.panel();
				this.paint.list();
				this.paint.header();
				break;
			}
			case "renamed":
				this.paint.list();
				this.paint.header();
				break;
			case "moved":
				this.paint.list();
				break;
			case "activated": {
				const document = this.workspace.getDocument(event.id);
				if (document) {
					this.states.show(event.id, document.text);
					this.paint.view();
				}
				this.paint.panel();
				this.paint.list();
				this.paint.header();
				break;
			}
		}
	}
}
