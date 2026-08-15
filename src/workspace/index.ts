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
export { decodeShare, encodeShare, SHARE_PARAM, sharePayloadOf } from "./share";
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
