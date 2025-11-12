#!/usr/bin/env bash
# Verify high-priority short names only

set -euo pipefail

DB_FILE="all-names-database.json"
TEMP_FILE=".all-names-database.json.tmp"

# Priority names to check (most likely to be available)
priority_names=(
    # Unique 4-char names
    "Arke" "Axon" "Cyte" "Docq" "Glyf" "Kaos" "Lume" "Nodo" "Prax" "Qube" "Ryze" "Synt"
    
    # Unique 5-6 char names
    "Acadex" "Arkive" "Citero" "Cognix" "Eduvia" "Grapho" "Lexica" "Lithos" "Methix" "Writex" "Xypher"
    
    # Promising 7-8 char names
    "Academix" "Citeflow" "Cognixa" "Docuflow" "Edubase" "Graphex" "Learniq" "Logiciq" "Paperiq" "Quoteiq" "Scholiq" "Thinkiq" "Writeiq"
)

echo "=========================================="
echo "Priority Domain Verification"
echo "=========================================="
echo ""
echo "Checking ${#priority_names[@]} priority names"
echo ""

TLDs=("com" "io" "net" "co.uk" "dev")

for name in "${priority_names[@]}"; do
    name_lower=$(echo "$name" | tr '[:upper:]' '[:lower:]')
    
    # Check if already verified
    is_verified=$(jq --arg name "$name" '.names[] | select(.name == $name) | .availability.verified' "$DB_FILE")
    
    if [ "$is_verified" = "true" ]; then
        echo "⊘ $name - already verified, skipping"
        continue
    fi
    
    # Check all TLDs
    declare -A tld_availability
    available_count=0
    
    for tld in "${TLDs[@]}"; do
        domain="${name_lower}.${tld}"
        
        # WHOIS check
        whois_available=false
        whois_output=$(timeout 5 whois "$domain" 2>&1 || echo "timeout")
        
        if echo "$whois_output" | grep -qiE "(no match|not found|no entries found|no data found|status: free|status: available)"; then
            whois_available=true
        fi
        
        # Check if WHOIS has useful data
        whois_has_data=false
        if echo "$whois_output" | grep -qiE "(registrar:|creation date|registry expiry|domain status|name server)"; then
            whois_has_data=true
        elif echo "$whois_output" | grep -qiE "(no match|not found|no entries found|no data found)"; then
            whois_has_data=true
        fi
        
        # DNS check
        dns_available=false
        if ! host "$domain" &>/dev/null; then
            dns_available=true
        fi
        
        # Combined logic
        if [ "$whois_has_data" = true ]; then
            if [ "$whois_available" = true ] && [ "$dns_available" = true ]; then
                tld_availability[$tld]=true
                available_count=$((available_count + 1))
            else
                tld_availability[$tld]=false
            fi
        else
            if [ "$dns_available" = true ]; then
                tld_availability[$tld]=true
                available_count=$((available_count + 1))
            else
                tld_availability[$tld]=false
            fi
        fi
        
        sleep 0.5
    done
    
    # Determine status
    if [ $available_count -eq 5 ]; then
        status="fully-available"
        echo "✓ $name - FULLY AVAILABLE (${TLDs[*]})"
    elif [ $available_count -gt 0 ]; then
        status="partial"
        echo "~ $name - PARTIAL ($available_count/5 available)"
    else
        status="all-taken"
        echo "✗ $name - ALL TAKEN"
    fi
    
    # Update database
    jq_update='(.names[] | select(.name == $name) | .availability) |= {status: $status, verified: true'
    jq_args=(--arg name "$name" --arg status "$status")
    
    for tld in "${TLDs[@]}"; do
        tld_var=$(echo "$tld" | tr '.' '_')
        jq_update+=", \"${tld}\": \$${tld_var}"
        jq_args+=(--argjson "$tld_var" "${tld_availability[$tld]}")
    done
    
    jq_update+='}'
    
    jq "${jq_args[@]}" "$jq_update" "$DB_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$DB_FILE"
    
    unset tld_availability
done

echo ""
echo "✓ Priority verification complete"
echo ""

