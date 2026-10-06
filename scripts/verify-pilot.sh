#!/bin/bash
# IntentLane Pilot Verification Automation
# Automates machine-verifiable gates, produces checklist for human gates
# Usage: ./scripts/verify-pilot.sh <pilot-dir> [--output json|text]

set -euo pipefail

PILOT_DIR="${1:-pilots/netnewswire}"
OUTPUT_FORMAT="${2:-text}"
if [[ "$OUTPUT_FORMAT" == "--output" ]]; then
    OUTPUT_FORMAT="${3:-text}"
fi
REPO_ROOT=$(git rev-parse --show-toplevel)

# Load pilot config
CONTRACT_FILE="$PILOT_DIR/contract.yaml"
PILOT_YAML="$PILOT_DIR/pilot.yaml"
APP_ID=$(grep '^app:' "$CONTRACT_FILE" -A 10 | grep 'id:' | head -1 | sed 's/.*id: *//')
APP_NAME=$(grep '^app:' "$CONTRACT_FILE" -A 10 | grep 'name:' | head -1 | sed 's/.*name: *//')
URL_SCHEME=$(grep '^app:' "$CONTRACT_FILE" -A 10 | grep 'url_scheme:' | head -1 | sed 's/.*url_scheme: *//')
FIXTURE_URL="http://127.0.0.1:8765/pilot-feed.xml"

# Results storage
RESULTS=()
HUMAN_GATES=()

add_result() {
    local gate="$1" status="$2" details="$3"
    RESULTS+=("{\"gate\":\"$gate\",\"status\":\"$status\",\"details\":\"$details\"}")
}

add_human_gate() {
    local gate="$1" description="$2" protocol="$3"
    HUMAN_GATES+=("{\"gate\":\"$gate\",\"description\":\"$description\",\"protocol\":\"$protocol\"}")
}

# Helper: log to stderr (for JSON mode, keep stdout clean)
log() {
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        return  # Suppress all logs in JSON mode
    else
        echo "$@"
    fi
}

# 1. Contract validation
log ""
log "=== IntentLane Pilot Verification: $APP_NAME ==="
log ""
log "1. Contract validation..."
if pnpm exec tsx "$REPO_ROOT/packages/cli/src/index.ts" validate -c "$CONTRACT_FILE" >/dev/null 2>&1; then
    add_result "contract" "pass" "Contract validates"
    log "   ✅ Contract valid"
else
    add_result "contract" "fail" "Contract validation failed"
    log "   ❌ Contract invalid"
    exit 1
fi

# 2. Fixture server
log ""
log "2. Fixture server..."
if curl -s -o /dev/null -w '%{http_code}' "$FIXTURE_URL" | grep -q "200"; then
    add_result "fixture" "pass" "Fixture server responding at $FIXTURE_URL"
    log "   ✅ Fixture server responding"
else
    add_result "fixture" "fail" "Fixture server not responding"
    log "   ❌ Fixture server not responding (run serve.sh)"
fi

# 3. Generated artifacts check
log ""
log "3. Generated artifacts..."
# Check both project-level and pilot-level generated dirs
GEN_DIRS=(
    "$REPO_ROOT/.intentlane/generated"
    "$PILOT_DIR/.intentlane/generated"
    "$PILOT_DIR/.build/netnewswire/Mac/IntentLanePilot"
)
ARTIFACTS_FOUND=0
for dir in "${GEN_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        COUNT=$(ls "$dir"/*.swift 2>/dev/null | wc -l | tr -d ' ')
        if [[ "$COUNT" -gt 0 ]]; then
            ARTIFACTS_FOUND=$COUNT
            break
        fi
    fi
done

if [[ "$ARTIFACTS_FOUND" -gt 0 ]]; then
    add_result "artifacts" "pass" "$ARTIFACTS_FOUND Swift files generated"
    log "   ✅ $ARTIFACTS_FOUND Swift artifacts generated"
else
    add_result "artifacts" "fail" "No generated artifacts"
    log "   ❌ No generated artifacts (run generate)"
fi

# 4. App installation (check common locations)
log ""
log "4. App installation..."
APP_PATHS=(
    "/Applications/${APP_NAME}.app"
    "$HOME/Applications/${APP_NAME}.app"
    "$PILOT_DIR/.build/netnewswire/.intentlane/derived/Build/Products/Debug/${APP_NAME}.app"
)
APP_PATH=""
for path in "${APP_PATHS[@]}"; do
    if [[ -d "$path" ]]; then
        APP_PATH="$path"
        break
    fi
done

if [[ -n "$APP_PATH" ]]; then
    add_result "app_install" "pass" "App found at $APP_PATH"
    log "   ✅ App installed at: $APP_PATH"
else
    add_result "app_install" "fail" "App not found in standard locations"
    log "   ❌ App not installed (build with reproduce.sh)"
fi

# 5. Spotlight index verification (run pilot test if available)
log ""
log "5. Spotlight index verification..."
SPOTLIGHT_TEST=$(grep -A 10 'gates:' "$PILOT_DIR/pilot.yaml" 2>/dev/null | grep 'spotlight_index:' | head -1 | sed 's/.*spotlight_index: *//' || true)
if [[ -n "$SPOTLIGHT_TEST" ]]; then
    log "   Running: $SPOTLIGHT_TEST"
    if eval "$SPOTLIGHT_TEST" >/dev/null 2>&1; then
        add_result "spotlight_index" "pass" "Spotlight index test passed"
        log "   ✅ Spotlight index test passed"
    else
        add_result "spotlight_index" "fail" "Spotlight index test failed (entities not indexed)"
        log "   ❌ Spotlight index test failed"
    fi
else
    # Fallback: basic mdfind check
    open -a "$APP_PATH" 2>/dev/null || true
    sleep 3
    RESULTS_COUNT=$(mdfind "kMDItemContentType == 'com.apple.intents.entity'" 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$RESULTS_COUNT" -gt 0 ]]; then
        add_result "spotlight_index" "pass" "Found $RESULTS_COUNT indexed entities"
        log "   ✅ Spotlight index has $RESULTS_COUNT entities"
    else
        add_result "spotlight_index" "fail" "No entities found in Spotlight index"
        log "   ❌ No entities in Spotlight index"
    fi
fi

# 6. Shortcuts verification (run pilot test if available)
log ""
log "6. Shortcuts verification..."
SHORTCUTS_TEST=$(grep -A 10 'gates:' "$PILOT_DIR/pilot.yaml" 2>/dev/null | grep 'shortcuts_donation:' | head -1 | sed 's/.*shortcuts_donation: *//' || true)
if [[ -n "$SHORTCUTS_TEST" ]]; then
    log "   Running: $SHORTCUTS_TEST"
    if eval "$SHORTCUTS_TEST" >/dev/null 2>&1; then
        add_result "shortcuts" "pass" "Shortcuts donation test passed"
        log "   ✅ Shortcuts donation test passed"
    else
        add_result "shortcuts" "fail" "Shortcuts donation test failed (shortcuts not donated)"
        log "   ❌ Shortcuts donation test failed"
    fi
else
    # Fallback: basic shortcuts list check
    SHORTCUTS_LIST=$(shortcuts list 2>/dev/null || true)
    if echo "$SHORTCUTS_LIST" | grep -qi "$APP_NAME\|$URL_SCHEME"; then
        COUNT=$(echo "$SHORTCUTS_LIST" | grep -ci "$APP_NAME\|$URL_SCHEME" || echo 0)
        add_result "shortcuts" "pass" "$COUNT pilot shortcut(s) registered"
        log "   ✅ $COUNT shortcut(s) registered"
    else
        add_result "shortcuts" "fail" "No pilot shortcuts found (may need app launch + donation)"
        log "   ❌ No pilot shortcuts found"
    fi
fi

# 7. AppIntentsTesting (run pilot test if available)
log ""
log "7. AppIntentsTesting (contract)..."
APPINTENTS_TEST=$(grep -A 10 'gates:' "$PILOT_DIR/pilot.yaml" 2>/dev/null | grep 'appintents_testing:' | head -1 | sed 's/.*appintents_testing: *//' || true)
if [[ -n "$APPINTENTS_TEST" ]]; then
    log "   Running: $APPINTENTS_TEST"
    if eval "$APPINTENTS_TEST" >/dev/null 2>&1; then
        add_result "appintents_testing" "pass" "AppIntentsTesting passed"
        log "   ✅ AppIntentsTesting passed"
    else
        add_result "appintents_testing" "fail" "AppIntentsTesting failed (tests not configured or failing)"
        log "   ❌ AppIntentsTesting failed"
    fi
else
    add_result "appintents_testing" "not_configured" "No test command in pilot.yaml"
    log "   ⚠️  No AppIntentsTesting command configured"
fi

# 8. Human gates (Siri AI, Spotlight UI, Shortcuts execution)
log ""
log "8. Human gates (require manual verification)..."

# From MANUAL-SIRI-ACCEPTANCE.md
add_human_gate "siri_open" \
    "Say 'Open an article in $APP_NAME' → Siri shows selection → select Alpha → Alpha opens" \
    "MANUAL-SIRI-ACCEPTANCE.md step 4"

add_human_gate "siri_mark_read" \
    "Say 'Mark an article as read in $APP_NAME' → Siri shows selection → select Beta → Beta marked read" \
    "MANUAL-SIRI-ACCEPTANCE.md step 5"

add_human_gate "siri_negative" \
    "Say 'Open an article called NothingHere' → no article opens, Gamma never selected" \
    "MANUAL-SIRI-ACCEPTANCE.md step 6"

add_human_gate "spotlight_ui" \
    "Search 'Alpha article about feed readers' in Spotlight → click result → Alpha opens in app" \
    "MANUAL-SIRI-ACCEPTANCE.md step 3"

add_human_gate "shortcuts_ui" \
    "Open Shortcuts app → verify 'Open article' and 'Mark article as read' with Article parameter" \
    "MANUAL-SIRI-ACCEPTANCE.md step 2"

add_human_gate "independent_reproduction" \
    "Second tester reproduces all steps on clean session/machine" \
    "MANUAL-SIRI-ACCEPTANCE.md step 7"

log "   📋 ${#HUMAN_GATES[@]} human gates require manual verification:"
for i in "${!HUMAN_GATES[@]}"; do
    GATE=$(echo "${HUMAN_GATES[$i]}" | jq -r '.gate')
    DESC=$(echo "${HUMAN_GATES[$i]}" | jq -r '.description')
    log "      $((i+1)). $GATE: $DESC"
done

# Output
if [[ "$OUTPUT_FORMAT" == "json" ]]; then
    # Build JSON arrays properly
    RESULTS_JSON="["
    for i in "${!RESULTS[@]}"; do
        if [[ $i -gt 0 ]]; then RESULTS_JSON+=","; fi
        RESULTS_JSON+="${RESULTS[$i]}"
    done
    RESULTS_JSON+="]"
    
    HUMAN_JSON="["
    for i in "${!HUMAN_GATES[@]}"; do
        if [[ $i -gt 0 ]]; then HUMAN_JSON+=","; fi
        HUMAN_JSON+="${HUMAN_GATES[$i]}"
    done
    HUMAN_JSON+="]"
    
    jq -n \
        --arg pilot "$APP_NAME" \
        --argjson results "$RESULTS_JSON" \
        --argjson human "$HUMAN_JSON" \
        '{pilot: $pilot, machine: $results, human: $human}'
else
    MACHINE_PASS=$(echo "${RESULTS[@]}" | jq -s 'map(select(.status=="pass")) | length' 2>/dev/null || echo 0)
    MACHINE_FAIL=$(echo "${RESULTS[@]}" | jq -s 'map(select(.status=="fail")) | length' 2>/dev/null || echo 0)
    MACHINE_UNKNOWN=$(echo "${RESULTS[@]}" | jq -s 'map(select(.status=="unknown")) | length' 2>/dev/null || echo 0)

    echo ""
    echo "=== Verification Complete ==="
    echo "Machine gates: $MACHINE_PASS pass, $MACHINE_FAIL fail, $MACHINE_UNKNOWN unknown"
    echo "Human gates: ${#HUMAN_GATES[@]} pending"

    # Write human checklist
    CHECKLIST_FILE="$PILOT_DIR/VERIFICATION-CHECKLIST-$(date +%Y%m%d-%H%M%S).md"
    {
        echo "# Verification Checklist: $APP_NAME"
        echo "Date: $(date)"
        echo "OS: $(sw_vers -productVersion) build $(sw_vers -buildVersion)"
        echo "App: $APP_PATH"
        echo ""
        echo "## Machine Gates (Automated)"
        for r in "${RESULTS[@]}"; do
            GATE=$(echo "$r" | jq -r '.gate')
            STATUS=$(echo "$r" | jq -r '.status')
            DETAILS=$(echo "$r" | jq -r '.details')
            if [[ "$STATUS" = "pass" ]]; then
                echo "- [x] $GATE: $DETAILS"
            else
                echo "- [ ] $GATE: $DETAILS"
            fi
        done
        echo ""
        
        # Add fix instructions for failing gates
        FAIL_COUNT=$(echo "${RESULTS[@]}" | jq -s 'map(select(.status=="fail")) | length' 2>/dev/null || echo 0)
        if [[ "$FAIL_COUNT" -gt 0 ]]; then
            echo "## Fix Instructions (for failing gates)"
            for r in "${RESULTS[@]}"; do
                GATE=$(echo "$r" | jq -r '.gate')
                STATUS=$(echo "$r" | jq -r '.status')
                DETAILS=$(echo "$r" | jq -r '.details')
                if [[ "$STATUS" = "fail" ]]; then
                    case "$GATE" in
                        spotlight_index)
                            echo "- **spotlight_index**: Run app, sync 'IntentLane NetNewsWire Pilot' feed, wait 30s for CoreSpotlight indexing"
                            ;;
                        shortcuts)
                            echo "- **shortcuts**: Launch app, use Siri/Shortcuts to invoke 'Open an article' and 'Mark article as read' to trigger donations"
                            ;;
                        appintents_testing)
                            echo "- **appintents_testing**: Add 'IntentLanePilotTests' test target to NetNewsWire Xcode project with AppIntentsTesting"
                            ;;
                        *)
                            echo "- **$GATE**: $DETAILS"
                            ;;
                    esac
                fi
            done
            echo ""
        fi
        
        echo "## Human Gates (Manual - require person)"
        for i in "${!HUMAN_GATES[@]}"; do
            GATE=$(echo "${HUMAN_GATES[$i]}" | jq -r '.gate')
            DESC=$(echo "${HUMAN_GATES[$i]}" | jq -r '.description')
            PROTO=$(echo "${HUMAN_GATES[$i]}" | jq -r '.protocol')
            echo "- [ ] **$GATE**: $DESC (_${PROTO}_)"
        done
        echo ""
        echo "## Sign-off"
        echo "Tester: _________________"
        echo "Results: ☐ All pass ☐ Issues noted"
        echo "Notes: _________________"
    } > "$CHECKLIST_FILE"
    log ""
    log "📄 Checklist written to: $CHECKLIST_FILE"
fi
