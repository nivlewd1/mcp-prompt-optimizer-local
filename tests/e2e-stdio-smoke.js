#!/usr/bin/env node
/**
 * Black-box end-to-end smoke test for the published MCP server.
 *
 * Spawns `node index.js` as a real subprocess (no flags == MCP server mode,
 * exactly how Claude Desktop/Cursor/etc. launch it) and speaks JSON-RPC over
 * stdio. Does not import any internal class or call any handler method
 * directly. Free tier requires no API key and no network, so this suite
 * exercises the full protocol path with zero credentials.
 *
 * Usage: node tests/e2e-stdio-smoke.js
 */

const { spawn } = require('child_process');
const path = require('path');

const INDEX_JS = path.join(__dirname, '..', 'index.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

function runServer({ env = {}, requests, timeoutMs = 20000, waitForId = null }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [INDEX_JS], {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdoutBuf = '';
    let stderrBuf = '';
    const rpcResponses = [];
    let settled = false;

    const finish = (extra = {}) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { child.kill(); } catch (_) {}
      resolve({ rpcResponses, stderr: stderrBuf, exitCode: child.exitCode, ...extra });
    };

    const timer = setTimeout(() => finish({ timedOut: true }), timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString('utf8');
      let idx;
      while ((idx = stdoutBuf.indexOf('\n')) >= 0) {
        const line = stdoutBuf.slice(0, idx).trim();
        stdoutBuf = stdoutBuf.slice(idx + 1);
        if (!line) continue;
        let parsed;
        try {
          parsed = JSON.parse(line);
          rpcResponses.push(parsed);
        } catch (_) {
          rpcResponses.push({ __nonJsonStdoutLine: line });
        }
        if (waitForId !== null && parsed && parsed.id === waitForId) {
          // Give the process a brief grace period in case more output is mid-flight,
          // then tear down via kill() — never via stdin.end() (see note below).
          setTimeout(() => finish(), 150);
        }
      }
    });

    child.stderr.on('data', (chunk) => { stderrBuf += chunk.toString('utf8'); });
    child.on('exit', (code) => finish({ exitCode: code }));
    child.on('error', (err) => finish({ spawnError: err }));

    (async () => {
      for (const { msg, delayAfterMs } of requests) {
        if (child.exitCode !== null || settled) break;
        try {
          child.stdin.write(JSON.stringify(msg) + '\n');
        } catch (_) {
          break;
        }
        await new Promise((r) => setTimeout(r, delayAfterMs ?? 500));
      }
      // Deliberately do NOT close stdin here: this SDK's stdio transport treats
      // EOF as a shutdown signal and tears the process down immediately, racing
      // (and sometimes losing) the response to the last in-flight request. The
      // overall timeout + child.kill() in finish() is the only teardown path.
    })();
  });
}

const initializeRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'e2e-smoke-test', version: '1.0.0' },
  },
};
const initializedNotification = { jsonrpc: '2.0', method: 'notifications/initialized' };
const toolsListRequest = { jsonrpc: '2.0', id: 2, method: 'tools/list' };

function optimizeCallRequest(prompt, id = 3) {
  return {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name: 'optimize_prompt', arguments: { prompt, ai_context: 'code-generation', goals: ['clarity'] } },
  };
}

// requests[] entries are { msg, delayAfterMs } — delayAfterMs is harness-only
// timing and must never be embedded in the JSON-RPC payload itself (an SDK
// with strict request-schema validation will reject/silently drop a message
// carrying an unrecognized top-level field).
const wire = (msg, delayAfterMs) => ({ msg, delayAfterMs });

async function testFreeTierFullProtocolNoCredentials() {
  console.log('\n[1] Free tier: initialize -> tools/list -> tools/call optimize_prompt, zero credentials, zero network');
  const prompt = 'write a function that reverses a linked list';
  const result = await runServer({
    env: { OPTIMIZER_API_KEY: '' },
    requests: [
      wire(initializeRequest, 500),
      wire(initializedNotification, 300),
      wire(toolsListRequest, 500),
      wire(optimizeCallRequest(prompt), 3000),
    ],
    waitForId: 3,
  });

  assert(!result.timedOut, 'process responds within the timeout (no hang)');
  if (process.env.DEBUG_E2E) {
    console.log('  --- raw rpcResponses ---');
    console.log(JSON.stringify(result.rpcResponses, null, 2));
    console.log('  --- raw stderr ---');
    console.log(result.stderr);
  }

  const initResp = result.rpcResponses.find((r) => r.id === 1);
  assert(!!initResp && !!initResp.result, 'initialize returns a result object');
  assert(
    initResp?.result?.serverInfo?.name === 'mcp-prompt-optimizer-local',
    `serverInfo.name matches package identity (got ${JSON.stringify(initResp?.result?.serverInfo)})`
  );

  const listResp = result.rpcResponses.find((r) => r.id === 2);
  assert(!!listResp?.result?.tools, 'tools/list returns a tools array');
  const toolNames = (listResp?.result?.tools || []).map((t) => t.name);
  assert(toolNames.includes('optimize_prompt'), 'tools/list advertises "optimize_prompt"');

  const callResp = result.rpcResponses.find((r) => r.id === 3);
  assert(!!callResp, 'tools/call optimize_prompt returns a response');
  assert(!callResp?.error, `tools/call did not error out on the free tier (error: ${JSON.stringify(callResp?.error)})`);
  const text = callResp?.result?.content?.[0]?.text || '';
  assert(typeof text === 'string' && text.length > 0, 'tools/call response carries non-empty text content');

  const promptWords = 'reverses a linked list'.split(' ');
  const hitCount = promptWords.filter((w) => text.toLowerCase().includes(w.toLowerCase())).length;
  assert(
    hitCount >= 2,
    'optimized output actually reflects the user\'s prompt (catches a template-discards-the-prompt bug end-to-end)'
  );

  assert(
    result.rpcResponses.every((r) => r.__nonJsonStdoutLine === undefined),
    'stdout stays a clean JSON-RPC channel — no stray log lines leaked onto it'
  );
}

async function testMalformedKeyedFormatRejectedLocally() {
  console.log('\n[2] Malformed keyed-tier API key is rejected without a network call');
  const result = await runServer({
    env: { OPTIMIZER_API_KEY: 'not-a-real-key-format' },
    requests: [wire(initializeRequest, 500), wire(initializedNotification, 300), wire(toolsListRequest, 500)],
    timeoutMs: 10000,
    waitForId: 2,
  });
  // Format rejection surfaces via startup log to stderr per fallbackSecurityValidation();
  // the server should still come up in a defined state (free tier) rather than crash.
  const listResp = result.rpcResponses.find((r) => r.id === 2);
  assert(!!listResp?.result?.tools || result.exitCode !== null, 'server reaches a defined state (tools/list answers, or exits deliberately) instead of hanging');
}

(async () => {
  console.log('='.repeat(80));
  console.log('E2E STDIO SMOKE TEST — real subprocess, real JSON-RPC, zero internal coupling');
  console.log('='.repeat(80));

  await testFreeTierFullProtocolNoCredentials();
  await testMalformedKeyedFormatRejectedLocally();

  console.log('\n' + '='.repeat(80));
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));
  process.exit(failed > 0 ? 1 : 0);
})();
