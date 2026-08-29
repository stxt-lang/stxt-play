/**
 * Public surface of the workspace layer: the in-memory model and its persistence. No DOM and no
 * editor types here either, so it is testable in Node like the analysis layer.
 */

export {
	UNTITLED,
	Workspace,
	WorkspaceDocument,
	WorkspaceEvent,
	WorkspaceListener,
	WorkspaceSnapshot,
} from "./Workspace";
export {
	decodeOpen,
	decodeShare,
	encodeOpen,
	encodeShare,
	fromShareDocument,
	isOpenLink,
	OPEN_PARAM,
	OPEN_TITLE_PARAM,
	OpenLinkDocument,
	SHARE_NAMESPACE,
	SHARE_PARAM,
	SHARE_VERSION,
	sharePayloadOf,
	toShareDocument,
} from "./share";
export {
	clearWorkspace,
	DEFAULT_SETTINGS,
	fromWorkspaceSnapshot,
	IndentMode,
	KeyValueStorage,
	loadSettings,
	loadWorkspace,
	PlaygroundSettings,
	saveSettings,
	saveWorkspace,
	SETTINGS_STORAGE_KEY,
	toWorkspaceSnapshot,
	WORKSPACE_STORAGE_KEY,
	WORKSPACE_STORAGE_VERSION,
} from "./storage";
