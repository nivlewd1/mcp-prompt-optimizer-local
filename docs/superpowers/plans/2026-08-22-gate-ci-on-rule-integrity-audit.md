# Gate CI on the Rule-Integrity Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make `npm run test:rules` (`tests/rule-integrity-audit.js`) — the tool that found all 27+21+7 mid-word-splice defects fixed across v4.1.5-4.1.8 — a required CI check, so a reintroduced instance of that exact bug class is caught automatically instead of only when someone remembers to run the script by hand.

**Architecture:** One narrow refinement to the audit script's existing static heuristic (Check 4) to remove a currently-live false positive that would otherwise make CI red on day one for a reason unrelated to any future change, then a one-line CI workflow addition.

**Tech Stack:** Node.js, GitHub Actions.

**Spec:** `C:\Users\nivle\FastAPI_Backend\docs\superpowers\specs\2026-08-21-production-guardrails-design.md` (Component 5). This plan lives in `mcp-local-prompt-optimizer-npm`, a separate repo from the spec's home repo — see the spec's header note on scope spanning three repos.

## Global Constraints

- No new dependency, no new script — this plan modifies the existing `tests/rule-integrity-audit.js` and the existing `.github/workflows/ci.yml`.
- `npm run test:rules` must exit 0 against the current 129-rule set before it's added as a CI gate. Verified this session: it currently exits 1 (one FLAGGED item), so Task 1 is a hard prerequisite for Task 2, not optional cleanup.
- Do not weaken the check for the bug class it exists to catch. The refinement in Task 1 only suppresses a flag when a rule's `replacement` is exactly `'$1'` and the pattern's sole group spans the entire regex — a structural condition under which mid-word splicing is impossible by construction, because the output is always exactly whatever the regex matched, unchanged. Every historically-real splice bug (v4.1.5-4.1.8) had a replacement that did *not* reproduce the full match verbatim — that mismatch is what caused the splice. The refinement cannot suppress those.

---

## File Structure

- `tests/rule-integrity-audit.js` — Task 1 adds one helper function (`findMatchingParenEnd`) and one guard condition to the existing Check 4.
- `.github/workflows/ci.yml` — Task 2 adds one `run: npm run test:rules` step.

---

### Task 1: Fix the current false positive in Check 4

**Files:**
- Modify: `tests/rule-integrity-audit.js:243-250` (add helper after `countCaptureGroups`), `:330-342` (Check 4)

**Interfaces:**
- Consumes: nothing new — same `rule.pattern.source` (`src`) and `rule.replacement` already in scope at Check 4's call site.
- Produces: `npm run test:rules` exits 0 against the current rule set (verified: currently exits 1 solely because of this false positive on `preserve_ai_parameters`). Task 2 depends on this exit code.

**Context:** `preserve_ai_parameters` (`lib/optimization-rules.js:1333-1341`) has pattern `(--\w+(?:\s+(?:"[^"]*"|'[^']*'|[^\s]+))?)` and `replacement: "$1"`. The entire pattern is one outer group (opens at index 0, its matching `)` is the last character of the source), and the replacement is exactly that group's backreference — so whatever this regex matches is reproduced in the output completely unchanged, regardless of where the internal alternation sits or whether it has a `\b`/`^` anchor. Check 4's current logic (`tests/rule-integrity-audit.js:337-342`) flags any bare alternation lacking those anchors as a "possible mid-word match risk" without accounting for this — a real gap in the heuristic, not a bug in the rule. Confirmed via the audit's own output this session: probe `"--x \"zzcanary1 zzcanary2 zzcanary3\""` produced identical output, and the script's own label already reads `STATIC HEURISTIC (unproven) ... needs manual review, not auto-confirmed` — this task is that manual review.

- [x] **Step 1: Confirm the current failing baseline**

Run: `npm run test:rules`
Expected: exit code 1, "Flagged (real issue found): 1", the flagged rule is `preserve_ai_parameters` with the `STATIC HEURISTIC` message. This is the state being fixed — no code change yet, this step is just establishing the baseline to compare against after Step 3.

- [x] **Step 2: Add the matching-paren helper**

In `tests/rule-integrity-audit.js`, immediately after `countCaptureGroups` (ends at line 250), add:

```javascript
function findMatchingParenEnd(source, openIndex) {
  // Returns the index of the ')' that closes the '(' at openIndex, or -1 if
  // openIndex isn't an opening paren or has no match (shouldn't happen for a
  // pattern that already compiled into a RegExp).
  if (source[openIndex] !== '(') return -1;
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    if (source[i] === '\\') { i++; continue; }
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
```

- [x] **Step 3: Add the whole-match-identity guard to Check 4**

In `tests/rule-integrity-audit.js`, replace:

```javascript
    // Check 4 (static, not dynamic like 1-3): missing \b around a bare
    // multi-alternative trigger. This is the v4.1.5 bug class (a short
    // trigger word matching mid-word inside a longer one, e.g. "test"
    // inside "Testing") -- a clean synthesized probe won't expose it,
    // because the synthesizer always places trigger words at real word
    // boundaries. This is a shape heuristic, not a proof; kept separate
    // from the dynamically-verified checks above and labeled as such.
    const hasAlternation = /\(\?:[^)]*\|[^)]*\)/.test(src);
    const hasBoundary = src.includes('\\b');
    const hasAnchor = src.startsWith('^');
    if (hasAlternation && !hasBoundary && !hasAnchor) {
      issues.push('STATIC HEURISTIC (unproven): bare alternation with no \\b anchor and no ^ anchor -- possible mid-word match risk, same shape as the v4.1.5 bug class; needs manual review, not auto-confirmed');
    }
```

with:

```javascript
    // Check 4 (static, not dynamic like 1-3): missing \b around a bare
    // multi-alternative trigger. This is the v4.1.5 bug class (a short
    // trigger word matching mid-word inside a longer one, e.g. "test"
    // inside "Testing") -- a clean synthesized probe won't expose it,
    // because the synthesizer always places trigger words at real word
    // boundaries. This is a shape heuristic, not a proof; kept separate
    // from the dynamically-verified checks above and labeled as such.
    const hasAlternation = /\(\?:[^)]*\|[^)]*\)/.test(src);
    const hasBoundary = src.includes('\\b');
    const hasAnchor = src.startsWith('^');
    // A pure whole-match identity replacement ($1, where group 1 is a single
    // outer group spanning the entire pattern) cannot mid-word-splice no
    // matter where the alternation sits inside it: the output is always
    // exactly whatever the regex matched, unchanged. The splice risk this
    // check exists to catch requires the replacement to NOT reproduce the
    // full match verbatim (a literal, a partial-group reference, multiple
    // groups) -- that mismatch is what caused every real v4.1.5-4.1.8 bug.
    // See preserve_ai_parameters (lib/optimization-rules.js), flagged here
    // before this guard despite `replacement: "$1"` on a pattern that is
    // one single outer-wrapping group.
    const isWholeMatchIdentity =
      rule.replacement.trim() === '$1' &&
      src.startsWith('(') &&
      findMatchingParenEnd(src, 0) === src.length - 1;
    if (hasAlternation && !hasBoundary && !hasAnchor && !isWholeMatchIdentity) {
      issues.push('STATIC HEURISTIC (unproven): bare alternation with no \\b anchor and no ^ anchor -- possible mid-word match risk, same shape as the v4.1.5 bug class; needs manual review, not auto-confirmed');
    }
```

- [x] **Step 4: Verify the fix against the real rule set**

Run: `npm run test:rules`
Expected: exit code 0, "Flagged (real issue found): 0", "Verified clean (dynamic probe passed all checks): 129" (up from 128). `preserve_ai_parameters` no longer appears in the FLAGGED section. The INFORMATIONAL section (`business_proposal_enhancement`) is untouched — this task only affects Check 4, not the informational check.

- [x] **Step 5: Sanity-check the guard doesn't over-suppress**

This is a manual reasoning check, not an automated test (this script has no meta-test harness of its own — running it against the real 129-rule set, as in Step 4, is this repo's existing verification convention for this file). Confirm by inspection: `isWholeMatchIdentity` requires `rule.replacement.trim() === '$1'` *and* the pattern's entire source to be one single outer-wrapping group. Any rule whose replacement is a literal string, a different `$N`, or multiple `$N` references — which describes every rule actually implicated in the v4.1.5/v4.1.6/v4.1.7/v4.1.8 fixes per `CHANGELOG.md` — fails the `=== '$1'` check and is unaffected by this guard.

- [x] **Step 6: Commit**

```bash
git add tests/rule-integrity-audit.js
git commit -m "fix(audit): don't flag pure whole-match identity replacements in Check 4

preserve_ai_parameters was the only rule flagged by the current audit,
and it can't mid-word-splice: replacement is exactly \$1 for a pattern
that's one single outer-wrapping group, so output always equals
whatever was matched, unchanged, regardless of alternation/anchors.
This was blocking CI-gating this script (see docs/superpowers/plans/
2026-08-22-gate-ci-on-rule-integrity-audit.md, Task 2) since the audit
currently exits 1 on a rule set that has no real splice bug."
```

---

### Task 2: Add test:rules to CI

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm run test:rules` exiting 0 (Task 1).
- Produces: a required CI check on every push/PR to `main`.

- [x] **Step 1: Add the CI step**

In `.github/workflows/ci.yml`, replace:

```yaml
    - run: npm ci
    # Gate on the real MCP stdio handshake (free-tier, keyless, no network).
    # NOT `npm test` (node index.js --test) — that self-test still expects an
    # API key + the optional binary and reports failures under the free-tier
    # model, so it cannot gate CI until it is reconciled.
    - name: MCP handshake (initialize -> tools/list)
      run: node test-mcp-server.js
```

with:

```yaml
    - run: npm ci
    # Gate on the real MCP stdio handshake (free-tier, keyless, no network).
    # NOT `npm test` (node index.js --test) — that self-test still expects an
    # API key + the optional binary and reports failures under the free-tier
    # model, so it cannot gate CI until it is reconciled.
    - name: MCP handshake (initialize -> tools/list)
      run: node test-mcp-server.js
    # Gate on the rule-integrity audit — the tool that found every
    # mid-word-splice defect across v4.1.5-4.1.8. Previously run only by
    # hand; see docs/superpowers/plans/2026-08-22-gate-ci-on-rule-integrity-audit.md.
    - name: Rule integrity audit
      run: npm run test:rules
```

- [x] **Step 2: Verify locally before pushing**

Run: `npm run test:rules`
Expected: exit code 0 (confirms Task 1 landed; this step doesn't run the workflow YAML itself, just re-confirms the command it invokes is green).

- [x] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: gate on rule-integrity audit (test:rules)"
```

- [x] **Step 4: Verify in CI**

Push (or open a PR) and confirm the new "Rule integrity audit" step appears and passes in the GitHub Actions run. This is the first real end-to-end confirmation that the wiring works — the local `npm run test:rules` runs in Steps 1/2/4 of Task 1 and Step 2 of this task all use the same Node version installed locally, not the workflow's matrixed `node-version: [18.x, 20.x, 22.x]`; if any of those versions behaves differently (unlikely for pure regex/string logic, but unverified), the CI run is what actually confirms it.
