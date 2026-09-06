/** The elements of `web/index.html` the application wires, by the id each one has there. */
const IDS = {
	editor: "editor",
	docTitle: "doc-title",
	docList: "doc-list",
	docNew: "doc-new",
	problemsList: "problems-list",
	problemsCount: "problems-count",
	indentTabs: "indent-tabs",
	indentSpaces: "indent-spaces",
	validationToggle: "validation-toggle",
	docReset: "doc-reset",
	docClear: "doc-clear",
	share: "share",
	status: "status",
	viewTabs: "view-tabs",
	sidebar: "sidebar",
	splitter: "splitter",
} as const;

/** The page elements the application needs, all present. */
export type PlaygroundElements = { readonly [K in keyof typeof IDS]: HTMLElement };

/**
 * Finds every element the application needs.
 *
 * @param root the document to look in.
 * @returns the elements, or undefined if any is missing: the page is not the playground's.
 */
export function findElements(root: Document): PlaygroundElements | undefined {
	const found: Partial<Record<keyof typeof IDS, HTMLElement>> = {};
	for (const key of Object.keys(IDS) as (keyof typeof IDS)[]) {
		const element = root.getElementById(IDS[key]);
		if (!element) {
			return undefined;
		}
		found[key] = element;
	}
	return found as PlaygroundElements;
}
