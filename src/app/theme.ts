import { Theme } from "../workspace";

/**
 * The theme of the page: the one chosen with the button of the header, or the one of the system
 * while none is chosen. Nothing here touches the page; `ui/themeToggle.ts` applies it, and the
 * script in the head of `web/index.html` decides the same before the first paint.
 */

const systemTheme = (systemDark: boolean): Theme => (systemDark ? "dark" : "light");

/**
 * @param chosen the theme stored in the settings, if any.
 * @param systemDark whether the system asks for a dark colour scheme.
 * @returns the theme to show.
 */
export function themeOf(chosen: Theme | undefined, systemDark: boolean): Theme {
	return chosen ?? systemTheme(systemDark);
}

/**
 * What a press of the button leaves chosen: the other theme. When that is the one of the
 * system there is nothing to remember, and the page follows the system again.
 *
 * @param chosen the theme stored in the settings, if any.
 * @param systemDark whether the system asks for a dark colour scheme.
 * @returns the theme to store, or undefined to store none.
 */
export function toggledTheme(chosen: Theme | undefined, systemDark: boolean): Theme | undefined {
	const next: Theme = themeOf(chosen, systemDark) === "dark" ? "light" : "dark";
	return next === systemTheme(systemDark) ? undefined : next;
}
