# Research & Technology Decisions

**Feature**: Algorithms Package
**Date**: 2025-11-24
**Status**: Complete

## Overview

This document captures the research findings and technology decisions made during Phase 0 planning for the algorithms package. Each decision includes rationale and alternatives considered.

## Decisions

### 1. Result/Option Type Design Patterns

**Decision**: Use discriminated unions with `{ ok: true, value: T }` | `{ ok: false, error: E }` for Result and `{ some: true, value: T }` | `{ some: false }` for Option

**Rationale**:
- TypeScript discriminated unions provide exhaustive pattern matching at compile time
- No monadic operators needed initially (can add later if needed)
- Familiar pattern for TypeScript developers
- Zero runtime dependencies required
- Compiler enforces handling of both success and failure cases

**Alternatives Considered**:
1. **Third-party libraries** (fp-ts, neverthrow):
   - ❌ Rejected: Violates zero dependency requirement (FR-014)
   - ❌ Rejected: Adds learning curve for unfamiliar monadic APIs
   - ❌ Rejected: Increases bundle size unnecessarily

2. **Nullable returns** (`T | undefined`):
   - ❌ Rejected: Loss of error information (can't distinguish failure types)
   - ❌ Rejected: No way to communicate WHY operation failed
   - ❌ Rejected: Doesn't satisfy error handling clarity requirement

3. **Exceptions** (traditional try-catch):
   - ❌ Rejected: Violates spec requirement for no-throw APIs (FR-020)
   - ❌ Rejected: Exceptions not visible in type signatures
   - ❌ Rejected: Easy to forget error handling

**Implementation Notes**:
- Result type uses `ok: boolean` discriminator
- Option type uses `some: boolean` discriminator
- Type narrowing via `if (result.ok)` checks
- Helper functions: `Ok<T>(value: T)`, `Err<E>(error: E)`, `Some<T>(value: T)`, `None()`

---

### 2. Graph Data Structure Representation

**Decision**: Adjacency list using `Map<string, Set<string>>` for O(1) neighbor lookup

**Rationale**:
- Standard efficient representation for sparse graphs (typical in academic networks)
- Supports both directed and undirected edges
- Fast neighbor enumeration for traversal algorithms (DFS, BFS)
- O(V + E) space complexity (optimal for sparse graphs)
- JavaScript Map/Set provide O(1) average-case operations

**Alternatives Considered**:
1. **Adjacency matrix** (2D array):
   - ❌ Rejected: O(V²) space complexity wasteful for sparse graphs
   - ❌ Rejected: Academic citation networks are typically sparse (<<V² edges)
   - ❌ Rejected: Wastes memory storing non-existent edges as zeros/nulls

2. **Edge list** (array of edges):
   - ❌ Rejected: O(E) time complexity for neighbor lookup (too slow)
   - ❌ Rejected: Inefficient for traversal algorithms that need frequent neighbor access
   - ❌ Rejected: Requires linear scan to find edges from a specific node

3. **Hybrid approaches** (combination of structures):
   - ❌ Rejected: Unnecessary complexity for target graph sizes (<10,000 nodes)
   - ❌ Rejected: Adds implementation overhead without clear performance benefit
   - ❌ Rejected: Violates YAGNI principle

**Implementation Notes**:
- `nodes: Map<string, N>` - Maps node IDs to node objects
- `edges: Map<string, E>` - Maps edge IDs to edge objects
- `adjacencyList: Map<string, Set<string>>` - Maps node IDs to neighbor IDs
- For undirected graphs: Add edges in both directions in adjacency list

---

### 3. Node ID Uniqueness Enforcement Strategy

**Decision**: Use `Map<string, Node>` for node storage; check `has()` before `set()` in `addNode()` method; return `Err(DuplicateNodeError)` if exists

**Rationale**:
- Map provides O(1) existence checks via `has()` method
- Fails fast on duplicate IDs preventing silent data corruption
- Clear error messages guide developers to fix bugs early
- Maintains graph invariant that node IDs are unique
- Aligns with Result type error handling pattern

**Alternatives Considered**:
1. **Last-write-wins** (silently replace existing node):
   - ❌ Rejected: Risk of accidental overwrites destroying data
   - ❌ Rejected: Hides programming errors instead of surfacing them
   - ❌ Rejected: Makes debugging difficult (no indication of duplicate IDs)

2. **Merge strategy** (combine old and new node data):
   - ❌ Rejected: Adds complexity with ambiguous merge semantics
   - ❌ Rejected: No clear rule for which fields to keep/merge
   - ❌ Rejected: Requires user-defined merge function (too complex for core API)

3. **Automatic ID generation** (UUID/auto-increment):
   - ❌ Rejected: User needs control over node IDs for referencing
   - ❌ Rejected: Academic entities have natural IDs (OpenAlex IDs)
   - ❌ Rejected: Adds complexity and hides ID collisions

**Implementation Notes**:
- `addNode(node: N): Result<void, DuplicateNodeError>`
- Check: `if (this.nodes.has(node.id)) return Err({ type: 'duplicate-node', message: \`Node '\${node.id}' already exists\`, nodeId: node.id })`
- Helper: `hasNode(id: string): boolean` for pre-checks

---

### 4. Algorithm Performance Optimization Techniques

**Decision**: Use visited sets (`Set<string>`) for cycle detection; priority queue (binary min-heap) for Dijkstra; iterative implementations to avoid stack overflow

**Rationale**:
- Visited sets provide O(1) membership checks (critical for DFS/BFS)
- Priority queue provides O(log V) insert/extract-min operations (optimal for Dijkstra)
- Iterative implementations are stack-safe for arbitrarily deep graphs
- Matches standard algorithm textbook implementations (CLRS, Sedgewick)

**Alternatives Considered**:
1. **Recursive implementations**:
   - ❌ Rejected: Stack overflow risk with deep graphs (>1000 depth)
   - ❌ Rejected: JavaScript call stack size limits (~10k frames)
   - ❌ Rejected: Academic citation chains can be arbitrarily deep

2. **Fibonacci heap** (for Dijkstra):
   - ❌ Rejected: Implementation complexity very high
   - ❌ Rejected: Marginal performance gain for target graph sizes
   - ❌ Rejected: Binary heap sufficient for <10,000 nodes (per spec)

3. **Bidirectional search** (for pathfinding):
   - ✅ Considered: Could add as optimization later if needed
   - ⏸️ Deferred: Standard Dijkstra meets performance requirements
   - ⏸️ Deferred: Can implement as separate function if needed

**Implementation Notes**:
- Visited sets: `const visited = new Set<string>()`
- Priority queue: Custom MinHeap class for Dijkstra
- Iterative DFS: Use explicit stack (`const stack: string[] = []`)
- Iterative BFS: Use queue (`const queue: string[] = []`)

---

### 5. Type-Safe Discriminated Union Patterns

**Decision**: Use literal `type` field for node/edge discrimination; define union types like `WorkNode | AuthorNode`; TypeScript narrows types via `type` field checks

**Rationale**:
- Standard TypeScript pattern for heterogeneous collections
- Compile-time type narrowing without runtime overhead
- Runtime type inspection via simple `node.type` checks
- Serialization-friendly (JSON.stringify/parse works)
- No instanceof brittleness or prototype chain issues

**Alternatives Considered**:
1. **Nominal typing with branded types**:
   - ❌ Rejected: Adds complexity without clear benefit
   - ❌ Rejected: Harder to understand for developers unfamiliar with branding
   - ❌ Rejected: Doesn't provide runtime type inspection

2. **Class hierarchies** (Node base class, WorkNode extends Node):
   - ❌ Rejected: Serialization complexity (loses class info in JSON)
   - ❌ Rejected: instanceof checks brittle across module boundaries
   - ❌ Rejected: OOP overhead for simple data structures

3. **Symbol-based discrimination** (unique symbols as type markers):
   - ❌ Rejected: Symbols not serializable to JSON
   - ❌ Rejected: Harder to debug (symbols not readable in console)
   - ❌ Rejected: Adds runtime overhead creating unique symbols

**Implementation Notes**:
- Example node union: `type Node = WorkNode | AuthorNode | InstitutionNode`
- Type narrowing: `if (node.type === 'work') { /* node is WorkNode */ }`
- Literal types: `type: 'work'` (not `type: string`)

---

### 6. Error Type Hierarchy Design

**Decision**: Base `GraphError` discriminated union with variants: `InvalidInputError`, `InvalidWeightError`, `NegativeWeightError`, `CycleDetectedError`, `DuplicateNodeError`; each has `type` discriminator and `message` string

**Rationale**:
- Exhaustive pattern matching on error types (compiler enforces handling)
- Descriptive error messages for debugging
- Consistent error structure across all algorithms
- Type-safe error handling without exception boilerplate

**Alternatives Considered**:
1. **Error subclasses** (class InvalidInputError extends Error):
   - ❌ Rejected: instanceof brittleness across module boundaries
   - ❌ Rejected: Serialization issues (Error objects don't serialize well)
   - ❌ Rejected: Stack traces add overhead (not needed for non-exception errors)

2. **Error codes as strings** (return "INVALID_INPUT"):
   - ❌ Rejected: Lack of type safety (typos not caught by compiler)
   - ❌ Rejected: No structured error data (can't include cycle path, node ID, etc.)
   - ❌ Rejected: Harder to pattern match (string comparison less clear)

3. **Union of string literals** (type Error = "invalid-input" | "negative-weight"):
   - ❌ Rejected: Loss of error message context (can't explain WHY it failed)
   - ❌ Rejected: Can't attach additional data (cycle path, node ID)
   - ❌ Rejected: Less useful for debugging

**Implementation Notes**:
- Base type: `type GraphError = InvalidInputError | InvalidWeightError | ...`
- Example: `type DuplicateNodeError = { type: 'duplicate-node'; message: string; nodeId: string }`
- Pattern match: `if (error.type === 'duplicate-node') { /* access error.nodeId */ }`

---

### 7. Test Strategy for Algorithm Correctness

**Decision**: Test fixtures with known graph structures and expected results; property-based testing for algorithm invariants; performance benchmarks with time limits; edge case coverage (empty graphs, disconnected components, cycles)

**Rationale**:
- Known-answer tests verify correctness against textbook examples
- Property tests verify invariants hold (e.g., DFS visits all reachable nodes exactly once)
- Performance benchmarks enforce <100ms, <200ms requirements (SC-001, SC-002)
- Edge case coverage ensures robustness (SC-005)

**Alternatives Considered**:
1. **Snapshot testing** (save algorithm output, compare on re-run):
   - ❌ Rejected: Lack of semantic verification (can snapshot incorrect behavior)
   - ❌ Rejected: Brittle (changes to output format break tests)
   - ❌ Rejected: Doesn't verify algorithm properties, just output stability

2. **Fuzzing** (generate random graphs, run algorithms):
   - ✅ Considered: Good supplementary technique
   - ⏸️ Deferred: Not primary testing strategy (use for stress testing later)
   - ⏸️ Deferred: Harder to reproduce failures and debug

3. **Formal verification** (proof of correctness):
   - ❌ Rejected: Out of scope for PhD research project
   - ❌ Rejected: Requires specialized tools and expertise
   - ❌ Rejected: Algorithms are standard textbook implementations

**Implementation Notes**:
- Test fixtures: Pre-defined graphs with known properties (DAGs, cycles, disconnected)
- Property tests: Verify DFS/BFS visit order properties, path minimality, cycle detection correctness
- Performance tests: `expect(endTime - startTime).toBeLessThan(100)` for 1000-node graphs
- Edge cases: Empty graph, single node, disconnected components, self-loops, multi-edges

---

## Summary

All research tasks completed. Key technology decisions:

1. ✅ Result/Option types using discriminated unions (zero dependencies)
2. ✅ Adjacency list graph representation (O(V + E) space, O(1) neighbor lookup)
3. ✅ Strict node ID uniqueness via Map.has() checks
4. ✅ Iterative algorithms with visited sets and priority queues
5. ✅ Discriminated unions for heterogeneous graphs (type field)
6. ✅ Structured error types (GraphError discriminated union)
7. ✅ Known-answer + property-based + performance testing strategy

**No NEEDS CLARIFICATION items remain**. Ready for Phase 1 data modeling.

---

**Generated**: 2025-11-24 (Phase 0 complete)
