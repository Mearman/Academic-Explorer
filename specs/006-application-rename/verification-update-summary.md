# Domain Availability Verification Update Summary

**Date**: 2025-11-12
**Script**: `update-database-availability.sh`

## Update Details

### New Names Verified: 12

All new "New Non-Compound Concepts" names have been checked and the database updated.

## Results

### ✗ All Taken (7 names)

1. **Mentoria** - Mentor + ia suffix, guided scholarly mentorship
2. **Archivum** - Latin for archive, curated archive of knowledge
3. **Lucerna** - Latin for lantern, illuminating research pathways
4. **Vectura** - Vector-inspired, movement through knowledge graphs
5. **Cognitia** - Cognition-derived, domain of understanding
6. **Mentis** - Latin for mind/intellect
7. **Luminor** - Lumina + or suffix, bringer of light

### ~ Partially Available (5 names)

1. **Scholarium** - Scholar + Latin suffix, scholarly repository (1/2 available)
2. **Protasis** - Rhetorical term, opening proposition (1/2 available)
3. **Synkrisis** - Ancient rhetorical comparison (1/2 available)
4. **Auraton** - Aura + ton blend, golden aura of insights (1/2 available)
5. **Erudion** - Streamlined erudition, deep scholarly learning (1/2 available)

### ✓ Fully Available: 0 new names

No new names are fully available with both .com and .io extensions.

## Updated Database Statistics

**Total Names in Database**: 119
- **Verified**: 119 (100%)
- **Fully Available** (.com + .io): 5 names
- **Partially Available**: 26 names
- **All Taken**: 88 names

## Fully Available Names (Complete List)

Only **5 names** from the entire database of 119 have both .com and .io available:

1. **ScholarWeave** (Original Top 4, Score: 25/25) ⭐
2. **CitationMesh** (Original Top 4, Score: 23/25)
3. **Graphademia** (Original Top 4, Score: 22/25)
4. **ResearchLattice** (Original Top 4, Score: 22/25)
5. **Bibliom** (First Round Non-Compound)

## Key Insights

### Success Rates by Category

| Category | Total | Fully Available | Partial | Taken | Success Rate |
|----------|-------|-----------------|---------|-------|--------------|
| **Original Compound Names** | 4 | 4 | 0 | 0 | **100%** |
| **All Non-Compound Names** | 115 | 1 | 26 | 88 | **0.87%** |
| **New Concepts Round** | 12 | 0 | 5 | 7 | **0%** |

### Overall Statistics

- **Total names researched**: 119
- **Total domains checked**: 238 (.com and .io for each)
- **Fully available rate**: 4.2% (5/119)
- **Any availability rate**: 26.1% (31/119)

## Conclusion

The verification of 12 additional "New Non-Compound Concepts" names reinforces the original finding:

**Compound portmanteau names dramatically outperform single-word names in domain availability.**

- Compound words: **100% availability** (4/4)
- All non-compound attempts: **0.87% availability** (1/115)

This data strongly validates the original research approach and confirms that **ScholarWeave** remains the optimal choice with:
- Highest research score (25/25)
- Full domain availability (.com and .io)
- No conflicts
- Clear, memorable, scholarly meaning

## Script Usage

The consolidated `update-database-availability.sh` script:
- Automatically finds unverified names in the JSON database
- Checks domain availability via DNS lookups
- Updates the database with results
- Maintains metadata statistics
- Can be run repeatedly to verify new additions

**Usage**:
```bash
cd specs/006-application-rename
bash scripts/update-database-availability.sh
```

---

**Database File**: `all-names-database.json` (now fully updated with all 119 names verified)
