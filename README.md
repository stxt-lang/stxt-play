# STXT Playground

A web editor for [STXT](https://stxt.dev): write documents in the browser, with their grammars
next to them, and see the errors while typing.

**Live at [play.stxt.dev](https://play.stxt.dev).**

## What it does

- **Several documents at once**, with syntax highlighting. Blocks that a grammar declares as
  `MARKDOWN` are highlighted as Markdown, and `TEXT` blocks stay plain.
- **Grammars** (`@stxt.schema` and `@stxt.template`) are edited alongside the documents they validate.
- **Errors while typing**: syntax errors, and schema validation errors next to them.
- **Autocompletion** (typing, or Ctrl+Space), driven by the grammar: the root nodes of every
  grammar of the workspace, the children declared for the enclosing node, and the `ENUM` values.
- **Hover** over a node shows what the parser and its grammar know about it.
- **Go to definition**: Ctrl+Click (Cmd+Click on macOS) on a node name, or Ctrl+B / Cmd+B, opens
  the grammar that defines it, on the line that declares the node.
- **Share links**, for the whole workspace or for one document.

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
│ validation errors                                    │
└──────────────────────────────────────────────────────┘
```

- **Everything is a document.** Schemas and templates sit in the same list as the rest, but they
  look different, because they feed validation.
- **Documents may have a title.** Schemas and templates are identified by their namespace.
- **Errors go in a panel at the bottom**, like the *Problems* panel of VS Code.
- **The document list** can be reordered (dragging rows, or Alt+Up/Down) and resized (dragging
  the divider; a double click restores the default width).

The header has two switches, and both are remembered between visits:

| Switch | What it does |
|---|---|
| Spaces / tabs | Converts the **structural** indentation of every document. Comments, values and the indentation inside text blocks are left as they are. It can be undone in each document |
| Validate | Schema validation on or off. With validation on, a namespace that no grammar of the workspace covers is reported as `SCHEMA_NOT_FOUND`, also in a workspace with no grammar at all |

The workspace lives in the browser. It is saved to `localStorage` while typing, and comes back
on the next visit. Nothing leaves the machine.

| Button | What it does |
|---|---|
| **Share** | Puts the whole workspace, compressed, in the URL fragment. No server is involved |
| Link button of a row | Shares that one document, with the grammars it needs |
| **↺ Reset** | Brings back the example documents (see `seed/`) |
| **Clear** (the bin icon) | Removes every document, and leaves a single empty one |

## Links

Two kinds of link open content in the playground. In both, a `<payload>` is the base64url
(no padding) of the raw-deflate of a UTF-8 text. In Node:

```js
const payload = require("node:zlib").deflateRawSync(Buffer.from(text, "utf8")).toString("base64url");
```

| Link | What it does |
|---|---|
| `#w=<payload>` | Opens a **whole workspace**. It asks before replacing what the browser holds |
| `#d=<payload>` | Opens **one document**, added to the workspace. Nothing is replaced, and nothing is asked |
| `&t=<title>` | With `#d=`: the title of the document (form-encoded) |
| `&g=<payload>` | With `#d=`, zero or more: a grammar the document needs |

### A workspace: `#w=`

What travels in the link is STXT: one document that carries the whole workspace.

```stxt
# STXT Playground workspace: https://play.stxt.dev
Workspace (stxt.play.share):
	Version: 1
	Document: Recipe
		Active: true
		Text >>
			Recipe (stxt.play.cooking): Pancakes
			...
	Document: stxt.play.cooking
		Text >>
			...
```

- There is one `Document` per workspace document, in order, with its title as the value.
- `Active: true` marks the one open in the editor. Otherwise the first one is used.
- `Text` has the full text, literal. A `Document` without `Text` is an empty document.
- The header comment and the indentation style are free.

### A document: `#d=`

This is what the *Open in the playground* buttons of the code blocks on
[stxt.dev](https://stxt.dev) use.

```js
const url = `https://play.stxt.dev/#d=${payload}&t=${encodeURIComponent(title)}`;
```

- Opening the same link twice selects the existing document, and does not add a copy.
- A tab that is already running picks the link up on `hashchange`, so a site may reuse one
  playground tab with a named `target`. The fragment is cleared once it is used.

The workspace keeps **one definition per namespace**. A grammar that arrives in a link
(as `&g=`, or as a `#d=` document whose roots are all schemas or templates) follows this rule:

| The namespace of the grammar | What happens |
|---|---|
| Nothing defines it | The grammar is added |
| An identical definition exists | Nothing is added |
| A different definition exists | The playground asks before replacing it |

A `g=` payload that is not a grammar, or that does not decode, is ignored. The document of the
link always opens.

The playground builds these links itself. The link button of a row copies `#d=` with the text,
`&t=` with the title, and one `&g=` for each workspace document that defines a namespace the
document uses.

## Stack

A **fully static site**: no server and no API. Parsing, validation and highlighting run in the
browser. The `web/` directory is served as it is.

| Piece | Choice |
|---|---|
| Language | TypeScript, `strict` |
| Bundler | [esbuild](https://esbuild.github.io/): one dependency, no config file |
| Editor | [CodeMirror 6](https://codemirror.net/): highlighting by decorations fed by the parser, no Lezer grammar |
| Styles | SCSS compiled with `sass` |
| Local server | `http-server`, caching disabled |
| Parser | `@stxt-lang/core`, bundled into the page |

```
css/            SCSS sources         → compiled into web/css/
src/            TypeScript sources   → bundled into web/js/
src/index.ts    the entry point: starts the application once the page is parsed
src/app/        the application: Playground.ts composes the page, and the rest is what it composes.
                Tested in Node (elements.ts and status.ts are the two thin DOM adapters)
src/analysis/   the analysis core: tokens, diagnostics, workspace grammars, completion, node info,
                definitions (no DOM, no editor)
src/workspace/  the workspace model, its localStorage persistence, share and open links (no DOM)
src/editor/     the CodeMirror layer: decorations from tokens, completion, hover, go to definition,
                and the editor state of every workspace document
src/ui/         the document list, the problems panel, the dialogs, the header switches, the splitter, the view tabs
seed/           the example documents and grammars, bundled as text
test/           mocha tests of the analysis core, the workspace and the DOM-free parts of the application
web/            exactly what gets served, committed as is
```

**`web/` is committed, build output included.** That directory is published as it stands, so
`npm run build` has to be run, and its result committed, before anything reaches the site.

- `web/css/` and `web/js/` are overwritten on every build. The sources are `css/` and `src/`.
- `web/index.html` is written by hand. The last build step (`scripts/stamp-assets.mjs`) rewrites
  the `?v=<hash>` of every asset it references, so a new build always changes the asset URLs.
- `web/_headers` and `web/_redirects`: the HTML is never cached, the versioned assets are cached
  for long, and `/index.html` redirects to `/`.

## Commands

```bash
npm install
npm run build        # typecheck + lint, then bundle TS, compile SCSS and stamp asset versions into web/
npm test             # mocha tests of the analysis core and the workspace
npm start            # build, then serve web/ on http://localhost:8080 (PORT overrides)
npm run watch        # rebuild TS and SCSS on change
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src test
```

`./start_server.sh` and `./compile_css.sh` do the same from a file manager: they reopen
themselves in a terminal when double-clicked.

## Design constraints

- **No parser lives here.** The playground uses
  [`@stxt-lang/core`](https://www.npmjs.com/package/@stxt-lang/core). Parsing, schema and validation
  changes belong in [`stxt-js`](https://github.com/stxt-lang/stxt-js).
- **No hand-written grammar files.** Highlighting comes from parsing, as it does in the
  [VS Code extension](https://github.com/stxt-lang/stxt-vscode).
- **The workspace is the discovery mechanism.** STXT-DISCOVERY-SPEC assumes a file system, and the
  browser has no directory chain. Here every grammar in the document list feeds a single
  provider, and a document is validated against the grammar of its namespace. Two grammars that
  define the same namespace are an error, and that namespace has no active definition. It is the
  rule STXT-DISCOVERY-SPEC applies to two definitions at the same level.

## License

MIT, see [LICENSE.txt](LICENSE.txt).
