#!/usr/bin/env bash
# Calculate rank based on name length and availability, then sort

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_DIR="$(dirname "$SCRIPT_DIR")"
DB_FILE="$SPEC_DIR/all-names-database.json"
TEMP_FILE="$SPEC_DIR/.all-names-database.json.tmp"

echo "=========================================="
echo "Rank Calculator and Sorter"
echo "=========================================="
echo ""

# Calculate rank and sort using jq
jq '
  # Read TLD count from config
  (.config.tlds | length) as $tld_count |
  
  # Process each name
  .names |= map(
    # Get name length
    (.name | length) as $name_length |
    
    # Calculate availability count
    (.availability | 
      [.com, .io, .net, .["co.uk"], .dev] | 
      map(select(. == true)) | 
      length
    ) as $available_count |
    
    # Calculate availability score (0-100)
    (if .availability.status == "fully-available" then 100
     elif .availability.status == "partial" then ($available_count / $tld_count * 50)
     else 0
     end) as $availability_score |
    
    # Calculate length score (0-100, shorter = better)
    (if $name_length <= 5 then 100
     elif $name_length <= 10 then (100 - (($name_length - 5) * 5))
     elif $name_length <= 15 then (75 - (($name_length - 10) * 5))
     elif $name_length <= 20 then (50 - (($name_length - 15) * 5))
     else (25 - (($name_length - 20) * 1.25))
     end) as $length_score |

    # Calculate research score (0-100, normalize from 0-25 scale)
    ((if .researchScore then .researchScore else 0 end) * 4) as $research_score |

    # Calculate total rank (weighted: 50% availability, 20% length, 30% research)
    (($availability_score * 0.5) + ($length_score * 0.2) + ($research_score * 0.3)) as $rank |

    # Add rank and component scores to the object
    . + {
      rank: ($rank | round),
      rankComponents: {
        availabilityScore: ($availability_score | round),
        lengthScore: ($length_score | round),
        researchScore: ($research_score | round),
        nameLength: $name_length,
        availableCount: $available_count,
        totalTlds: $tld_count
      }
    }
  ) |
  
  # Sort by rank (descending), then by name (ascending) for ties
  .names |= sort_by([-.rank, .name])
' "$DB_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$DB_FILE"

echo "✓ Rank calculated and database sorted"
echo ""

# Show top 10
echo "=========================================="
echo "TOP 10 NAMES BY RANK"
echo "=========================================="
echo ""

jq -r '.names[0:10] | .[] |
  "\(.rank) pts - \(.name) (\(.rankComponents.nameLength) chars, \(.availability.status))\(if .researchScore then " [Research: \(.researchScore)/25]" else "" end)
    Availability: \(.rankComponents.availableCount)/\(.rankComponents.totalTlds) TLDs = \(.rankComponents.availabilityScore) pts (50%)
    Length: \(.rankComponents.nameLength) chars = \(.rankComponents.lengthScore) pts (20%)
    Research: \(.rankComponents.researchScore) pts (30%)"
' "$DB_FILE"

echo ""
echo "=========================================="
echo "STATISTICS BY RANK RANGE"
echo "=========================================="
echo ""

jq -r '
  [.names[] | select(.rank >= 90)] as $excellent |
  [.names[] | select(.rank >= 70 and .rank < 90)] as $good |
  [.names[] | select(.rank >= 50 and .rank < 70)] as $fair |
  [.names[] | select(.rank >= 30 and .rank < 50)] as $poor |
  [.names[] | select(.rank < 30)] as $very_poor |
  
  "90-100 (Excellent): \($excellent | length) names\(if ($excellent | length) > 0 then " (e.g., \($excellent[0:3] | map(.name) | join(", ")))" else "" end)",
  "70-89 (Good): \($good | length) names\(if ($good | length) > 0 then " (e.g., \($good[0:3] | map(.name) | join(", ")))" else "" end)",
  "50-69 (Fair): \($fair | length) names\(if ($fair | length) > 0 then " (e.g., \($fair[0:3] | map(.name) | join(", ")))" else "" end)",
  "30-49 (Poor): \($poor | length) names\(if ($poor | length) > 0 then " (e.g., \($poor[0:3] | map(.name) | join(", ")))" else "" end)",
  "0-29 (Very Poor): \($very_poor | length) names\(if ($very_poor | length) > 0 then " (e.g., \($very_poor[0:3] | map(.name) | join(", ")))" else "" end)"
' "$DB_FILE"

echo ""
echo "✓ Database updated with rankings and sorted"
