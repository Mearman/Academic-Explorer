/**
 * XYFlow node types registry
 * Separated from component definitions to support React Fast Refresh
 */

import {
	CustomNode,
	WorkNode,
	AuthorNode,
	SourceNode,
	InstitutionNode,
} from "./custom-nodes";

// Node types registry for XYFlow
export const nodeTypes = {
	custom: CustomNode,
	work: WorkNode,
	author: AuthorNode,
	source: SourceNode,
	institution: InstitutionNode,
};