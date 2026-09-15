import { Analyzer } from "../analysis";
import { encodeOpen, Workspace } from "../workspace";

/** An open link for one document of the workspace, ready to put after the `#` of the URL. */
export interface DocumentLink {
	/** The fragment, without the leading `#`: `d=<payload>`, `&t=<title>` and one `&g=` per grammar. */
	fragment: string;
	/** How many grammars travel with the document. */
	grammars: number;
}

/**
 * Builds the link that shares one document without the rest of the workspace: the same open link
 * (`#d=`) stxt.dev builds for its code blocks, so whoever opens it gets the document added to their
 * own workspace, nothing replaced and nothing asked. The grammars the document needs to validate
 * go along as `&g=` parameters, one per workspace document that defines a namespace the document
 * uses (see `Analyzer.getGrammarDocuments`), and the title travels as `&t=`.
 *
 * @param workspace the workspace the document is in.
 * @param analyzer the analysis of that workspace, which knows where each namespace is defined.
 * @param id identifier of the document to share.
 * @returns the link, or undefined when the document is not in the workspace.
 */
export async function encodeDocumentLink(workspace: Workspace, analyzer: Analyzer, id: string): Promise<DocumentLink | undefined> {
	const document = workspace.getDocument(id);
	if (!document) {
		return undefined;
	}
	const grammars: string[] = [];
	for (const grammarId of analyzer.getGrammarDocuments(id)) {
		const grammar = workspace.getDocument(grammarId);
		if (grammar) {
			grammars.push(grammar.text);
		}
	}
	return { fragment: await encodeOpen(document.text, document.title, grammars), grammars: grammars.length };
}
