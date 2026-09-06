/** How long a status message stays on screen. */
const STATUS_MS = 2500;

/** Shows a short message in the status area of the header. */
export type ShowStatus = (message: string) => void;

/**
 * Wires the status area: a message replaces the previous one and fades out after a while.
 *
 * @param element the status element.
 * @param durationMs how long a message stays visible.
 */
export function createStatus(element: HTMLElement, durationMs: number = STATUS_MS): ShowStatus {
	let timer: number | undefined;
	return (message) => {
		element.textContent = message;
		element.classList.add("status-visible");
		if (timer !== undefined) {
			window.clearTimeout(timer);
		}
		timer = window.setTimeout(() => element.classList.remove("status-visible"), durationMs);
	};
}
