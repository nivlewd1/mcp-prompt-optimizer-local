#!/usr/bin/env node

/**
 * MCP Prompt Optimizer Local - Comprehensive Validation Test Suite
 * Tests all critical functionality without requiring installation
 * 
 * Usage: node test-package-validation.js
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class PackageValidationTest {
    constructor() {
        this.projectRoot = path.dirname(__filename);
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
        this.tempFiles = [];
    }

    async runAllTests() {
        console.log('🧪 MCP Prompt Optimizer Local - Package Validation Test Suite');
        console.log('==============================================================\n');

        try {
            // Test 1: File Structure Validation
            await this.testFileStructure();

            // Test 2: License Manager Functionality
            await this.testLicenseManager();

            // Test 3: Prompt Optimizer with License Integration
            await this.testPromptOptimizerIntegration();

            // Test 4: MCP Tools with Quota Validation
            await this.testMCPToolsIntegration();

            // Test 5: Free Tier Installation Logic
            await this.testFreeTierInstallation();

            // Test 6: API Key Validation Logic
            await this.testAPIKeyValidation();

            // Test 7: Quota Enforcement Simulation
            await this.testQuotaEnforcement();

            // Test 8: Daily Reset Logic
            await this.testDailyReset();

            // Test 9: MCP Protocol Compliance
            await this.testMCPProtocolCompliance();

            // Test 10: Error Handling
            await this.testErrorHandling();

            this.generateTestReport();

        } catch (error) {
            console.error(`💥 Test suite failed: ${error.message}`);
            this.fail('TEST_SUITE_CRASH', `Test suite crashed: ${error.message}`);
            this.generateTestReport();
            process.exit(1);
        } finally {
            await this.cleanup();
        }
    }

    // Test 1: File Structure Validation
    async testFileStructure() {
        this.logTest('📁 Testing File Structure');

        const requiredFiles = [
            'package.json',
            'index.js',
            'secure-postinstall.js',
            'lib/license-manager.js',
            'lib/prompt-optimizer.js',
            'lib/mcp-tools.js',
            'lib/enhanced-api-key-check.js',
            'lib/optimization-rules.js'
        ];

        let allFilesExist = true;
        for (const file of requiredFiles) {
            const filePath = path.join(this.projectRoot, file);
            try {
                await fs.access(filePath);
                this.pass(`✅ Found: ${file}`);
            } catch (error) {
                this.fail(`❌ Missing: ${file}`, `Required file ${file} not found`);
                allFilesExist = false;
            }
        }

        if (allFilesExist) {
            this.pass('FILE_STRUCTURE', 'All required files present');
        }
    }

    // Test 2: License Manager Functionality
    async testLicenseManager() {
        this.logTest('🔑 Testing License Manager');

        try {
            // Clear environment for clean test
            delete process.env.OPTIMIZER_API_KEY;

            const LicenseManager = require('./lib/license-manager.js');
            const licenseManager = new LicenseManager();

            // Test free tier validation
            const freeResult = await licenseManager.validateLicense();
            if (freeResult.valid && freeResult.type === 'free') {
                this.pass('FREE_TIER_VALIDATION', 'Free tier validation works correctly');
            } else {
                this.fail('FREE_TIER_VALIDATION', 'Free tier validation failed');
            }

            // Test usage tracking
            const usage = await licenseManager.loadDailyUsage();
            if (usage && typeof usage.count === 'number' && usage.date) {
                this.pass('USAGE_TRACKING', 'Daily usage tracking works');
            } else {
                this.fail('USAGE_TRACKING', 'Daily usage tracking failed');
            }

            // Test quota checking
            const quota = await licenseManager.checkDailyQuota(freeResult);
            if (quota && typeof quota.allowed === 'boolean' && typeof quota.remaining === 'number') {
                this.pass('QUOTA_CHECKING', 'Quota checking works correctly');
            } else {
                this.fail('QUOTA_CHECKING', 'Quota checking failed');
            }

            // Test quota status
            const status = await licenseManager.getQuotaStatus();
            if (status && status.tier && typeof status.remaining === 'number') {
                this.pass('QUOTA_STATUS', 'Quota status retrieval works');
            } else {
                this.fail('QUOTA_STATUS', 'Quota status retrieval failed');
            }

        } catch (error) {
            this.fail('LICENSE_MANAGER', `License Manager test failed: ${error.message}`);
        }
    }

    // Test 3: Prompt Optimizer with License Integration
    async testPromptOptimizerIntegration() {
        this.logTest('🧠 Testing Prompt Optimizer Integration');

        try {
            const PromptOptimizer = require('./lib/prompt-optimizer.js');
            const optimizer = new PromptOptimizer({ debug: false });

            // Test initialization
            const initialized = await optimizer.initialize();
            if (initialized) {
                this.pass('OPTIMIZER_INIT', 'Prompt optimizer initializes correctly');
            } else {
                this.fail('OPTIMIZER_INIT', 'Prompt optimizer initialization failed');
            }

            // Test health check
            const healthy = await optimizer.isHealthy();
            if (healthy) {
                this.pass('OPTIMIZER_HEALTH', 'Optimizer health check passes');
            } else {
                this.warn('OPTIMIZER_HEALTH', 'Optimizer health check concerns');
            }

            // Test license manager integration
            if (optimizer.licenseManager) {
                this.pass('LICENSE_INTEGRATION', 'License manager properly integrated');
            } else {
                this.fail('LICENSE_INTEGRATION', 'License manager not integrated');
            }

            // Test quota checking method
            if (typeof optimizer.checkQuotaStatus === 'function') {
                const quotaStatus = await optimizer.checkQuotaStatus();
                if (quotaStatus && quotaStatus.tier) {
                    this.pass('OPTIMIZER_QUOTA_CHECK', 'Optimizer quota checking works');
                } else {
                    this.fail('OPTIMIZER_QUOTA_CHECK', 'Optimizer quota checking failed');
                }
            } else {
                this.fail('OPTIMIZER_QUOTA_METHOD', 'checkQuotaStatus method missing');
            }

        } catch (error) {
            this.fail('OPTIMIZER_INTEGRATION', `Prompt Optimizer integration test failed: ${error.message}`);
        }
    }

    // Test 4: MCP Tools with Quota Validation
    async testMCPToolsIntegration() {
        this.logTest('🔧 Testing MCP Tools Integration');

        try {
            const { MCPToolHandler, MCP_TOOLS } = require('./lib/mcp-tools.js');

            // Test tools definition
            if (MCP_TOOLS.optimize_prompt && MCP_TOOLS.get_quota_status) {
                this.pass('MCP_TOOLS_DEFINITION', 'MCP tools properly defined');
            } else {
                this.fail('MCP_TOOLS_DEFINITION', 'MCP tools missing or incomplete');
            }

            // Create mock optimizer for testing
            const mockOptimizer = {
                licenseManager: {
                    validateLicenseAndQuota: async () => ({
                        valid: true,
                        tier: 'free',
                        quota: { allowed: true, remaining: 5, limit: 5 }
                    })
                },
                checkQuotaStatus: async () => ({
                    tier: 'free',
                    unlimited: false,
                    used: 0,
                    remaining: 5,
                    limit: 5
                }),
                optimizeForContext: async (text, context, goals) => ({
                    optimizedText: `Enhanced: ${text}`,
                    appliedRules: ['test_rule'],
                    confidence: 0.8,
                    processingTime: 100
                })
            };

            const toolHandler = new MCPToolHandler(mockOptimizer);

            // Test tools list
            const toolsList = await toolHandler.getToolsList();
            if (toolsList.tools && toolsList.tools.length >= 2) {
                this.pass('TOOLS_LIST', 'Tools list includes required tools');
            } else {
                this.fail('TOOLS_LIST', 'Tools list incomplete');
            }

            // Test quota status tool
            const quotaResponse = await toolHandler.handleToolInvoke('get_quota_status', {}, 'test1');
            if (quotaResponse.content && !quotaResponse.isError) {
                this.pass('QUOTA_STATUS_TOOL', 'get_quota_status tool works');
            } else {
                this.fail('QUOTA_STATUS_TOOL', 'get_quota_status tool failed');
            }

        } catch (error) {
            this.fail('MCP_TOOLS_INTEGRATION', `MCP Tools integration test failed: ${error.message}`);
        }
    }

    // Test 5: Free Tier Installation Logic
    async testFreeTierInstallation() {
        this.logTest('🆓 Testing Free Tier Installation');

        try {
            // Clear API key for free tier test
            delete process.env.OPTIMIZER_API_KEY;

            const requireValidApiKey = require('./lib/enhanced-api-key-check.js');
            const result = requireValidApiKey();

            if (result.valid && result.tier === 'free' && result.quota) {
                this.pass('FREE_TIER_INSTALL', 'Free tier installation logic works');
            } else {
                this.fail('FREE_TIER_INSTALL', 'Free tier installation logic failed');
            }

            // Test quota structure
            if (result.quota.daily_limit === 5) {
                this.pass('FREE_TIER_QUOTA', 'Free tier quota correctly set to 5');
            } else {
                this.fail('FREE_TIER_QUOTA', 'Free tier quota incorrect');
            }

        } catch (error) {
            this.fail('FREE_TIER_INSTALL', `Free tier installation test failed: ${error.message}`);
        }
    }

    // Test 6: API Key Validation Logic
    async testAPIKeyValidation() {
        this.logTest('🔐 Testing API Key Validation');

        try {
            const requireValidApiKey = require('./lib/enhanced-api-key-check.js');

            // Test valid pro key
            process.env.OPTIMIZER_API_KEY = 'sk-local-pro-1234567890abcdef1234567890abcdef';
            const proResult = requireValidApiKey();
            if (proResult.valid && proResult.tier === 'pro') {
                this.pass('PRO_KEY_VALIDATION', 'Pro key validation works');
            } else {
                this.fail('PRO_KEY_VALIDATION', 'Pro key validation failed');
            }

            // Test valid basic key
            process.env.OPTIMIZER_API_KEY = 'sk-local-basic-1234567890abcdef1234567890abcdef';
            const basicResult = requireValidApiKey();
            if (basicResult.valid && basicResult.tier === 'basic') {
                this.pass('BASIC_KEY_VALIDATION', 'Basic key validation works');
            } else {
                this.fail('BASIC_KEY_VALIDATION', 'Basic key validation failed');
            }

            // Clean up
            delete process.env.OPTIMIZER_API_KEY;

        } catch (error) {
            this.fail('API_KEY_VALIDATION', `API key validation test failed: ${error.message}`);
        }
    }

    // Test 7: Quota Enforcement Simulation
    async testQuotaEnforcement() {
        this.logTest('📊 Testing Quota Enforcement');

        try {
            // Create temporary usage file with quota at limit
            const usageFile = path.join(os.homedir(), '.mcp-optimizer-usage-test.json');
            const testUsage = {
                date: new Date().toDateString(),
                count: 5
            };
            await fs.writeFile(usageFile, JSON.stringify(testUsage));
            this.tempFiles.push(usageFile);

            // Mock license manager with test file
            const LicenseManager = require('./lib/license-manager.js');
            const licenseManager = new LicenseManager();
            licenseManager.usageFile = usageFile;

            // Test quota exceeded scenario
            const license = await licenseManager.validateLicense();
            const quota = await licenseManager.checkDailyQuota(license);

            if (!quota.allowed && quota.remaining === 0) {
                this.pass('QUOTA_ENFORCEMENT', 'Quota enforcement works correctly');
            } else {
                this.fail('QUOTA_ENFORCEMENT', 'Quota enforcement failed');
            }

        } catch (error) {
            this.fail('QUOTA_ENFORCEMENT', `Quota enforcement test failed: ${error.message}`);
        }
    }

    // Test 8: Daily Reset Logic
    async testDailyReset() {
        this.logTest('🔄 Testing Daily Reset Logic');

        try {
            // Create temporary usage file with yesterday's date
            const usageFile = path.join(os.homedir(), '.mcp-optimizer-usage-test2.json');
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            const oldUsage = {
                date: yesterday.toDateString(),
                count: 5
            };
            await fs.writeFile(usageFile, JSON.stringify(oldUsage));
            this.tempFiles.push(usageFile);

            // Mock license manager with test file
            const LicenseManager = require('./lib/license-manager.js');
            const licenseManager = new LicenseManager();
            licenseManager.usageFile = usageFile;

            // Load usage should reset for new day
            const usage = await licenseManager.loadDailyUsage();
            
            if (usage.count === 0 && usage.date === new Date().toDateString()) {
                this.pass('DAILY_RESET', 'Daily reset logic works correctly');
            } else {
                this.fail('DAILY_RESET', 'Daily reset logic failed');
            }

        } catch (error) {
            this.fail('DAILY_RESET', `Daily reset test failed: ${error.message}`);
        }
    }

    // Test 9: MCP Protocol Compliance
    async testMCPProtocolCompliance() {
        this.logTest('🔌 Testing MCP Protocol Compliance');

        try {
            const { MCP_TOOLS } = require('./lib/mcp-tools.js');

            // Test tool schema structure
            let validSchema = true;
            for (const [toolName, toolDef] of Object.entries(MCP_TOOLS)) {
                if (!toolDef.description || !toolDef.inputSchema) {
                    validSchema = false;
                    break;
                }
                if (!toolDef.inputSchema.type || !toolDef.inputSchema.properties) {
                    validSchema = false;
                    break;
                }
            }

            if (validSchema) {
                this.pass('MCP_SCHEMA', 'MCP tool schemas are valid');
            } else {
                this.fail('MCP_SCHEMA', 'MCP tool schemas invalid');
            }

            // Test required tools presence
            const requiredTools = ['optimize_prompt', 'get_quota_status'];
            const hasAllRequired = requiredTools.every(tool => MCP_TOOLS[tool]);

            if (hasAllRequired) {
                this.pass('MCP_REQUIRED_TOOLS', 'All required MCP tools present');
            } else {
                this.fail('MCP_REQUIRED_TOOLS', 'Missing required MCP tools');
            }

        } catch (error) {
            this.fail('MCP_PROTOCOL', `MCP protocol compliance test failed: ${error.message}`);
        }
    }

    // Test 10: Error Handling
    async testErrorHandling() {
        this.logTest('⚠️ Testing Error Handling');

        try {
            const LicenseManager = require('./lib/license-manager.js');
            const licenseManager = new LicenseManager();

            // Test invalid API key handling
            process.env.OPTIMIZER_API_KEY = 'invalid-key-format';
            
            try {
                const requireValidApiKey = require('./lib/enhanced-api-key-check.js');
                requireValidApiKey();
                this.fail('ERROR_HANDLING_INVALID_KEY', 'Should have thrown error for invalid key');
            } catch (error) {
                if (error.message.includes('Invalid API key format')) {
                    this.pass('ERROR_HANDLING_INVALID_KEY', 'Invalid key error handling works');
                } else {
                    this.fail('ERROR_HANDLING_INVALID_KEY', 'Wrong error message for invalid key');
                }
            }

            // Clean up
            delete process.env.OPTIMIZER_API_KEY;

            // Test quota exceeded error handling
            const { MCPToolHandler } = require('./lib/mcp-tools.js');
            const mockOptimizerQuotaExceeded = {
                licenseManager: {
                    validateLicenseAndQuota: async () => ({
                        valid: true,
                        tier: 'free',
                        quota: { allowed: false, remaining: 0, limit: 5 }
                    })
                }
            };

            const toolHandler = new MCPToolHandler(mockOptimizerQuotaExceeded);
            const response = await toolHandler.handleToolInvoke('optimize_prompt', { prompt: 'test' }, 'test');

            if (response.isError && response.content?.[0]?.text?.includes('Daily optimization limit')) {
                this.pass('ERROR_HANDLING_QUOTA', 'Quota exceeded error handling works');
            } else {
                this.fail('ERROR_HANDLING_QUOTA', 'Quota exceeded error handling failed');
            }

        } catch (error) {
            this.fail('ERROR_HANDLING', `Error handling test failed: ${error.message}`);
        }
    }

    // Helper methods
    pass(testId, message) {
        this.testResults.passed++;
        this.testResults.details.push({ type: 'PASS', id: testId, message });
        console.log(`   ✅ ${message}`);
    }

    fail(testId, message) {
        this.testResults.failed++;
        this.testResults.details.push({ type: 'FAIL', id: testId, message });
        console.log(`   ❌ ${message}`);
    }

    warn(testId, message) {
        this.testResults.warnings++;
        this.testResults.details.push({ type: 'WARN', id: testId, message });
        console.log(`   ⚠️  ${message}`);
    }

    logTest(testName) {
        console.log(`\n${testName}`);
        console.log('─'.repeat(50));
    }

    generateTestReport() {
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('========================');
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`⚠️  Warnings: ${this.testResults.warnings}`);
        
        const total = this.testResults.passed + this.testResults.failed;
        const successRate = total > 0 ? (this.testResults.passed / total * 100).toFixed(1) : 0;
        
        console.log(`📈 Success Rate: ${successRate}%`);

        if (this.testResults.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults.details
                .filter(d => d.type === 'FAIL')
                .forEach(d => console.log(`   • ${d.id}: ${d.message}`));
        }

        if (this.testResults.warnings > 0) {
            console.log('\n⚠️  WARNINGS:');
            this.testResults.details
                .filter(d => d.type === 'WARN')
                .forEach(d => console.log(`   • ${d.id}: ${d.message}`));
        }

        // Overall assessment
        console.log('\n🏆 OVERALL ASSESSMENT');
        console.log('=====================');
        
        if (this.testResults.failed === 0) {
            console.log('🎉 ALL TESTS PASSED! Package is ready for use.');
            console.log('✅ License enforcement implemented correctly');
            console.log('✅ Free tier support working');
            console.log('✅ MCP protocol compliance verified');
        } else if (this.testResults.failed <= 2) {
            console.log('⚠️  MOSTLY FUNCTIONAL with minor issues');
            console.log('🔧 Review failed tests and fix before deployment');
        } else {
            console.log('❌ SIGNIFICANT ISSUES DETECTED');
            console.log('🚨 Package needs substantial fixes before use');
        }

        console.log('\n📋 NEXT STEPS:');
        if (this.testResults.failed === 0) {
            console.log('1. ✅ Package validation complete');
            console.log('2. 🚀 Ready for production deployment');
            console.log('3. 📦 Safe to publish to NPM');
        } else {
            console.log('1. 🔧 Fix failed test cases');
            console.log('2. 🧪 Re-run validation tests');
            console.log('3. ✅ Ensure all tests pass before deployment');
        }
    }

    async cleanup() {
        // Clean up temporary files
        for (const file of this.tempFiles) {
            try {
                await fs.unlink(file);
            } catch (error) {
                // Ignore cleanup errors
            }
        }

        // Clean up environment
        delete process.env.OPTIMIZER_API_KEY;
    }
}

// Run tests if called directly
if (require.main === module) {
    const testSuite = new PackageValidationTest();
    testSuite.runAllTests().catch(error => {
        console.error(`💥 Test suite crashed: ${error.message}`);
        process.exit(1);
    });
}

module.exports = PackageValidationTest;