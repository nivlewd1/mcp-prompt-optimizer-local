const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Enhanced Binary Integrity Verification System
 * Ensures binaries haven't been tampered with across all platforms
 * Handles development mode with placeholder binaries
 */
class BinaryIntegrityVerifier {
    constructor(manifestPath) {
        this.manifestPath = manifestPath || path.join(__dirname, '..', 'manifest.json');
        this.manifest = null;
        this.devMode = process.env.NODE_ENV === 'development' || process.env.MCP_DEV_MODE === 'true';
    }

    loadManifest() {
        if (this.manifest) return this.manifest;

        try {
            const manifestData = fs.readFileSync(this.manifestPath, 'utf-8');
            this.manifest = JSON.parse(manifestData);
            return this.manifest;
        } catch (error) {
            throw new Error(`Failed to load manifest from ${this.manifestPath}: ${error.message}`);
        }
    }

    detectPlatform() {
        const platform = process.platform;
        const arch = process.arch;
        
        // Map to our manifest keys
        const platformMap = {
            'win32': 'win32',
            'darwin': 'darwin', 
            'linux': 'linux'
        };
        
        const archMap = {
            'x64': 'x64',
            'x86_64': 'x64',
            'arm64': 'arm64',
            'aarch64': 'arm64'
        };
        
        const normalizedPlatform = platformMap[platform] || platform;
        const normalizedArch = archMap[arch] || 'x64';
        
        return `${normalizedPlatform}-${normalizedArch}`;
    }

    async verifyBinary(binaryPath, expectedHash, binaryInfo = {}) {
        console.log(`🔍 Verifying binary integrity: ${path.basename(binaryPath)}`);
        
        try {
            // Check if file exists
            if (!fs.existsSync(binaryPath)) {
                throw new Error(`Binary not found: ${binaryPath}`);
            }

            // Read and hash the binary
            const fileBuffer = fs.readFileSync(binaryPath);
            const fileSize = fileBuffer.length;
            
            // Check if this is a placeholder binary (small text file)
            const isPlaceholder = fileSize < 10000 && fileBuffer.toString().includes('placeholder');
            
            if (isPlaceholder) {
                if (this.devMode || binaryInfo.dev_placeholder) {
                    console.log(`⚠️  Development placeholder detected: ${path.basename(binaryPath)}`);
                    console.log(`📝 This will be replaced with real binary in CI/production`);
                    return {
                        verified: true,
                        hash: 'placeholder',
                        size: fileSize,
                        isPlaceholder: true,
                        devMode: true
                    };
                } else {
                    throw new Error(`Placeholder binary detected in production mode: ${binaryPath}`);
                }
            }
            
            const hash = crypto.createHash('sha256');
            hash.update(fileBuffer);
            const actualHash = hash.digest('hex');
            
            console.log(`📊 Expected hash: ${expectedHash}`);
            console.log(`📊 Actual hash:   ${actualHash}`);
            
            if (actualHash !== expectedHash) {
                throw new Error(`Binary integrity check FAILED!
                
❌ Hash mismatch detected:
   File: ${path.basename(binaryPath)}
   Expected: ${expectedHash}
   Actual:   ${actualHash}
   Size: ${fileSize} bytes
   
⚠️  This could indicate:
   - Binary has been modified/corrupted
   - Man-in-the-middle attack
   - Storage corruption
   - Wrong binary version
   
🔧 Solutions:
   1. Re-download: npm uninstall && npm install mcp-prompt-optimizer-local
   2. Clear cache: npm cache clean --force
   3. Check antivirus software isn't modifying files
   4. Contact support@promptoptimizer.help if problem persists
   
🛡️  For security, installation cannot continue with unverified binary.`);
            }
            
            console.log('✅ Binary integrity verification passed');
            
            // Additional file metadata verification
            const stats = fs.statSync(binaryPath);
            
            if (binaryInfo.size && stats.size !== binaryInfo.size) {
                console.log(`⚠️  Warning: Binary size mismatch (expected ${binaryInfo.size}, got ${stats.size})`);
            }
            
            return {
                verified: true,
                hash: actualHash,
                size: stats.size,
                lastModified: stats.mtime,
                isPlaceholder: false
            };
            
        } catch (error) {
            throw new Error(`Binary verification failed: ${error.message}`);
        }
    }

    async verifyAllBinaries(binDir) {
        console.log('🔍 Verifying all available binaries...');
        
        const manifest = this.loadManifest();
        const results = {};
        let foundBinaries = 0;
        let placeholderBinaries = 0;
        
        for (const [platformKey, binaryInfo] of Object.entries(manifest.binaries)) {
            const binaryPath = path.join(binDir, binaryInfo.filename);
            
            try {
                if (fs.existsSync(binaryPath)) {
                    console.log(`\n📦 Checking ${platformKey}: ${binaryInfo.filename}`);
                    
                    // Handle missing binaries in dev mode
                    if (binaryInfo.missing && binaryInfo.dev_placeholder) {
                        console.log(`⚠️  Development placeholder: ${platformKey}`);
                        results[platformKey] = { 
                            status: 'placeholder', 
                            path: binaryPath,
                            devMode: true 
                        };
                        placeholderBinaries++;
                        continue;
                    }
                    
                    const result = await this.verifyBinary(binaryPath, binaryInfo.sha256, binaryInfo);
                    
                    if (result.isPlaceholder) {
                        results[platformKey] = { ...result, status: 'placeholder' };
                        placeholderBinaries++;
                    } else {
                        results[platformKey] = { ...result, status: 'verified' };
                        foundBinaries++;
                    }
                } else {
                    console.log(`⚠️  Missing binary: ${platformKey} (${binaryInfo.filename})`);
                    results[platformKey] = { status: 'missing', path: binaryPath };
                }
            } catch (error) {
                console.error(`❌ Verification failed for ${platformKey}: ${error.message}`);
                results[platformKey] = { 
                    status: 'failed', 
                    error: error.message,
                    path: binaryPath
                };
            }
        }
        
        // Summary
        const totalPlatforms = Object.keys(manifest.binaries).length;
        console.log(`\n📊 Verification Summary:`);
        console.log(`   Platforms: ${totalPlatforms}`);
        console.log(`   Verified: ${foundBinaries}`);
        console.log(`   Placeholders: ${placeholderBinaries}`);
        console.log(`   Missing: ${totalPlatforms - foundBinaries - placeholderBinaries}`);
        
        if (placeholderBinaries > 0) {
            console.log(`\n⚠️  Development mode: ${placeholderBinaries} placeholder binaries detected`);
            console.log(`   Real binaries will be built in CI/production`);
        }
        
        return results;
    }

    async verifyCurrentPlatform() {
        const manifest = this.loadManifest();
        const platformKey = this.detectPlatform();
        const binaryInfo = manifest.binaries[platformKey];
        
        if (!binaryInfo) {
            // Check if there are alternative platform keys
            const availablePlatforms = Object.keys(manifest.binaries);
            throw new Error(`No binary available for platform: ${platformKey}
            
Available platforms: ${availablePlatforms.join(', ')}

This usually means:
1. Your platform isn't supported yet
2. The package hasn't been built for your architecture
3. You're running on an unsupported system

Detected platform: ${process.platform}
Detected architecture: ${process.arch}

Contact support@promptoptimizer.help for assistance.`);
        }
        
        const binDir = path.join(path.dirname(this.manifestPath), 'bin');
        const binaryPath = path.join(binDir, binaryInfo.filename);
        
        // Special handling for missing binaries in manifest
        if (binaryInfo.missing) {
            if (this.devMode || binaryInfo.dev_placeholder) {
                console.log(`⚠️  Development mode: ${platformKey} binary is placeholder`);
                return {
                    verified: true,
                    platform: platformKey,
                    devMode: true,
                    isPlaceholder: true
                };
            } else {
                throw new Error(`Binary not available for ${platformKey} - missing in production build`);
            }
        }
        
        const result = await this.verifyBinary(binaryPath, binaryInfo.sha256, binaryInfo);
        result.platform = platformKey;
        return result;
    }

    // Enhanced platform detection for debugging
    getPlatformInfo() {
        const platformKey = this.detectPlatform();
        const manifest = this.loadManifest();
        const binaryInfo = manifest.binaries[platformKey];
        
        return {
            detected: platformKey,
            raw: {
                platform: process.platform,
                arch: process.arch,
                version: process.version
            },
            binary: binaryInfo || null,
            supported: !!binaryInfo,
            devMode: this.devMode,
            availablePlatforms: Object.keys(manifest.binaries)
        };
    }

    // Quick verification for postinstall
    static async quickVerify(binDir = null, manifestPath = null) {
        try {
            const verifier = new BinaryIntegrityVerifier(manifestPath);
            const result = await verifier.verifyCurrentPlatform();
            
            if (result.isPlaceholder) {
                console.log('⚠️  Quick verification: Development placeholder detected');
            } else {
                console.log('✅ Quick verification passed');
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Quick verification failed:', error.message);
            
            // Enhanced error info for troubleshooting
            try {
                const verifier = new BinaryIntegrityVerifier(manifestPath);
                const platformInfo = verifier.getPlatformInfo();
                console.error('\n🔍 Platform Detection Info:');
                console.error(`   Detected: ${platformInfo.detected}`);
                console.error(`   Supported: ${platformInfo.supported}`);
                console.error(`   Available: ${platformInfo.availablePlatforms.join(', ')}`);
                console.error(`   Raw: ${platformInfo.raw.platform}-${platformInfo.raw.arch}`);
            } catch (debugError) {
                console.error('   (Platform info unavailable)');
            }
            
            throw error;
        }
    }
}

module.exports = BinaryIntegrityVerifier;

// CLI usage with enhanced options
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'verify-all';
    
    console.log('🔧 MCP Prompt Optimizer - Binary Integrity Verifier');
    console.log('====================================================');
    
    const verifier = new BinaryIntegrityVerifier();
    
    switch (command) {
        case 'platform-info':
            console.log('\n🔍 Platform Detection:');
            const platformInfo = verifier.getPlatformInfo();
            console.log(JSON.stringify(platformInfo, null, 2));
            break;
            
        case 'quick':
            console.log('\n⚡ Quick verification (current platform only):');
            BinaryIntegrityVerifier.quickVerify()
                .then(result => {
                    console.log('\n✅ Quick verification passed');
                    if (result.isPlaceholder) {
                        console.log('⚠️  Using development placeholder');
                    }
                })
                .catch(error => {
                    console.error('\n❌ Quick verification failed');
                    process.exit(1);
                });
            break;
            
        case 'verify-all':
        default:
            const binDir = args[1] || path.join(__dirname, '..', 'bin');
            console.log(`\n📁 Binary directory: ${binDir}`);
            console.log(`📋 Manifest: ${verifier.manifestPath}`);
            
            verifier.verifyAllBinaries(binDir)
                .then(results => {
                    console.log('\n📊 Detailed Results:');
                    console.log(JSON.stringify(results, null, 2));
                    
                    const hasFailures = Object.values(results).some(r => r.status === 'failed');
                    const hasPlaceholders = Object.values(results).some(r => r.status === 'placeholder');
                    
                    if (hasFailures) {
                        console.error('\n❌ Some binaries failed verification');
                        process.exit(1);
                    } else if (hasPlaceholders) {
                        console.log('\n⚠️  Development mode: Some binaries are placeholders');
                        console.log('   This is normal for development - real binaries built in CI');
                    } else {
                        console.log('\n✅ All binaries verified successfully');
                    }
                })
                .catch(error => {
                    console.error('💥 Verification process failed:', error.message);
                    process.exit(1);
                });
            break;
    }
}