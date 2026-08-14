import { Parser, toCanonicalJson } from "@stxt-lang/core";

/**
 * Entry point of the playground.
 *
 * For now this is a smoke test rather than an application: it proves that the whole stack is
 * wired up — TypeScript compiles, esbuild bundles `@stxt-lang/core` for the browser, the SCSS
 * is served, and the core parser runs client-side with no server involved.
 */

const SAMPLE = [
	"# The playground is not built yet, but the parser already runs in the browser.",
	"Greeting (dev.stxt.play): hola!",
	"\tFrom: stxt-play",
	"\tNote >>",
	"\t\tEverything under a '>>' node is literal text.",
].join("\n");

function main(): void {
	const output = document.getElementById("smoke-test-output");
	if (!output) {
		return;
	}

	try {
		const nodes = new Parser().parse(SAMPLE);
		output.textContent = toCanonicalJson(nodes);
	} catch (error) {
		output.textContent = String(error);
	}
}

document.addEventListener("DOMContentLoaded", main);
