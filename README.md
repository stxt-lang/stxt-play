# STXT Playground

A web playground for [STXT](https://stxt.dev), the human-first hierarchical text format: write STXT
in the browser, with its grammar next to it, and see the result as you type. Think *JSON Editor
Online*, but for STXT.

> **Status: intent, not implementation.** This repository is empty. What follows is what the
> playground is meant to be, so that the goal is written down before the first line of code.

## What it should do

- **Edit one or several STXT documents** at once. The editor is the centrepiece.
- **Edit and insert grammars** — `@stxt.schema` and `@stxt.template` — alongside the documents they
  validate.
- **Show syntax errors as you type**, and schema validation errors next to them.
- **Autocomplete** driven by the active schema or template.
- Syntax highlighting, and the canonical JSON tree (STXT-TREE-SPEC) side by side with the source.
- Share an example by URL, for documentation and demos.

The list is open; more will be added as the design settles.

## Beyond the playground

The editor is not meant to be single-use. Two follow-ups shape the design:

- **A reusable library.** Highlighting and the editor component should ship separately, so that
  `stxt.dev` itself — and any other site — can embed them.
- **A WYSIWYG editor** for content management systems: editing STXT documents without seeing the
  syntax.

## Design constraints

- **No parser lives here.** The playground is a consumer of
  [`@stxt-lang/core`](https://www.npmjs.com/package/@stxt-lang/core). Parsing, schema and validation
  changes belong in [`stxt-js`](https://github.com/stxt-lang/stxt-js) and are published from there.
- **No hand-written grammar files.** Highlighting comes from parsing, as it does in the
  [VS Code extension](https://github.com/stxt-lang/stxt-vscode) — one definition of the language,
  the core one.
- Schema discovery (STXT-DISCOVERY-SPEC) assumes a filesystem. The browser has no directory chain,
  so how a grammar binds to a document on the web is still an open question.

## License

MIT — see [LICENSE.txt](LICENSE.txt).
