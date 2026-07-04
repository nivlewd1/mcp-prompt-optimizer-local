const fs = require('fs');
const path = require('path');

/**
 * Enhanced API Key Validation for Secure Installation - NOW WITH FREE TIER SUPPORT
 */
function getApiKey() {
    // Priority: env var > local config file > .env file
    if (process.env.OPTIMIZER_API_KEY) {
        return process.env.OPTIMIZER_API_KEY.trim();
    }

    // Check user home config
    const configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.mcp_optimizer', 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (cfg.apiKey) return cfg.apiKey.trim();
        } catch (error) {
            // Invalid JSON, continue to other methods
        }
    }

    // Check for .env file in project directory
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        try {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/OPTIMIZER_API_KEY\s*=\s*(.+)/);
            if (match && match[1]) {
                return match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes
            }
        } catch (error) {
            // Invalid .env, continue
        }
    }

    return null;
}

function isValidKeyFormat(key) {
    if (!key || typeof key !== 'string') {
        return false;
    }

    // Enhanced validation patterns
    const patterns = [
        /^sk-local-(basic|pro)-[a-f0-9]{32}$/i,  // Original format
        /^mcp_(live|test)_[a-f0-9]{32}$/i,       // New format from plans
        /^opt_[a-f0-9]{40}$/i                    // Alternative format
    ];

    return patterns.some(pattern => pattern.test(key));
}

function validateKeyStrength(key) {
    const checks = {
        length: key.length >= 25,
        format: isValidKeyFormat(key),
        entropy: hasGoodEntropy(key),
        notTestKey: !isTestKey(key)
    };

    return {
        valid: Object.values(checks).every(Boolean),
        checks,
        strength: Object.values(checks).filter(Boolean).length / Object.keys(checks).length
    };
}

function hasGoodEntropy(key) {
    // Basic entropy check - look for hex patterns
    const hexPart = key.match(/[a-f0-9]{20,}/i);
    if (!hexPart) return false;
    
    const chars = hexPart[0].toLowerCase();
    const charCounts = {};
    for (const char of chars) {
        charCounts[char] = (charCounts[char] || 0) + 1;
    }
    
    // Check if distribution isn't too uniform (which would indicate a weak key)
    const uniqueChars = Object.keys(charCounts).length;
    return uniqueChars >= 8; // Should have good variety
}

function isTestKey(key) {
    // More specific test key patterns to avoid false positives
    const testPatterns = [
        /test.*key/i,
        /demo.*key/i, 
        /example.*key/i,
        /^sk-local-(basic|pro)-0{20,}/i,  // Keys with many zeros
        /^sk-local-(basic|pro)-1{20,}/i,  // Keys with many ones
        /^sk-local-(basic|pro)-[a-f]*abcdef[a-f]*$/i,  // Only if it's mostly abcdef pattern
        /^mcp_(live|test)_0{20,}/i,
        /dummy/i,
        /placeholder/i
    ];
    
    return testPatterns.some(pattern => pattern.test(key));
}

function getKeyTier(key) {
    if (key.includes('-pro-') || key.includes('_live_')) {
        return 'pro';
    } else if (key.includes('-basic-') || key.includes('_test_')) {
        return 'basic';
    } else {
        return 'unknown';
    }
}

module.exports = function requireValidApiKey() {
    console.log('🔑 Validating API key for secure installation...');

    const apiKey = getApiKey();

    // FREE TIER: no API key required. Install must never hard-fail just because a key is absent —
    // the caller (secure-postinstall) already handles tier === 'free'. (audit #1)
    if (!apiKey) {
        console.log('✅ No API key found — enabling FREE tier (5 daily optimizations, no key required).');
        return { key: null, tier: 'free', strength: 1, valid: true };
    }

    const validation = validateKeyStrength(apiKey);
    if (!validation.valid) {
        const issues = Object.entries(validation.checks)
            .filter(([_, passed]) => !passed)
            .map(([check]) => check);
        // A malformed key is a user mistake, not a reason to fail the install — degrade to free tier.
        console.log(`⚠️  API key format not recognized (${issues.join(', ')}). Falling back to FREE tier.`);
        console.log('   Get a valid key at: https://promptoptimizer.xyz/local-license');
        return { key: null, tier: 'free', strength: 0, valid: true, warning: 'invalid key format' };
    }

    if (validation.strength < 0.8) {
        console.log('⚠️  Warning: API key has low entropy. Consider requesting a new key.');
    }

    const tier = getKeyTier(apiKey);
    console.log(`✅ API key format validated (${tier} tier)`);
    console.log('ℹ️  Note: Final validation happens with backend server');

    return {
        key: apiKey,
        tier,
        strength: validation.strength,
        valid: true
    };
};

// Allow direct testing
if (require.main === module) {
    try {
        const result = module.exports();
        console.log('✅ Key validation test passed:', result);
    } catch (error) {
        console.error('❌ Key validation test failed:', error.message);
        process.exit(1);
    }
}