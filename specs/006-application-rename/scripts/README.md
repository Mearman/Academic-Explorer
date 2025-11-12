# Domain Availability Checker Scripts

This directory contains scripts for verifying domain availability for the Academic Explorer application rename project.

## Main Script: `update-database-availability.sh`

### Features

- **Dynamic TLD Configuration**: Reads TLDs from `all-names-database.json` config section
- **Automatic Name Discovery**: Finds all unverified names in the database
- **DNS Verification**: Checks domain availability using DNS lookups
- **Auto-Update**: Updates the JSON database with verification results
- **Idempotent**: Can be run repeatedly as new names are added

### Usage

```bash
cd specs/006-application-rename
bash scripts/update-database-availability.sh
```

### Configuring TLDs to Check

Edit the `config.tlds` array in `all-names-database.json`:

```json
{
  "config": {
    "tlds": ["com", "io", "app", "org"],
    "description": "Top-level domains to check for availability."
  },
  ...
}
```

**Supported TLDs**: Any valid top-level domain (com, io, org, net, app, dev, ai, etc.)

### Adding New Names to Verify

1. Add new name entries to `all-names-database.json` with `verified: false`:

```json
{
  "name": "NewName",
  "type": "invented",
  "category": "Your Category",
  "origin": "Description of origin",
  "pronunciation": "new-NAME",
  "meaning": "What it means",
  "vibe": "Brand personality",
  "researchScore": null,
  "availability": {
    "status": "unverified",
    "com": null,
    "io": null,
    "verified": false
  },
  "pricing": null,
  "conflicts": [],
  "recommendation": "research-needed",
  "notes": "Additional notes"
}
```

2. Run the script:

```bash
bash scripts/update-database-availability.sh
```

The script will automatically:
- Find the new unverified name
- Check all configured TLDs
- Update the availability status
- Set `verified: true`

### How It Works

1. **Reads Configuration**: Extracts TLD list from `config.tlds`
2. **Finds Unverified Names**: Queries JSON for entries with `verified: false`
3. **DNS Checks**: For each name, checks `{name}.{tld}` using `host` command
4. **Determines Status**:
   - `fully-available`: All configured TLDs available
   - `partial`: Some TLDs available
   - `all-taken`: No TLDs available
5. **Updates Database**: Uses `jq` to update the JSON with results
6. **Updates Metadata**: Recalculates totals and statistics

### Output Example

```
==========================================
Domain Availability Database Updater
==========================================

Reading configuration...
TLDs to check: com io app org (4 extensions)

Finding unverified names...
Found 3 unverified names

✓ ExampleName - FULLY AVAILABLE (com io app org)
~ PartialName - PARTIAL (2/4 available)
✗ TakenName - ALL TAKEN

==========================================
UPDATE SUMMARY
==========================================

Total names checked: 3
Fully available (.com + .io + .app + .org): 1
Partially available: 1
All taken: 1

✓ Fully Available Names:
  - ExampleName

~ Partially Available Names:
  - PartialName

==========================================
DATABASE UPDATED
==========================================

Updated: all-names-database.json

Current database statistics:
  Total names: 129
  Verified: 129
  Fully available: 6
  Partially available: 30
  All taken: 93
  Unverified: 0

✓ All names in database have been verified!
```

### Requirements

- **bash**: Version 4.0+ (for associative arrays)
- **jq**: JSON processor for reading/writing database
  ```bash
  brew install jq  # macOS
  ```
- **host**: DNS lookup utility (usually pre-installed)

### Database Structure

The script expects this structure in `all-names-database.json`:

```json
{
  "config": {
    "tlds": ["com", "io"],
    "description": "..."
  },
  "metadata": {
    "totalNames": 129,
    "fullyAvailable": 6,
    "partiallyAvailable": 30,
    "allTaken": 93,
    ...
  },
  "names": [
    {
      "name": "NameHere",
      "availability": {
        "status": "unverified|fully-available|partial|all-taken",
        "verified": true|false,
        "com": true|false|null,
        "io": true|false|null,
        ...
      },
      ...
    }
  ]
}
```

### Availability Status Values

- **`unverified`**: Not yet checked
- **`fully-available`**: All configured TLDs available
- **`partial`**: Some TLDs available
- **`all-taken`**: No TLDs available

### Tips

1. **Add Multiple TLDs**: Check popular extensions like `.app`, `.dev`, `.ai`, `.org`
2. **Batch Operations**: Add multiple names before running the script
3. **Re-verification**: To re-check a name, set `verified: false`
4. **Partial Results**: Check which specific TLD is available by examining the JSON

### Legacy Scripts

- `check-domain-availability.sh`: Original checker with WHOIS support
- `check-domains-simple.sh`: Simple checker for top 4 candidates
- `check-alternative-domains.sh`: First round alternatives (40 names)
- `check-expanded-domains.sh`: Expanded alternatives (65 names)

These scripts are preserved for reference but **`update-database-availability.sh` is recommended** for all new work.

## Example Workflow

```bash
# 1. Add new name ideas to all-names-database.json with verified: false

# 2. Optionally update TLDs to check
jq '.config.tlds = ["com", "io", "app", "dev"]' all-names-database.json > temp.json
mv temp.json all-names-database.json

# 3. Run verification
bash scripts/update-database-availability.sh

# 4. Check results
jq '.names[] | select(.availability.status == "fully-available") | .name' \
   all-names-database.json

# 5. Commit changes
git add all-names-database.json
git commit -m "docs(root): verify new name candidates"
```

## Contributing

When adding new verification capabilities:
1. Update the script with new logic
2. Test with sample unverified names
3. Update this README
4. Document any new requirements
