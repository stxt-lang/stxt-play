/** Narrowest the document list gets, in CSS pixels: the header buttons must stay usable. */
const MIN_SIDEBAR_WIDTH = 160;

/** Room the editor always keeps, in CSS pixels: the list never pushes it off the screen. */
const MIN_EDITOR_WIDTH = 320;

/** How far one arrow key press moves the divider, in CSS pixels. */
const KEY_STEP = 16;

/** What the splitter needs from the page and what it reports back. */
export interface SplitterOptions {
	/** The drag handle between the document list and the editor. */
	handle: HTMLElement;
	/** The document list pane, resized through its `--sidebar-width` custom property. */
	sidebar: HTMLElement;
	/** The stored width to start from, in CSS pixels; undefined = the stylesheet default. */
	width: number | undefined;
	/** Called when the user settles on a width; undefined = back to the stylesheet default. */
	onWidthChange: (width: number | undefined) => void;
}

/**
 * Wires the divider between the document list and the editor: dragging it trades width between
 * the two — to read long document titles, or to give the editor the room back. The width lands
 * in the sidebar's `--sidebar-width` custom property, which only the wide layout reads: on
 * narrow screens the panes are shown one at a time and the CSS ignores it (the handle is hidden
 * there too). Arrow keys move the divider when the handle has the focus, and a double click
 * returns to the default width. `onWidthChange` fires when a width settles (drag end, key press,
 * reset), not on every moved pixel.
 */
export function setupSplitter(options: SplitterOptions): void {
	const { handle, sidebar, onWidthChange } = options;

	/** Keeps the sidebar and the editor above their minimum widths, whatever the window size. */
	const clamp = (width: number): number => {
		const total = sidebar.parentElement?.getBoundingClientRect().width ?? 0;
		const max = Math.max(MIN_SIDEBAR_WIDTH, total - MIN_EDITOR_WIDTH);
		return Math.round(Math.min(max, Math.max(MIN_SIDEBAR_WIDTH, width)));
	};

	/** The width in force, or undefined when the stylesheet default rules. */
	let current: number | undefined;

	const apply = (width: number | undefined): void => {
		current = width;
		if (width === undefined) {
			sidebar.style.removeProperty("--sidebar-width");
			handle.removeAttribute("aria-valuenow");
		} else {
			sidebar.style.setProperty("--sidebar-width", `${width}px`);
			handle.setAttribute("aria-valuenow", String(width));
		}
	};

	if (options.width !== undefined) {
		apply(clamp(options.width));
	}

	// --- Dragging, with pointer capture so the drag survives leaving the handle ---------------

	let dragFrom: { x: number; width: number } | undefined;

	handle.addEventListener("pointerdown", (event) => {
		event.preventDefault();
		handle.setPointerCapture(event.pointerId);
		dragFrom = { x: event.clientX, width: sidebar.getBoundingClientRect().width };
		handle.classList.add("splitter-active");
	});

	handle.addEventListener("pointermove", (event) => {
		if (dragFrom) {
			apply(clamp(dragFrom.width + event.clientX - dragFrom.x));
		}
	});

	const endDrag = (): void => {
		if (dragFrom) {
			dragFrom = undefined;
			handle.classList.remove("splitter-active");
			onWidthChange(current);
		}
	};
	handle.addEventListener("pointerup", endDrag);
	handle.addEventListener("pointercancel", endDrag);

	// --- Keyboard and reset --------------------------------------------------------------------

	handle.addEventListener("keydown", (event) => {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
			return;
		}
		event.preventDefault();
		const from = current ?? sidebar.getBoundingClientRect().width;
		apply(clamp(from + (event.key === "ArrowRight" ? KEY_STEP : -KEY_STEP)));
		onWidthChange(current);
	});

	handle.addEventListener("dblclick", () => {
		apply(undefined);
		onWidthChange(undefined);
	});
}
