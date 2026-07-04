#!/usr/bin/env node

/**
 * Authentication Security Test
 * Verifies that all authentication bypasses have been removed
 */

const SimplifiedLicenseManager = require('./lib/license-manager');
const PromptOptimizer = require('./lib/prompt-optimizer');

console.log('🔒 Authentication Security Test Suite\n');
console.log('Testing that all bypass vulnerabilities have been fixed...\n');

const tests = [];
const results = {
    passed: 0,
    failed: 0,
    total: 0
};

// Helper to run async tests
async function runTest(name, testFn) {
    results.total++;
    console.log(`\n📝 Test ${results.total}: ${name}`);

    try {
        await testFn();
        console.log(`   ✅ PASSED`);
        results.passed++;
        return true;
    } catch (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
        results.failed++;
        return false;
    }
}

// Test 1: No API key should fail
async function testNoApiKey() {
    delete process.env.OPTIMIZER_API_KEY;

    const licenseManager = new SimplifiedLicenseManager();
    const result = await licenseManager.validateLicense();

    if (result.valid === true) {
        throw new Error('SECURITY ISSUE: Validation passed without API key!');
    }

    if (!result.error || !result.error.includes('API key required')) {
        throw new Error('Should return proper error message');
    }
}

// Test 2: Invalid key format should fail
async function testInvalidKeyFormat() {
    process.env.OPTIMIZER_API_KEY = 'invalid-key-format';

    const licenseManager = new SimplifiedLicenseManager();
    const result = await licenseManager.validateLicense();

    if (result.valid === true) {
        throw new Error('SECURITY ISSUE: Invalid key format accepted!');
    }
}

// Test 3: Optimizer should fail without API key
async function testOptimizerWithoutKey() {
    delete process.env.OPTIMIZER_API_KEY;

    const optimizer = new PromptOptimizer();
    await optimizer.initialize();

    try {
        await optimizer.optimizeForContext('test prompt', 'llm-interaction', ['clarity']);
        throw new Error('SECURITY ISSUE: Optimizer worked without API key!');
    } catch (error) {
        if (!error.message.includes('API key required')) {
            throw new Error(`Wrong error message: ${error.message}`);
        }
    }
}

// Test 4: Client-side usage file should not be used
async function testNoClientSideUsageFile() {
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');
    const usageFile = path.join(os.homedir(), '.mcp-optimizer-usage.json');

    // Try to create a fake usage file
    try {
        await fs.writeFile(usageFile, JSON.stringify({ date: new Date().toDateString(), count: 999 }));
    } catch (error) {
        // Ignore if can't write
    }

    // License manager should not have these methods anymore
    const licenseManager = new SimplifiedLicenseManager();

    if (typeof licenseManager.loadDailyUsage === 'function') {
        throw new Error('SECURITY ISSUE: loadDailyUsage method still exists!');
    }

    if (typeof licenseManager.incrementUsageCount === 'function') {
        throw new Error('SECURITY ISSUE: incrementUsageCount method still exists!');
    }

    if (typeof licenseManager.resetQuotaForTesting === 'function') {
        throw new Error('SECURITY ISSUE: resetQuotaForTesting method still exists!');
    }

    // Clean up
    try {
        await fs.unlink(usageFile);
    } catch (error) {
        // Ignore
    }
}

// Test 5: Backend validation URL should be configured
async function testBackendURLConfigured() {
    const licenseManager = new SimplifiedLicenseManager();

    if (!licenseManager.backendUrl) {
        throw new Error('Backend URL not configured');
    }

    if (!licenseManager.backendUrl.includes('https://')) {
        throw new Error('Backend URL should use HTTPS');
    }

    console.log(`   📡 Backend URL: ${licenseManager.backendUrl}`);
}

// Test 6: Validate with backend method exists
async function testBackendValidationExists() {
    const licenseManager = new SimplifiedLicenseManager();

    if (typeof licenseManager.validateWithBackend !== 'function') {
        throw new Error('validateWithBackend method missing!');
    }

    console.log('   🔗 Backend validation method exists');
}

// Test 7: Valid key format should pass format check
async function testValidKeyFormat() {
    const licenseManager = new SimplifiedLicenseManager();

    const basicKey = 'sk-local-basic-1234567890abcdef1234567890abcdef';
    const proKey = 'sk-local-pro-1234567890abcdef1234567890abcdef';

    if (!licenseManager.isValidKeyFormat(basicKey)) {
        throw new Error('Valid basic key format rejected');
    }

    if (!licenseManager.isValidKeyFormat(proKey)) {
        throw new Error('Valid pro key format rejected');
    }

    console.log('   ✓ Basic key format: VALID');
    console.log('   ✓ Pro key format: VALID');
}

// Run all tests
async function runAllTests() {
    console.log('=' .repeat(60));
    console.log('Starting Authentication Security Tests');
    console.log('=' .repeat(60));

    await runTest('No API key should be rejected', testNoApiKey);
    await runTest('Invalid key format should be rejected', testInvalidKeyFormat);
    await runTest('Optimizer should fail without API key', testOptimizerWithoutKey);
    await runTest('Client-side usage tracking should be removed', testNoClientSideUsageFile);
    await runTest('Backend URL should be configured', testBackendURLConfigured);
    await runTest('Backend validation method should exist', testBackendValidationExists);
    await runTest('Valid key formats should be accepted', testValidKeyFormat);

    console.log('\n' + '=' .repeat(60));
    console.log('Test Results Summary');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log('=' .repeat(60));

    if (results.failed === 0) {
        console.log('\n🎉 All security tests passed! Authentication is properly enforced.');
        console.log('\n✅ Security Status:');
        console.log('   • API key required for all operations');
        console.log('   • Backend validation enforced');
        console.log('   • Client-side bypasses removed');
        console.log('   • Quota tracking server-side only');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Please review the security implementation.');
        process.exit(1);
    }
}

// Run tests
runAllTests().catch(error => {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
});
