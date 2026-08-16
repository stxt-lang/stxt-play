/**
 * The dialogs of the playground: small in-page modals on the native `<dialog>` element,
 * instead of `window.confirm` / `window.prompt`. The browser still gives us the modal
 * behaviour for free — focus trap, Escape to cancel, inert page behind, `::backdrop` — but
 * the look is ours and the buttons say what they do ("Delete", "Reset") instead of "OK".
 *
 * One `<dialog>` is created lazily and reused: two dialogs never overlap in the playground.
 */

/** What a confirmation asks. */
export interface ConfirmOptions {
	/** Short title, e.g. `Delete "Recipe"?`. */
	title: string;
	/** One or two sentences with the consequences. */
	message: string;
	/** Label of the confirming button, e.g. "Delete". */
	confirmLabel: string;
	/** Label of the cancelling button; "Cancel" by default. */
	cancelLabel?: string;
	/** Destructive action: the initial focus goes to Cancel, so Enter does not lose anything. */
	danger?: boolean;
}

/** A link handed to the user, for when the clipboard is not available. */
export interface LinkOptions {
	title: string;
	message: string;
	url: string;
}

let dialog: HTMLDialogElement | undefined;

/** The shared `<dialog>`, created on first use. */
function element(): HTMLDialogElement {
	if (!dialog) {
		dialog = document.createElement("dialog");
		dialog.className = "play-dialog";
		document.body.appendChild(dialog);
	}
	return dialog;
}

/**
 * Shows the dialog with the given content and resolves with its return value when it closes,
 * whether by a button, by Escape or by a click on the backdrop (both count as cancelling).
 */
function open(content: HTMLElement, focus: HTMLElement | undefined): Promise<string> {
	const host = element();
	host.textContent = "";
	host.appendChild(content);
	return new Promise((resolve) => {
		const onClose = (): void => {
			host.removeEventListener("close", onClose);
			host.removeEventListener("click", onBackdrop);
			resolve(host.returnValue);
		};
		// A click outside the panel lands on the <dialog> itself, since the panel fills it
		const onBackdrop = (event: MouseEvent): void => {
			if (event.target === host) {
				host.close("");
			}
		};
		host.addEventListener("close", onClose);
		host.addEventListener("click", onBackdrop);
		host.returnValue = "";
		host.showModal();
		focus?.focus();
	});
}

function panel(title: string, message: string): { root: HTMLElement; actions: HTMLElement } {
	const root = document.createElement("div");
	root.className = "play-dialog-panel";
	const heading = document.createElement("h2");
	heading.className = "play-dialog-title";
	heading.textContent = title;
	const text = document.createElement("p");
	text.className = "play-dialog-message";
	text.textContent = message;
	const actions = document.createElement("div");
	actions.className = "play-dialog-actions";
	root.append(heading, text, actions);
	return { root, actions };
}

function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
	const control = document.createElement("button");
	control.type = "button";
	control.className = className;
	control.textContent = label;
	control.addEventListener("click", onClick);
	return control;
}

/**
 * Asks the user to confirm an action.
 *
 * @returns true if the user confirmed; false on Cancel, Escape or a click outside.
 */
export async function confirmDialog(options: ConfirmOptions): Promise<boolean> {
	const { root, actions } = panel(options.title, options.message);
	const cancel = button(options.cancelLabel ?? "Cancel", "play-dialog-button", () => element().close(""));
	const confirm = button(
		options.confirmLabel,
		options.danger ? "play-dialog-button play-dialog-danger" : "play-dialog-button play-dialog-primary",
		() => element().close("confirm")
	);
	actions.append(cancel, confirm);
	return (await open(root, options.danger ? cancel : confirm)) === "confirm";
}

/**
 * Hands a link over to the user: a read-only field with the URL, selected, plus a Copy button
 * that tries the clipboard again (a click is a fresh user gesture) and falls back to selecting
 * the text so Ctrl+C works.
 */
export async function linkDialog(options: LinkOptions): Promise<void> {
	const { root, actions } = panel(options.title, options.message);
	const field = document.createElement("input");
	field.type = "text";
	field.readOnly = true;
	field.className = "play-dialog-field";
	field.value = options.url;
	field.addEventListener("focus", () => field.select());
	root.insertBefore(field, actions);
	const copy = button("Copy", "play-dialog-button play-dialog-primary", () => {
		field.focus();
		field.select();
		void navigator.clipboard?.writeText(options.url).then(
			() => { copy.textContent = "Copied!"; },
			() => { /* selection stays: Ctrl+C is the fallback */ }
		);
	});
	const close = button("Close", "play-dialog-button", () => element().close(""));
	actions.append(copy, close);
	await open(root, field);
}
