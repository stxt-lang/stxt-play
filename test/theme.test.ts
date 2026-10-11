import * as assert from "assert";
import { readFileSync } from "fs";
import { themeOf, toggledTheme } from "../src/app/theme";
import { loadSettings, SETTINGS_STORAGE_KEY } from "../src/workspace";
import { memoryStorage } from "./support";

describe("Theme", () => {
	it("is the chosen one, or the system's while none is chosen", () => {
		assert.strictEqual(themeOf(undefined, false), "light");
		assert.strictEqual(themeOf(undefined, true), "dark");
		assert.strictEqual(themeOf("dark", false), "dark");
		assert.strictEqual(themeOf("light", true), "light");
	});

	it("remembers a choice only while it differs from the system", () => {
		assert.strictEqual(toggledTheme(undefined, false), "dark", "light system, press: dark, remembered");
		assert.strictEqual(toggledTheme("dark", false), undefined, "press again: light, the system's, nothing to remember");
		assert.strictEqual(toggledTheme(undefined, true), "light", "dark system, press: light, remembered");
		assert.strictEqual(toggledTheme("light", true), undefined);
		// The system changed under a stored choice, and now agrees with it: the other one is chosen
		assert.strictEqual(toggledTheme("dark", true), "light");
		assert.strictEqual(toggledTheme("light", false), "dark");
	});

	// The page decides the theme before the application loads, with a script of its own in the
	// head: it must read the same settings and decide the same as the application does later
	it("is the same in the head of the page as in the application", () => {
		const html = readFileSync("web/index.html", "utf8");
		const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
		assert.ok(script, "web/index.html has an inline script");
		const run = new Function("localStorage", "matchMedia", "document", script) as (
			localStorage: unknown, matchMedia: unknown, document: unknown) => void;

		const stored = [
			undefined,
			"{oops",
			JSON.stringify({ indent: "tabs", validation: true }),
			JSON.stringify({ indent: "tabs", validation: true, theme: "dark" }),
			JSON.stringify({ indent: "tabs", validation: true, theme: "light" }),
			JSON.stringify({ indent: "tabs", validation: true, theme: "sepia" }),
			"null",
		];
		for (const raw of stored) {
			for (const systemDark of [false, true]) {
				const storage = memoryStorage();
				if (raw !== undefined) {
					storage.setItem(SETTINGS_STORAGE_KEY, raw);
				}
				const page = { documentElement: { dataset: {} as Record<string, string> } };
				const queries: string[] = [];
				run(storage, (query: string) => (queries.push(query), { matches: systemDark }), page);
				assert.strictEqual(
					page.documentElement.dataset.theme,
					themeOf(loadSettings(storage).theme, systemDark),
					`stored ${raw}, system ${systemDark ? "dark" : "light"}`,
				);
				assert.ok(queries.every((query) => query === "(prefers-color-scheme: dark)"));
			}
		}
	});
});
