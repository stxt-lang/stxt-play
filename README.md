# STXT Playground

A web playground for [STXT](https://stxt.dev), the human-first hierarchical text format: write STXT
in the browser, with its grammar next to it, and see errors as you type. Think VS Code, simplified —
a real editor, not a form or a viewer.

> **Status: scaffolding.** The stack is in place and `web/index.html` says hello, but none of the
> playground itself is built yet. What follows is what it is meant to become.

## What it should do

- **Edit one or several STXT documents** at once, with syntax highlighting.
- **Edit and insert grammars** — `@stxt.schema` and `@stxt.template` — alongside the documents they
  validate.
- **Show syntax errors as you type**, and schema validation errors next to them.
- **Autocomplete** driven by the active schema or template.

## The interface

```
┌──────────────────────────────────────────────────────┐
│ active document title      [spaces/tabs] [validate]  │  header
├───────────────┬──────────────────────────────────────┤
│ documents     │                                      │
│ (schemas and  │              EDITOR                  │
│  templates    │                                      │
│  look         │                                      │
│  different)   │                                      │
├───────────────┴──────────────────────────────────────┤
│ validation errors            (right side or footer)  │
└──────────────────────────────────────────────────────┘
```

- **Everything is a document.** Schemas and templates sit in the same list as the rest, but **look
  different**, because they play a different role: they feed validation and resolution.
- **Documents may carry a title; schemas and templates may not** — those are identified by their
  **namespace**, which is already their name.
- **Where errors go is undecided**: right-hand side or footer.
- The header carries the active document's title and **two switches**: spaces/tabs, and schema
  validation on/off.

Nothing here is settled. The playground is **not** a JSON converter: showing the canonical
STXT-TREE-SPEC tree was on the list and was dropped — it may come back as a secondary view, but it
is not what the product is about.

## Beyond the playground

The editor is not meant to be single-use. Two follow-ups shape the design:

- **A reusable library.** Highlighting and the editor component should ship separately, so that
  `stxt.dev` itself — and any other site — can embed them.
- **A WYSIWYG editor** for content management systems: editing STXT documents without seeing the
  syntax.

## Stack

A **fully static site**: no server, no server-side rendering, no API. Everything — parsing,
validation, highlighting — runs in the browser. The `web/` directory is served straight from the
repository, with no build step in between.

| Piece | Choice |
|---|---|
| Language | TypeScript, `strict` |
| Bundler | [esbuild](https://esbuild.github.io/) — one dependency, no config file |
| Styles | SCSS compiled with `sass` |
| Local server | `http-server`, caching disabled |
| Parser | `@stxt-lang/core`, bundled into the page |

```
css/          SCSS sources         → compiled into web/css/
src/          TypeScript sources   → bundled into web/js/
web/          exactly what gets served, committed as is
compile_css.sh
start_server.sh
```

**`web/` is committed, build output included.** Since that directory is published as it stands,
`npm run build` has to be run — and its result committed — before anything reaches the site. Never hand-edit `web/css/` or `web/js/`: they are overwritten on every build. The sources are
`css/` and `src/`.

## Commands

```bash
npm install
npm run build        # typecheck + lint, then bundle TS and compile SCSS into web/
npm start            # build, then serve web/ on http://localhost:8080 (PORT overrides)
npm run watch        # rebuild TS and SCSS on change
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src
```

`./start_server.sh` and `./compile_css.sh` are the same thing from a file manager: they reopen
themselves in a terminal when double-clicked, as the other repositories' scripts do.

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
