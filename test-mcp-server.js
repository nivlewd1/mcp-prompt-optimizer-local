#!/usr/bin/env node
/**
 * Integration smoke test for the MCP stdio server (audit #2).
 * Spawns `node index.js` (no args -> server mode) and performs a real MCP handshake:
 * initialize -> tools/list. Passing proves the package now works as an MCP server, not just a CLI.
 *
 * Run: node test-mcp-server.js   (exits 0 on success, 1 on failure)
 */
const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

(async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,               // node
    args: [path.join(__dirname, 'index.js')], // no flags -> stdio server
    cwd: __dirname,
    env: { ...process.env, OPTIMIZER_SKIP_SECURITY: 'true' },
    stderr: 'inherit',
  });
  const client = new Client({ name: 'mcp-server-smoke-test', version: '1.0.0' }, { capabilities: {} });

  try {
    await client.connect(transport);            // performs initialize handshake
    const { tools } = await client.listTools(); // tools/list
    if (!Array.isArray(tools) || tools.length === 0) {
      throw new Error('tools/list returned no tools');
    }
    console.log(`✅ MCP handshake OK — ${tools.length} tools: ${tools.map((t) => t.name).join(', ')}`);
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error(`❌ MCP server smoke test failed: ${err.message}`);
    try { await client.close(); } catch (_) {}
    process.exit(1);
  }
})();
