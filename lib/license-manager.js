/**
 * Simplified License Manager - Secure with Backend Validation
 * All users (including free tier) require API keys validated by backend
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class SimplifiedLicenseManager {
    constructor() {
        this.cacheFile = path.join(os.homedir(), '.mcp-license-cache.json');
        this.cacheExpiry = 1 * 60 * 60 * 1000; // 1 hour cache only
        this.backendUrl = process.env.OPTIMIZER_BACKEND_URL || 'https://p01--project-optimizer--fvmrdk8m9k9j.code.run';
        this.debug = process.env.MCP_DEBUG === 'true';
    }

    log(message) {
        if (this.debug) {
            console.log(`[DEBUG] ${message}`);
        }
    }

    async validateLicense() {
        const apiKey = process.env.OPTIMIZER_API_KEY;

        this.log(`Starting license validation...`);
        this.log(`API Key found: ${apiKey ? 'YES' : 'NO'}`);

        // SECURITY: API key is REQUIRED - no free tier bypass
        if (!apiKey) {
            this.log(`No API key provided - validation FAILED`);
            return {
                valid: false,
                error: 'API key required. Sign up for a free key at https://promptoptimizer.xyz/local-license'
            };
        }

        this.log(`API Key: ${apiKey.substring(0, 25)}...`);

        // Validate format
        if (!this.isValidKeyFormat(apiKey)) {
            this.log(`Key format validation failed`);
            return {
                valid: false,
                error: 'Invalid API key format. Must start with "sk-local-" and contain "-basic-" or "-pro-"'
            };
        }

        this.log(`Key format validation passed`);

        // Try cache first (short-lived for performance)
        const cached = await this.getCachedValidation(apiKey);
        if (cached && cached.valid) {
            this.log(`Using cached validation - VALID`);
            return cached;
        }

        this.log(`No valid cache found, validating with backend...`);

        // SECURITY: Must validate with backend server
        try {
            const backendValidation = await this.validateWithBackend(apiKey);

            if (backendValidation && backendValidation.valid) {
                this.log(`Backend validation successful`);
                // Cache successful validation
                await this.cacheValidation(apiKey, backendValidation);
                return backendValidation;
            }

            return {
                valid: false,
                error: backendValidation?.error || 'Invalid API key'
            };
        } catch (error) {
            this.log(`Backend validation failed: ${error.message}`);
            return {
                valid: false,
                error: `Validation failed: ${error.message}`
            };
        }
    }

    // SECURITY: Backend validation method
    async validateWithBackend(apiKey) {
        return new Promise((resolve, reject) => {
            const url = `${this.backendUrl}/api/v1/api-keys/validate`;

            const options = {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 10000
            };

            const req = https.request(url, options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        if (res.statusCode === 200) {
                            const response = JSON.parse(data);
                            if (response.valid && response.context) {
                                // Map backend response to our format
                                resolve({
                                    valid: true,
                                    type: response.context.type,
                                    tier: response.context.tier,
                                    quota: {
                                        limit: response.context.quota_limit,
                                        used: response.context.quota_used,
                                        remaining: response.context.quota_limit === null ? 'unlimited' :
                                                   response.context.quota_limit - response.context.quota_used,
                                        unlimited: response.context.quota_limit === null
                                    },
                                    user_id: response.context.user_id,
                                    mcp_access_level: response.context.mcp_access_level
                                });
                            } else {
                                resolve({ valid: false, error: 'Invalid API key' });
                            }
                        } else if (res.statusCode === 401) {
                            resolve({ valid: false, error: 'Invalid API key' });
                        } else {
                            const error = JSON.parse(data);
                            resolve({ valid: false, error: error.detail || 'Validation failed' });
                        }
                    } catch (parseError) {
                        reject(new Error(`Invalid response: ${parseError.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Network error: ${error.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    // SECURITY: Get quota status from backend
    async getQuotaStatus() {
        const apiKey = process.env.OPTIMIZER_API_KEY;

        if (!apiKey) {
            return { error: 'API key required' };
        }

        try {
            return new Promise((resolve, reject) => {
                const url = `${this.backendUrl}/api/v1/api-keys/quota-status`;

                const options = {
                    method: 'GET',
                    headers: {
                        'x-api-key': apiKey,
                        'Accept': 'application/json'
                    },
                    timeout: 10000
                };

                const req = https.request(url, options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            if (res.statusCode === 200) {
                                const response = JSON.parse(data);
                                resolve({
                                    tier: response.tier,
                                    unlimited: response.quota_limit === null,
                                    used: response.quota_used,
                                    remaining: response.quota_remaining,
                                    limit: response.quota_limit,
                                    usage_percentage: response.usage_percentage
                                });
                            } else {
                                resolve({ error: 'Failed to get quota status' });
                            }
                        } catch (parseError) {
                            reject(new Error(`Invalid response: ${parseError.message}`));
                        }
                    });
                });

                req.on('error', (error) => {
                    reject(new Error(`Network error: ${error.message}`));
                });

                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Request timeout'));
                });

                req.end();
            });
        } catch (error) {
            this.log(`Error getting quota status: ${error.message}`);
            return { error: error.message };
        }
    }

    // Use the exact validation logic from the original working version
    isValidKeyFormat(licenseKey) {
        if (!licenseKey || typeof licenseKey !== 'string') {
            this.log(`Key validation failed: not a string`);
            return false;
        }
        
        // Must start with sk-local-
        if (!licenseKey.startsWith('sk-local-')) {
            this.log(`Key validation failed: doesn't start with sk-local-`);
            return false;
        }
        
        // Must have basic or pro tier
        if (!licenseKey.includes('-basic-') && !licenseKey.includes('-pro-')) {
            this.log(`Key validation failed: doesn't contain -basic- or -pro-`);
            return false;
        }
        
        // Minimum length check
        if (licenseKey.length < 25) {
            this.log(`Key validation failed: too short (${licenseKey.length} chars)`);
            return false;
        }
        
        this.log(`Key format validation: PASSED`);
        return true;
    }

    async getCachedValidation(apiKey, allowExpired = false) {
        try {
            const cacheData = await fs.readFile(this.cacheFile, 'utf8');
            const cache = JSON.parse(cacheData);
            
            this.log(`Cache file contents: ${JSON.stringify(cache, null, 2)}`);
            
            if (cache.apiKey !== apiKey) {
                this.log(`Cache key mismatch`);
                return null;
            }
            
            const age = Date.now() - new Date(cache.timestamp).getTime();
            if (!allowExpired && age > this.cacheExpiry) {
                this.log(`Cache expired (${Math.round(age / 1000 / 60)} minutes old)`);
                return null;
            }
            
            this.log(`Cache found - Valid: ${cache.validation?.valid}`);
            return cache.validation;
        } catch (error) {
            this.log(`No cache available: ${error.message}`);
            return null;
        }
    }

    async cacheValidation(apiKey, validation) {
        try {
            const cacheData = {
                apiKey,
                validation,
                timestamp: new Date().toISOString()
            };
            
            await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
            this.log(`Validation cached successfully`);
        } catch (error) {
            this.log(`Cache write failed: ${error.message}`);
        }
    }

    async clearCache() {
        try {
            await fs.unlink(this.cacheFile);
            this.log(`Cache file deleted: ${this.cacheFile}`);
        } catch (error) {
            this.log(`Cache clear failed (file may not exist): ${error.message}`);
        }
    }

}

module.exports = SimplifiedLicenseManager;