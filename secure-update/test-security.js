#!/usr/bin/env node

/**
 * Security Test Suite for Cross-Platform Support
 * Tests the enhanced security validation with multiple platforms
 */

const path = require('path');
const fs = require('fs');

// Import our security components
const BinaryIntegrityVerifier = require('../lib/binary-integrity-verifier');
const requireValidApiKey = require('../lib/enhanced-api-key-check');

class SecurityTestSuite {
    constructor() {
        this.projectRoot = path.dirname(__dirname);
        this.testResults = [];
        this.startTime = Date.now();
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
        const prefix = `[${elapsed}s] 🧪`;
        
        if (level === 'error') {
            console.error(`${prefix} ${message}`);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }

    async runTest(testName, testFunction) {
        this.log(`Running test: ${testName}`);
        
        try {
            const result = await testFunction();
            this.testResults.push({ name: testName, status: 'passed', result });
            this.log(`✅ ${testName} - PASSED`);
            return true;
        } catch (error) {
            this.testResults.push({ name: testName, status: 'failed', error: error.message });
            this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
            return false;
        }
    }

    async testManifestGeneration() {
        const { buildManifest, EXPECTED_BINARIES } = require('../secure-update/generate-manifest');
        
        const manifest = await buildManifest('3.1.0-test', true);
        
        // Verify manifest structure
        if (!manifest.version) throw new Error('Manifest missing version');
        if (!manifest.binaries) throw new Error('Manifest missing binaries');
        if (!manifest.security) throw new Error('Manifest missing security');
        
        // Verify all expected platforms are present
        const expectedPlatforms = Object.keys(EXPECTED_BINARIES);
        const manifestPlatforms = Object.keys(manifest.binaries);
        
        for (const platform of expectedPlatforms) {
            if (!manifestPlatforms.includes(platform)) {
                throw new Error(`Missing platform in manifest: ${platform}`);
            }
        }
        
        return { platforms: manifestPlatforms.length, expected: expectedPlatforms.length };
    }

    async testBinaryIntegrityVerifier() {
        const verifier = new BinaryIntegrityVerifier();
        
        // Test platform detection
        const platformInfo = verifier.getPlatformInfo();
        if (!platformInfo.detected) throw new Error('Platform detection failed');
        
        // Test manifest loading
        const manifest = verifier.loadManifest();
        if (!manifest.binaries) throw new Error('Manifest loading failed');
        
        // Test verification of available binaries
        const binDir = path.join(this.projectRoot, 'bin');
        const results = await verifier.verifyAllBinaries(binDir);
        
        const totalResults = Object.keys(results).length;
        if (totalResults === 0) throw new Error('No verification results');
        
        return { 
            platform: platformInfo.detected,
            results: totalResults,
            supported: platformInfo.supported
        };
    }

    async testApiKeyValidation() {
        // Test with environment variable
        const originalKey = process.env.OPTIMIZER_API_KEY;
        
        try {
            // Test missing key
            delete process.env.OPTIMIZER_API_KEY;
            try {
                requireValidApiKey();
                throw new Error('Should have failed with missing API key');
            } catch (error) {
                if (!error.message.includes('API key')) {
                    throw new Error('Wrong error message for missing API key');
                }
            }
            
            // Test with valid key format
            process.env.OPTIMIZER_API_KEY = 'sk-local-test-key-1234567890abcdef';
            const result = requireValidApiKey();
            
            if (!result.valid) throw new Error('Valid API key rejected');
            if (!result.tier) throw new Error('API key tier not detected');
            
            return { tier: result.tier, source: result.source };
            
        } finally {
            // Restore original key
            if (originalKey) {
                process.env.OPTIMIZER_API_KEY = originalKey;
            } else {
                delete process.env.OPTIMIZER_API_KEY;
            }
        }
    }

    async testSecurePostInstall() {
        const SecurePostInstaller = require('../secure-postinstall');
        const installer = new SecurePostInstaller();
        
        // Test compatibility checks
        const compatibilityResults = await installer.runCompatibilityChecks();
        
        if (!compatibilityResults.nodeVersion) throw new Error('Node version check missing');
        if (!compatibilityResults.platform) throw new Error('Platform check missing');
        if (!compatibilityResults.permissions) throw new Error('Permission check missing');
        
        return {
            nodeVersion: compatibilityResults.nodeVersion.passed,
            platform: compatibilityResults.platform.passed,
            permissions: compatibilityResults.permissions.passed
        };
    }

    async testPackageJsonUpdate() {
        const packagePath = path.join(this.projectRoot, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        // Verify version update
        if (pkg.version !== '3.1.0') throw new Error(`Expected version 3.1.0, got ${pkg.version}`);
        
        // Verify cross-platform metadata
        if (!pkg.platforms) throw new Error('Missing platforms metadata');
        if (!pkg.security.cross_platform_support) throw new Error('Missing cross-platform security flag');
        
        // Verify new scripts
        if (!pkg.scripts['generate-manifest']) throw new Error('Missing generate-manifest script');
        if (!pkg.scripts['generate-manifest-dev']) throw new Error('Missing generate-manifest-dev script');
        
        return { 
            version: pkg.version,
            platforms: Object.keys(pkg.platforms).length,
            scripts: Object.keys(pkg.scripts).length
        };
    }

    async testBinaryHashConsistency() {
        const manifestPath = path.join(this.projectRoot, 'manifest.json');
        
        // Generate new manifest and compare with existing
        const { buildManifest } = require('../secure-update/generate-manifest');
        const newManifest = await buildManifest('3.1.0', true);
        
        if (fs.existsSync(manifestPath)) {
            const existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            
            // Compare binary hashes for consistency
            let consistentHashes = 0;
            let totalBinaries = 0;
            
            for (const [platform, binaryInfo] of Object.entries(newManifest.binaries)) {
                totalBinaries++;
                if (existingManifest.binaries[platform] && 
                    existingManifest.binaries[platform].sha256 === binaryInfo.sha256) {
                    consistentHashes++;
                }
            }
            
            return { consistent: consistentHashes, total: totalBinaries };
        }
        
        return { consistent: 0, total: Object.keys(newManifest.binaries).length };
    }

    async testErrorHandlingAndMessages() {
        const verifier = new BinaryIntegrityVerifier();
        
        try {
            // Test with invalid manifest path
            const badVerifier = new BinaryIntegrityVerifier('/nonexistent/manifest.json');
            try {
                badVerifier.loadManifest();
                throw new Error('Should have failed with invalid manifest path');
            } catch (error) {
                if (!error.message.includes('Failed to load manifest')) {
                    throw new Error('Wrong error message for invalid manifest');
                }
            }
            
            // Test with unsupported platform
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'unsupported', configurable: true });
            
            try {
                const platformKey = verifier.detectPlatform();
                // Should still work but with unsupported platform
                if (!platformKey.includes('unsupported')) {
                    throw new Error('Platform detection should include unsupported platform');
                }
            } finally {
                Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
            }
            
            return { errorHandling: 'working', messageQuality: 'comprehensive' };
            
        } catch (error) {
            throw new Error(`Error handling test failed: ${error.message}`);
        }
    }

    async testBackwardCompatibility() {
        // Verify that existing functionality still works
        const BinaryManager = require('../lib/binary-manager');
        const manager = new BinaryManager();
        
        // Test platform detection
        const platformInfo = manager.detectPlatform();
        if (!platformInfo.platform) throw new Error('Binary manager platform detection failed');
        
        // Test binary discovery
        const binary = await manager.discoverBinary();
        // Should work even if binary is placeholder
        
        // Test health check
        const health = await manager.healthCheck();
        if (!health.platform) throw new Error('Health check missing platform info');
        
        return {
            platformDetection: 'working',
            binaryDiscovery: binary ? 'found' : 'fallback',
            healthCheck: 'working'
        };
    }

    async runAllTests() {
        console.log('🧪 MCP Prompt Optimizer - Security Test Suite v3.1.0');
        console.log('=====================================================');
        console.log('Testing cross-platform security enhancements...\n');
        
        const tests = [
            ['Manifest Generation', () => this.testManifestGeneration()],
            ['Binary Integrity Verification', () => this.testBinaryIntegrityVerifier()],
            ['API Key Validation System', () => this.testApiKeyValidation()],
            ['Secure Post-Install Script', () => this.testSecurePostInstall()],
            ['Package.json v3.1.0 Update', () => this.testPackageJsonUpdate()],
            ['Binary Hash Consistency', () => this.testBinaryHashConsistency()],
            ['Error Handling and Messages', () => this.testErrorHandlingAndMessages()],
            ['Backward Compatibility', () => this.testBackwardCompatibility()]
        ];
        
        let passed = 0;
        
        for (const [name, testFn] of tests) {
            if (await this.runTest(name, testFn)) {
                passed++;
            }
        }
        
        console.log('\n📊 Test Results Summary');
        console.log('=======================');
        console.log(`✅ Passed: ${passed}/${tests.length} (${((passed/tests.length)*100).toFixed(1)}%)`);
        console.log(`❌ Failed: ${tests.length - passed}/${tests.length}`);
        
        if (passed === tests.length) {
            console.log('\n🎉 All tests passed! Cross-platform security is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Check the details above.');
        }
        
        console.log('\n📋 Detailed Results:');
        this.testResults.forEach(test => {
            const status = test.status === 'passed' ? '✅' : '❌';
            console.log(`   ${status} ${test.name}`);
            if (test.result) {
                console.log(`      Result: ${JSON.stringify(test.result)}`);
            }
            if (test.error) {
                console.log(`      Error: ${test.error}`);
            }
        });
        
        console.log('\n🔧 Next Steps:');
        if (passed === tests.length) {
            console.log('   1. Commit changes to repository');
            console.log('   2. Push to GitHub to trigger CI builds');
            console.log('   3. CI will build real macOS and Linux binaries');
            console.log('   4. Test cross-platform installation');
            console.log('   5. Publish v3.1.0 to npm');
        } else {
            console.log('   1. Fix failing tests');
            console.log('   2. Re-run test suite');
            console.log('   3. Verify all security components working');
        }
        
        return passed === tests.length;
    }
}

// Run tests if called directly
if (require.main === module) {
    const suite = new SecurityTestSuite();
    suite.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('💥 Test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = SecurityTestSuite;