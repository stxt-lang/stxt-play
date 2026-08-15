import BOOK from "../seed/book.stxt";
import ACME_BOOK_SCHEMA from "../seed/com.acme.book.stxt";
import COOKING_TEMPLATE from "../seed/com.example.cooking.stxt";
import DOCS_TEMPLATE from "../seed/com.example.docs.stxt";
import EMAIL from "../seed/email.stxt";
import RECIPE from "../seed/recipe.stxt";

/**
 * The workspace a first-time visitor gets, and what the Reset button restores: documents next to
 * the grammars that validate them, so the playground demonstrates what it is about — editing
 * STXT and seeing it validated against a grammar written beside it. The files live in `seed/`
 * (see its README for where each one comes from) and are bundled as text.
 */

/** A document and its title, ready to be added to the workspace. */
export interface SeedDocument {
	title: string;
	text: string;
}

/** The seed documents, in list order. The first one is the active document. */
export const SEED_DOCUMENTS: SeedDocument[] = [
	{ title: "Recipe", text: RECIPE },
	{ title: "Recipe template", text: COOKING_TEMPLATE },
	{ title: "Email", text: EMAIL },
	{ title: "Docs template", text: DOCS_TEMPLATE },
	{ title: "Book", text: BOOK },
	{ title: "Book schema", text: ACME_BOOK_SCHEMA },
];
