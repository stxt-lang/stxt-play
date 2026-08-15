import { GrammarKind } from "../analysis";

/** What kind of entry a list row is: a plain document, or one of the two grammar kinds. */
export type DocumentListKind = "document" | GrammarKind;

/** One row of the document list, as the app computes it from the workspace and the analysis. */
export interface DocumentListEntry {
	/** Identifier of the workspace document. */
	id: string;
	/** Text shown: the title for documents, the namespace(s) for grammars. */
	label: string;
	/** Drives the look of the row: grammars look different from documents. */
	kind: DocumentListKind;
	/** Whether this is the document in the editor. */
	active: boolean;
	/** Whether the user may rename it. Grammars are identified by their namespace, so no. */
	renamable: boolean;
	/** Number of error diagnostics of the document. */
	errors: number;
	/** Number of warning diagnostics of the document. */
	warnings: number;
}

/** What the list asks the app to do. The list itself changes nothing. */
export interface DocumentListHandlers {
	/** The user picked a row. */
	onSelect(id: string): void;
	/** The user pressed the "new document" button. */
	onCreate(): void;
	/** The user finished an inline rename with a new title. */
	onRename(id: string, title: string): void;
	/** The user asked to delete a row (the app confirms). */
	onDelete(id: string): void;
}

/** The document list of the sidebar. */
export interface DocumentList {
	/** Replaces the rows with the given entries, in their order. */
	render(entries: DocumentListEntry[]): void;
	/** Starts an inline rename of a row, if it is renamable. */
	startRename(id: string): void;
}

/** Text of the kind badge of a row. */
const KIND_BADGE: Record<DocumentListKind, string> = {
	document: "≡",
	schema: "S",
	template: "T",
};

/** Tooltip of the kind badge of a row. */
const KIND_TITLE: Record<DocumentListKind, string> = {
	document: "Document",
	schema: "Schema — identified by its namespace",
	template: "Template — identified by its namespace",
};

/**
 * Creates the document list inside its `<ul>` and wires the "new document" button.
 *
 * Plain DOM, like the problems panel. Rows are focusable: Enter or Space selects, F2 renames,
 * Delete asks for deletion; double-click on the label renames too. The list keeps only one piece
 * of state of its own — which row is being renamed — so re-rendering while the user types a new
 * title keeps the input in place.
 *
 * @param list element the rows are rendered into.
 * @param newButton the "new document" button.
 * @param handlers what to call back on user actions.
 */
export function createDocumentList(
	list: HTMLElement,
	newButton: HTMLElement,
	handlers: DocumentListHandlers
): DocumentList {
	let entries: DocumentListEntry[] = [];
	let renaming: string | null = null;

	newButton.addEventListener("click", () => handlers.onCreate());

	const render = (): void => {
		list.textContent = "";
		for (const entry of entries) {
			list.appendChild(renaming === entry.id ? renderRenameRow(entry) : renderRow(entry));
		}
	};

	const startRename = (id: string): void => {
		const entry = entries.find((e) => e.id === id);
		if (!entry || !entry.renamable) {
			return;
		}
		renaming = id;
		render();
		const input = list.querySelector<HTMLInputElement>("input.doc-rename");
		if (input) {
			input.focus();
			input.select();
		}
	};

	const finishRename = (entry: DocumentListEntry, title: string | null): void => {
		if (renaming !== entry.id) {
			return;
		}
		renaming = null;
		if (title !== null && title.trim().length > 0 && title.trim() !== entry.label) {
			handlers.onRename(entry.id, title.trim());
		} else {
			render();
		}
	};

	const renderRow = (entry: DocumentListEntry): HTMLElement => {
		const row = document.createElement("li");
		row.className = `doc doc-${entry.kind}${entry.active ? " doc-active" : ""}`;
		row.tabIndex = 0;
		row.setAttribute("role", "option");
		row.setAttribute("aria-selected", String(entry.active));
		row.dataset.id = entry.id;

		const badge = document.createElement("span");
		badge.className = "doc-kind";
		badge.textContent = KIND_BADGE[entry.kind];
		badge.title = KIND_TITLE[entry.kind];

		const label = document.createElement("span");
		label.className = "doc-label";
		label.textContent = entry.label;
		label.title = entry.renamable ? `${entry.label} — double-click to rename` : entry.label;

		const problems = document.createElement("span");
		problems.className = "doc-problems";
		if (entry.errors > 0) {
			problems.appendChild(problemCount("error", entry.errors));
		}
		if (entry.warnings > 0) {
			problems.appendChild(problemCount("warning", entry.warnings));
		}

		const remove = document.createElement("button");
		remove.type = "button";
		remove.className = "doc-delete";
		remove.title = "Delete document";
		remove.setAttribute("aria-label", `Delete ${entry.label}`);
		remove.textContent = "×";
		remove.addEventListener("click", (event) => {
			event.stopPropagation();
			handlers.onDelete(entry.id);
		});

		row.append(badge, label, problems, remove);

		row.addEventListener("click", () => handlers.onSelect(entry.id));
		if (entry.renamable) {
			label.addEventListener("dblclick", (event) => {
				event.stopPropagation();
				startRename(entry.id);
			});
		}
		row.addEventListener("keydown", (event) => {
			switch (event.key) {
				case "Enter":
				case " ":
					event.preventDefault();
					handlers.onSelect(entry.id);
					break;
				case "F2":
					event.preventDefault();
					startRename(entry.id);
					break;
				case "Delete":
					event.preventDefault();
					handlers.onDelete(entry.id);
					break;
			}
		});
		return row;
	};

	const renderRenameRow = (entry: DocumentListEntry): HTMLElement => {
		const row = document.createElement("li");
		row.className = `doc doc-${entry.kind} doc-renaming${entry.active ? " doc-active" : ""}`;
		row.dataset.id = entry.id;

		const badge = document.createElement("span");
		badge.className = "doc-kind";
		badge.textContent = KIND_BADGE[entry.kind];

		const input = document.createElement("input");
		input.type = "text";
		input.className = "doc-rename";
		input.value = entry.label;
		input.setAttribute("aria-label", "New title");
		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				finishRename(entry, input.value);
			} else if (event.key === "Escape") {
				event.preventDefault();
				finishRename(entry, null);
			}
		});
		input.addEventListener("blur", () => finishRename(entry, input.value));

		row.append(badge, input);
		return row;
	};

	const problemCount = (severity: "error" | "warning", count: number): HTMLElement => {
		const span = document.createElement("span");
		span.className = `doc-count doc-count-${severity}`;
		span.textContent = String(count);
		span.title = `${count} ${severity}${count === 1 ? "" : "s"}`;
		return span;
	};

	return {
		render(next: DocumentListEntry[]): void {
			entries = next;
			if (renaming !== null && !entries.some((e) => e.id === renaming)) {
				renaming = null;
			}
			render();
		},
		startRename,
	};
}
