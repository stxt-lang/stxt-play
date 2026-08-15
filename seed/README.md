# Seed workspace

The documents a first-time visitor gets, and what the *Reset* button restores. They are bundled
into the page as text by esbuild (`--loader:.stxt=text`) and listed, with their titles, in
`src/seed.ts`. `test/seed.test.ts` checks that the whole set parses and validates cleanly.

- `recipe.stxt`, `com.example.cooking.stxt`, `book.stxt` — written for the playground.
- `email.stxt`, `com.example.docs.stxt`, `com.acme.book.stxt` — copies from the corpus of the
  `stxt-web` repository (`docs/email.stxt`, `examples/definitions/templates/com.example.docs.stxt`,
  `examples/definitions/tutorial/schema.stxt`), taken on 2026-08-15. They are copies, not links:
  the playground is a static site and cannot read a sibling repository at run time.
