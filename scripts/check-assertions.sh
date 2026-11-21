#!/usr/bin/env bash
# Guardrail for the Playwright suite: fail when a spec *adds* a weakened
# assertion or an escape hatch.
#
# It is a diff gate, not a lint rule. Lines already on the base branch are
# grandfathered, which is why the deliberate `force: true` fallback in
# tests/smoke.spec.ts (WebKit actionability) keeps passing while a new one
# fails. The point is to make "the test goes green because I stopped asserting"
# a reviewable act instead of a silent edit.
#
# Usage: bash scripts/check-assertions.sh [base-ref]
#        BASE_REF=origin/develop bash scripts/check-assertions.sh
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

BASE_REF="${1:-${BASE_REF:-origin/main}}"
SPEC_GLOB="*.spec.ts"
# Deliberately blunt: any of these in an *added* line needs a human decision.
PATTERN='\.(skip|fixme)\(|toBeTruthy\(|waitForTimeout\(|force:[[:space:]]*true'

if ! git rev-parse --verify --quiet "${BASE_REF}^{commit}" >/dev/null; then
  echo "check-assertions: cannot resolve '${BASE_REF}' - nothing to diff against."
  echo "check-assertions: run 'git fetch origin main' (or pass a base ref). Skipped."
  exit 0
fi

changed="$(mktemp)"
hits="$(mktemp)"
trap 'rm -f "$changed" "$hits"' EXIT

# Committed and uncommitted edits to existing specs...
git diff --name-only --diff-filter=AM "$BASE_REF" -- "$SPEC_GLOB" >>"$changed"
# ...plus specs that do not exist on the base branch yet (no diff hunks).
git ls-files --others --exclude-standard -- "$SPEC_GLOB" >>"$changed"
sort -u -o "$changed" "$changed"

while IFS= read -r file; do
  [ -n "$file" ] || continue
  [ -f "$file" ] || continue
  if git cat-file -e "${BASE_REF}:${file}" 2>/dev/null; then
    # The pattern travels via the environment: awk's -v would eat the
    # backslashes in it and blow up on an unbalanced parenthesis.
    if ! git diff --unified=0 "$BASE_REF" -- "$file" |
      PAT="$PATTERN" awk -v f="$file" '
        BEGIN { pat = ENVIRON["PAT"] }
        /^@@/ {
          if (match($0, /\+[0-9]+/)) {
            ln = substr($0, RSTART + 1, RLENGTH - 1) + 0
          }
          next
        }
        /^\+\+\+/ { next }
        /^\+/ {
          body = substr($0, 2)
          # Prose that mentions an escape hatch is fine; code that uses one is not.
          if (body ~ pat && body !~ /^[[:space:]]*(\/\/|\*|\/\*)/) {
            printf "%s:%d: %s\n", f, ln, body
          }
          ln++
          next
        }
      ' >>"$hits"; then
      echo "check-assertions: internal error scanning ${file}" >&2
      exit 2
    fi
  else
    grep -nE "$PATTERN" "$file" | sed "s|^|${file}:|" >>"$hits" || true
  fi
done <"$changed"

if [ -s "$hits" ]; then
  {
    echo "check-assertions: FAILED - weakened test assertions added since ${BASE_REF}:"
    sed 's/^/  /' "$hits"
    echo
    echo "Assert the specific outcome instead: toBeVisible/toBe/toEqual/toContainText,"
    echo "or expect.poll(...) instead of waitForTimeout. Do not add skip/fixme,"
    echo "do not paper over a race with force: true."
    echo "If one of these is genuinely required, justify it in the PR description."
  } >&2
  exit 1
fi

echo "check-assertions: OK - no weakened assertions added since ${BASE_REF}."
