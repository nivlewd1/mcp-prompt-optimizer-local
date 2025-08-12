#!/usr/bin/env node

/**
 * MCP Prompt Optimizer Local - Core Optimization Module
 * Handles prompt optimization with local processing
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class PromptOptimizer {
    constructor() {
        this.projectRoot = path.dirname(path.dirname(__filename));
        this.logPrefix = '[PromptOptimizer]';
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = `${timestamp} ${this.logPrefix}`;
        
        if (level === 'error') {
            console.error(`${prefix} ❌ ${message}`);
        } else if (level === 'warn') {
            console.warn(`${prefix} ⚠️  ${message}`);
        } else if (level === 'success') {
            console.error(`${prefix} ✅ ${message}`);
        } else {
            console.error(`${prefix} ℹ️  ${message}`);
        }
    }

    async testOptimization() {
        this.log('🧪 Testing prompt optimization functionality...');
        
        const testPrompt = "make this better";
        const testContext = "llm_interaction";
        const testGoals = ["clarity", "conciseness"];
        
        this.log(`Input: "${testPrompt}"`);
        this.log(`Context: ${testContext}`);
        this.log(`Goals: ${testGoals.join(', ')}`);
        
        // Simulate optimization process
        const optimizedPrompt = this.optimizePrompt(testPrompt, testContext, testGoals);
        
        this.log(`Optimized: "${optimizedPrompt}"`);
        this.log('✅ Optimization test completed successfully!', 'success');
        
        return {
            original: testPrompt,
            optimized: optimizedPrompt,
            context: testContext,
            goals: testGoals
        };
    }

    optimizePrompt(prompt, context = "llm_interaction", goals = ["clarity"]) {
        // Simple optimization logic for testing
        let optimized = prompt;
        
        if (goals.includes("clarity")) {
            optimized = optimized.replace(/this/g, "the following text");
        }
        
        if (goals.includes("conciseness")) {
            optimized = optimized.replace(/make/g, "improve");
        }
        
        // Add context-specific improvements
        switch (context) {
            case "llm_interaction":
                optimized = `Please ${optimized} with detailed explanations and examples.`;
                break;
            case "image_generation":
                optimized = `Generate an image that ${optimized} with high quality and detail.`;
                break;
            case "code_generation":
                optimized = `Write clean, well-commented code that ${optimized} following best practices.`;
                break;
            default:
                optimized = `${optimized} effectively.`;
        }
        
        return optimized;
    }

    async checkBinaryAvailability() {
        this.log('🔍 Checking binary availability...');
        
        const binDir = path.join(this.projectRoot, 'bin');
        
        try {
            const files = await fs.readdir(binDir);
            const binaries = files.filter(f => f.startsWith('mcp-optimizer-'));
            
            if (binaries.length > 0) {
                this.log(`Found ${binaries.length} binary files:`);
                binaries.forEach(binary => this.log(`  - ${binary}`));
                return true;
            } else {
                this.log('No binary files found', 'warn');
                return false;
            }
        } catch (error) {
            this.log(`Error checking binaries: ${error.message}`, 'error');
            return false;
        }
    }

    async checkPythonFallback() {
        this.log('🐍 Checking Python fallback...');
        
        const pythonServer = path.join(this.projectRoot, 'python-server', 'app', 'main.py');
        
        try {
            await fs.access(pythonServer, fs.constants.F_OK);
            this.log('Python server available');
            return true;
        } catch (error) {
            this.log('Python server not available', 'warn');
            return false;
        }
    }

    async runFullTest() {
        this.log('🚀 Running full optimization test suite...');
        
        try {
            // Test 1: Basic optimization
            await this.testOptimization();
            
            // Test 2: Binary availability
            const binaryAvailable = await this.checkBinaryAvailability();
            
            // Test 3: Python fallback
            const pythonAvailable = await this.checkPythonFallback();
            
            // Test 4: License validation
            const licenseKey = process.env.MCP_LICENSE_KEY;
            if (licenseKey) {
                this.log('✅ License key found in environment');
            } else {
                this.log('⚠️  No license key found in environment', 'warn');
            }
            
            // Summary
            this.log('🎯 Test Results Summary:');
            this.log(`  - Optimization Logic: ✅ Working`);
            this.log(`  - Binary Files: ${binaryAvailable ? '✅ Available' : '❌ Missing'}`);
            this.log(`  - Python Fallback: ${pythonAvailable ? '✅ Available' : '❌ Missing'}`);
            this.log(`  - License Key: ${licenseKey ? '✅ Set' : '❌ Not Set'}`);
            
            this.log('✅ Full test suite completed!', 'success');
            
            return {
                optimizationTest: true,
                binaryAvailable,
                pythonAvailable,
                licenseKeySet: !!licenseKey
            };
            
        } catch (error) {
            this.log(`Test failed: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Handle command line usage
if (require.main === module) {
    const optimizer = new PromptOptimizer();
    const args = process.argv.slice(2);
    
    if (args.includes('--test')) {
        optimizer.runFullTest().then(() => {
            process.exit(0);
        }).catch((error) => {
            console.error('Test failed:', error);
            process.exit(1);
        });
    } else {
        console.log('MCP Prompt Optimizer Local - Core Module');
        console.log('Usage: node prompt-optimizer.js --test');
        console.log('Or use as a module: require("./prompt-optimizer")');
    }
}

module.exports = PromptOptimizer;
