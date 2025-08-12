/**
 * Binary Manager - Intelligent orchestration of protected binaries
 * Automates binary selection, verification, and execution WITHOUT exposing source
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

class BinaryManager {
    constructor(projectRoot = null) {
        this.projectRoot = projectRoot || path.dirname(__dirname);
        this.binDir = path.join(this.projectRoot, 'bin');
        this.logPrefix = '[BinaryManager]';
        this.platformInfo = this.detectPlatform();
        this.selectedBinary = null;
        this.fallbackStrategy = null;
    }

    log(message, level = 'info') {
        if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
            const timestamp = new Date().toISOString();
            const prefix = `${timestamp} ${this.logPrefix}`;
            console.error(`${prefix} ${message}`);
        }
    }

    /**
     * SMART PLATFORM DETECTION
     * Automatically detect optimal binary for current platform
     */
    detectPlatform() {
        const platform = os.platform();
        const arch = os.arch();
        
        const platformMap = {
            'win32': 'windows',
            'darwin': 'macos', 
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
        const extension = platform === 'win32' ? '.exe' : '';
        
        return {
            platform: normalizedPlatform,
            arch: normalizedArch,
            extension,
            binaryName: `mcp-optimizer-${normalizedPlatform}-${normalizedArch}${extension}`,
            isWindows: platform === 'win32',
            isMac: platform === 'darwin',
            isLinux: platform === 'linux'
        };
    }

    /**
     * AUTOMATIC BINARY DISCOVERY
     * Find the best available binary for current platform
     */
    async discoverBinary() {
        this.log('Starting binary discovery...');
        
        try {
            // Priority 1: Exact platform match
            const exactMatch = await this.checkBinary(this.platformInfo.binaryName);
            if (exactMatch.available) {
                this.selectedBinary = exactMatch;
                this.log(`Found exact platform match: ${this.platformInfo.binaryName}`);
                return exactMatch;
            }
            
            // Priority 2: Compatible alternatives
            const alternatives = await this.findCompatibleBinaries();
            if (alternatives.length > 0) {
                this.selectedBinary = alternatives[0];
                this.log(`Found compatible binary: ${alternatives[0].name}`);
                return alternatives[0];
            }
            
            // Priority 3: Set fallback strategy
            this.fallbackStrategy = await this.determineFallbackStrategy();
            this.log(`No binary found, fallback strategy: ${this.fallbackStrategy}`);
            
            return null;
            
        } catch (error) {
            this.log(`Binary discovery failed: ${error.message}`);
            this.fallbackStrategy = 'python';
            return null;
        }
    }

    async checkBinary(binaryName) {
        const binaryPath = path.join(this.binDir, binaryName);
        
        try {
            // Check if file exists
            await fs.access(binaryPath, fs.constants.F_OK);
            
            // Check if executable
            await fs.access(binaryPath, fs.constants.X_OK);
            
            // Get file stats
            const stats = await fs.stat(binaryPath);
            
            return {
                name: binaryName,
                path: binaryPath,
                available: true,
                size: stats.size,
                executable: true,
                lastModified: stats.mtime
            };
            
        } catch (error) {
            return {
                name: binaryName,
                path: binaryPath,
                available: false,
                error: error.message
            };
        }
    }

    async findCompatibleBinaries() {
        try {
            const binFiles = await fs.readdir(this.binDir);
            const compatibleBinaries = [];
            
            for (const file of binFiles) {
                if (file.startsWith('mcp-optimizer-') && file !== this.platformInfo.binaryName) {
                    const binaryInfo = await this.checkBinary(file);
                    if (binaryInfo.available) {
                        // Check compatibility score
                        const compatibility = this.calculateCompatibility(file);
                        if (compatibility > 0) {
                            binaryInfo.compatibility = compatibility;
                            compatibleBinaries.push(binaryInfo);
                        }
                    }
                }
            }
            
            // Sort by compatibility score
            return compatibleBinaries.sort((a, b) => b.compatibility - a.compatibility);
            
        } catch (error) {
            this.log(`Error finding compatible binaries: ${error.message}`);
            return [];
        }
    }

    calculateCompatibility(binaryName) {
        // Simple compatibility scoring
        let score = 0;
        
        if (binaryName.includes(this.platformInfo.platform)) {
            score += 10;
        }
        
        if (binaryName.includes(this.platformInfo.arch)) {
            score += 5;
        }
        
        // Cross-platform compatibility rules
        if (this.platformInfo.isLinux && binaryName.includes('linux')) {
            score += 8;
        }
        
        if (this.platformInfo.isMac && binaryName.includes('macos')) {
            score += 8;
        }
        
        return score;
    }

    async determineFallbackStrategy() {
        // Check Python availability
        try {
            const { execSync } = require('child_process');
            execSync('python3 --version', { stdio: 'ignore', timeout: 3000 });
            return 'python3';
        } catch {
            try {
                execSync('python --version', { stdio: 'ignore', timeout: 3000 });
                return 'python';
            } catch {
                return 'error';
            }
        }
    }

    /**
     * SMART BINARY EXECUTION
     * Execute the selected binary with optimal parameters
     */
    async executeBinary(args = [], options = {}) {
        if (!this.selectedBinary) {
            await this.discoverBinary();
        }
        
        if (!this.selectedBinary) {
            return this.executeFallback(args, options);
        }
        
        this.log(`Executing binary: ${this.selectedBinary.name}`);
        
        const execOptions = {
            cwd: this.projectRoot,
            stdio: options.stdio || 'inherit',
            env: {
                ...process.env,
                MCP_BINARY_MODE: 'true',
                MCP_BINARY_PATH: this.selectedBinary.path,
                ...options.env
            },
            ...options
        };
        
        return new Promise((resolve, reject) => {
            const child = spawn(this.selectedBinary.path, args, execOptions);
            
            child.on('exit', (code, signal) => {
                if (code === 0) {
                    resolve({ success: true, code, signal });
                } else {
                    // Try fallback on binary failure
                    this.log(`Binary failed with code ${code}, trying fallback...`);
                    this.executeFallback(args, options).then(resolve).catch(reject);
                }
            });
            
            child.on('error', (error) => {
                this.log(`Binary execution error: ${error.message}`);
                // Try fallback on execution error
                this.executeFallback(args, options).then(resolve).catch(reject);
            });
        });
    }

    async executeFallback(args = [], options = {}) {
        if (this.fallbackStrategy === 'error') {
            throw new Error('No execution method available (no binary or Python)');
        }
        
        this.log(`Using fallback strategy: ${this.fallbackStrategy}`);
        
        // Python fallback execution
        const pythonScript = path.join(this.projectRoot, 'python-server', 'main_entry.py');
        
        const execOptions = {
            cwd: this.projectRoot,
            stdio: options.stdio || 'inherit',
            env: {
                ...process.env,
                MCP_PYTHON_MODE: 'true',
                MCP_FALLBACK_MODE: 'true',
                ...options.env
            },
            ...options
        };
        
        return new Promise((resolve, reject) => {
            const child = spawn(this.fallbackStrategy, [pythonScript, ...args], execOptions);
            
            child.on('exit', (code, signal) => {
                resolve({ success: code === 0, code, signal, fallback: true });
            });
            
            child.on('error', (error) => {
                reject(new Error(`Fallback execution failed: ${error.message}`));
            });
        });
    }

    /**
     * BINARY HEALTH CHECK
     * Verify binary integrity and performance
     */
    async healthCheck() {
        const health = {
            timestamp: new Date().toISOString(),
            platform: this.platformInfo,
            binary: null,
            fallback: null,
            recommendations: []
        };
        
        // Check binary availability
        if (this.selectedBinary || await this.discoverBinary()) {
            health.binary = {
                available: true,
                name: this.selectedBinary.name,
                size: this.selectedBinary.size,
                path: this.selectedBinary.path
            };
        } else {
            health.binary = {
                available: false,
                reason: 'No compatible binary found for platform'
            };
            health.recommendations.push('Consider Python fallback mode');
        }
        
        // Check fallback availability
        const fallback = await this.determineFallbackStrategy();
        health.fallback = {
            available: fallback !== 'error',
            strategy: fallback
        };
        
        if (!health.binary.available && !health.fallback.available) {
            health.recommendations.push('Install Python 3.8+ for fallback mode');
        }
        
        return health;
    }

    /**
     * AUTO-REPAIR FUNCTIONALITY
     * Attempt to fix common binary issues automatically
     */
    async autoRepair() {
        this.log('Starting auto-repair...');
        const repairs = [];
        
        try {
            // Repair 1: Fix binary permissions
            if (this.selectedBinary && !this.platformInfo.isWindows) {
                try {
                    await fs.chmod(this.selectedBinary.path, 0o755);
                    repairs.push('Fixed binary permissions');
                } catch (error) {
                    repairs.push(`Permission repair failed: ${error.message}`);
                }
            }
            
            // Repair 2: Verify binary integrity
            if (this.selectedBinary) {
                const stats = await fs.stat(this.selectedBinary.path);
                if (stats.size < 1000000) { // Less than 1MB is suspicious
                    repairs.push('Warning: Binary file seems corrupted (too small)');
                }
            }
            
            // Repair 3: Clean temporary files
            const tempFiles = [
                path.join(this.projectRoot, '.mcp-cache'),
                path.join(this.projectRoot, 'installation-info.json')
            ];
            
            for (const tempFile of tempFiles) {
                try {
                    await fs.unlink(tempFile);
                    repairs.push(`Cleaned temporary file: ${path.basename(tempFile)}`);
                } catch {
                    // File doesn't exist, that's fine
                }
            }
            
            return {
                success: true,
                repairs,
                message: `Auto-repair completed: ${repairs.length} actions taken`
            };
            
        } catch (error) {
            return {
                success: false,
                repairs,
                error: error.message
            };
        }
    }

    /**
     * PUBLIC API METHODS
     */
    async initialize() {
        this.log('Initializing binary manager...');
        await this.discoverBinary();
        return this.selectedBinary !== null || this.fallbackStrategy !== 'error';
    }

    async start(args = [], options = {}) {
        if (!this.selectedBinary && !this.fallbackStrategy) {
            await this.initialize();
        }
        
        return this.executeBinary(args, options);
    }

    async getStatus() {
        return {
            platform: this.platformInfo,
            selectedBinary: this.selectedBinary,
            fallbackStrategy: this.fallbackStrategy,
            health: await this.healthCheck()
        };
    }
}

module.exports = BinaryManager;