#!/usr/bin/env node

/**
 * MCP Prompt Optimizer Local - Enhanced Main Entry Point
 * Integrates advanced optimization engine with cross-platform binary management
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// Import enhanced components
const PromptOptimizer = require('./lib/prompt-optimizer');
const { MCPToolHandler } = require('./lib/mcp-tools');

// MCP server SDK — real stdio transport so the package works as an MCP server, not just a CLI.
// Clients (Claude Desktop, etc.) spawn this binary and speak JSON-RPC over stdin/stdout. (audit #2)
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

// Import existing components with fallbacks
let BinaryManager, validateApiKey;
try {
    BinaryManager = require('./lib/binary-manager');
} catch (error) {
    console.warn('BinaryManager not available, using fallback');
    BinaryManager = class FallbackBinaryManager {
        async validateBinaryAvailability() {
            return {
                available: false,
                platform: process.platform,
                error: 'Binary manager not available'
            };
        }
    };
}

// Startup-time key check. This only checks format — it never calls the backend,
// so it must never claim the key is "validated". Real validation happens lazily
// on the first optimize call (lib/license-manager.js). No key is the free tier,
// a supported mode, not a failure.
async function fallbackSecurityValidation() {
    const apiKey = process.env.OPTIMIZER_API_KEY || process.env.MCP_LICENSE_KEY;

    if (!apiKey) {
        return { success: true, tier: 'free', message: 'No API key — free tier active' };
    }

    const LicenseManager = require('./lib/license-manager');
    if (!new LicenseManager().isValidKeyFormat(apiKey)) {
        return {
            success: false,
            error: 'API key format not recognized (expected sk-local-<basic|pro>-...)'
        };
    }

    return { success: true, tier: 'keyed', message: 'API key format valid — backend check happens on first optimize call' };
}

// Use fallback security validation for development
validateApiKey = fallbackSecurityValidation;

class MCPPromptOptimizerLocal {
    constructor() {
        this.projectRoot = path.dirname(__filename);
        this.logPrefix = '[MCP-Optimizer]';
        this.optimizer = null;
        this.toolHandler = null;
        this.binaryManager = new BinaryManager();
        this.initialized = false;

        // Real MCP server over stdio (audit #2). Handlers delegate to the existing tool handler.
        const pkg = require('./package.json');
        this.server = new Server(
            { name: pkg.name || 'mcp-prompt-optimizer-local', version: pkg.version || '0.0.0' },
            { capabilities: { tools: {} } }
        );
        this.setupMCPHandlers();
    }

    setupMCPHandlers() {
        // getMCPTools() -> { tools: [...] } and invokeMCPTool() -> { content: [...] } are already
        // MCP-shaped (lib/mcp-tools.js), so these handlers are thin delegators.
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return await this.getMCPTools();
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            return await this.invokeMCPTool(name, args);
        });
    }

    async startMCPServer() {
        await this.initialize();
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        // stderr only — stdout is the JSON-RPC channel
        this.log('MCP server running on stdio (JSON-RPC)', 'success');
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = `${timestamp} ${this.logPrefix}`;
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ❌ ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ⚠️  ${message}`);
                break;
            case 'success':
                console.error(`${prefix} ✅ ${message}`);
                break;
            case 'debug':
                if (process.env.DEBUG) {
                    console.log(`${prefix} 🔍 ${message}`);
                }
                break;
            default:
                console.error(`${prefix} ℹ️  ${message}`);
        }
    }

    /**
     * Initialize the advanced optimization system
     * @returns {boolean} - True if initialization successful
     */
    async initialize() {
        if (this.initialized) {
            return true;
        }

        try {
            this.log(`🚀 Initializing MCP Prompt Optimizer Local v${require('./package.json').version}...`);

            // API key is OPTIONAL: local rules-based optimization runs without one (free tier).
            // A valid key unlocks higher tiers / backend features; its absence must never block
            // local use — this is a privacy-first local package. (audit #1/#2)
            this.log('🔐 Checking API key (optional — free tier runs locally without one)...');
            try {
                const securityResult = await validateApiKey();
                if (securityResult && securityResult.success && securityResult.tier === 'keyed') {
                    this.log('✅ API key format valid (backend check happens on first optimize call)', 'success');
                    this.freeTier = false;
                } else if (securityResult && securityResult.success) {
                    this.log('ℹ️  No API key — running FREE tier (local rules-based optimization).');
                    this.freeTier = true;
                } else {
                    this.log(`⚠️  ${securityResult?.error || 'API key check failed'} — falling back to FREE tier.`);
                    this.freeTier = true;
                }
            } catch (error) {
                this.log(`ℹ️  Key check skipped (${error.message}); FREE tier active.`);
                this.freeTier = true;
            }

            // Initialize advanced optimizer
            this.log('🧠 Initializing advanced optimization engine...');
            this.optimizer = new PromptOptimizer({
                debug: process.env.DEBUG === 'true',
                sophisticationThresholds: {
                    basic: 0.3,
                    intermediate: 0.6,
                    advanced: 0.8
                }
            });

            const optimizerReady = await this.optimizer.initialize();
            if (!optimizerReady) {
                throw new Error('Advanced optimizer initialization failed');
            }
            this.log('✅ Advanced optimization engine ready', 'success');

            // Initialize MCP tool handler
            this.log('🔧 Initializing MCP tool handler...');
            this.toolHandler = new MCPToolHandler(this.optimizer, {
                debug: this.log.bind(this),
                info: this.log.bind(this),
                warn: (msg) => this.log(msg, 'warn'),
                error: (msg) => this.log(msg, 'error')
            });
            this.log('✅ MCP tool handler ready', 'success');

            this.initialized = true;
            this.log('🎉 MCP Prompt Optimizer Local fully initialized!', 'success');
            return true;

        } catch (error) {
            this.log(`❌ Initialization failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Test the advanced optimization functionality
     * @returns {Object} - Test results
     */
    async testAdvancedOptimization() {
        this.log('🧪 Testing advanced optimization functionality...');
        
        if (!this.initialized) {
            await this.initialize();
        }

        const testCases = [
            {
                name: "Basic Question Enhancement",
                prompt: "what is machine learning",
                context: "llm-interaction", 
                goals: ["clarity", "comprehensiveness"]
            },
            {
                name: "Technical Request",
                prompt: "create a function to sort data",
                context: "code-generation",
                goals: ["technical-precision", "actionability"]
            },
            {
                name: "Business Proposal",
                prompt: "write a proposal for remote work",
                context: "human-communication",
                goals: ["structure", "professionalism"]
            },
            {
                name: "Image Generation",
                prompt: "create an image of a sunset",
                context: "image-generation", 
                goals: ["specificity", "quality-enhancement"]
            }
        ];

        const results = [];

        for (const testCase of testCases) {
            try {
                this.log(`  Testing: ${testCase.name}`);
                
                const startTime = Date.now();
                const result = await this.optimizer.optimizeForContext(
                    testCase.prompt,
                    testCase.context,
                    testCase.goals
                );
                const processingTime = Date.now() - startTime;

                this.log(`    Original: "${testCase.prompt}"`);
                this.log(`    Optimized: "${result.optimizedText.slice(0, 100)}..."`);
                this.log(`    Applied ${result.appliedRules.length} rules in ${processingTime}ms`);
                this.log(`    Confidence: ${(result.confidence || 0).toFixed(2)}`);

                results.push({
                    ...testCase,
                    success: true,
                    result: result,
                    processingTime: processingTime
                });

            } catch (error) {
                this.log(`    ❌ Test failed: ${error.message}`, 'error');
                results.push({
                    ...testCase,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        this.log(`✅ Advanced optimization tests completed: ${successCount}/${results.length} passed`, 'success');

        return results;
    }

    /**
     * Test MCP tool functionality
     * @returns {Object} - MCP test results
     */
    async testMCPTools() {
        this.log('🔧 Testing MCP tool functionality...');

        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Test tools list
            const toolsList = await this.toolHandler.getToolsList({ templateToolsEnabled: false });
            this.log(`  Tools available: ${toolsList.tools.length}`);
            
            // Test optimize_prompt tool
            const optimizeResult = await this.toolHandler.handleToolInvoke(
                "optimize_prompt",
                {
                    prompt: "explain how neural networks work",
                    goals: ["clarity", "educational-value"],
                    ai_context: "llm-interaction"
                },
                "test_123"
            );

            if (!optimizeResult.isError) {
                this.log(`  ✅ optimize_prompt tool working`);
                this.log(`  Optimized length: ${optimizeResult.content[0].text.length} chars`);
            } else {
                this.log(`  ❌ optimize_prompt tool failed: ${optimizeResult.content?.[0]?.text}`, 'error');
            }

            return {
                toolsListSuccess: !!toolsList.tools,
                toolsCount: toolsList.tools?.length || 0,
                optimizeToolSuccess: !optimizeResult.isError,
                optimizeResult: optimizeResult
            };

        } catch (error) {
            this.log(`❌ MCP tool testing failed: ${error.message}`, 'error');
            return {
                toolsListSuccess: false,
                optimizeToolSuccess: false,
                error: error.message
            };
        }
    }

    /**
     * Run comprehensive test suite
     * @returns {Object} - Complete test results
     */
    async runFullTestSuite() {
        this.log('🚀 Running comprehensive test suite...');
        
        const results = {
            timestamp: new Date().toISOString(),
            version: require('./package.json').version,
            platform: process.platform,
            nodeVersion: process.version
        };

        try {
            // Test 1: Initialization
            this.log('📋 Test 1: System Initialization');
            results.initialization = await this.initialize();

            // Test 2: Security validation
            this.log('📋 Test 2: Security Validation');
            try {
                const securityResult = await validateApiKey();
                results.security = {
                    success: securityResult.success,
                    details: securityResult
                };
            } catch (error) {
                results.security = {
                    success: false,
                    error: error.message
                };
            }

            // Test 3: Binary availability
            this.log('📋 Test 3: Binary Availability');
            try {
                const binaryStatus = await this.binaryManager.validateBinaryAvailability();
                results.binaryAvailability = {
                    success: binaryStatus.available,
                    platform: binaryStatus.platform,
                    binaryPath: binaryStatus.binaryPath
                };
            } catch (error) {
                results.binaryAvailability = {
                    success: false,
                    error: error.message
                };
            }

            // Test 4: Advanced optimization
            this.log('📋 Test 4: Advanced Optimization Engine');
            results.advancedOptimization = await this.testAdvancedOptimization();

            // Test 5: MCP tools
            this.log('📋 Test 5: MCP Tool Integration');
            results.mcpTools = await this.testMCPTools();

            // Test 6: Component health
            this.log('📋 Test 6: Component Health Check');
            results.componentHealth = await this.getSystemHealth();

            // Calculate overall success
            const testCategories = [
                'initialization',
                'security', 
                'binaryAvailability',
                'advancedOptimization',
                'mcpTools'
            ];

            const successfulTests = testCategories.filter(category => {
                const test = results[category];
                if (Array.isArray(test)) {
                    return test.some(t => t.success);
                }
                return test && test.success !== false;
            }).length;

            results.overallSuccess = successfulTests >= 4; // At least 4/5 tests must pass
            results.successRate = successfulTests / testCategories.length;

            // Summary
            this.log('📊 Test Suite Summary:');
            this.log(`  ✅ Initialization: ${results.initialization ? 'PASS' : 'FAIL'}`);
            this.log(`  ✅ Security: ${results.security?.success ? 'PASS' : 'FAIL'}`);
            this.log(`  ✅ Binary Availability: ${results.binaryAvailability?.success ? 'PASS' : 'FAIL'}`);
            this.log(`  ✅ Advanced Optimization: ${results.advancedOptimization?.filter(t => t.success).length || 0}/${results.advancedOptimization?.length || 0} tests passed`);
            this.log(`  ✅ MCP Tools: ${results.mcpTools?.optimizeToolSuccess ? 'PASS' : 'FAIL'}`);
            this.log(`  📈 Overall Success Rate: ${(results.successRate * 100).toFixed(1)}%`);

            if (results.overallSuccess) {
                this.log('🎉 Test suite completed successfully!', 'success');
            } else {
                this.log('⚠️  Test suite completed with issues', 'warn');
            }

            return results;

        } catch (error) {
            this.log(`❌ Test suite failed: ${error.message}`, 'error');
            results.overallSuccess = false;
            results.error = error.message;
            return results;
        }
    }

    /**
     * Get system health status
     * @returns {Object} - Health status
     */
    async getSystemHealth() {
        try {
            const health = {
                timestamp: new Date().toISOString(),
                overall: 'healthy'
            };

            // Check optimizer health
            if (this.optimizer) {
                health.optimizer = {
                    initialized: this.optimizer.initialized,
                    componentState: await this.optimizer.getComponentState(),
                    healthy: await this.optimizer.isHealthy(),
                    metrics: await this.optimizer.getMetrics()
                };
            } else {
                health.optimizer = { status: 'not_initialized' };
            }

            // Check tool handler
            if (this.toolHandler) {
                health.toolHandler = { status: 'ready' };
            } else {
                health.toolHandler = { status: 'not_initialized' };
            }

            // Check binary manager
            health.binaryManager = {
                status: 'ready',
                platform: process.platform
            };

            // Determine overall health
            const components = [health.optimizer, health.toolHandler, health.binaryManager];
            const healthyComponents = components.filter(comp => 
                comp.healthy !== false && comp.status !== 'not_initialized'
            ).length;

            if (healthyComponents === components.length) {
                health.overall = 'healthy';
            } else if (healthyComponents >= components.length * 0.7) {
                health.overall = 'degraded';
            } else {
                health.overall = 'unhealthy';
            }

            return health;

        } catch (error) {
            return {
                timestamp: new Date().toISOString(),
                overall: 'error',
                error: error.message
            };
        }
    }

    /**
     * Legacy compatibility method for simple optimization
     * @param {string} prompt - Prompt to optimize
     * @param {string} context - Context type
     * @param {Array<string>} goals - Optimization goals
     * @returns {string} - Optimized prompt
     */
    async optimizePrompt(prompt, context = "llm-interaction", goals = ["clarity"]) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (this.optimizer) {
            // Use advanced optimization. Errors (license/quota failures, etc.)
            // propagate to the CLI's main() catch, which reports and exits(1) —
            // silently returning the raw prompt here made failures look like success.
            const result = await this.optimizer.optimizeForContext(prompt, context, goals);
            return result.optimizedText;
        }

        // Fallback to basic optimization
        return this._basicOptimization(prompt, context, goals);
    }

    /**
     * Basic fallback optimization for compatibility
     * @param {string} prompt - Prompt to optimize
     * @param {string} context - Context type
     * @param {Array<string>} goals - Optimization goals
     * @returns {string} - Optimized prompt
     */
    _basicOptimization(prompt, context, goals) {
        let optimized = prompt;

        // Apply basic transformations
        if (goals.includes("clarity")) {
            optimized = optimized.replace(/\bthis\b/g, "the following");
            optimized = optimized.replace(/\bthat\b/g, "the specified");
        }

        if (goals.includes("specificity")) {
            optimized = optimized.replace(/\bthings\b/g, "elements");
            optimized = optimized.replace(/\bstuff\b/g, "items");
        }

        if (goals.includes("actionability")) {
            if (!optimized.match(/^(please|create|write|analyze|explain)/i)) {
                optimized = `Please ${optimized}`;
            }
        }

        // Context-specific improvements
        switch (context) {
            case "llm-interaction":
                if (goals.includes("structure") && !optimized.includes("step")) {
                    optimized += " Please provide a step-by-step approach.";
                }
                break;
            case "image-generation":
                if (goals.includes("specificity") && !optimized.includes("style")) {
                    optimized += " Include specific visual style and composition details.";
                }
                break;
            case "code-generation":
                if (goals.includes("technical-precision") && !optimized.includes("best practices")) {
                    optimized += " Follow best practices with proper error handling.";
                }
                break;
        }

        return optimized;
    }

    /**
     * Get MCP tool definitions for external integration
     * @returns {Object} - MCP tool definitions
     */
    async getMCPTools() {
        if (!this.initialized) {
            await this.initialize();
        }

        if (this.toolHandler) {
            return await this.toolHandler.getToolsList({ templateToolsEnabled: false });
        } else {
            throw new Error('Tool handler not initialized');
        }
    }

    /**
     * Handle MCP tool invocation
     * @param {string} toolName - Tool name
     * @param {Object} args - Tool arguments
     * @param {string} messageId - Message ID
     * @returns {Object} - Tool result
     */
    async invokeMCPTool(toolName, args, messageId = null) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (this.toolHandler) {
            return await this.toolHandler.handleToolInvoke(toolName, args, messageId);
        } else {
            throw new Error('Tool handler not initialized');
        }
    }

    /**
     * Check binary availability
     * @returns {Object} - Binary status
     */
    async checkBinaryAvailability() {
        this.log('🔍 Checking binary availability...');
        
        try {
            const status = await this.binaryManager.validateBinaryAvailability();
            
            if (status.available) {
                this.log(`✅ Binary available: ${status.binaryPath}`, 'success');
            } else {
                this.log(`⚠️  Binary not available for ${status.platform}`, 'warn');
            }
            
            return status;
            
        } catch (error) {
            this.log(`❌ Error checking binaries: ${error.message}`, 'error');
            return {
                available: false,
                platform: process.platform,
                error: error.message
            };
        }
    }
}

// Handle command line usage
async function main() {
    const optimizer = new MCPPromptOptimizerLocal();
    const args = process.argv.slice(2);
    
    try {
        if (args.includes('--test') || args.includes('-t')) {
            const results = await optimizer.runFullTestSuite();
            
            if (results.overallSuccess) {
                console.log('\n🎉 All systems operational!');
                process.exit(0);
            } else {
                console.log('\n⚠️  Some issues detected. Check logs above.');
                process.exit(1);
            }
            
        } else if (args.includes('--health') || args.includes('-h')) {
            await optimizer.initialize();
            const health = await optimizer.getSystemHealth();
            console.log(JSON.stringify(health, null, 2));
            process.exit(health.overall === 'healthy' ? 0 : 1);
            
        } else if (args.includes('--tools')) {
            await optimizer.initialize();
            const tools = await optimizer.getMCPTools();
            console.log(JSON.stringify(tools, null, 2));
            process.exit(0);
            
        } else if (args.includes('--optimize')) {
            const promptIndex = args.indexOf('--optimize') + 1;
            if (promptIndex < args.length) {
                const prompt = args[promptIndex];
                const context = args.includes('--context') ? 
                    args[args.indexOf('--context') + 1] : 'llm-interaction';
                const goals = args.includes('--goals') ? 
                    args[args.indexOf('--goals') + 1].split(',') : ['clarity'];
                
                await optimizer.initialize();
                const result = await optimizer.optimizePrompt(prompt, context, goals);
                console.log(result);
                process.exit(0);
            } else {
                console.error('❌ --optimize requires a prompt argument');
                process.exit(1);
            }
            
        } else if (args.includes('help') || args.includes('--help')) {
            // Explicit help
            console.log('MCP Prompt Optimizer Local');
            console.log('Advanced cross-platform prompt optimization with MCP integration');
            console.log('');
            console.log('Usage:');
            console.log('  node index.js --test                    Run comprehensive test suite');
            console.log('  node index.js --health                  Check system health');
            console.log('  node index.js --tools                   List available MCP tools');
            console.log('  node index.js --optimize "prompt"       Optimize a prompt');
            console.log('  node index.js --optimize "prompt" --context llm-interaction --goals clarity,actionability');
            console.log('');
            console.log('Options:');
            console.log('  --context <type>     AI context (llm-interaction, code-generation, image-generation, etc.)');
            console.log('  --goals <list>       Optimization goals (comma-separated)');
            console.log('');
            console.log('Environment Variables:');
            console.log('  OPTIMIZER_API_KEY    API key for authentication');
            console.log('  DEBUG=true           Enable debug logging');
            console.log('');
            console.log('Examples:');
            console.log('  node index.js --optimize "write a function" --context code-generation');
            console.log('  node index.js --optimize "create an image" --context image-generation --goals specificity');
        } else {
            // No CLI flag: run as a real MCP stdio server — this is how MCP clients (Claude
            // Desktop, etc.) launch the package. Stays connected until stdin closes.
            await optimizer.startMCPServer();
        }

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Export for module usage
module.exports = MCPPromptOptimizerLocal;

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}