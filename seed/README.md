# Seed workspace

The documents a first-time visitor gets, and what the *Reset* button restores.

- esbuild bundles them into the page as text (`--loader:.stxt=text`).
- `src/seed.ts` lists them, with their titles.
- `test/seed.test.ts` checks that the whole set parses and validates without errors.

## The documents

| Group | Grammar | Documents |
|---|---|---|
| A tutorial | `stxt.play.tutorial.stxt` (`@stxt.template`): a title, an optional lesson number and one `Introduction` TEXT block | `1.welcome.stxt` to `6.next-steps.stxt`, numbered so they read in order |
| Recipes | `stxt.play.cooking.stxt` (`@stxt.template`) | `recipe-pancakes.stxt`, `recipe-bolognese.stxt`, `recipe-brownies.stxt` |
| Books | `stxt.play.library.stxt` (`@stxt.schema`) | `book-handbook.stxt`, `book-notes.stxt`, `book-plain-text.stxt` |
| Configuration files | `stxt.play.config.stxt` (`@stxt.template`, with typed values: BOOLEAN, NATURAL, URL, ENUM) | `config-development.stxt`, `config-staging.stxt`, `config-production.stxt` |

About the tutorial:

- The first lesson is the document a visitor lands on.
- Lessons 2 and 4 have no namespace on purpose. They add nodes of their own to show the syntax,
  and lesson 4 is about documents without a namespace.
- Lesson 5 has a second root, a recipe, to be broken against the cooking template.

## The namespaces

The namespaces are `stxt.play.*` on purpose:

- They are short, so they show whole in the document list.
- `@stxt.*` stays reserved for the language. `stxt.*`, without the `@`, is a plain namespace.
- The portal (`stxt.dev`, source in the `stxt-lang` repository) never uses that family in its
  examples. Any example opened with its *Open in the playground* button can be added to a fresh
  workspace without a `DISCOVERY_DUPLICATE_NAMESPACE` clash with the seed.
