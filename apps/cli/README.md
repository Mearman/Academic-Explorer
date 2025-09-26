# OpenAlex CLI

Command-line interface for accessing OpenAlex academic data with intelligent caching and entity management.

## Main Commands

```bash
# Entity Operations
pnpm cli get <entity-id>              # Auto-detect entity type
pnpm cli get-typed authors A123       # Get specific entity type
pnpm cli list authors                 # List entities
pnpm cli search authors "ML"          # Search entities
pnpm cli stats                        # Show statistics

# Cache Management
pnpm cli cache:stats                  # Cache statistics
pnpm cli cache:clear --confirm        # Clear cache

# Static Data
pnpm cli static:analyze              # Analyze usage patterns
pnpm cli static:generate             # Generate static cache
```

**Supported Entities**: works, authors, sources, institutions, topics, publishers, funders