import { DocumentAnalysis } from "../analysis";
import { DocumentListKind } from "../ui/documentList";
import { WorkspaceDocument } from "../workspace";

/** How a document presents itself in the list and the header. */
export interface DocumentLabel {
	/** Text shown: the title for documents, the namespace(s) for grammars. */
	label: string;
	/** Drives the look: a plain document, a schema or a template. */
	kind: DocumentListKind;
	/** Whether the user may rename it. Grammars are identified by their namespace, so no. */
	renamable: boolean;
}

/**
 * Documents are labeled by their title; grammars, by the namespaces they define (a title makes no
 * sense for them: the namespace already is their name). A grammar whose namespace is still blank
 * falls back to its title so the row is never empty.
 *
 * @param document the workspace document.
 * @param analysis its analysis, if the analyzer has one.
 */
export function labelOf(document: WorkspaceDocument, analysis: DocumentAnalysis | undefined): DocumentLabel {
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
