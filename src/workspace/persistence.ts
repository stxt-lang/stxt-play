import { KeyValueStorage, saveWorkspace } from "./storage";
import { Workspace } from "./Workspace";

/**
 * Debounced persistence of the workspace: every change schedules a write shortly after, so a
 * burst of keystrokes costs one write, and the app can force one when the page is about to be
 * hidden or closed. DOM-free (the timer functions are globals in the browser and in Node), so
 * it is testable like the rest of the workspace layer.
 */

/** How long after the last change the workspace is written to the store. */
export const PERSIST_DELAY_MS = 300;

/** The two moments persistence knows: right now, or shortly after the last change. */
export interface WorkspacePersistence {
	/** Writes the workspace now, cancelling any scheduled write. */
	persistNow(): void;
	/** (Re)schedules a write {@link PERSIST_DELAY_MS} after the last call. */
	schedulePersist(): void;
}

/**
 * Creates the persistence of a workspace over a store.
 *
 * @param workspace the workspace to persist.
 * @param storage the store to write to; without one, both operations do nothing.
 * @param delayMs the debounce delay, injectable for tests.
 * @returns the two operations.
 */
export function createWorkspacePersistence(
	workspace: Workspace,
	storage: KeyValueStorage | undefined,
	delayMs: number = PERSIST_DELAY_MS,
): WorkspacePersistence {
	let timer: ReturnType<typeof setTimeout> | undefined;

	const persistNow = (): void => {
		if (timer !== undefined) {
			clearTimeout(timer);
			timer = undefined;
		}
		if (storage) {
			saveWorkspace(storage, workspace.toSnapshot());
		}
	};

	const schedulePersist = (): void => {
		if (!storage) {
			return;
		}
		if (timer !== undefined) {
			clearTimeout(timer);
		}
		timer = setTimeout(persistNow, delayMs);
	};

	return { persistNow, schedulePersist };
}
