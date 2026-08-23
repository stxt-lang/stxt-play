/** The three panes of the playground a narrow screen shows one at a time. */
export type PlaygroundView = "documents" | "editor" | "problems";

/** The view tabs of narrow screens: Documents · Editor · Problems. */
export interface ViewTabs {
	/** Makes the given pane the visible one (a no-op in layout terms when the tabs are hidden). */
	show(view: PlaygroundView): void;
	/** Whether the tabs are in use, i.e. the layout shows one pane at a time. */
	isActive(): boolean;
	/** Mirrors the number of problems on the Problems tab. */
	setProblemCount(count: number): void;
}

/** Media query under which the layout shows one pane at a time (the same breakpoint as the CSS). */
const NARROW_QUERY = "(max-width: 720px)";

/**
 * Creates the view tabs inside their nav element.
 *
 * On wide screens the sidebar, the editor and the problems panel are all on screen, and the
 * tabs are hidden by CSS. On narrow screens the three panes would fight for a small height —
 * a document list of three rows, an editor spilling over the problems — so the layout shows
 * one pane at a time and these tabs pick which. The chosen pane is a `data-view` attribute on
 * `<body>`; the CSS does the showing and hiding, so a wide screen ignores it entirely.
 *
 * @param nav the `<nav>` holding one button per pane, each with a `data-view` attribute.
 * @param onShow called after a pane is made visible, with the pane shown.
 */
export function createViewTabs(nav: HTMLElement, onShow?: (view: PlaygroundView) => void): ViewTabs {
	const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>("button[data-view]"));
	const counter = nav.querySelector<HTMLElement>(".view-tab-count");
	const narrow = window.matchMedia(NARROW_QUERY);

	const show = (view: PlaygroundView): void => {
		document.body.dataset.view = view;
		for (const button of buttons) {
			button.setAttribute("aria-selected", String(button.dataset.view === view));
		}
		onShow?.(view);
	};

	for (const button of buttons) {
		button.addEventListener("click", () => show(button.dataset.view as PlaygroundView));
	}
	show("editor");

	return {
		show,
		isActive: () => narrow.matches,
		setProblemCount(count: number): void {
			if (counter) {
				counter.textContent = String(count);
				counter.hidden = count === 0;
			}
		},
	};
}
