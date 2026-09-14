import WELCOME from "../seed/1.welcome.stxt";
import WHAT_IS_STXT from "../seed/2.what-is-stxt.stxt";
import COMMENTS from "../seed/3.comments.stxt";
import SIMPLE_DOCS from "../seed/4.simple-docs.stxt";
import NAMESPACE_DOCS from "../seed/5.namespace-docs.stxt";
import NEXT_STEPS from "../seed/6.next-steps.stxt";
import TUTORIAL_TEMPLATE from "../seed/stxt.play.tutorial.stxt";
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
 * the grammars that validate them, so the playground demonstrates what it is about, editing
 * STXT and seeing it validated against a grammar written beside it. First a short tutorial: six
 * lessons with their template, the first one being the active document a visitor lands on. Then
 * three groups of examples: three recipes with their template, three books with their schema, and
 * three server configurations with their template (documents, and data). The files live in
 * `seed/` (see its README, also for why their namespaces are `stxt.play.*`) and are bundled as
 * text.
 */

/** A document and its title, ready to be added to the workspace. */
export interface SeedDocument {
	title: string;
	text: string;
}

/** The seed documents, in list order. The first one is the active document. */
export const SEED_DOCUMENTS: SeedDocument[] = [
	{ title: "1. Welcome", text: WELCOME },
	{ title: "2. What is STXT", text: WHAT_IS_STXT },
	{ title: "3. Comments", text: COMMENTS },
	{ title: "4. Documents without namespace", text: SIMPLE_DOCS },
	{ title: "5. Namespace documents", text: NAMESPACE_DOCS },
	{ title: "6. Next steps", text: NEXT_STEPS },
	{ title: "Tutorial template", text: TUTORIAL_TEMPLATE },
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
