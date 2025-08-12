// test/integration-test.js
const { spawn } = require('child_process');
const path = require('path');

async function runIntegrationTests() {
    console.log('🧪 Running Integration Tests\n');
    
    const tests = [
        {
            name: 'No API Key Error',
            env: {},
            expectError: true,
            expectedOutput: 'OPTIMIZER_API_KEY'
        },
        {
            name: 'Invalid API Key Format',
            env: { OPTIMIZER_API_KEY: 'invalid-key' },
            expectError: true,
            expectedOutput: 'sk-local-'
        },
        {
            name: 'Valid API Key Format Check',
            env: { OPTIMIZER_API_KEY: 'sk-local-test-12345' },
            expectError: false,
            expectedOutput: 'License validated'
        }
    ];
    
    for (const test of tests) {
        console.log(`Testing: ${test.name}`);
        
        try {
            const result = await runCommand('node', ['index.js', 'check-license'], test.env);
            
            if (test.expectError && result.code === 0) {
                console.log(`❌ Expected error but got success`);
            } else if (!test.expectError && result.code !== 0) {
                console.log(`❌ Expected success but got error: ${result.stderr}`);
            } else if (result.output.includes(test.expectedOutput)) {
                console.log(`✅ Test passed`);
            } else {
                console.log(`❌ Expected output "${test.expectedOutput}" not found`);
                console.log(`   Actual output: ${result.output.substring(0, 100)}...`);
            }
        } catch (error) {
            console.log(`❌ Test failed: ${error.message}`);
        }
        
        console.log('');
    }
}

function runCommand(command, args, env) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            env: { ...process.env, ...env },
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', data => stdout += data);
        child.stderr.on('data', data => stderr += data);
        
        child.on('close', code => {
            resolve({
                code,
                output: stdout + stderr,
                stdout,
                stderr
            });
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
            child.kill();
            resolve({ code: -1, output: 'Timeout', stdout: '', stderr: 'Timeout' });
        }, 5000);
    });
}

if (require.main === module) {
    runIntegrationTests().catch(console.error);
}

module.exports = { runIntegrationTests };
