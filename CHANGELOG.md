# Changelog

All notable changes to the MCP Prompt Optimizer Local package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.1.11] - 2026-10-14

### Fixed
- **The support address was wrong.** `support@promptoptimizer.help` is not a registered domain, so mail to it
  bounced. It appeared in the README, the install and binary-integrity failure messages and the cross-platform
  guide. All now use `support@promptoptimizer.xyz`.
- **README privacy and licensing wording matches the code.** It said "no data collection" and "48h license
  caching". Prompts are processed on your machine and are never sent to the backend, but a license key is
  validated with the backend (the free tier with no key makes no network calls), and that validation is cached
  for 1 hour.

## [4.1.10] - 2026-10-08

### Fixed
- **`mcp-prompt-optimizer-local` command did not exist after install.** The package only registered the
  `mcp-optimizer` bin, but the README (and every MCP client config example in it) uses
  `mcp-prompt-optimizer-local`, so a client configured from the README could not start the server.
  Both names are now registered.
- **`--version` and `check-license` were documented but not implemented.** `--version` / `-v` now
  prints the package version; `check-license` runs the same validation as `--health` (the existing
  `npm run check-license` script already did this).

### Changed
- License validation requests now send `User-Agent: mcp-prompt-optimizer-local/<version>` so the
  backend can tell this client apart from the cloud package and the raw API.

## [4.1.8] - 2026-07-30

### Fixed
- 🔤 **`business_proposal_enhancement` truncated multi-word trailing clauses**: its pattern used
  `(?:\s+for\s+\w+)*`, which only ever consumes ONE word per repetition of the literal "for" — a
  real repeat requires "for" to appear again, which it doesn't in normal English — so
  `"write a proposal for remote work"` matched only `"...for remote"`, leaving `"work"` dangling
  after the boilerplate swap. Rewritten to `(?:\s+for\s+.+?)?(?:\.|$)`, matching the convention
  already used by `marketing_content_enhancement`/`business_strategy_development` elsewhere in
  this file. Found by rerunning the exact prompt live and inspecting the real output; reproduced
  and fixed before touching anything else.
- 🧩 **7 more rules had the exact v4.1.5 mid-word-splice defect, previously undiscovered**:
  `technical_documentation_enhancement`, `marketing_content_enhancement`,
  `business_strategy_development`, `academic_research_enhancement`,
  `academic_writing_enhancement`, `image_specification_enhancement`, and
  `creative_story_detection_enhanced` all lacked a `\b` boundary before their leading trigger
  alternation. Confirmed live: `"let's recreate documentation for X"` matched `"create"` inside
  `"recreate"`, producing `"let's reCreate comprehensive technical documentation..."`;
  `"the doctor will reexamine..."` matched `"examine"` inside `"reexamine"`; four more of the same
  shape. All 7 fixed with a leading `\b`, verified against both the original splice repro (no
  longer fires) and the original legitimate trigger phrasing (still fires correctly).
- 📋 Added `tests/rule-integrity-audit.js` — a permanent, dynamic per-rule test that synthesizes a
  probe from each rule's own regex source (not static grep, which already undercounted the 4.1.7
  bug 3-vs-21) and asserts: no literal `\n` regression, no `$N` referencing a non-existent capture
  group, and no synthetic "canary" token surviving in the output outside the regex's own matched
  span (ground truth for the truncation/dangling-fragment class covering both fixes above). Plus
  one static heuristic (bare alternation with no `\b`/`^` anchor) that found the 7 rules above —
  labeled explicitly as an unproven heuristic requiring manual confirmation, which is how
  `preserve_ai_parameters` was correctly identified and ruled out as a false positive (CLI-flag
  syntax, not English prose — safe by construction, not by boundary anchor). Run via
  `node tests/rule-integrity-audit.js`. All 129 rules now dynamically verified clean.

### Root cause across all bugs found this session (v4.1.3 through v4.1.8)
Every one of them is the same invariant violated: **the text a rule's regex matches must be fully
accounted for in what it emits — either preserved via `$N` or deliberately discarded whole, never
half-eaten.** Missing captures (v4.1.3) under-emitted; missing `\b` (v4.1.5, and 7 more here)
matched too little of a word and spliced mid-token; the literal-`\n` bug (v4.1.7) was a wrong
literal in the replacement itself; today's truncation bug matched too little of a multi-word
clause. Static grep found some instances and missed others (undercounted 4.1.7 3-vs-21, entirely
missed this session's 7 new discoveries) because it can't observe what the regex actually
consumes on real input — only running the rule dynamically against real text does. Rules the
audit script cannot synthesize a trigger for are reported as unverified, not passing; as of this
version there are none, but any new rule added to the file should be run through
`node tests/rule-integrity-audit.js` before shipping, not verified by inspection alone.

## [4.1.7] - 2026-07-30

### Fixed
- 🔤 **21 rules rendered literal `\n` text instead of line breaks** (the same defect class fixed
  for `technical_debugging_enhancement` in 4.1.3, at much larger scale): each rule's `replacement`
  string was written with an escaped backslash (`\\n` in the JS source), which parses to the
  two-character sequence backslash+`n` at runtime instead of an actual newline — so multi-section
  markdown templates rendered as one line littered with visible `\n\n## Heading` text. Affected
  all 13 `business_*` rules, `marketing_content_enhancement`, `business_strategy_development`,
  `technical_documentation_enhancement`, `academic_research_enhancement`,
  `academic_writing_enhancement`, `image_specification_enhancement`,
  `creative_story_detection_enhanced`, and `expert_add_analysis_framework`. Found by running real
  prompts end-to-end (real subprocess, real MCP `tools/call`, zero internal coupling) to verify the
  4.1.5/4.1.6 fixes and inspecting actual output text — `business_proposal_enhancement`'s output
  showed literal `\n\n## Executive Summary\n...` where a previous same-session audit had called
  this prompt's output "already good." Fixed by replacing the escaped source token with a real
  newline in each of the 21 `replacement:` lines only (verified via character-code inspection,
  not a blind find/replace — the file also has legitimate comment text elsewhere that discusses
  `\n` as documentation and must not be touched). Verified with `node index.js --test` (80%
  baseline, unchanged), `tests/e2e-stdio-smoke.js` (11/11), and a fresh 10-prompt real-subprocess
  quality pass.

## [4.1.6] - 2026-07-30

### Fixed
- 🚪 **Goal-score gate was decorative, not functional**: `optimizeForContext`'s loop logged a rule
  as `SKIPPED (goal_score=... below dynamic_threshold=...)` when its goal score didn't clear the
  dynamic threshold, but had no `continue` statement — it fell through and applied the rule
  anyway. Every prompt run this session was already only exercising rules whose goal score
  legitimately cleared their threshold (0.62–0.76), so this had gone unnoticed; the only rules the
  gate was silently failing to filter were ones scoring a hard `0.00` (no goal overlap at all).
  Found while fixing the rule-chaining splice bug (4.1.5) — same loop, adjacent lines. Fix is the
  one missing `continue;`. As a side effect this also stops a double `_trackRuleMetric` call
  (`'skipped'` immediately followed by `'applied'`) for the same rule on the same pass.
  Verified before touching code: simulated the gate with `continue` against every prompt already
  validated this session (linked-list, debugging, proposal, image, testing-suite, minimal-input)
  and confirmed zero rules flip from applied to skipped, and no non-zero-score rule gets newly
  filtered — the gate only removes rules that were already contributing nothing. Re-verified after
  the change with `node index.js --test` (80% baseline, unchanged) and
  `tests/e2e-stdio-smoke.js` (11/11), including re-running the 4.1.5 debugging-prompt canary to
  confirm the template-swap-collision guard and the now-functional gate don't interact badly.

## [4.1.5] - 2026-07-30

### Fixed
- 🧩 **Rule-chaining splice bug (the 4.1.3 "Known issue," now fixed)**: two related defects
  combined to produce garbled output like "...security testing.ing strategies to validate the
  fix". First, `technical_testing_strategy` and 26 sibling rules (14 `technical_*`, 13
  `business_*` — the whole family of bare-alternation, static-boilerplate-replacement rules with
  no word boundaries) could match a short trigger word *inside* a longer word, e.g. `test` inside
  `Testing`, splicing their replacement in mid-word. Fixed the same way as 4.1.4's
  `hotfix_content_creation_enhancement`: every pattern in the family is now wrapped in
  `\b...\b`. Second, even with clean whole-word matching, a second "template swap" rule (one
  whose replacement is a full boilerplate block, not an in-place edit) could still fire against
  text that an earlier template-swap rule had *just inserted in the same pass* — e.g.
  `technical_debugging_enhancement` inserts "5. Testing strategies to validate the fix", then
  `technical_testing_strategy` matches the word "Testing" inside that freshly-inserted text and
  shoves its own paragraph into the middle of it. `optimizeForContext`'s rule loop now tracks
  whether a template-swap rule has already fired this pass (replacement length > 3x the matched
  span) and skips any further template-swap rule, while still letting small in-place tweaks chain
  as the loop's own comment always intended. Verified via a standalone probe (isolated rule
  application on plain prompts, before and after), the full `optimizeForContext` pipeline on the
  original reported debugging prompt, `node index.js --test`, and `tests/e2e-stdio-smoke.js`
  (11/11, including the black-box subprocess test — the one initial failure was the local dev
  free-tier daily quota being exhausted from repeated test runs, not a regression, confirmed by
  resetting `~/.mcp-daily-usage.json` and rerunning clean).

## [4.1.4] - 2026-07-30

### Fixed
- **`hotfix_content_creation_enhancement`'s trigger regex matched "on" hiding inside another
  word.** The pattern `(?:about|on|for|regarding)` has no word boundaries, so for input like
  "write a function that reverses a linked list" the engine backtracked the preceding `a\s+\w+`
  group short by two letters — matching "a functi" instead of "a function" — solely so the "on"
  at the end of "function" could satisfy the trigger. The entire coding request then got replaced
  by the rule's generic "Create comprehensive content about..." essay template, discarding the
  actual ask. Found live while running real prompts through the published package end to end.
  Fixed by requiring `\b(?:about|on|for|regarding)\b` — the trigger words must now be their own
  word, not a substring of "function", "reason", "condition", or similar.

## [4.1.3] - 2026-07-29

### Fixed
- 🧵 **`info`/`debug` log lines leaked onto stdout**: `prompt-optimizer.js` and `mcp-tools.js`
  each built their own logger with `info`/`debug` routed through `console.log` (stdout) while
  `warn`/`error` correctly went to `console.error` (stderr). When running as an MCP server,
  stdout is the JSON-RPC channel — any client that parses each stdout line as JSON-RPC (a
  reasonable implementation choice; this audit's own black-box test did exactly that) would hit
  unparseable lines like `[INFO] Rules engine loaded with 129 optimization rules` interleaved
  with real responses. Same defect class the cloud package fixed in `c2ab906`; this package still
  had it. All four log levels now go to stderr except `warn`/`error`, which already did.
  Found and confirmed via a new black-box test (`tests/e2e-stdio-smoke.js`) that spawns the
  published binary as a real subprocess and speaks JSON-RPC over stdio, exactly as an external
  MCP client would — no internal class imports, no mocking.
- 🧩 **`technical_request_enhancement` and `technical_security_audit` rules discarded the user's
  actual ask**: both had a regex `pattern` with no capture group and a fully static `replacement`
  string. `String.replace()` only replaces the matched span, so e.g. "write a **function that
  reverses a linked list**" matched only "write a function", got swapped for boilerplate, and
  left "that reverses a linked list" dangling after it as a disconnected sentence fragment — the
  specific technical ask silently discarded from the middle. Same bug class as the backend's
  `c32f518` (Tier-1 template rewrite discarding the prompt). Both rules now capture the trailing
  clause and fold it back into the boilerplate via `$1`, and `technical_request_enhancement` no
  longer hardcodes "function" when the ask was a script/program/application.
- 🔤 **`technical_debugging_enhancement`'s template rendered literal `\n` text**: the replacement
  string used `\\n` inside a double-quoted JS string, which is a literal backslash+n, not a
  newline — output showed `\n\n**Problem Description:**` as visible text instead of line breaks.
  Also had the same missing-capture defect as above (the actual error detail was left dangling).
  Both fixed; the specific error/issue text is now folded into the "Problem Description" section.

### Known issue (found during this audit, not fixed here — fixed in [4.1.5](#415---2026-07-30))
- Rules apply sequentially against the *cumulative* output of previous rules, not just the
  original prompt (`optimizeForContext`'s `currentText = enhancedText` chaining in
  `optimization-rules.js`). When multiple "full boilerplate template" rules fire on the same
  prompt, a later rule's pattern can match text an earlier rule just inserted, splicing its own
  replacement mid-word (observed: `technical_debugging_enhancement`'s "5. Testing strategies to
  validate the fix" got `technical_testing_strategy` spliced into its middle, producing "...
  security testing.ing strategies to validate the fix"). Reproduced independent of the fixes
  above. A real fix needs "full-template" rules to be mutually exclusive (only the
  highest-priority one fires) rather than stackable like the small in-place tweak rules are —
  a change to the core `RulesEngine` loop that all 129 rules run through, out of scope for this
  pass given the blast radius.

## [4.1.2] - 2026-07-18

### Fixed
- 🔀 **Every MCP tool call response was double-wrapped in a JSON-RPC envelope**: `mcp-tools.js`
  manually built a full `{jsonrpc, result, id}` envelope, but the SDK's own transport layer
  already wraps whatever the handler returns in its own envelope — so the real `{content:[...]}`
  payload ended up nested one level too deep (`result.result.content` instead of `result.content`)
  for any spec-compliant MCP client to find. `tools/list` was unaffected; every `tools/call` was
  broken for real clients (Claude Desktop, Claude Code, Cursor). Confirmed by reading the SDK
  source directly and live-verified with a real MCP client against a real spawned server.
- 📊 **`get_quota_status` called a JWT-only backend endpoint**: always 403'd for an API-key client.
  Repointed to the API-key-authed `/api/v1/mcp/quota-status` and remapped its response shape.
- 📅 **"Resets: Invalid Date"**: neither the free-tier nor keyed-tier quota response ever set a
  `resetsAt`/reset-text field. Free tier now computes the real next-daily-reset; keyed tier passes
  through the backend's renewal text instead of feeding `undefined` into `new Date()`.
- 🔗 **Dead domain**: `promptoptimizer-blog.vercel.app` references in README and postinstall
  updated to `promptoptimizer.xyz`.

## [4.1.1] - 2026-07-18

### Fixed
- 🆓 **Free tier was completely non-functional**: no-key requests were unconditionally rejected
  despite the docs/startup log promising a working free tier. Now works, gated by a new local
  daily counter (`~/.mcp-daily-usage.json`) that never calls the backend.
- 🔇 **CLI `--optimize` silently swallowed every failure**: a license/quota error returned the
  raw unmodified prompt with exit code 0, indistinguishable from a real optimization. Errors now
  propagate and exit non-zero.
- 📛 **Startup "API key validated" message was fake**: only checked key length ≥10, no format or
  backend check. Now reuses the real format validator and doesn't overclaim.
- 🔢 **Paid-tier quota gate blocked every limited-quota key**: read fields the backend response
  never sets, so every non-unlimited keyed tier was rejected regardless of actual remaining quota.
- 🔑 **`MCP_LICENSE_KEY` (legacy env var) silently downgraded to free tier**: recognized at
  startup but not during actual license validation. Now read consistently.

## [4.0.4] - 2026-04-13

### Changed
- 📦 **Version Bump**: Incremented version to 4.0.4 to resolve npm publishing conflict with existing v4.0.3 on the registry.
- 🔗 **Link Alignment**: Unified all license and API key signup links to https://promptoptimizer.xyz/local-license.

## [4.0.3] - 2026-04-13

### Changed
- 📦 **Version Bump**: Incremented version to 4.0.3 to resolve npm publishing conflict with existing v4.0.2 on the registry.
- 🛡️ **Health & Documentation**: Finalized professional health documentation and community guidelines.

## [4.0.2] - 2026-04-12

### Added
- 🛡️ **Security Policy**: Added `SECURITY.md` for coordinated vulnerability disclosure.
- 🤝 **Community Guidelines**: Added `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` to foster open-source participation.
- 🤖 **CI/CD Visibility**: Added GitHub Actions workflow for cross-platform binary builds.
- 🏷️ **Snyk Health Badges**: Added professional health and status badges to `README.md`.

### Changed
- 📝 **Metadata Optimization**: Standardized `package.json` keywords and license strings for better registry visibility.
- 📂 **Package Distribution**: Updated included files list to include new community and security documentation.
- 📄 **Documentation Refresh**: Centralized resource links in README for better developer experience.

## [4.0.1] - 2026-04-09

### Added
- 🔒 **Security Hardening**: Backend API key validation enforced for all users (free and pro).
- 📊 **Server-Side Quota**: Quota tracking moved from local files to backend database to prevent bypasses.
- 🚫 **Bypass Removal**: Eliminated all client-side authentication and quota bypasses.

## [4.0.0] - 2026-04-01

### Changed (Breaking)
- ⚠️ **API Key Required**: Version 4.0.0 and above require a valid API key for all operations.
- 💰 **New Tiers**: Introduced Free (5/day) and Pro (unlimited) optimization tiers.

## [3.2.0] - 2025-11-02

### 🎉 Added
- **Minimal Input Enhancement Rule** (Priority 10): Transforms minimal/vague inputs like "hi", "hello", "hey" into structured request templates with 175x expansion
- **Debug Template Enhancement Rule** (Priority 9): Provides structured debugging framework for "debug", "fix", "error" requests with 10x expansion
- **Context-Aware Validation System**: Intelligent expansion limits based on content type:
  - Minimal input: 300x (e.g., "hi" → comprehensive template)
  - Image generation: 70x (detailed visual specifications)
  - Creative content: 20x (stories, poems)
  - Technical content: 15x (code, debugging)
  - Business proposals: 200x (comprehensive structure)
- **Deterministic Routing**: Alphabetical tie-breaking ensures identical outputs across multiple runs (eliminates variance)

### 🔧 Changed
- **Goal Threshold**: Lowered from 0.08 to 0.05 for more aggressive optimization and better rule application
- **Rule Selection**: Improved sorting algorithm with 4-level deterministic tie-breaking (priority → score → weight → alphabetical)
- **Validation Logic**: Enhanced per-rule validation with context-specific expansion limits

### 🐛 Fixed
- **Non-Deterministic Behavior**: Eliminated random variance in rule selection (achieved 100% determinism)
- **Minimal Input Handling**: "hi", "hello", "hey" now properly enhanced instead of returned unchanged
- **Debug Request Processing**: "debug my python function" now receives structured template instead of unchanged output
- **Validation Accuracy**: Context-aware limits prevent inappropriate expansions while allowing necessary enhancements

### 📊 Performance
- **100% Determinism**: Identical outputs across multiple runs for all test cases
- **100% Validation Rate**: All 6/6 test scenarios pass expansion requirements (improved from 66.7%)
- **Full Feature Parity**: Complete alignment with Python MCP server behavior
- **Cross-Platform Stable**: All improvements work identically on Windows, macOS, and Linux

### 🎯 Impact
This release achieves full feature parity with the Python MCP server, providing:
- Predictable, consistent optimization results
- Proper handling of minimal inputs (no more unchanged "hi" responses)
- Structured debugging templates for technical requests
- Context-aware validation preventing runaway expansions
- Production-ready reliability with zero variance

## [3.1.1] - 2025-09-15

### 🔧 Fixed
- **NPM Publishing**: Updated version to resolve npm registry version conflict
- **Package Configuration**: Optimized package.json for production deployment
- **Production Security**: Removed development-only scripts from published package

### 📦 Deployment
- **Ready for Production**: All QA checks passed, 100% test suite success
- **Cross-Platform Verified**: All 5 platform binaries tested and verified
- **Zero Dependencies**: Maintains security-first approach with no external dependencies

## [3.1.0] - 2025-09-15

### 🚀 Added
- **Cross-Platform Support**: Native binaries for Windows, macOS (Intel & Apple Silicon), and Linux (x64 & ARM64)
- **Free Tier**: 5 daily optimizations without API key required
- **Enhanced Quota System**: Persistent daily usage tracking with automatic reset
- **Advanced Rules Engine**: 127 optimization rules with context-aware selection
- **MCP Protocol Compliance**: Full Model Context Protocol integration with proper tool schemas
- **Binary Integrity Verification**: SHA256 checksums for all platform binaries
- **Automatic Platform Detection**: Seamless installation across all supported platforms

### 🔧 Enhanced
- **License Manager**: Multi-tier validation (Free/Basic/Pro) with quota enforcement
- **Error Handling**: Comprehensive error scenarios with user-friendly messages
- **Security Validation**: Multi-gate installation process with API key validation
- **Optimization Engine**: Context-aware prompt enhancement with goal alignment
- **Tool Integration**: MCP tools with quota validation and status monitoring

### 🛡️ Security
- **API Key Validation**: Format validation for Basic and Pro tier keys
- **Binary Verification**: SHA256 integrity checking for all downloaded binaries
- **Quota Enforcement**: Daily limits enforced before optimization processing
- **Local Processing**: Complete privacy with no data transmission

### 🌍 Cross-Platform
- **Windows**: x64 support with native .exe binary
- **macOS**: Universal support for Intel (x64) and Apple Silicon (ARM64)
- **Linux**: Support for x64 and ARM64 architectures
- **Automatic Downloads**: Missing binaries fetched from verified GitHub releases
- **CI/CD Pipeline**: Automated builds and releases for all platforms

### 📦 Distribution
- **Zero Dependencies**: No third-party packages for maximum security
- **Universal Installation**: Single `npm install` command works everywhere
- **Bandwidth Optimized**: Platform-specific binary downloads only when needed
- **GitHub Releases**: Verified binaries with checksums available

### 🔄 Migration
- **Backward Compatible**: Seamless upgrade from v3.0.x
- **Environment Variables**: Support for both `OPTIMIZER_API_KEY` and legacy `MCP_LICENSE_KEY`
- **Configuration Migration**: Automatic detection and upgrade of existing configurations

## [3.0.1] - 2025-08-12

### 🐛 Fixed
- Package manifest generation for development environments
- Binary availability checking on different platforms
- Installation security validation edge cases

### 🔧 Improved
- Development mode manifest generation
- Cross-platform binary detection
- Error messaging for missing components

## [3.0.0] - 2025-08-10

### 🚀 Initial Release
- Basic prompt optimization functionality
- Windows x64 binary support
- API key-based licensing
- MCP tool integration foundation
- Local processing engine

### 📝 Features
- Advanced prompt optimization with multiple rules
- Context detection and goal alignment
- Template management system
- Security validation framework

---

## 📋 Version History Summary

| Version | Release Date | Key Features |
|---------|-------------|--------------|
| 3.1.1 | 2025-09-15 | 🔧 Production fixes, npm publishing ready |
| 3.1.0 | 2025-09-15 | 🌍 Cross-platform, 🆓 Free tier, 🔒 Enhanced security |
| 3.0.1 | 2025-08-12 | 🐛 Bug fixes, 🔧 Improvements |
| 3.0.0 | 2025-08-10 | 🚀 Initial release |

## 🔮 Upcoming Features

### v3.2.0 (Planned)
- **Template Marketplace**: Shared optimization templates
- **Performance Analytics**: Detailed optimization metrics
- **Plugin System**: Extensible rule architecture
- **Web Interface**: Optional browser-based configuration

### v3.3.0 (Planned)
- **Cloud Sync**: Optional cloud backup for templates
- **Team Features**: Shared configurations for organizations
- **Advanced Context Detection**: Enhanced AI context recognition
- **Custom Rules Engine**: User-defined optimization rules

---

## 🆘 Support & Migration

For migration assistance or support questions:
- 📧 Email: support@promptoptimizer.xyz
- 🐛 Issues: [GitHub Issues](https://github.com/mcp-prompt-optimizer/local-npm/issues)
- 📖 Docs: [Documentation](https://promptoptimizer-blog.vercel.app/docs)

## 📜 License

This project is licensed under a Commercial License. See the LICENSE file for details.
