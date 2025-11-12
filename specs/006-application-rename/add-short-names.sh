#!/usr/bin/env bash
# Add more short name suggestions (3-10 characters)

set -euo pipefail

DB_FILE="all-names-database.json"
TEMP_FILE=".all-names-database.json.tmp"

# New short names to add (3-10 characters)
new_names=(
    # 3-4 characters
    "Acme"
    "Aeon"
    "Arke"
    "Axon"
    "Cyte"
    "Docq"
    "Enso"
    "Glyf"
    "Hexa"
    "Iota"
    "Kaos"
    "Lume"
    "Meta"
    "Nodo"
    "Omni"
    "Prax"
    "Qube"
    "Ryze"
    "Synt"
    "Texa"
    "Velo"
    "Writ"
    "Xeno"
    "Yara"
    "Zeno"
    
    # 5-6 characters
    "Acadex"
    "Arkive"
    "Citero"
    "Cognix"
    "Docent"
    "Eduvia"
    "Ethica"
    "Factum"
    "Grapho"
    "Ideate"
    "Lexica"
    "Lithos"
    "Logica"
    "Methix"
    "Neuron"
    "Notion"
    "Praxis"
    "Quasar"
    "Recite"
    "Schola"
    "Thesis"
    "Verify"
    "Writex"
    "Xypher"
    
    # 7-8 characters
    "Academix"
    "Archival"
    "Biblio"
    "Citeflow"
    "Cognixa"
    "Docuflow"
    "Edubase"
    "Factbase"
    "Graphex"
    "Infomap"
    "Knowbase"
    "Learniq"
    "Literate"
    "Logiciq"
    "Mindmap"
    "Notebox"
    "Paperiq"
    "Quoteiq"
    "Readflow"
    "Scholiq"
    "Thinkiq"
    "Veritas"
    "Writeiq"
    
    # 9-10 characters
    "Academica"
    "Briefcase"
    "Citeflex"
    "Cognibase"
    "Docubase"
    "Edumetric"
    "Factcheck"
    "Graphflow"
    "Infobase"
    "Knowflow"
    "Learnbase"
    "Literati"
    "Metastudy"
    "Notespace"
    "Paperflow"
    "Quotebox"
    "Readbase"
    "Scholarly"
    "Studyflow"
    "Thinkbase"
)

echo "=========================================="
echo "Adding Short Name Suggestions"
echo "=========================================="
echo ""
echo "Adding ${#new_names[@]} new names (3-10 characters)"
echo ""

# Add each new name to the database
for name in "${new_names[@]}"; do
    # Check if name already exists
    exists=$(jq --arg name "$name" '.names[] | select(.name == $name) | .name' "$DB_FILE")
    
    if [ -n "$exists" ]; then
        echo "⊘ $name - already exists, skipping"
        continue
    fi
    
    # Add new name with unverified availability
    jq --arg name "$name" '
        .names += [{
            name: $name,
            availability: {
                status: "unverified",
                verified: false,
                com: false,
                io: false,
                net: false,
                "co.uk": false,
                dev: false
            }
        }]
    ' "$DB_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$DB_FILE"
    
    echo "✓ $name - added ($(echo -n "$name" | wc -c) characters)"
done

# Update metadata
total_names=$(jq '.names | length' "$DB_FILE")
jq --argjson total "$total_names" \
   '.metadata.totalNames = $total' \
   "$DB_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$DB_FILE"

echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "Total names in database: $total_names"
echo ""
echo "Next steps:"
echo "1. Run: bash scripts/update-database-availability.sh"
echo "2. Run: bash scripts/calculate-rank-and-sort.sh"
echo ""

