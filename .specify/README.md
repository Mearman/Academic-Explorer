# GitHub Spec Kit Setup

This directory contains the GitHub Spec Kit configuration for spec-driven development in the Academic Explorer project.

## What is Spec Kit?

GitHub Spec Kit is a toolkit for Spec-Driven Development with AI coding agents. It provides a structured workflow for:
- Creating feature specifications
- Generating implementation plans
- Breaking down features into tasks
- Maintaining project principles and guidelines

## Directory Structure

```
.specify/
├── memory/
│   └── constitution.md    # Project principles and development standards
├── scripts/
│   └── bash/              # Automation scripts for spec-driven workflow
└── README.md              # This file

.claude/commands/
├── speckit.specify.md      # Create or update feature specifications
├── speckit.plan.md         # Generate implementation plans
├── speckit.tasks.md        # Break down features into actionable tasks
├── speckit.implement.md    # Execute implementation steps
├── speckit.checklist.md    # Create quality checklists
├── speckit.clarify.md      # Clarify specification questions
├── speckit.analyze.md      # Analyze code and features
└── speckit.constitution.md # Create/update project constitution

specs/                      # Feature specifications (git-tracked)
templates/                  # Spec templates
checklists/                 # Quality checklists
```

## Available Commands

After setup, the following slash commands are available in Claude Code:

### Core Workflow Commands

- `/speckit.specify <feature description>` - Create a new feature specification
  - Generates a concise short name for the feature
  - Checks for existing branches
  - Creates a spec file with quality validation
  - Identifies clarifications needed

- `/speckit.clarify` - Clarify specification questions
  - Address [NEEDS CLARIFICATION] markers
  - Update specs with user responses

- `/speckit.plan` - Generate implementation plan
  - Creates technical architecture
  - Identifies components and dependencies
  - Technology-agnostic design

- `/speckit.tasks` - Break down into actionable tasks
  - Generates task list from plan
  - Creates implementation checklist
  - Tracks progress

- `/speckit.implement` - Execute implementation
  - Follows task list
  - Implements features
  - Runs tests and validation

### Supporting Commands

- `/speckit.checklist` - Create quality checklists
  - Specification quality validation
  - Implementation verification
  - Testing requirements

- `/speckit.analyze` - Analyze code and features
  - Review existing code
  - Identify patterns and issues
  - Suggest improvements

- `/speckit.constitution` - Create/update project constitution
  - Define development principles
  - Set quality standards
  - Establish governance rules

## Project Constitution

The project constitution is located at `.specify/memory/constitution.md` and defines:

- **Core Principles**: TypeScript-first, monorepo architecture, TDD, deterministic behavior
- **Development Standards**: Code quality, testing requirements, OpenAlex integration
- **Quality Pipeline**: Type checking, testing, linting, building
- **CI/CD Requirements**: GitHub Actions, deployment, rollback procedures

## Workflow Example

1. **Create Specification**:
   ```
   /speckit.specify Add dark mode toggle to application settings
   ```

2. **Clarify Requirements** (if needed):
   ```
   /speckit.clarify
   ```

3. **Generate Plan**:
   ```
   /speckit.plan
   ```

4. **Break Down Tasks**:
   ```
   /speckit.tasks
   ```

5. **Implement**:
   ```
   /speckit.implement
   ```

## Spec-Driven Development Principles

### What vs. How
- **Specifications** (spec.md) describe WHAT users need and WHY (business value)
- **Plans** (plan.md) describe HOW to implement (technical architecture)
- **Tasks** (tasks.md) break down HOW into actionable steps

### Quality Gates
- Specifications must be technology-agnostic
- Requirements must be testable and unambiguous
- Success criteria must be measurable
- Maximum 3 [NEEDS CLARIFICATION] markers per spec

### Branch Naming
Feature branches follow the pattern: `N-short-name`
- N: Sequential feature number
- short-name: 2-4 word description (e.g., "user-auth", "analytics-dashboard")

## Integration with Academic Explorer

Spec Kit is configured to work with:
- Nx monorepo structure
- TypeScript strict mode
- TDD workflow
- GitHub Actions CI/CD
- Multi-tier caching architecture
- OpenAlex API integration

## Documentation

- [Spec Kit GitHub Repository](https://github.com/github/spec-kit)
- [Spec-Driven Development Guide](https://github.com/github/spec-kit/blob/main/spec-driven.md)
- [Academic Explorer Constitution](./.specify/memory/constitution.md)

## Version

**Spec Kit Version**: Latest (from git)
**Constitution Version**: 1.0.0
**Installed**: 2025-11-11
