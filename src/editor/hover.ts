import { Extension } from "@codemirror/state";
import { hoverTooltip } from "@codemirror/view";
import { NodeDefinitionInfo, NodeInfo } from "../analysis";

/** Asks the app for the description of the node opened at a 0-based line. */
export type NodeInfoProvider = (line: number) => NodeInfo | undefined;

/**
 * Hover tooltip for STXT: what the parse knows about the node under the pointer, and what the
 * grammar of its namespace declares for it, when there is one. The content comes from
 * `analysis/nodeInfo.ts`; this file only renders it as DOM.
 *
 * @param describe the app's hook into the analyzer for the document in the view.
 */
export function stxtHover(describe: NodeInfoProvider): Extension {
	return hoverTooltip((view, pos) => {
		const line = view.state.doc.lineAt(pos);
		const info = describe(line.number - 1);
		if (!info) {
			return null;
		}
		return {
			pos: line.from,
			end: line.to,
			above: true,
			create: () => ({ dom: render(info) }),
		};
	});
}

/** Cardinality in the template notation: (1), (?), (*), (+), (min,max). */
function cardinality(min: number | null, max: number | null): string {
	const lo = min ?? 0;
	if (lo === 1 && max === 1) {
		return "(1)";
	}
	if (lo === 0 && max === 1) {
		return "(?)";
	}
	if (lo === 0 && max === null) {
		return "(*)";
	}
	if (lo === 1 && max === null) {
		return "(+)";
	}
	return `(${lo},${max === null ? "∞" : max})`;
}

function el(tag: string, className: string, text?: string): HTMLElement {
	const element = document.createElement(tag);
	element.className = className;
	if (text !== undefined) {
		element.textContent = text;
	}
	return element;
}

function render(info: NodeInfo): HTMLElement {
	const root = el("div", "stxt-hover");

	const title = el("div", "stxt-hover-title");
	title.appendChild(el("span", "stxt-hover-name", info.name));
	if (info.namespace) {
		title.appendChild(el("span", "stxt-hover-namespace", ` (${info.namespace})`));
	}
	root.appendChild(title);

	const facts: string[] = [info.kind === "block" ? "text block" : "inline node", `level ${info.level}`];
	if (info.kind === "block") {
		facts.push(`${info.textLines ?? 0} line${info.textLines === 1 ? "" : "s"}`);
	} else if (info.value !== undefined && info.value.length > 0) {
		facts.push(`value “${info.value}”`);
	}
	if (info.canonicalName !== info.name) {
		facts.push(`canonical “${info.canonicalName}”`);
	}
	root.appendChild(el("div", "stxt-hover-facts", facts.join(" · ")));

	if (info.definition) {
		root.appendChild(renderDefinition(info.definition));
	} else if (info.namespace) {
		root.appendChild(el("div", "stxt-hover-none", "No grammar in the workspace declares this node."));
	}
	return root;
}

function renderDefinition(definition: NodeDefinitionInfo): HTMLElement {
	const section = el("div", "stxt-hover-definition");
	section.appendChild(el("div", "stxt-hover-heading", `Grammar ${definition.namespace}`));

	const type = el("div", "stxt-hover-row");
	type.appendChild(el("span", "stxt-hover-key", "Type"));
	type.appendChild(el("span", "stxt-hover-value", definition.type));
	section.appendChild(type);

	if (definition.values.length > 0) {
		const values = el("div", "stxt-hover-row");
		values.appendChild(el("span", "stxt-hover-key", "Values"));
		values.appendChild(el("span", "stxt-hover-value", definition.values.join(", ")));
		section.appendChild(values);
	}

	if (definition.children.length > 0) {
		const children = el("div", "stxt-hover-row");
		children.appendChild(el("span", "stxt-hover-key", "Children"));
		const list = el("span", "stxt-hover-value");
		list.textContent = definition.children
			.map((child) => {
				const name = child.namespace !== definition.namespace ? `${child.name} (${child.namespace})` : child.name;
				return `${name} ${cardinality(child.min, child.max)}`;
			})
			.join(", ");
		children.appendChild(list);
		section.appendChild(children);
	}

	if (definition.description) {
		section.appendChild(el("div", "stxt-hover-description", definition.description));
	}
	return section;
}
