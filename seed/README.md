# Seed workspace

The documents a first-time visitor gets, and what the *Reset* button restores. They are bundled
into the page as text by esbuild (`--loader:.stxt=text`) and listed, with their titles, in
`src/seed.ts`. `test/seed.test.ts` checks that the whole set parses and validates cleanly.

Three groups, all written for the playground (since 2026-08-17):

- **A template and three documents** — `stxt.play.cooking.stxt` (`@stxt.template`) and
  the recipes `recipe-pancakes.stxt`, `recipe-bolognese.stxt`, `recipe-brownies.stxt`.
- **A schema and three documents** — `stxt.play.library.stxt` (`@stxt.schema`) and the
  books `book-handbook.stxt`, `book-notes.stxt`, `book-plain-text.stxt`.
- **A template and three configuration files** — `stxt.play.config.stxt`
  (`@stxt.template`, typed values: BOOLEAN, NATURAL, URL, ENUM) and the server configurations
  `config-development.stxt`, `config-staging.stxt`, `config-production.stxt`: STXT used for data,
  not prose.

The namespaces are `stxt.play.*` on purpose — short, so they show whole in the document list, and
under the language's own name rather than `com.example.*` (`@stxt.*` stays reserved for the
language; `stxt.*` without the `@` is a plain namespace): the portal (`stxt.dev`, source in the
`stxt-web` repository) never uses that family in its examples, so any example opened from the
portal with its *Open in playground* button can be added to a fresh workspace without a
`DISCOVERY_DUPLICATE_NAMESPACE` clash with the seed. Before 2026-08-17 the seed reused
`com.example.docs` and `com.acme.book` from the corpus, which the portal defines too.
