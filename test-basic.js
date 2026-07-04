#!/usr/bin/env node

/**
 * Basic test for the core optimization functionality
 */

const PromptOptimizer = require('./lib/prompt-optimizer');

async function testBasic() {
    console.log('🧪 Testing basic optimization...');
    
    try {
        // Test 1: Basic initialization
        console.log('1. Initializing optimizer...');
        const optimizer = new PromptOptimizer({ debug: true });
        
        const initialized = await optimizer.initialize();
        console.log(`   Initialization: ${initialized ? 'SUCCESS' : 'FAILED'}`);
        
        if (!initialized) {
            throw new Error('Initialization failed');
        }
        
        // Test 2: Basic optimization
        console.log('2. Testing optimization...');
        const testPrompt = "what is machine learning";
        const result = await optimizer.optimizeForContext(
            testPrompt,
            'llm-interaction',
            ['clarity', 'comprehensiveness']
        );
        
        console.log(`   Original: "${testPrompt}"`);
        console.log(`   Optimized: "${result.optimizedText.slice(0, 100)}..."`);
        console.log(`   Rules applied: ${result.appliedRules.length}`);
        console.log(`   Confidence: ${(result.confidence || 0).toFixed(2)}`);
        
        // Test 3: Health check
        console.log('3. Health check...');
        const healthy = await optimizer.isHealthy();
        console.log(`   Health: ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
        
        console.log('✅ Basic tests completed successfully!');
        return true;
        
    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        console.error(error.stack);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testBasic().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = testBasic;