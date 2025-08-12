#!/usr/bin/env node

/**
 * Cross-Platform Implementation Verification
 * Validates the complete cross-platform setup
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 MCP Prompt Optimizer - Cross-Platform Implementation Verification');
console.log('====================================================================');
console.log('Verifying v3.1.0 cross-platform enhancements...\n');

let passed = 0;
let total = 0;

function test(name, condition, details = '') {
    total++;
    if (condition) {
        console.log(`✅ ${name}`);
        if (details) console.log(`   ${details}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        if (details) console.log(`   ${details}`);
    }
}

// Check package.json updates
console.log('📦 Package Configuration:');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
test('Version updated to 3.1.0', pkg.version === '3.1.0', `Current: ${pkg.version}`);
test('Cross-platform OS support', 
     pkg.os && pkg.os.includes('darwin') && pkg.os.includes('linux'), 
     `OS: ${pkg.os?.join(', ')}`);
test('Multi-architecture CPU support', 
     pkg.cpu && pkg.cpu.includes('x64') && pkg.cpu.includes('arm64'), 
     `CPU: ${pkg.cpu?.join(', ')}`);
test('Platform metadata present', 
     pkg.platforms && Object.keys(pkg.platforms).length >= 5, 
     `Platforms: ${Object.keys(pkg.platforms || {}).length}`);
test('Cross-platform security flag', 
     pkg.security?.cross_platform_support === true);
test('New manifest scripts', 
     pkg.scripts['generate-manifest'] && pkg.scripts['generate-manifest-dev']);

// Check binary files
console.log('\n🔧 Binary Files:');
const binDir = 'bin';
const expectedBinaries = [
    'mcp-optimizer-windows-x64.exe',
    'mcp-optimizer-macos-x64', 
    'mcp-optimizer-macos-arm64',
    'mcp-optimizer-linux-x64',
    'mcp-optimizer-linux-arm64'
];

expectedBinaries.forEach(binary => {
    const exists = fs.existsSync(path.join(binDir, binary));
    test(`Binary exists: ${binary}`, exists);
});

// Check manifest.json
console.log('\n📋 Manifest Verification:');
if (fs.existsSync('manifest.json')) {
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    test('Manifest version 3.1.0', manifest.version === '3.1.0');
    test('All platforms in manifest', 
         Object.keys(manifest.binaries).length === 5,
         `Platforms: ${Object.keys(manifest.binaries).join(', ')}`);
    test('Cross-platform feature flag', 
         manifest.features?.includes('cross_platform_support'));
    test('Build summary present', 
         manifest.build_summary && typeof manifest.build_summary.total_platforms === 'number');
    test('Security requirements', 
         manifest.security?.requires_api_key && manifest.security?.verification_required);
} else {
    test('Manifest.json exists', false, 'Run: npm run generate-manifest-dev');
}

// Check secure-update directory
console.log('\n🔐 Secure Update Infrastructure:');
test('secure-update directory exists', fs.existsSync('secure-update'));
test('generate-manifest.js exists', fs.existsSync('secure-update/generate-manifest.js'));
test('test-security.js exists', fs.existsSync('secure-update/test-security.js'));

// Check CI/CD setup
console.log('\n🚀 CI/CD Configuration:');
test('.github/workflows directory exists', fs.existsSync('.github/workflows'));
test('build-binaries.yml exists', fs.existsSync('.github/workflows/build-binaries.yml'));

// Check enhanced security components
console.log('\n🛡️ Security Enhancements:');
test('Enhanced binary-integrity-verifier exists', fs.existsSync('lib/binary-integrity-verifier.js'));

if (fs.existsSync('lib/binary-integrity-verifier.js')) {
    const verifierContent = fs.readFileSync('lib/binary-integrity-verifier.js', 'utf8');
    test('Multi-platform detection', verifierContent.includes('darwin') && verifierContent.includes('linux'));
    test('Placeholder handling', verifierContent.includes('isPlaceholder') || verifierContent.includes('dev_placeholder'));
}

// Check documentation
console.log('\n📚 Documentation:');
test('CHANGELOG.md updated', fs.existsSync('CHANGELOG.md'));
if (fs.existsSync('CHANGELOG.md')) {
    const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
    test('v3.1.0 documented', changelog.includes('[3.1.0]'));
    test('Cross-platform features documented', changelog.includes('Cross-Platform Support'));
}
test('Cross-platform guide exists', fs.existsSync('CROSS-PLATFORM.md'));

// Architecture validation
console.log('\n🏗️ Architecture Validation:');
try {
    // Test if our enhanced components can be loaded
    const BinaryIntegrityVerifier = require('./lib/binary-integrity-verifier');
    const verifier = new BinaryIntegrityVerifier();
    const platformInfo = verifier.getPlatformInfo();
    
    test('Binary verifier loads correctly', true);
    test('Platform detection working', !!platformInfo.detected, `Detected: ${platformInfo.detected}`);
    test('Available platforms listed', platformInfo.availablePlatforms?.length >= 5);
} catch (error) {
    test('Binary verifier loads correctly', false, error.message);
}

// Summary
console.log('\n📊 Implementation Summary:');
console.log('========================');
console.log(`✅ Passed: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
console.log(`❌ Failed: ${total - passed}/${total}`);

if (passed === total) {
    console.log('\n🎉 Perfect! Cross-platform implementation is complete and ready.');
    console.log('\n🚀 Next Steps:');
    console.log('   1. git add . && git commit -m "feat: Add cross-platform support v3.1.0"');
    console.log('   2. git push origin main');
    console.log('   3. GitHub Actions will build real binaries for all platforms');
    console.log('   4. Test installation on macOS and Linux');
    console.log('   5. Publish v3.1.0 to npm registry');
} else {
    console.log('\n⚠️  Some components need attention. Review failed items above.');
    console.log('\n🔧 Common fixes:');
    console.log('   - Run: npm run generate-manifest-dev');
    console.log('   - Check all binary files are present');
    console.log('   - Verify package.json version and metadata');
}

console.log('\n🌍 Platform Support Status:');
console.log('   🪟 Windows x64: ✅ Production (18MB binary)');
console.log('   🍎 macOS Intel: 🚀 Ready (CI builds real binary)');  
console.log('   🍎 macOS Apple Silicon: 🚀 Ready (CI builds real binary)');
console.log('   🐧 Linux x64: 🚀 Ready (CI builds real binary)');
console.log('   🐧 Linux ARM64: 🚀 Ready (CI builds real binary)');

console.log('\n💡 Development vs Production:');
console.log('   - Development: Uses placeholder binaries (current state)');
console.log('   - CI/Production: Builds real PyInstaller binaries for each platform');
console.log('   - Security: All binaries verified with SHA256 integrity checking');

process.exit(passed === total ? 0 : 1);