#!/usr/bin/env node
/**
 * Rule integrity audit — dynamic, not static grep.
 *
 * Static pattern-grepping already undercounted one of this session's real
 * bugs (3 vs the actual 21 rules with a literal-backslash-n defect). This
 * audit instead synthesizes a prompt from each rule's own regex source and
 * actually runs the rule against it, checking the same invariant behind
 * every bug found this session: the text a rule's pattern matches must be
 * fully accounted for in what it emits -- either preserved via $N or
 * deliberately discarded whole, never half-eaten.
 *
 * Per rule, two synthetic prompts are generated from pattern.source:
 *   - MINIMAL: the shortest string satisfying every required (non-optional)
 *     part of the pattern.
 *   - MAXIMAL: same, but every optional/repeated multi-word-consuming group
 *     (\w+, .+, .+? under a ?, *, or + quantifier) is filled with unique
 *     "canary" tokens instead of a single placeholder word. This is the
 *     exact shape of the business_proposal_enhancement "for remote work"
 *     bug and the technical_request_enhancement/technical_security_audit
 *     missing-capture bugs -- if a canary token survives in the output as
 *     bare leftover text (not folded in via $N), the match under-consumed
 *     what it should own and something is dangling.
 *
 * Checks run against every rule that the generator can synthesize a match
 * for:
 *   1. Literal backslash+n in the replacement's OUTPUT (permanent
 *      regression guard for the v4.1.7 fix).
 *   2. $N in `replacement` referencing a capture-group index that doesn't
 *      exist in `pattern` (JS silently leaves "$N" as literal text in this
 *      case -- would read as broken output).
 *   3. Canary tokens leaking into the output as bare, unfolded text (the
 *      truncation/dangling-fragment class -- v4.1.7's business_proposal
 *      bug and the missing-capture bugs fixed in 4.1.3).
 *   4. (informational only) canary tokens present in the synthesized input
 *      but absent from output, with zero $N in the replacement at all --
 *      can't be distinguished from an intentionally-static template
 *      automatically; reported separately as lower-confidence.
 *
 * BOUND ON WHAT THIS PROVES: rules the generator can't synthesize a valid
 * trigger for are reported UNVERIFIED, not passing -- an unverified rule
 * has not been shown to be correct, only not-yet-checked by this tool.
 *
 * Usage: node tests/rule-integrity-audit.js
 */

const { RulesEngine } = require('../lib/optimization-rules.js');

const BSN = String.fromCharCode(92) + 'n';

function synthesize(source, { maximal }) {
  let i = 0;
  const n = source.length;
  let canaryCounter = 0;

  function nextCanary() {
    canaryCounter++;
    return `zzcanary${canaryCounter}`;
  }

  function parseAlternation(stop) {
    const first = parseSequence(stop);
    // Skip any remaining alternatives -- we only synthesize the first branch.
    let depth = 0;
    while (i < n) {
      if (source[i] === '\\') { i += 2; continue; }
      if (source[i] === '(') { depth++; i++; continue; }
      if (source[i] === ')') { if (depth === 0) break; depth--; i++; continue; }
      if (source[i] === '|' && depth === 0) {
        i++;
        skipSequence(stop);
        continue;
      }
      if (stop.includes(source[i]) && depth === 0) break;
      i++;
    }
    return first;
  }

  function skipSequence(stop) {
    let depth = 0;
    while (i < n) {
      if (source[i] === '\\') { i += 2; continue; }
      if (source[i] === '(') { depth++; i++; continue; }
      if (source[i] === ')') { if (depth === 0) return; depth--; i++; continue; }
      if (source[i] === '|' && depth === 0) return;
      if (stop.includes(source[i]) && depth === 0) return;
      i++;
    }
  }

  function parseSequence(stop) {
    let text = '';
    while (i < n && !(stop.includes(source[i])) && source[i] !== '|') {
      text += parseAtom();
    }
    return text;
  }

  function quantifierAfter() {
    if (source[i] === '?' || source[i] === '*' || source[i] === '+') {
      const q = source[i]; i++;
      // Lazy modifier (*?, +?, ??) -- doesn't change what can be
      // synthesized as a valid match, only which match the real engine
      // prefers among several valid ones. Consume it so it isn't
      // mis-parsed as a separate atom-level '?' on whatever follows.
      if (source[i] === '?') i++;
      return q;
    }
    if (source[i] === '{') {
      let j = i + 1;
      while (j < n && source[j] !== '}') j++;
      const inner = source.slice(i + 1, j); // e.g. "2,", "3", "2,5"
      i = j + 1;
      if (source[i] === '?') i++;
      const minMatch = inner.match(/^(\d+)/);
      const min = minMatch ? Number(minMatch[1]) : 1;
      return `{${min}}`;
    }
    return '';
  }

  function parseAtom() {
    const c = source[i];
    if (c === '(') return parseGroup();
    if (c === '[') return parseCharClass();
    if (c === '\\') {
      i++;
      const e = source[i]; i++;
      const q = quantifierAfter();
      if (e === 'b') return '';
      let unit;
      if (e === 's') unit = ' ';
      else if (e === 'w') unit = 'x';
      else if (e === 'd') unit = '1';
      else unit = e;
      // \s and a literal escaped char (e.g. \.) must pass their own unit
      // through verbatim -- only \w/\d are safe to substitute a generic
      // filler for. \w and \d can never match a space, so a multi-word
      // canary phrase there is a synthesizer artifact, not a realistic
      // probe -- only `.` and negated char classes can actually span
      // multiple words, which is the only shape where under-consumption
      // (the real bug class) can occur.
      const genericPlaceholderOk = e === 'w' || e === 'd';
      return applyQuantifier(unit, q, genericPlaceholderOk, false);
    }
    if (c === '^' || c === '$') { i++; return ''; }
    if (c === '.') {
      i++;
      const q = quantifierAfter();
      return applyQuantifier('x', q, true, true);
    }
    i++;
    const q = quantifierAfter();
    return applyQuantifier(c, q, false, false);
  }

  function applyQuantifier(unit, q, genericPlaceholderOk, canSpanSpaces) {
    if (q === '') return unit;
    if (q === '?') return maximal ? unit : '';
    if (q === '*' || q === '+' || q.startsWith('{')) {
      // '*' has a minimum of zero reps -- minimal synthesis must be able to
      // emit nothing here. '{n,...}' has a minimum of n (parsed below);
      // getting this wrong for {2,} (treating it as min 0) is why
      // foundation_normalize_whitespace's [ \t]{2,} was unverifiable.
      const minReps = q === '+' ? 1 : (q.startsWith('{') ? Number(q.slice(1, -1)) : 0);
      const placeholderToken = genericPlaceholderOk ? (unit === '1' ? '1' : 'x') : unit;
      if (!maximal) {
        if (minReps === 0) return '';
        return placeholderToken.repeat(minReps);
      }
      if (genericPlaceholderOk && canSpanSpaces) {
        // maximal AND the atom can actually span spaces: multi-word canary
        // phrase to stress the truncation class.
        return `${nextCanary()} ${nextCanary()} ${nextCanary()}`;
      }
      return placeholderToken.repeat(Math.max(minReps, 1));
    }
    return unit;
  }

  function parseGroup() {
    i++; // consume '('
    let lookaround = null; // 'pos' | 'neg' | null
    if (source[i] === '?') {
      if (source[i + 1] === ':') { i += 2; }
      else if (source[i + 1] === '=') { lookaround = 'pos'; i += 2; }
      else if (source[i + 1] === '!') { lookaround = 'neg'; i += 2; }
      else if (source[i + 1] === '<' && source[i + 2] === '=') { lookaround = 'pos'; i += 3; }
      else if (source[i + 1] === '<' && source[i + 2] === '!') { lookaround = 'neg'; i += 3; }
      else { i += 1; }
    }
    const inner = parseAlternation([')']);
    i++; // consume ')'
    if (lookaround === 'neg') return ''; // zero-width AND we want the forbidden text absent -- correct to omit.
    if (lookaround === 'pos') return inner; // zero-width but its content MUST be present right there to match.
    const q = quantifierAfter();
    if (q === '?') return maximal ? inner : '';
    if (q === '*') return maximal ? `${inner} ${nextCanary()} ${nextCanary()}` : '';
    if (q === '+') return inner;
    return inner;
  }

  function parseCharClass() {
    i++; // consume '['
    let negate = false;
    if (source[i] === '^') { negate = true; i++; }
    let first = null;
    while (i < n && source[i] !== ']') {
      if (source[i] === '\\') { i++; if (first === null) first = source[i]; i++; continue; }
      if (first === null && source[i] !== '-') first = source[i];
      i++;
    }
    i++; // consume ']'
    const q = quantifierAfter();
    const unit = negate ? 'x' : (first || 'x');
    // A negated class like [^"] or [^.] typically still allows spaces
    // (space isn't in the exclusion set), so a generic 'x' placeholder is
    // safe and it CAN span multiple words -- unlike \w. A whitelist class
    // like [ \t] only allows specific members, so 'x' would be an invalid
    // placeholder; must use the real extracted member instead.
    return applyQuantifier(unit, q, negate, negate);
  }

  const text = parseAlternation([]);
  // NOTE: deliberately no blanket whitespace-run collapse here -- a rule
  // like foundation_normalize_whitespace ([ \t]{2,}) exists specifically
  // to detect multiple consecutive whitespace chars, and collapsing runs
  // down to one space would destroy the exact structure it needs to match.
  // Every atom already emits precisely the whitespace its own quantifier
  // calls for; nothing here pads sequences with extra separators.
  let result = text;
  // A pattern that ends in a required \s+ (e.g. "improve\s+" with nothing
  // after it) needs that trailing space to actually be present in the
  // probe to match -- .trim() was silently deleting the one thing the
  // pattern required. Anchor it with a trailing word instead of stripping
  // it, same reasoning as leading space (rare, but handled for symmetry).
  if (result.startsWith(' ')) result = 'x' + result;
  if (result.endsWith(' ')) result = result + 'x';
  return result;
}

function countCaptureGroups(source) {
  let count = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\\') { i++; continue; }
    if (source[i] === '(' && source[i + 1] !== '?') count++;
  }
  return count;
}

function main() {
  const engine = new RulesEngine();
  const results = { verified: [], unverified: [], flagged: [], informational: [] };

  for (const rule of engine.rules) {
    const src = rule.pattern.source;
    let minimal, maximal;
    try {
      minimal = synthesize(src, { maximal: false });
      maximal = synthesize(src, { maximal: true });
    } catch (e) {
      results.unverified.push({ name: rule.name, reason: `synthesis threw: ${e.message}` });
      continue;
    }

    rule.pattern.lastIndex = 0;
    const minimalMatches = rule.pattern.test(minimal);
    rule.pattern.lastIndex = 0;
    const maximalMatches = rule.pattern.test(maximal);

    if (!minimalMatches && !maximalMatches) {
      results.unverified.push({ name: rule.name, reason: 'generator could not synthesize a matching trigger', minimal, maximal });
      continue;
    }

    const probe = maximalMatches ? maximal : minimal;

    // The actual matched span, independent of what the replacement does with
    // it -- this is the ground truth for "did the regex own all the text it
    // should have." Any canary token in `probe` that falls OUTSIDE this span
    // is guaranteed to survive in the output as literal leftover text once
    // .replace() runs, regardless of what the replacement string contains.
    rule.pattern.lastIndex = 0;
    const execMatch = rule.pattern.exec(probe);
    const matchedSpan = execMatch ? execMatch[0] : '';

    let output;
    try {
      output = rule.apply(probe);
    } catch (e) {
      results.flagged.push({ name: rule.name, issue: 'apply() threw', detail: e.message, probe });
      continue;
    }

    const issues = [];

    // Check 1: literal backslash+n regression
    if (output.includes(BSN)) {
      issues.push('literal backslash+n in output');
    }

    // Check 2: $N referencing a non-existent group
    const groupCount = countCaptureGroups(src);
    const dollarRefs = [...rule.replacement.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
    for (const nRef of dollarRefs) {
      if (nRef > groupCount) {
        issues.push(`replacement references $${nRef} but pattern has only ${groupCount} capture group(s)`);
      }
    }

    // Check 3: under-consumption -- a canary token present in the probe but
    // outside the regex's own matched span. This is ground truth for the
    // truncation/dangling-fragment class (business_proposal_enhancement's
    // "for remote work" bug): whatever the replacement does, text outside
    // the match is guaranteed to survive verbatim in the output.
    const canariesInProbe = [...probe.matchAll(/zzcanary\d+/g)].map((m) => m[0]);
    if (canariesInProbe.length > 0) {
      const strandedOutsideMatch = canariesInProbe.filter((tok) => !matchedSpan.includes(tok));
      if (strandedOutsideMatch.length > 0) {
        issues.push(`match under-consumes: canary token(s) fell outside the matched span and will survive verbatim in output (dangling-fragment class): ${strandedOutsideMatch.join(', ')}`);
      } else if (dollarRefs.length === 0) {
        results.informational.push({
          name: rule.name,
          note: 'optional/repeated multi-word group present, fully consumed by the match, but replacement has zero $N refs -- that content is fully discarded by design; cannot auto-distinguish "intentional static template" from "silently drops user content worth preserving" (see v4.1.3 class) without a human judgment call',
        });
      }
    }

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

    if (issues.length > 0) {
      results.flagged.push({ name: rule.name, issues, probe, output });
    } else {
      results.verified.push(rule.name);
    }
  }

  console.log('='.repeat(80));
  console.log('RULE INTEGRITY AUDIT');
  console.log('='.repeat(80));
  console.log(`Total rules: ${engine.rules.length}`);
  console.log(`Verified clean (dynamic probe passed all checks): ${results.verified.length}`);
  console.log(`Flagged (real issue found): ${results.flagged.length}`);
  console.log(`Unverified (generator couldn't synthesize a trigger): ${results.unverified.length}`);
  console.log(`Informational (discard ambiguity, not a confirmed bug): ${results.informational.length}`);
  console.log();

  if (results.flagged.length > 0) {
    console.log('-'.repeat(80));
    console.log('FLAGGED — real issues');
    console.log('-'.repeat(80));
    for (const f of results.flagged) {
      console.log(`\n[${f.name}]`);
      (f.issues || [f.detail]).forEach((iss) => console.log(`  - ${iss}`));
      if (f.probe) console.log(`  probe:  ${JSON.stringify(f.probe)}`);
      if (f.output) console.log(`  output: ${JSON.stringify(f.output)}`);
    }
    console.log();
  }

  if (results.informational.length > 0) {
    console.log('-'.repeat(80));
    console.log('INFORMATIONAL — needs a human judgment call, not auto-confirmed');
    console.log('-'.repeat(80));
    for (const inf of results.informational) {
      console.log(`  - ${inf.name}: ${inf.note}`);
    }
    console.log();
  }

  console.log('-'.repeat(80));
  console.log(`UNVERIFIED (${results.unverified.length}) — not shown as passing, just not checked by this tool:`);
  console.log('-'.repeat(80));
  console.log('  ' + results.unverified.map((u) => u.name).join(', '));

  const exitCode = results.flagged.length > 0 ? 1 : 0;
  process.exitCode = exitCode;
}

if (require.main === module) {
  main();
} else {
  module.exports = { synthesize, countCaptureGroups };
}
