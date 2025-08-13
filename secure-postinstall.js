#!/usr/bin/env node

/**
 * Enhanced Secure Post-Install Handler with GitHub Release Support
 * - API key validation + binary integrity verification + GitHub release fetching
 * - Skips security gates in CI or when OPTIMIZER_SKIP_SECURITY=true
 */

const path = require('path');
const fs = require('fs');
const https = require('https');

// Security gates - both must pass (for end-users)
const requireValidApiKey = require('./lib/enhanced-api-key-check');
const BinaryIntegrityVerifier = require('./lib/binary-integrity-verifier');

class SecurePostInstaller {
  constructor() {
    this.projectRoot = __dirname;
    this.startTime = Date.now();
    this.packageInfo = this.getPackageInfo();
    this.isCI = this.detectCIEnvironment();
  }

  detectCIEnvironment() {
    // Strict CI detection across common providers
    const isStrictCI =
      (process.env.CI === 'true' || process.env.CI === '1') &&
      (
        process.env.GITHUB_ACTIONS === 'true' ||
        process.env.TRAVIS === 'true' ||
        process.env.CIRCLECI === 'true' ||
        !!process.env.JENKINS_URL
      );

    // Explicit developer override for local builds/tests
    const devOverride = process.env.OPTIMIZER_SKIP_SECURITY === 'true';

    if (isStrictCI) {
      this.log('🤖 Strict CI environment detected - skipping security validation');
    } else if (devOverride) {
      this.log('⚠️ Developer override active (OPTIMIZER_SKIP_SECURITY=true) - skipping security validation');
    }

    return isStrictCI || devOverride;
  }

  getPackageInfo() {
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    } catch {
      return { version: '3.1.0', name: 'mcp-prompt-optimizer-local' };
    }
  }

  log(message, level = 'info') {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const prefix = `[${elapsed}s] 🛡️`;
    (level === 'error' ? console.error : console.log)(`${prefix} ${message}`);
  }

  async downloadFile(url, destinationPath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destinationPath);

      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          const loc = response.headers.location;
          if (!loc) return reject(new Error('Redirect without location header'));
          return this.downloadFile(loc, destinationPath).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', (err) => {
          fs.unlink(destinationPath, () => {});
          reject(err);
        });
      }).on('error', reject);
    });
  }

  async fetchFromGitHubRelease(filename) {
    const repoUrl = this.packageInfo.repository?.url || 'https://github.com/nivlewd1/mcp-prompt-optimizer-local';
    const version = this.packageInfo.version;

    const repoMatch = repoUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+)(?:\.git)?/i);
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

    // Ensure executable on Unix-like systems
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

    if (fs.existsSync(binaryPath)) {
      try {
        const result = await verifier.verifyCurrentPlatform();
        if (result.verified && !result.isPlaceholder) {
          this.log(`✅ Binary verified: ${expectedBinary.filename}`);
          return binaryPath;
        }
        if (result.isPlaceholder) this.log('⚠️  Placeholder detected, fetching real binary...');
      } catch (err) {
        this.log(`⚠️  Local binary verification failed: ${err.message}`, 'error');
        this.log('📥 Attempting to fetch binary from GitHub release...');
      }
    } else {
      this.log('📥 Binary not found locally, fetching from GitHub release...');
    }

    // Fetch & verify
    const downloadedPath = await this.fetchFromGitHubRelease(expectedBinary.filename);
    const verify = await verifier.verifyCurrentPlatform();
    if (!verify.verified) throw new Error('Downloaded binary failed verification');
    this.log('✅ Downloaded binary verified successfully');
    return downloadedPath;
  }

  async runSecurityGates() {
    this.log('Starting secure installation validation...');

    const results = {
      apiKey: null,
      binaryIntegrity: null,
      binaryAvailable: null,
      overall: false,
      errors: [],
      warnings: [],
      skippedInCI: this.isCI
    };

    // CI/dev override: skip gates
    if (this.isCI) {
      this.log('🤖 Security validation skipped (CI/override).');
      results.overall = true;
      return results;
    }

    // Gate 1: API Key
    try {
      this.log('🔑 Gate 1: API Key Validation');
      const apiKeyResult = requireValidApiKey();
      results.apiKey = apiKeyResult;
      this.log(`✅ API key validated (${apiKeyResult.tier} tier)`);
    } catch (error) {
      this.log(`❌ API key validation failed: ${error.message}`, 'error');
      results.errors.push(`API Key: ${error.message}`);
      return results;
    }

    // Gate 2: Ensure Binary (download if needed)
    try {
      this.log('📦 Gate 2: Binary Availability Check');
      const binaryPath = await this.ensureBinaryAvailable();
      results.binaryAvailable = { path: binaryPath };
      this.log('✅ Binary available and ready');
    } catch (error) {
      this.log(`❌ Binary availability check failed: ${error.message}`, 'error');
      results.errors.push(`Binary Availability: ${error.message}`);
      return results;
    }

    // Gate 3: Binary Integrity
    try {
      this.log('🔍 Gate 3: Binary Integrity Verification');
      const binaryResult = await BinaryIntegrityVerifier.quickVerify();
      results.binaryIntegrity = binaryResult;
      if (binaryResult.isPlaceholder) {
        this.log('⚠️  Development placeholder detected');
        results.warnings.push('Using development placeholder binary');
      } else {
        this.log('✅ Binary integrity verified');
      }
    } catch (error) {
      this.log(`❌ Binary integrity check failed: ${error.message}`, 'error');
      results.errors.push(`Binary Integrity: ${error.message}`);
      return results;
    }

    results.overall = true;
    return results;
  }

  async runCompatibilityChecks() {
    this.log('🔧 Running compatibility checks...');
    return {
      nodeVersion: this.checkNodeVersion(),
      platform: this.checkPlatform(),
      permissions: await this.checkPermissions()
    };
  }

  checkNodeVersion() {
    const major = parseInt(process.versions.node.split('.')[0], 10);
    return major >= 16
      ? { passed: true, version: process.version }
      : { passed: false, message: `Node.js ${process.version} is too old. Requires Node.js 16+` };
  }

  checkPlatform() {
    const platform = process.platform;
    const arch = process.arch;
    const supported = ['win32', 'darwin', 'linux'].includes(platform) && ['x64', 'arm64'].includes(arch);
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
      await fs.promises.mkdir(binDir, { recursive: true });
      await fs.promises.access(binDir, fs.constants.R_OK);

      const entries = await fs.promises.readdir(binDir);
      const bin = entries.find(f => f.includes('mcp-optimizer'));
      if (bin) {
        const p = path.join(binDir, bin);
        await fs.promises.access(p, fs.constants.R_OK);
        if (process.platform !== 'win32') {
          try { await fs.promises.access(p, fs.constants.X_OK); }
          catch { await fs.promises.chmod(p, 0o755); }
        }
      }

      return { passed: true, message: 'Permissions OK' };
    } catch (error) {
      return { passed: false, message: `Permission error: ${error.message}` };
    }
  }

  async runPostInstallTasks() {
    const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const userDataDir = path.join(home, '.mcp_optimizer');
    await fs.promises.mkdir(userDataDir, { recursive: true }).catch(() => {});
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
      } catch (e) {
        this.log(`⚠️  Could not create config file: ${e.message}`);
      }
    }
  }

  showSuccessMessage(securityResults, compatibilityResults) {
    if (this.isCI) {
      console.log('\n🤖 MCP Prompt Optimizer Local - CI Installation Complete!');
      console.log('✅ Package installed successfully for build process');
      console.log('⚠️ Security checks were skipped due to CI/override flag');
      return;
    }

    console.log('\n🎉 MCP Prompt Optimizer Local - Installation Complete!\n');
    if (securityResults.skippedInCI) {
      console.log('⚠️ Security checks were skipped in this environment');
    } else {
      console.log('✅ Security validation passed');
      console.log(`✅ API key validated (${securityResults.apiKey.tier} tier)`);
      console.log('✅ Binary integrity verified');
    }
    console.log(`✅ Platform supported (${compatibilityResults.platform.platform}-${compatibilityResults.platform.arch})`);

    if (securityResults.warnings?.length) {
      console.log('\n⚠️  Warnings:');
      for (const w of securityResults.warnings) console.log(`   ⚠️  ${w}`);
    }

    console.log('\n🚀 Ready to use:');
    console.log('   mcp-prompt-optimizer-local                 # Start the MCP server');
    console.log('   mcp-prompt-optimizer-local check-license   # Check license status');
    console.log('   mcp-prompt-optimizer-local help            # Show help');
    console.log('\n📚 Docs: https://promptoptimizer-blog.vercel.app/docs');
    console.log('🌍 Cross-platform guide: https://github.com/nivlewd1/mcp-prompt-optimizer-local/blob/main/CROSS-PLATFORM.md\n');
  }

  showFailureMessage(securityResults, compatibilityResults) {
    if (this.isCI) {
      console.log('\n❌ MCP Prompt Optimizer Local - CI Installation Failed');
      console.log('This should not happen in CI environments');
      return;
    }

    console.log('\n❌ MCP Prompt Optimizer Local - Installation Failed\n');

    if (securityResults.errors.length) {
      console.log('🛡️  Security Issues:');
      for (const e of securityResults.errors) console.log(`   ❌ ${e}`);
      console.log('');
    }

    if (compatibilityResults) {
      const failed = Object.entries(compatibilityResults).filter(([, c]) => !c.passed);
      if (failed.length) {
        console.log('🔧 Compatibility Issues:');
        for (const [name, c] of failed) console.log(`   ❌ ${name}: ${c.message}`);
        console.log('');
      }
    }

    console.log('🔧 Troubleshooting:\n');
    console.log('1. API Key: export OPTIMIZER_API_KEY=your-key-here  (or ~/.mcp_optimizer/config.json with {"apiKey":"your-key"})\n');
    console.log('2. Binary: npm cache clean --force && npm uninstall && npm install mcp-prompt-optimizer-local\n');
    console.log('3. Platform: Windows/macOS/Linux on x64/arm64; Node.js 16+\n');
    console.log('📧 support@promptoptimizer.help\n');
  }

  async run() {
    console.log('🛡️  MCP Prompt Optimizer - Secure Installation');
    console.log('================================================');

    try {
      const securityResults = await this.runSecurityGates();
      if (!securityResults.overall) {
        this.showFailureMessage(securityResults, null);
        process.exit(1);
      }

      let compatibilityResults = null;
      if (!this.isCI) {
        compatibilityResults = await this.runCompatibilityChecks();
        const hasIssues = Object.values(compatibilityResults).some(c => !c.passed);
        if (hasIssues) {
          this.showFailureMessage(securityResults, compatibilityResults);
          process.exit(1);
        }
      }

      await this.runPostInstallTasks();
      this.showSuccessMessage(securityResults, compatibilityResults);
    } catch (error) {
      this.log(`💥 Unexpected installation error: ${error.message}`, 'error');
      console.log('\n❌ Installation failed due to unexpected error');
      console.log(`Error: ${error.message}`);
      console.log('\n🔧 Try:');
      console.log('1. npm cache clean --force');
      console.log('2. npm uninstall mcp-prompt-optimizer-local');
      console.log('3. npm install mcp-prompt-optimizer-local');
      console.log('\nIf the problem persists, contact support@promptoptimizer.help');
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const installer = new SecurePostInstaller();
  installer.run().catch(err => {
    console.error('💥 Post-install script failed:', err.message);
    process.exit(1);
  });
}

module.exports = SecurePostInstaller;