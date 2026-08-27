import PANCAKES from "../seed/recipe-pancakes.stxt";
import BOLOGNESE from "../seed/recipe-bolognese.stxt";
import BROWNIES from "../seed/recipe-brownies.stxt";
import COOKING_TEMPLATE from "../seed/stxt.play.cooking.stxt";
import HANDBOOK from "../seed/book-handbook.stxt";
import NOTES from "../seed/book-notes.stxt";
import PLAIN_TEXT from "../seed/book-plain-text.stxt";
import LIBRARY_SCHEMA from "../seed/stxt.play.library.stxt";
import DEVELOPMENT from "../seed/config-development.stxt";
import STAGING from "../seed/config-staging.stxt";
import PRODUCTION from "../seed/config-production.stxt";
import CONFIG_TEMPLATE from "../seed/stxt.play.config.stxt";

/**
 * The workspace a first-time visitor gets, and what the Reset button restores: documents next to
 * the grammars that validate them, so the playground demonstrates what it is about — editing
 * STXT and seeing it validated against a grammar written beside it. Three groups: three recipes
 * with their template, three books with their schema, and three server configurations with their
 * template (documents, and data). The files live in `seed/` (see its README, also for why their
 * namespaces are `stxt.play.*`) and are bundled as text.
 */

/** A document and its title, ready to be added to the workspace. */
export interface SeedDocument {
	title: string;
	text: string;
}

/** The seed documents, in list order. The first one is the active document. */
export const SEED_DOCUMENTS: SeedDocument[] = [
	{ title: "Pancakes", text: PANCAKES },
	{ title: "Spaghetti bolognese", text: BOLOGNESE },
	{ title: "Chocolate brownies", text: BROWNIES },
	{ title: "Cooking template", text: COOKING_TEMPLATE },
	{ title: "The STXT Handbook", text: HANDBOOK },
	{ title: "Notes on Indentation", text: NOTES },
	{ title: "Plain Text at Scale", text: PLAIN_TEXT },
	{ title: "Library schema", text: LIBRARY_SCHEMA },
	{ title: "Server: development", text: DEVELOPMENT },
	{ title: "Server: staging", text: STAGING },
	{ title: "Server: production", text: PRODUCTION },
	{ title: "Config template", text: CONFIG_TEMPLATE },
];
