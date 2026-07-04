#!/usr/bin/env node

/**
 * Simplified Setup for MCP Prompt Optimizer Local
 */

console.log('🏗️  MCP Prompt Optimizer Local - Setup\n');

const hasApiKey = process.env.OPTIMIZER_API_KEY;

if (hasApiKey) {
    console.log('✅ API key found in environment');
    console.log('🧪 Testing license validation...\n');
    
    const SimplifiedLicenseManager = require('./lib/license-manager');
    const manager = new SimplifiedLicenseManager();
    
    manager.validateLicense()
        .then(result => {
            if (result.valid) {
                console.log('✅ License validation successful!');
                console.log(`📋 Type: ${result.type}`);
                console.log(`🎁 Features: ${result.features.join(', ')}`);
                console.log('\n🚀 Ready to use: mcp-prompt-optimizer-local');
                console.log('\n📖 Claude Desktop configuration:');
                console.log(`{
  "mcpServers": {
    "prompt-optimizer-local": {
      "command": "mcp-prompt-optimizer-local",
      "env": {
        "OPTIMIZER_API_KEY": "${hasApiKey.substring(0, 20)}..."
      }
    }
  }
}`);
            } else {
                console.log('❌ License validation failed:', result.error);
                showSetupInstructions();
            }
        })
        .catch(error => {
            console.log('⚠️  License validation error:', error.message);
            console.log('💡 This might work in offline mode or with cached validation');
        });
} else {
    console.log('❌ No API key found');
    showSetupInstructions();
}

function showSetupInstructions() {
    console.log('\n📋 Setup Steps:');
    console.log('1. 🔗 Get your license: https://promptoptimizer.xyz/local-license');
    console.log('2. 🔧 Set environment variable:');
    console.log('     export OPTIMIZER_API_KEY=your-license-key');
    console.log('3. 🧪 Test setup: npm run setup');
    console.log('4. 🚀 Start server: mcp-prompt-optimizer-local');
    console.log('\n💡 The license enables all features: content analysis, debugging enhancement,');
    console.log('    technical preservation, template management, and optional LLM integration.');
}
