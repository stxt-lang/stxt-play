# STXT Playground

A web playground for [STXT](https://stxt.dev), the human-first hierarchical text format: write STXT
in the browser, with its grammar next to it, and see the result as you type. Think *JSON Editor
Online*, but for STXT.

> **Status: scaffolding.** The stack is in place and `web/index.html` says hello, but none of the
> playground itself is built yet. What follows is what it is meant to become.

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

## Stack

A **fully static site**: no server, no server-side rendering, no API. Everything — parsing,
validation, highlighting — runs in the browser. Cloudflare serves the `web/` directory straight
from the repository, with no build step of its own.

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

**`web/` is committed, build output included.** Since Cloudflare publishes that directory as it
stands, `npm run build` has to be run — and its result committed — before anything reaches the
site. Never hand-edit `web/css/` or `web/js/`: they are overwritten on every build. The sources are
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
