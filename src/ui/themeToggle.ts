import { themeOf, toggledTheme } from "../app/theme";
import { PlaygroundSettings } from "../workspace";

/** What the theme button needs. */
export interface ThemeToggleOptions {
	/** The button of the header. */
	button: HTMLElement;
	/** The element that carries the theme, as `data-theme`: the `<html>` of the page. */
	root: HTMLElement;
	/** The live settings object; the button mutates its theme. */
	settings: PlaygroundSettings;
	/** The dark colour scheme of the system: `matchMedia("(prefers-color-scheme: dark)")`. */
	system: MediaQueryList;
	/** Saves the settings to the store. */
	persistSettings(): void;
}

/**
 * Wires the theme button and paints the theme: light or dark, the one chosen with the button or,
 * while none is chosen, the one of the system, which the page then follows when it changes.
 */
export function setupThemeToggle(options: ThemeToggleOptions): void {
	const { button, root, settings, system } = options;

	const render = (): void => {
		const theme = themeOf(settings.theme, system.matches);
		root.dataset.theme = theme;
		button.setAttribute("aria-pressed", String(theme === "dark"));
		button.title = theme === "dark" ? "Switch to the light theme" : "Switch to the dark theme";
	};

	button.addEventListener("click", () => {
		const theme = toggledTheme(settings.theme, system.matches);
		if (theme === undefined) {
			delete settings.theme;
		} else {
			settings.theme = theme;
		}
		options.persistSettings();
		render();
	});
	system.addEventListener("change", render);

	render();
}
