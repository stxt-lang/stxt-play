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
	clearWorkspace,
	KeyValueStorage,
	loadWorkspace,
	saveWorkspace,
	WORKSPACE_STORAGE_KEY,
	WORKSPACE_STORAGE_VERSION,
} from "./storage";
