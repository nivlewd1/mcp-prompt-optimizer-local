#!/usr/bin/env node

/**
 * Enhanced Secure Post-Install Handler with GitHub Release Support
 * Combines API key validation + binary integrity verification + GitHub release fetching
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

// Security gates - both must pass
const requireValidApiKey = require('./lib/enhanced-api-key-check');
const BinaryIntegrityVerifier = require('./lib/binary-integrity-verifier');

class SecurePostInstaller {
    constructor() {
        this.projectRoot = __dirname;
        this.startTime = Date.now();
        this.packageInfo = this.getPackageInfo();
    }

    getPackageInfo() {
        try {
            const packagePath = path.join(this.projectRoot, 'package.json');
            return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        } catch (error) {
            return { version: '3.1.0', name: 'mcp-prompt-optimizer-local' };
        }
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
        const prefix = `[${elapsed}s] 🛡️`;
        
        if (level === 'error') {
            console.error(`${prefix} ${message}`);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }

    async downloadFile(url, destinationPath) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(destinationPath);
            
            https.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Follow redirect
                    return this.downloadFile(response.headers.location, destinationPath)
                        .then(resolve)
                        .catch(reject);
                }
                
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }
                
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
                
                file.on('error', (err) => {
                    fs.unlink(destinationPath, () => {}); // Delete partial file
                    reject(err);
                });
            }).on('error', reject);
        });
    }

    async fetchFromGitHubRelease(filename) {
        const repoUrl = this.packageInfo.repository?.url || 'https://github.com/prompt-optimizer/mcp-prompt-optimizer-local';
        const version = this.packageInfo.version;
        
        // Extract repo info from URL
        const repoMatch = repoUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+)/);
        if (!repoMatch) {
            throw new Error('Invalid repository URL in package.json');
        }
        
        const [, owner, repo] = repoMatch;
        const releaseUrl = `https://github.com/${owner}/${repo}/releases/download/v${version}/${filename}`;
        
        this.log(`📥 Downloading ${filename} from GitHub release v${version}...`);
        
        const binDir = path.join(this.projectRoot, 'bin');
        await fs.promises.mkdir(binDir, { recursive: true });
        
        const destinationPath = path.join(binDir, filename);
        await this.downloadFile(releaseUrl, destinationPath);
        
        // Set executable permissions on Unix-like systems
        if (process.platform !== 'win32') {
            await fs.promises.chmod(destinationPath, 0o755);
        }
        
        this.log(`✅ Downloaded and installed ${filename}`);
        return destinationPath;
    }

    async ensureBinaryAvailable() {
        const verifier = new BinaryIntegrityVerifier();
        const platformInfo = verifier.getPlatformInfo();
        
        if (!platformInfo.supported) {
            throw new Error(`Platform not supported: ${platformInfo.detected}`);
        }
        
        const expectedBinary = platformInfo.binary;
        const binaryPath = path.join(this.projectRoot, 'bin', expectedBinary.filename);
        
        // Check if binary exists and is valid
        if (fs.existsSync(binaryPath)) {
            try {
                const result = await verifier.verifyCurrentPlatform();
                if (result.verified && !result.isPlaceholder) {
                    this.log(`✅ Binary already available and verified: ${expectedBinary.filename}`);
                    return binaryPath;
                }
                
                if (result.isPlaceholder) {
                    this.log(`⚠️  Placeholder detected, fetching real binary...`);
                }
            } catch (error) {
                this.log(`⚠️  Binary verification failed: ${error.message}`, 'error');
                this.log(`📥 Attempting to fetch binary from GitHub release...`);
            }
        } else {
            this.log(`📥 Binary not found locally, fetching from GitHub release...`);
        }
        
        // Fetch from GitHub release
        try {
            const downloadedPath = await this.fetchFromGitHubRelease(expectedBinary.filename);
            
            // Verify the downloaded binary
            const result = await verifier.verifyCurrentPlatform();
            if (result.verified) {
                this.log(`✅ Downloaded binary verified successfully`);
                return downloadedPath;
            } else {
                throw new Error('Downloaded binary failed verification');
            }
        } catch (error) {
            this.log(`❌ Failed to fetch binary from GitHub: ${error.message}`, 'error');
            throw new Error(`Unable to obtain valid binary for ${platformInfo.detected}: ${error.message}`);
        }
    }

    async runSecurityGates() {
        this.log('Starting secure installation validation...');
        
        const results = {
            apiKey: null,
            binaryIntegrity: null,
            binaryAvailable: null,
            overall: false,
            errors: [],
            warnings: []
        };

        // Gate 1: API Key Validation
        try {
            this.log('🔑 Gate 1: API Key Validation');
            const apiKeyResult = requireValidApiKey();
            results.apiKey = apiKeyResult;
            this.log(`✅ API key validated (${apiKeyResult.tier} tier)`);
        } catch (error) {
            this.log(`❌ API key validation failed: ${error.message}`, 'error');
            results.errors.push(`API Key: ${error.message}`);
            return results; // Fail fast - no point checking binary without valid key
        }

        // Gate 2: Ensure Binary Available (download if needed)
        try {
            this.log('📦 Gate 2: Binary Availability Check');
            const binaryPath = await this.ensureBinaryAvailable();
            results.binaryAvailable = { path: binaryPath };
            this.log('✅ Binary available and ready');
        } catch (error) {
            this.log(`❌ Binary availability check failed: ${error.message}`, 'error');
            results.errors.push(`Binary Availability: ${error.message}`);
            return results; // Critical failure
        }

        // Gate 3: Binary Integrity Verification  
        try {
            this.log('🔍 Gate 3: Binary Integrity Verification');
            const binaryResult = await BinaryIntegrityVerifier.quickVerify();
            results.binaryIntegrity = binaryResult;
            
            if (binaryResult.isPlaceholder) {
                this.log('⚠️  Development placeholder detected', 'warning');
                results.warnings.push('Using development placeholder binary');
            } else {
                this.log('✅ Binary integrity verified');
            }
        } catch (error) {
            this.log(`❌ Binary integrity check failed: ${error.message}`, 'error');
            results.errors.push(`Binary Integrity: ${error.message}`);
            return results; // Critical security failure
        }

        // All gates passed
        results.overall = true;
        return results;
    }

    async runCompatibilityChecks() {
        this.log('🔧 Running compatibility checks...');
        
        const checks = {
            nodeVersion: this.checkNodeVersion(),
            platform: this.checkPlatform(),
            permissions: await this.checkPermissions()
        };

        return checks;
    }

    checkNodeVersion() {
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        if (majorVersion < 16) {
            return {
                passed: false,
                message: `Node.js ${nodeVersion} is too old. Requires Node.js 16+`
            };
        }
        
        return {
            passed: true,
            version: nodeVersion
        };
    }

    checkPlatform() {
        const platform = process.platform;
        const arch = process.arch;
        const supported = ['win32', 'darwin', 'linux'].includes(platform) && 
                         ['x64', 'arm64'].includes(arch);
        
        return {
            passed: supported,
            platform,
            arch,
            message: supported ? 'Platform supported' : `Unsupported platform: ${platform}-${arch}`
        };
    }

    async checkPermissions() {
        try {
            const binDir = path.join(this.projectRoot, 'bin');
            
            // Check if we can read the bin directory
            await fs.promises.access(binDir, fs.constants.R_OK);
            
            // Check if we can read the binary
            const binaryFiles = await fs.promises.readdir(binDir);
            const binaryFile = binaryFiles.find(f => f.includes('mcp-optimizer'));
            
            if (binaryFile) {
                const binaryPath = path.join(binDir, binaryFile);
                await fs.promises.access(binaryPath, fs.constants.R_OK);
                
                // On Unix-like systems, check execute permissions
                if (process.platform !== 'win32') {
                    try {
                        await fs.promises.access(binaryPath, fs.constants.X_OK);
                    } catch {
                        // Try to fix permissions
                        await fs.promises.chmod(binaryPath, 0o755);
                    }
                }
            }
            
            return {
                passed: true,
                message: 'Permissions OK'
            };
            
        } catch (error) {
            return {
                passed: false,
                message: `Permission error: ${error.message}`
            };
        }
    }

    async runPostInstallTasks() {
        // Create necessary directories
        const userDataDir = path.join(process.env.HOME || process.env.USERPROFILE, '.mcp_optimizer');
        try {
            await fs.promises.mkdir(userDataDir, { recursive: true });
        } catch {
            // Directory might already exist
        }

        // Create initial config if it doesn't exist
        const configPath = path.join(userDataDir, 'config.json');
        if (!fs.existsSync(configPath)) {
            const defaultConfig = {
                version: this.packageInfo.version,
                installation_date: new Date().toISOString(),
                features_enabled: ['local_processing', 'template_management', 'cross_platform_support']
            };
            
            try {
                await fs.promises.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
                this.log(`📝 Created config file: ${configPath}`);
            } catch (error) {
                this.log(`⚠️  Could not create config file: ${error.message}`);
            }
        }
    }

    showSuccessMessage(securityResults, compatibilityResults) {
        console.log('\n🎉 MCP Prompt Optimizer Local - Installation Complete!');
        console.log('');
        console.log('✅ Security validation passed');
        console.log(`✅ API key validated (${securityResults.apiKey.tier} tier)`);
        console.log('✅ Binary integrity verified');
        console.log(`✅ Platform supported (${compatibilityResults.platform.platform}-${compatibilityResults.platform.arch})`);
        
        if (securityResults.warnings && securityResults.warnings.length > 0) {
            console.log('');
            console.log('⚠️  Warnings:');
            securityResults.warnings.forEach(warning => {
                console.log(`   ⚠️  ${warning}`);
            });
        }
        
        console.log('');
        console.log('🚀 Ready to use:');
        console.log('   mcp-prompt-optimizer-local              # Start the MCP server');
        console.log('   mcp-prompt-optimizer-local check-license  # Check license status');
        console.log('   mcp-prompt-optimizer-local help           # Show help');
        console.log('');
        console.log('📚 Documentation: https://promptoptimizer-blog.vercel.app/docs');
        console.log('🌍 Cross-platform guide: https://github.com/prompt-optimizer/mcp-prompt-optimizer-local/blob/main/CROSS-PLATFORM.md');
        console.log('');
    }

    showFailureMessage(securityResults, compatibilityResults) {
        console.log('\n❌ MCP Prompt Optimizer Local - Installation Failed');
        console.log('');
        
        if (securityResults.errors.length > 0) {
            console.log('🛡️  Security Issues:');
            securityResults.errors.forEach(error => {
                console.log(`   ❌ ${error}`);
            });
            console.log('');
        }
        
        if (compatibilityResults) {
            const failedChecks = Object.entries(compatibilityResults)
                .filter(([_, check]) => !check.passed);
                
            if (failedChecks.length > 0) {
                console.log('🔧 Compatibility Issues:');
                failedChecks.forEach(([name, check]) => {
                    console.log(`   ❌ ${name}: ${check.message}`);
                });
                console.log('');
            }
        }
        
        console.log('🔧 Troubleshooting:');
        console.log('');
        console.log('1. API Key Issues:');
        console.log('   - Get your key: https://promptoptimizer-blog.vercel.app/local-license');
        console.log('   - Set: export OPTIMIZER_API_KEY=your-key-here');
        console.log('   - Or create ~/.mcp_optimizer/config.json with {"apiKey": "your-key"}');
        console.log('');
        console.log('2. Binary Issues:');
        console.log('   - Try: npm cache clean --force');
        console.log('   - Reinstall: npm uninstall && npm install mcp-prompt-optimizer-local');
        console.log('   - Check internet connection for GitHub release downloads');
        console.log('');
        console.log('3. Platform Issues:');
        console.log('   - Supported: Windows, macOS, Linux on x64/arm64');
        console.log('   - Check: node --version (requires Node.js 16+)');
        console.log('');
        console.log('📧 Need help? Contact support@promptoptimizer.help');
        console.log('');
    }

    async run() {
        console.log('🛡️  MCP Prompt Optimizer - Secure Installation');
        console.log('================================================');
        
        let securityResults = null;
        let compatibilityResults = null;
        
        try {
            // Run security gates first (most critical)
            securityResults = await this.runSecurityGates();
            
            if (!securityResults.overall) {
                this.showFailureMessage(securityResults, null);
                process.exit(1);
            }
            
            // Run compatibility checks
            compatibilityResults = await this.runCompatibilityChecks();
            
            // Check for any compatibility failures
            const hasCompatibilityIssues = Object.values(compatibilityResults)
                .some(check => !check.passed);
                
            if (hasCompatibilityIssues) {
                this.showFailureMessage(securityResults, compatibilityResults);
                process.exit(1);
            }
            
            // Run post-install setup tasks
            await this.runPostInstallTasks();
            
            // Everything passed!
            this.showSuccessMessage(securityResults, compatibilityResults);
            
        } catch (error) {
            this.log(`💥 Unexpected installation error: ${error.message}`, 'error');
            console.log('\n❌ Installation failed due to unexpected error');
            console.log(`Error: ${error.message}`);
            console.log('\n🔧 Please try:');
            console.log('1. npm cache clean --force');
            console.log('2. npm uninstall mcp-prompt-optimizer-local');
            console.log('3. npm install mcp-prompt-optimizer-local');
            console.log('\nIf the problem persists, contact support@promptoptimizer.help');
            process.exit(1);
        }
    }
}

// Run secure post-install if called directly
if (require.main === module) {
    const installer = new SecurePostInstaller();
    installer.run().catch(error => {
        console.error('💥 Post-install script failed:', error.message);
        process.exit(1);
    });
}

module.exports = SecurePostInstaller;