#!/bin/bash
# Note: uses /bin/bash directly (not `env bash`) because this machine's
# /usr/local/bin/bash is x86_64-only and `env` can resolve to it ahead of
# /bin/bash, which fails under Rosetta with "Bad CPU type in executable".
# Perf-pass verification harness: paired visual compare (before vs after) +
# behaviour tests against the AFTER build, with a concise diff/pass summary.
#
#   scripts/perf-verify.sh BEFORE=http://localhost:3500 AFTER=http://localhost:3400
#   BEFORE=http://localhost:3500 AFTER=http://localhost:3400 scripts/perf-verify.sh
#
# Routes and widths are fixed per the perf-pass spec; interaction states are
# included (no --no-interactions). Reuses scripts/compare-pages.mjs (with
# COMPARE_BASELINE=1 so both sides use the rebuild's own selectors) and
# scripts/test-store.mjs (against AFTER only — the orderable fixture catalog
# needs a dev server, which production builds don't have).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Accept BEFORE/AFTER either as env vars or as KEY=VALUE positional args.
for arg in "$@"; do
  case "$arg" in
    BEFORE=*) BEFORE="${arg#BEFORE=}" ;;
    AFTER=*) AFTER="${arg#AFTER=}" ;;
  esac
done
BEFORE="${BEFORE:-}"
AFTER="${AFTER:-}"
if [[ -z "$BEFORE" || -z "$AFTER" ]]; then
  echo "usage: BEFORE=<url> AFTER=<url> scripts/perf-verify.sh" >&2
  exit 1
fi

VW="1440,390"
OUT_DIR="screenshots-perf"
# NOTE: scripts/compare.config.mjs only has a visual-compare entry for
# /products/seam-detail-co-ords-set, not /products/wide-leg-trouser-two-full-
# stripes (that product is instead the hardcoded PRODUCT target inside
# test-store.mjs's behaviour checks). Since editing existing tooling files is
# out of scope here, the visual leg below uses the route the config actually
# supports; test-store.mjs still exercises wide-leg-trouser-two-full-stripes
# as intended. Flag this mismatch to whoever owns compare.config.mjs.
COMPARE_ROUTES="/,/shop,/new-in,/products/seam-detail-co-ords-set"

echo "== perf-verify =="
echo "BEFORE=$BEFORE  AFTER=$AFTER"
echo "compare routes: $COMPARE_ROUTES   widths: $VW   out: $OUT_DIR"
echo

START=$(date +%s)

echo "-- compare-pages.mjs (visual, incl. interactions) --"
COMPARE_BASELINE=1 FRAMER_URL="$BEFORE" NEXT_URL="$AFTER" OUT_DIR="$OUT_DIR" \
  node scripts/compare-pages.mjs --route "$COMPARE_ROUTES" --vw "$VW" --clean

COMPARE_END=$(date +%s)
echo
echo "compare-pages took $((COMPARE_END - START))s"
echo

echo "-- test-store.mjs (behaviour, against AFTER) --"
set +e
node scripts/test-store.mjs --url "$AFTER" --vw "$VW" 2>&1 | tee "/tmp/perf-verify-test-store.$$.log"
TEST_STATUS=$?
set -e
TEST_END=$(date +%s)
echo
echo "test-store took $((TEST_END - COMPARE_END))s"
echo

echo "========================================"
echo "SUMMARY"
echo "========================================"

DIFF_FILE="$OUT_DIR/diff-summary.txt"
if [[ -f "$DIFF_FILE" ]]; then
  echo
  echo "-- visual diffs (route width diff%% name) --"
  cat "$DIFF_FILE"
  echo
  echo "-- flagged (>1%% diff) --"
  FLAGGED=$(awk '{
    pct = $3; gsub("%","",pct);
    if (pct+0 > 1.0) print
  }' "$DIFF_FILE")
  if [[ -n "$FLAGGED" ]]; then
    echo "$FLAGGED"
  else
    echo "none — all sections/states within 1%"
  fi
else
  echo "no diff-summary.txt found at $DIFF_FILE"
fi

echo
echo "-- behaviour tests --"
PASS_LINE=$(grep -E '^[0-9]+/[0-9]+ passed$' "/tmp/perf-verify-test-store.$$.log" || true)
if [[ -n "$PASS_LINE" ]]; then
  echo "$PASS_LINE"
else
  echo "could not find pass count in test-store output (exit code $TEST_STATUS)"
fi
rm -f "/tmp/perf-verify-test-store.$$.log"

echo
TOTAL_END=$(date +%s)
echo "total runtime: $((TOTAL_END - START))s"

if [[ -n "$FLAGGED" ]] || [[ $TEST_STATUS -ne 0 ]]; then
  exit 1
fi
exit 0
