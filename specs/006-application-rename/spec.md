# Feature Specification: Application Name Selection & Branding Update

**Feature Branch**: `006-application-rename`
**Created**: 2025-11-12
**Status**: Draft
**Input**: User description: "help me choose a better name for this application using the following information as a starting point [extensive research on naming options including CitationMesh, ScholarWeave, Graphademia, and ResearchLattice, along with domain availability research]"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Name Selection Decision (Priority: P1)

Project stakeholders need to evaluate and select the optimal application name from researched candidates (CitationMesh, ScholarWeave, Graphademia, ResearchLattice) based on uniqueness, relevance, memorability, and domain availability.

**Why this priority**: This is the foundational decision that blocks all subsequent branding and implementation work. Without a name selection, no technical changes can proceed.

**Independent Test**: Can be fully tested by presenting the evaluation criteria matrix to stakeholders and receiving a final name decision that meets all acceptance criteria.

**Acceptance Scenarios**:

1. **Given** research findings showing CitationMesh (23/25), ScholarWeave (25/25), Graphademia (22/25), and ResearchLattice (22/25) scores, **When** stakeholders review the comparison matrix, **Then** they select one name based on documented criteria
2. **Given** domain availability research showing likely available domains for top candidates, **When** the selected name is chosen, **Then** domain verification confirms availability for at least .com or .io extension
3. **Given** conflict analysis showing no existing products with selected name, **When** trademark search is performed, **Then** no legal conflicts are found in USPTO and EU databases

---

### User Story 2 - Domain Registration & Brand Protection (Priority: P2)

After name selection, secure the digital presence by registering domain names and protecting the brand across multiple platforms.

**Why this priority**: Domain registration must happen immediately after name selection to prevent squatting. This protects the brand before any public announcement.

**Independent Test**: Can be tested by verifying successful registration of primary domain (.com or .io) and checking availability of social media handles (GitHub, Twitter/X, LinkedIn) for consistency.

**Acceptance Scenarios**:

1. **Given** selected name with verified domain availability, **When** domain registration is initiated, **Then** primary domain (.com or .io) is successfully registered within 24 hours
2. **Given** primary domain registered, **When** brand protection assessment is performed, **Then** at least 3 of 4 platform handles (GitHub, Twitter/X, LinkedIn, npm/pnpm scope) are available and reserved
3. **Given** registered primary domain, **When** considering misspelling protection, **Then** common misspellings are identified and strategy for defensive registration is documented

---

### User Story 3 - Codebase Name Migration (Priority: P3)

Update all codebase references from "Academic Explorer" to the selected new name, including package names, repository metadata, documentation, and UI text.

**Why this priority**: This is the technical implementation that follows the decision and domain registration. It can be planned and executed only after P1 and P2 are complete.

**Independent Test**: Can be tested by performing a full-text search for "Academic Explorer" across the codebase and verifying all appropriate occurrences are replaced, while testing that the application still builds and runs correctly.

**Acceptance Scenarios**:

1. **Given** new name selected and approved, **When** package.json files across monorepo are updated, **Then** all package names reflect new application name and npm/pnpm installation succeeds
2. **Given** updated package names, **When** documentation files (README.md, CLAUDE.md, etc.) are updated, **Then** all references to old name are replaced with context-appropriate new name
3. **Given** updated codebase references, **When** full build process is executed, **Then** all projects build successfully with no broken references to old name
4. **Given** updated application, **When** UI is loaded, **Then** all visible text (title tags, headers, navigation) displays new name correctly

---

### User Story 4 - External Presence Update (Priority: P4)

Update external references including GitHub repository name, deployment URLs, published documentation, and live site metadata.

**Why this priority**: This is the public-facing update that should happen only after internal codebase changes are complete and tested. It has the highest visibility impact.

**Independent Test**: Can be tested by verifying GitHub repository redirect works, GitHub Pages deployment succeeds at new URL, and search engines can discover the new name.

**Acceptance Scenarios**:

1. **Given** updated codebase merged to main branch, **When** GitHub repository is renamed, **Then** old repository URL redirects to new URL and all existing links continue to work
2. **Given** renamed repository, **When** GitHub Pages deployment runs, **Then** application is accessible at new URL (e.g., mearman.github.io/[NewName])
3. **Given** deployed application, **When** search engines crawl the site, **Then** meta tags and Open Graph data reflect new name and description
4. **Given** updated live site, **When** users access old bookmarked URLs, **Then** they are redirected to new URLs with appropriate HTTP status codes

---

### Edge Cases

- What happens when users have existing local storage or IndexedDB data under the old application name? (Migration strategy needed)
- How does the system handle external citations or academic references to "Academic Explorer" in published papers? (Documentation note and redirect strategy)
- What if the preferred domain becomes unavailable during the registration process? (Fallback to alternative extension or second-choice name)
- How are in-flight pull requests and branches referencing old name handled? (Update guidelines in PR template)
- What about existing social media presence or mentions under old name? (Announcement strategy and cross-posting plan)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a decision matrix comparing at least 4 name candidates with scores for uniqueness, relevance, memorability, and domain availability
- **FR-002**: System MUST verify domain availability for selected name across at least .com, .io, .app, and .org extensions before final approval
- **FR-003**: System MUST identify and document potential trademark conflicts via USPTO and EU trademark database searches
- **FR-004**: System MUST identify all codebase references to "Academic Explorer" including package names, file content, documentation, and UI text
- **FR-005**: System MUST update package.json name fields across all monorepo packages (apps/web, apps/cli, packages/*) to reflect new name
- **FR-006**: System MUST update all documentation files (README.md, CLAUDE.md, package.json descriptions) with new name
- **FR-007**: System MUST update UI text including HTML title tags, meta tags, navigation headers, and footer text
- **FR-008**: System MUST verify build process succeeds after name changes with no broken import paths or references
- **FR-009**: System MUST configure GitHub repository redirect from old name to new name to preserve external links
- **FR-010**: System MUST update deployment configuration to publish at new GitHub Pages URL
- **FR-011**: System MUST verify social media handle availability (GitHub, Twitter/X, LinkedIn, npm scope) for brand consistency
- **FR-012**: System MUST document migration strategy for existing user data stored under old application name
- **FR-013**: System MUST update all git commit history references in documentation to point to correct repository

### Key Entities

- **Name Candidate**: Represents a proposed application name with attributes: name string, uniqueness score (1-5 stars), relevance score (1-5 stars), memorability score (1-5 stars), domain availability status, conflict level, rationale
- **Domain Registration**: Represents a secured domain with attributes: domain name, extension (.com/.io/.app/.org), registrar, registration date, expiration date, status (available/pending/registered)
- **Codebase Reference**: Represents an occurrence of old name in codebase with attributes: file path, line number, context (package name/UI text/documentation/comment), replacement priority (critical/high/medium/low)
- **Brand Asset**: Represents a platform presence with attributes: platform name (GitHub/Twitter/LinkedIn/npm), handle/username, availability status, registration date

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Stakeholders select one name from candidates within 5 business days of presentation, with documented rationale referencing comparison matrix
- **SC-002**: Primary domain (.com or .io) is registered within 24 hours of name selection
- **SC-003**: At least 75% of identified social media handles (GitHub, Twitter/X, LinkedIn) are available and match selected name exactly
- **SC-004**: Zero broken imports or build failures occur after codebase name migration
- **SC-005**: Full monorepo build (pnpm build) completes successfully in under 10 minutes after name changes
- **SC-006**: All automated tests (pnpm test) pass with no failures after name changes
- **SC-007**: Zero occurrences of "Academic Explorer" remain in codebase outside of git history and archived documentation
- **SC-008**: GitHub repository redirect is configured and tested, with old URLs returning HTTP 301 status
- **SC-009**: Deployed application at new GitHub Pages URL loads in under 3 seconds with new name visible in title and navigation
- **SC-010**: Search engine meta tags and Open Graph data reflect new name within 48 hours of deployment

## Assumptions

- The research-provided name candidates (CitationMesh, ScholarWeave, Graphademia, ResearchLattice) are the primary options for consideration
- Domain registration will use a standard registrar (Namecheap, GoDaddy, or Cloudflare Registrar) with annual renewal
- The monorepo structure (Nx + pnpm) allows for package name changes without breaking workspace dependencies
- GitHub Pages deployment configuration can be updated without losing deployment history
- Existing user data in browser storage (localStorage, IndexedDB) can be migrated using database key mapping if needed
- Social media handles will follow the pattern @[ApplicationName] or [ApplicationName] without special characters
- The selected name will use proper capitalization (e.g., "CitationMesh" not "citationmesh") for branding purposes
- TypeScript import paths use @academic-explorer/* aliases which will need updating to @[new-name]/* format
- The repository name change will not break existing clone URLs (GitHub provides automatic redirects)
- The .io or .com domain extension is preferred; .app and .org are acceptable fallbacks

## Constitution Alignment *(recommended)*

- **Type Safety**: Name migration script will use TypeScript with strict typing; no `any` types for file path manipulation or content replacement
- **Test-First**: Each phase (decision, domain registration, codebase migration, deployment) has testable acceptance scenarios with measurable outcomes
- **Monorepo Architecture**: Changes span both apps/ (web, cli) and packages/ (client, graph, simulation, ui, utils, types) with workspace dependencies preserved
- **Storage Abstraction**: User data migration (if needed) will use existing storage provider interface, not direct IndexedDB access
- **Performance & Memory**: Build time and test execution time success criteria ensure migration doesn't degrade build performance
- **Atomic Conventional Commits**: Implementation will use conventional commits per phase: `docs(rebrand): update name to [NewName] in README`, `refactor(packages): rename @academic-explorer scope to @[new-name]`, `ci(deploy): configure GitHub Pages for new repository name`

## Open Questions

[NEEDS CLARIFICATION: Which name should we select from the top candidates - ScholarWeave (highest score 25/25, most elegant), CitationMesh (23/25, technically descriptive), Graphademia (22/25, portmanteau), or ResearchLattice (22/25, scientific term)? This decision impacts all subsequent work.]

## Next Steps

1. Present decision matrix to project stakeholders for name selection
2. Verify selected name's domain availability using multiple registrars
3. Perform trademark search for selected name (USPTO + EU databases)
4. Register primary domain immediately upon clearance
5. Create detailed migration plan for codebase updates (file list, replacement patterns)
6. Execute codebase migration in isolated branch with full test coverage
7. Update GitHub repository settings and deployment configuration
8. Publish announcement with redirect strategy for old references
