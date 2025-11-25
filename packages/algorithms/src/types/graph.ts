/**
 * Base Node interface with required discriminator field.
 * All node types must extend this interface.
 *
 * @property id - Unique node identifier (must be unique within graph)
 * @property type - Discriminator field for runtime type narrowing
 *
 * @example
 * ```typescript
 * type WorkNode = {
 *   id: string;
 *   type: 'work';
 *   title: string;
 *   year: number;
 * };
 *
 * type AuthorNode = {
 *   id: string;
 *   type: 'author';
 *   name: string;
 * };
 *
 * type AcademicNode = WorkNode | AuthorNode;
 *
 * const processNode = (node: AcademicNode) => {
 *   if (node.type === 'work') {
 *     console.log(node.title); // TypeScript knows it's WorkNode
 *   } else {
 *     console.log(node.name); // TypeScript knows it's AuthorNode
 *   }
 * };
 * ```
 */
export interface Node {
  id: string;
  type: string;
  [key: string]: unknown;
}

/**
 * Base Edge interface with required fields for graph connectivity.
 * All edge types must extend this interface.
 *
 * @property id - Unique edge identifier
 * @property source - ID of source node (must exist in graph)
 * @property target - ID of target node (must exist in graph)
 * @property type - Discriminator field for runtime type narrowing
 * @property weight - Optional edge weight (default: 1 if not specified)
 *
 * @example
 * ```typescript
 * type CitationEdge = {
 *   id: string;
 *   source: string;
 *   target: string;
 *   type: 'citation';
 *   year: number;
 * };
 *
 * type AuthorshipEdge = {
 *   id: string;
 *   source: string;
 *   target: string;
 *   type: 'authorship';
 *   position: number;
 * };
 *
 * type AcademicEdge = CitationEdge | AuthorshipEdge;
 * ```
 */
export interface Edge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
  [key: string]: unknown;
}
