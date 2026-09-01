// Stamps a content hash on every versioned asset reference of web/index.html: `?v=<hash>`.
//
// The served files keep their fixed names (css/site.css, js/play.js, the favicons), so a browser
// or a CDN could hold on to an old copy after a new build; with the hash in the query string the
// URL changes whenever the content does, and index.html — which is never cached, see web/_headers —
// always points at the current one. Also stamps the package version into the header's
// `#app-version` span, so the visible version cannot drift from package.json. Runs as the last
// step of `npm run build`; idempotent.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..", "web");
const indexPath = join(web, "index.html");

/** Assets referenced from index.html that carry a version stamp. */
const ASSETS = ["css/site.css", "js/play.js", "favicon.ico", "favicon-16.png", "favicon-32.png", "apple-touch-icon.png"];

const hashOf = (file) => createHash("sha256").update(readFileSync(join(web, file))).digest("hex").slice(0, 10);

let html = readFileSync(indexPath, "utf8");
let stamped = 0;
for (const asset of ASSETS) {
	const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	// href="asset" or src="asset", with or without a previous ?v=...
	const pattern = new RegExp(`((?:href|src)=")${escaped}(?:\\?v=[0-9a-f]+)?(")`, "g");
	const version = hashOf(asset);
	html = html.replace(pattern, (_match, before, after) => {
		stamped++;
		return `${before}${asset}?v=${version}${after}`;
	});
}
const { version } = JSON.parse(readFileSync(join(web, "..", "package.json"), "utf8"));
html = html.replace(/(<span id="app-version"[^>]*>)[^<]*(<\/span>)/, `$1v${version}$2`);

writeFileSync(indexPath, html);
console.log(`stamp-assets: ${stamped} reference(s) versioned in web/index.html, version v${version}`);
