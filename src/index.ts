import { Node, Parser } from "@stxt-lang/core";

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

/** Renders a node and its descendants as an indented outline, one line per node. */
function outline(node: Node, depth: number): string[] {
	const indent = "\t".repeat(depth);
	if (node.isTextNode()) {
		const lines = node.getTextLines().map((line) => `${indent}\t${line}`);
		return [`${indent}${node.getName()} >>`, ...lines];
	}
	const children = node.getChildren().flatMap((child) => outline(child, depth + 1));
	return [`${indent}${node.getName()}: ${node.getValue()}`, ...children];
}

function main(): void {
	const output = document.getElementById("smoke-test-output");
	if (!output) {
		return;
	}

	try {
		const nodes = new Parser().parse(SAMPLE);
		output.textContent = nodes.flatMap((node) => outline(node, 0)).join("\n");
	} catch (error) {
		output.textContent = String(error);
	}
}

document.addEventListener("DOMContentLoaded", main);
