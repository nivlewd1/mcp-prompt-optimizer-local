#!/usr/bin/env node
/**
 * Determinism Test Suite for NPM Prompt Optimizer
 * Verifies identical outputs across multiple runs (matching MCP server behavior)
 *
 * Critical Fixes Being Tested:
 * 1. Context-aware validation (300x minimal, 70x image, 20x default)
 * 2. Deterministic routing (alphabetical tie-breaking)
 * 3. Minimal input pattern detection
 */

const { RulesEngine } = require('./lib/optimization-rules');

async function testDeterminism() {
    console.log('='.repeat(80));
    console.log('DETERMINISM TEST SUITE - NPM Prompt Optimizer');
    console.log('='.repeat(80));
    console.log('\nFixes Applied:');
    console.log('  1. Context-aware validation (minimal: 300x, image: 70x, default: 20x)');
    console.log('  2. Deterministic routing with alphabetical tie-breaking');
    console.log('  3. Goal threshold lowered to 0.05 (from 0.08)');
    console.log('  4. Minimal input pattern verification');
    console.log('\n' + '='.repeat(80));

    const testCases = [
        {
            prompt: "hi",
            context: "llm-interaction",
            goals: ["clarity"],
            description: "Minimal input - should expand ~300x",
            expectedMinExpansion: 10.0,
            type: "minimal"
        },
        {
            prompt: "generate image of a sunset",
            context: "image-generation",
            goals: ["clarity", "comprehensiveness"],
            description: "Image generation - should expand ~70x max",
            expectedMinExpansion: 5.0,
            type: "image"
        },
        {
            prompt: "write a poem about coding",
            context: "llm-interaction",
            goals: ["clarity", "quality-enhancement"],
            description: "Poetry request - moderate expansion",
            expectedMinExpansion: 2.0,
            type: "creative"
        },
        {
            prompt: "debug my python function",
            context: "code-generation",
            goals: ["technical-precision", "clarity"],
            description: "Technical/debug request - conservative expansion",
            expectedMinExpansion: 1.5,
            type: "technical"
        },
        {
            prompt: "write a story about a brave knight",
            context: "llm-interaction",
            goals: ["clarity", "quality-enhancement"],
            description: "Story request - moderate expansion",
            expectedMinExpansion: 2.0,
            type: "story"
        },
        {
            prompt: "explain machine learning",
            context: "llm-interaction",
            goals: ["clarity", "educational-value"],
            description: "Educational request - moderate expansion",
            expectedMinExpansion: 1.5,
            type: "educational"
        }
    ];

    const optimizer = new RulesEngine({ debugMode: false });
    let totalTests = 0;
    let deterministicTests = 0;
    let validationTests = 0;
    const failedTests = [];

    for (const testCase of testCases) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`Testing: "${testCase.prompt}"`);
        console.log(`Context: ${testCase.context} | Type: ${testCase.type}`);
        console.log(`Description: ${testCase.description}`);
        console.log('='.repeat(80));

        // Run the test 5 times to verify determinism
        const results = [];
        for (let run = 1; run <= 5; run++) {
            try {
                const result = await optimizer.optimizeForContext(
                    testCase.prompt,
                    testCase.context,
                    testCase.goals
                );

                results.push({
                    run,
                    optimized: result.optimizedText,
                    length: result.optimizedText.length,
                    rulesApplied: result.appliedRules.length,
                    confidence: result.confidenceModifier || 1.0
                });
            } catch (error) {
                results.push({
                    run,
                    error: error.message
                });
            }
        }

        // Check determinism (all 5 runs should produce identical output)
        const allSuccessful = results.every(r => !r.error);
        if (!allSuccessful) {
            console.log('\n[FAIL] Some runs encountered errors');
            results.filter(r => r.error).forEach(r => {
                console.log(`  Run ${r.run} error: ${r.error}`);
            });
            failedTests.push({
                prompt: testCase.prompt,
                issue: 'Errors occurred during optimization'
            });
            continue;
        }

        // Check if all outputs are identical
        const firstOutput = results[0].optimized;
        const allIdentical = results.every(r => r.optimized === firstOutput);

        totalTests++;

        // Test 1: Determinism
        if (allIdentical) {
            console.log('\n[PASS] DETERMINISM: All 5 runs produced IDENTICAL output');
            deterministicTests++;
        } else {
            console.log('\n[FAIL] DETERMINISM: Outputs varied across runs');
            const uniqueOutputs = [...new Set(results.map(r => r.optimized))];
            console.log(`  Found ${uniqueOutputs.length} unique outputs across 5 runs`);
            failedTests.push({
                prompt: testCase.prompt,
                issue: `Non-deterministic: ${uniqueOutputs.length} unique outputs`
            });
        }

        // Test 2: Expansion validation
        const expansion = results[0].length / testCase.prompt.length;
        const meetsMinExpansion = expansion >= testCase.expectedMinExpansion;

        console.log(`\n  Expansion: ${expansion.toFixed(2)}x (expected >= ${testCase.expectedMinExpansion}x)`);
        console.log(`  Original length: ${testCase.prompt.length} chars`);
        console.log(`  Optimized length: ${results[0].length} chars`);
        console.log(`  Rules applied: ${results[0].rulesApplied}`);
        console.log(`  Confidence: ${results[0].confidence.toFixed(3)}`);

        if (meetsMinExpansion) {
            console.log(`  [PASS] Expansion meets minimum requirement`);
            validationTests++;
        } else {
            console.log(`  [FAIL] Expansion below minimum (${expansion.toFixed(2)}x < ${testCase.expectedMinExpansion}x)`);
            failedTests.push({
                prompt: testCase.prompt,
                issue: `Insufficient expansion: ${expansion.toFixed(2)}x`
            });
        }

        // Show output preview
        const preview = firstOutput.substring(0, 150).replace(/\n/g, ' ');
        console.log(`\n  Output preview:`);
        console.log(`    ${preview}${firstOutput.length > 150 ? '...' : ''}`);

        // Validation-specific tests
        if (testCase.type === 'minimal') {
            if (expansion >= 10 && expansion <= 300) {
                console.log(`  [PASS] MINIMAL INPUT: Expansion within expected range (10-300x)`);
            } else if (expansion > 300) {
                console.log(`  [WARN] MINIMAL INPUT: Expansion exceeds 300x limit`);
            } else {
                console.log(`  [FAIL] MINIMAL INPUT: Expansion too low for minimal input`);
            }
        }

        if (testCase.type === 'image') {
            if (expansion <= 70) {
                console.log(`  [PASS] IMAGE GEN: Expansion within 70x limit`);
            } else {
                console.log(`  [FAIL] IMAGE GEN: Expansion exceeds 70x limit (${expansion.toFixed(2)}x)`);
            }
        }
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total test cases: ${totalTests}`);
    console.log(`Deterministic (identical across 5 runs): ${deterministicTests}/${totalTests}`);
    console.log(`Valid expansion: ${validationTests}/${totalTests}`);

    const determinismRate = (deterministicTests / totalTests * 100).toFixed(1);
    const validationRate = (validationTests / totalTests * 100).toFixed(1);

    console.log(`\nDeterminism Rate: ${determinismRate}%`);
    console.log(`Validation Rate: ${validationRate}%`);

    if (failedTests.length > 0) {
        console.log(`\nFailed Tests (${failedTests.length}):`);
        failedTests.forEach((test, i) => {
            console.log(`  ${i + 1}. "${test.prompt}": ${test.issue}`);
        });
    }

    if (determinismRate == 100 && validationRate == 100) {
        console.log(`\n[SUCCESS] All tests passed!`);
        console.log(`[SUCCESS] NPM package is fully aligned with MCP server`);
        console.log('='.repeat(80));
        return 0;
    } else if (determinismRate >= 80 && validationRate >= 80) {
        console.log(`\n[PARTIAL] Most tests passed (${Math.min(determinismRate, validationRate)}%)`);
        console.log(`[INFO] Some alignment issues remain`);
        console.log('='.repeat(80));
        return 1;
    } else {
        console.log(`\n[FAILURE] Significant issues found`);
        console.log(`[ERROR] NPM package needs more work for MCP server alignment`);
        console.log('='.repeat(80));
        return 1;
    }
}

// Run tests
testDeterminism().then(exitCode => {
    process.exit(exitCode);
}).catch(error => {
    console.error('\n[FATAL ERROR]', error);
    process.exit(1);
});
