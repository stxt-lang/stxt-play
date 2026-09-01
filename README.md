# STXT Playground

A web playground for [STXT](https://stxt.dev), the human-first hierarchical text language: write STXT
in the browser, with its grammar next to it, and see errors as you type. Think VS Code, simplified —
a real editor, not a form or a viewer.

> **Live at [play.stxt.dev](https://play.stxt.dev).** Every phase of `ROADMAP.md` is done: analysis
> core, editor, multi-document workspace, header switches, autocompletion, hover and go to
> definition, seed content, reset, share links, publication.

## What it should do

- **Edit one or several STXT documents** at once, with syntax highlighting. The content of blocks
  a grammar of the workspace declares as `MARKDOWN` is highlighted as Markdown (headings,
  emphasis, code, lists, quotes, links); `TEXT` blocks stay plain.
- **Edit and insert grammars** — `@stxt.schema` and `@stxt.template` — alongside the documents they
  validate.
- **Show syntax errors as you type**, and schema validation errors next to them.
- **Autocomplete** driven by the active schema or template: root nodes of every grammar of the
  workspace (plus `Schema (@stxt.schema)` and `Template (@stxt.template)` to start one), the
  children the grammar declares for the enclosing node, and `ENUM` values. Type, or press
  Ctrl+Space.
- **Hover** over a node to see what the parse and its grammar know about it.
- **Go to definition**: Ctrl+Click (Cmd+Click on macOS) on a node name, or Ctrl+B / Cmd+B with the
  cursor on it, opens the grammar of the workspace that defines its namespace, on the line that
  declares the node — `Node: Name` in a schema, the node's own line inside `Structure >>` in a
  template. On the namespace itself it opens the grammar root. (F12 is left to the browser.)

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
- **Errors go in a panel at the bottom**, like the *Problems* panel of VS Code, which is the
  reference; a right-hand panel would compete with the editor for width.
- The header carries the active document's title and **two switches**: spaces/tabs, and schema
  validation on/off. Both are remembered between visits. With validation on, a namespace that no
  grammar of the workspace covers is reported as `SCHEMA_NOT_FOUND` — also in a workspace with no
  grammar at all: the switch, not the presence of unrelated grammars, decides whether a document
  is validated. Switching the indentation converts the
  **structural** indentation of every document (levels only — comments, values and the relative
  indentation inside text blocks are left as they are), and it is undoable in each document.
- The document list can be **reordered** by dragging rows, or with Alt+Up/Down, and **resized**
  by dragging the divider between the list and the editor (arrow keys move it when it has the
  focus; a double click brings the default width back). The width is remembered between visits.

The playground is **not** a JSON converter: showing the canonical STXT-TREE-SPEC tree was on the
list and was dropped — it may come back as a secondary view, but it is not what the product is
about.

The workspace lives in the browser: it is saved to `localStorage` as you type and comes back on
the next visit. Nothing leaves your machine. **Share** puts the whole workspace, compressed, in the
URL fragment — the link carries the documents, no server involved — **↺ Reset** brings back the
example documents (see `seed/`), and **Clear** (the bin icon) removes them all and leaves a single empty one.

### Sharing a workspace from a link

What travels in a share link is STXT: `https://play.stxt.dev/#w=<payload>`, where `<payload>` is
the base64url (no padding) of the raw-deflate of one STXT document that carries the whole
workspace — inflate it and you get something you can read, edit and compress again:

```stxt
# STXT Playground workspace — https://play.stxt.dev
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

One `Document` per workspace document, in order, with its title as the value; `Active: true`
marks the one open in the editor (the first is used otherwise), and the `Text` block carries the
full text, literal, indented one level deeper. The header comment and the indentation style are
free — it is just STXT — and a `Document` without `Text` is an empty document. Anyone can build
such a link to hand a whole workspace (say, a document next to its grammar) to the playground;
opening it asks before replacing what the browser holds.

### Opening a document from a link

Any site can hand a snippet to the playground: `https://play.stxt.dev/#d=<payload>` opens it as
a new document, **added** to whatever workspace the browser already has (nothing is replaced,
nothing is asked), and selects it. `<payload>` is the base64url (no padding) of the raw-deflate
of the UTF-8 text; an optional `&t=<title>` (form-encoded) names the document. This is what the
*Open in the playground* buttons of the code blocks on [stxt.dev](https://stxt.dev) use. Opening
the same link twice selects the existing document instead of adding a copy, and a tab that is
already running picks the link up on `hashchange`, so a site may reuse one playground tab with
a named `target` (the fragment is cleared once consumed). In Node:

```js
const payload = require("node:zlib").deflateRawSync(Buffer.from(text, "utf8")).toString("base64url");
const url = `https://play.stxt.dev/#d=${payload}&t=${encodeURIComponent(title)}`;
```

The link may also carry the grammars the document needs to validate: zero or more `&g=<payload>`
parameters, each one a schema or template document encoded exactly like the `d=` payload. Each
grammar arrives as its own workspace document, and the workspace keeps one definition per
namespace: a grammar for a namespace nothing defines is added silently; one identical to the
definition already there does nothing; one that differs asks before replacing it. A `g=` payload
that is not a grammar, or does not decode, is ignored — the document of the link always opens.

A `d=` document that is itself a grammar — every root a schema or a template — follows the same
rule instead of entering as a plain document: an unknown namespace is added (listed by its
namespace), an identical definition is selected, and a differing one asks before being replaced.
Either way that grammar ends up selected, so no link can ever leave the workspace with two
definitions of the same namespace.

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
| Editor | [CodeMirror 6](https://codemirror.net/) — highlighting by decorations fed by the parser, no Lezer grammar |
| Styles | SCSS compiled with `sass` |
| Local server | `http-server`, caching disabled |
| Parser | `@stxt-lang/core`, bundled into the page |

```
css/            SCSS sources         → compiled into web/css/
src/            TypeScript sources   → bundled into web/js/
src/analysis/   the analysis core: tokens, diagnostics, workspace grammars, completion, node info, definitions (no DOM, no editor)
src/workspace/  the workspace model, its localStorage persistence, share and open links (no DOM either)
seed/           the example documents and grammars, bundled as text
src/editor/     the CodeMirror layer: decorations from tokens, completion, hover, go to definition, editor setup
src/ui/         the document list and the problems panel
test/           mocha tests of the analysis core and the workspace
web/            exactly what gets served, committed as is
compile_css.sh
start_server.sh
```

**`web/` is committed, build output included.** Since that directory is published as it stands,
`npm run build` has to be run — and its result committed — before anything reaches the site. Never
hand-edit `web/css/` or `web/js/`: they are overwritten on every build. The sources are `css/` and
`src/`. `web/index.html` is written by hand, but the last build step (`scripts/stamp-assets.mjs`)
rewrites the `?v=<hash>` of every asset it references, so a new build always changes the asset
URLs and no cache — browser or CDN — can hold on to an old bundle. `web/_headers` and
`web/_redirects` complete the picture: the HTML is never cached, the versioned assets are cached
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
  so here **the workspace is the discovery mechanism**: every grammar in the document list feeds a
  single provider, and a document is validated against the grammar of its namespace. Two grammars
  defining the same namespace are an error, and that namespace has no active definition — the
  same rule DISCOVERY applies to two definitions at the same level.

## License

MIT — see [LICENSE.txt](LICENSE.txt).
