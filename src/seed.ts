/**
 * The workspace a first-time visitor gets: a document and the template that validates it, so
 * the playground demonstrates the two things it is about — editing STXT and seeing it validated
 * against a grammar written next to it. Phase 6 will grow this from the `stxt-web` corpus.
 */

/** A document and its title, ready to be added to the workspace. */
export interface SeedDocument {
	title: string;
	text: string;
}

const RECIPE = [
	"# Welcome to the STXT playground.",
	"# Everything runs in your browser: edit the document and watch the analysis react.",
	"# The template in the list on the left validates this document. Try adding a node it does not declare.",
	"Recipe (com.example.cooking): Pa amb tomàquet",
	"\tServes: 2",
	"\tIngredients:",
	"\t\tIngredient: Bread",
	"\t\tIngredient: Ripe tomato",
	"\t\tIngredient: Olive oil and salt",
	"\tSteps >>",
	"\t\tRub the tomato on the bread.",
	"\t\tAdd olive oil and a pinch of salt.",
	"\t\tEverything in this block is literal text: # : >> are not parsed.",
	"",
].join("\n");

const RECIPE_TEMPLATE = [
	"# A template describes the shape of the documents of a namespace.",
	"# Grammars are listed by their namespace, not by a title.",
	"Template (@stxt.template): com.example.cooking",
	"\tStructure >>",
	"\t\tRecipe (com.example.cooking):",
	"\t\t\tServes: (?) NATURAL",
	"\t\t\tIngredients: (1)",
	"\t\t\t\tIngredient: (+)",
	"\t\t\tSteps: (1) TEXT",
	"",
].join("\n");

/** The seed documents, in list order. The first one is the active document. */
export const SEED_DOCUMENTS: SeedDocument[] = [
	{ title: "Recipe", text: RECIPE },
	{ title: "Recipe template", text: RECIPE_TEMPLATE },
];
