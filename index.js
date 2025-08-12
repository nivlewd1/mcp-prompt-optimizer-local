#!/usr/bin/env node

/**
 * MCP Prompt Optimizer Local - Simplified Edition
 * Enhanced local optimization with streamlined setup
 */

const path = require('path');
const SimplifiedLicenseManager = require('./lib/license-manager');

class SimplifiedMCPLocal {
    constructor() {
        this.projectRoot = __dirname;
        this.licenseManager = new SimplifiedLicenseManager();
    }

    async start() {
        console.log('🚀 MCP Prompt Optimizer Local - Starting...');
        
        try {
            // Simple license validation
            const licenseResult = await this.licenseManager.validateLicense();
            
            if (!licenseResult.valid) {
                this.showSetupInstructions();
                process.exit(1);
            }
            
            console.log(`✅ License validated: ${licenseResult.type} features enabled`);
            
            // Start the existing MCP server (keep all current functionality)
            await this.startMCPServer(licenseResult);
            
        } catch (error) {
            console.error('❌ Startup failed:', error.message);
            this.showSetupInstructions();
            process.exit(1);
        }
    }

    showSetupInstructions() {
        console.log('\n💡 Setup Required:');
        console.log('1. Get your license: https://promptoptimizer-blog.vercel.app/local-license');
        console.log('2. Set environment variable: export OPTIMIZER_API_KEY=your-license-key');
        console.log('3. Run: mcp-prompt-optimizer-local');
        console.log('\nFor help: https://promptoptimizer-blog.vercel.app/docs');
    }

    async startMCPServer(licenseResult) {
        // Keep existing server startup logic
        // Just pass the validated license info
        process.env.VALIDATED_LICENSE = JSON.stringify(licenseResult);
        
        // Import and start existing server components
        const BinaryManager = require('./lib/binary-manager');
        const binaryManager = new BinaryManager(this.projectRoot);
        
        try {
            // Initialize binary manager
            const binaryReady = await binaryManager.initialize();
            if (!binaryReady) {
                console.log('⚠️  Binary initialization issues, using fallback mode...');
            }
            
            // Start the MCP server
            const result = await binaryManager.start();
            console.log('✅ MCP server started successfully');
            return result;
            
        } catch (error) {
            console.error('❌ MCP server startup failed:', error.message);
            throw error;
        }
    }
}

// Simplified CLI handling
async function handleCLI() {
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        const command = args[0].toLowerCase();
        
        switch (command) {
            case 'check-license':
                await checkLicense();
                break;
            case 'clear-cache':
                await clearCache();
                break;
            case 'help':
                showHelp();
                break;
            case 'version':
                showVersion();
                break;
            default:
                console.error(`❌ Unknown command: ${command}`);
                console.log('Run "mcp-prompt-optimizer-local help" for usage');
                process.exit(1);
        }
    } else {
        // Start the server
        const mcpLocal = new SimplifiedMCPLocal();
        await mcpLocal.start();
    }
}

async function checkLicense() {
    const manager = new SimplifiedLicenseManager();
    const result = await manager.validateLicense();
    
    console.log('\n📋 License Validation Result:');
    if (result.valid) {
        console.log(`✅ License valid: ${result.type}`);
        console.log(`📊 Features: ${result.features.join(', ')}`);
        if (result.quota && result.quota.daily_limit) {
            console.log(`📈 Quota: ${result.quota.remaining}/${result.quota.daily_limit} remaining today`);
        } else if (result.quota && result.quota.unlimited) {
            console.log(`📈 Quota: Unlimited`);
        }
        if (result.local_validation) {
            console.log(`ℹ️  Note: Using local validation (backend not contacted)`);
        }
    } else {
        console.log('❌ License invalid or missing');
        console.log(`❗ Error: ${result.error}`);
        if (result.status_code) {
            console.log(`📡 Backend Response: HTTP ${result.status_code}`);
        }
        if (result.response_body) {
            console.log(`📄 Response: ${result.response_body}`);
        }
    }
}

async function clearCache() {
    console.log('🧹 Clearing license cache...');
    const manager = new SimplifiedLicenseManager();
    await manager.clearCache();
    console.log('✅ Cache cleared successfully');
    console.log('💡 Next license check will perform fresh validation');
}

function showHelp() {
    console.log(`
🚀 MCP Prompt Optimizer Local

Usage:
  mcp-prompt-optimizer-local              Start the MCP server
  mcp-prompt-optimizer-local check-license   Check license status  
  mcp-prompt-optimizer-local clear-cache     Clear license cache
  mcp-prompt-optimizer-local help            Show this help
  mcp-prompt-optimizer-local version         Show version

Setup:
  1. Get license: https://promptoptimizer-blog.vercel.app/local-license
  2. Set: export OPTIMIZER_API_KEY=your-license-key
  3. Run: mcp-prompt-optimizer-local

Environment Variables:
  OPTIMIZER_API_KEY       Your license key (required)
  MCP_LOG_LEVEL          Debug level (INFO, DEBUG, WARN, ERROR)
    `);
}

function showVersion() {
    const pkg = require('./package.json');
    console.log(`MCP Prompt Optimizer Local v${pkg.version}`);
}

if (require.main === module) {
    handleCLI().catch(error => {
        console.error('💥 Unexpected error:', error.message);
        console.log('\n🆘 Troubleshooting:');
        console.log('1. Clear cache: mcp-prompt-optimizer-local clear-cache');
        console.log('2. Check your license key: mcp-prompt-optimizer-local check-license');
        console.log('3. Get help: https://promptoptimizer-blog.vercel.app/docs');
        process.exit(1);
    });
}

module.exports = SimplifiedMCPLocal;
