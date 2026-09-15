import * as assert from "assert";
import { Analyzer } from "../src/analysis";
import { encodeDocumentLink } from "../src/app";
import { decodeOpen, Workspace } from "../src/workspace";
import { sequentialIds } from "./support";

const COOKING = "Template (@stxt.template): com.example.cooking\n\tStructure >>\n\t\tRecipe (com.example.cooking):\n";
const NOTES = "Schema (@stxt.schema): com.example.notes\n\tNode: Note\n\t\tType: TEXT\n";
const RECIPE = "Recipe (com.example.cooking): Pancakes\n\tNote (com.example.notes): Sunday\n";

/** A workspace and its analyzer, mirrored the way the application does it. */
function analyzed(...documents: [title: string, text: string][]): { workspace: Workspace; analyzer: Analyzer } {
	const workspace = new Workspace(sequentialIds());
	const analyzer = new Analyzer();
	for (const [title, text] of documents) {
		const added = workspace.addDocument(text, title);
		analyzer.setDocument(added.id, text);
	}
	return { workspace, analyzer };
}

describe("encodeDocumentLink", () => {
	it("builds an open link with the document, its title and the grammars it needs, in order of use", async () => {
		const { workspace, analyzer } = analyzed(["Notes", NOTES], ["Pancakes", RECIPE], ["Cooking", COOKING]);

		const link = await encodeDocumentLink(workspace, analyzer, "d2");
		assert.ok(link);
		assert.strictEqual(link.grammars, 2);

		const decoded = await decodeOpen(link.fragment);
		assert.deepStrictEqual(decoded, { text: RECIPE, title: "Pancakes", grammars: [COOKING, NOTES] });
	});

	it("brings nothing for a namespace the workspace does not define, and no title parameter for a blank one", async () => {
		const { workspace, analyzer } = analyzed([" ", RECIPE]);

		const link = await encodeDocumentLink(workspace, analyzer, "d1");
		assert.ok(link);
		assert.strictEqual(link.grammars, 0);
		assert.ok(!link.fragment.includes("&g="), "no grammar travels");

		const decoded = await decodeOpen(link.fragment);
		assert.strictEqual(decoded?.text, RECIPE);
		assert.strictEqual(decoded?.grammars, undefined);
	});

	it("is undefined for a document the workspace does not have", async () => {
		const { workspace, analyzer } = analyzed(["Pancakes", RECIPE]);
		assert.strictEqual(await encodeDocumentLink(workspace, analyzer, "d9"), undefined);
	});
});
