#!/usr/bin/env node
/**
 * generate-manifest.js
 *
 * Usage:
 *   node secure-update/generate-manifest.js --platform linux-x64 --binary dist/mcp-optimizer-linux-x64
 *   node secure-update/generate-manifest.js --dev-mode (for local development)
 *   node secure-update/generate-manifest.js --validate (for validation)
 *
 * This script:
 * - Reads manifest.json
 * - Updates entry for given platform with real hash
 * - Removes dev_placeholder and sets verified=true
 * - Writes updated manifest.json back to disk
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Simple CLI args parser
function getArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg, index, arr) => {
    if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '');
      const value = arr[index + 1] && !arr[index + 1].startsWith('--') ? arr[index + 1] : true;
      args[key] = value;
    }
  });
  return args;
}

function sha256File(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function tryGetGitCommit() {
  try {
    const { execSync } = require('child_process');
    return execSync('git rev-parse HEAD', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return 'unknown';
  }
}

function tryGetPackageVersion() {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return pkg.version;
  } catch {
    return '3.1.0';
  }
}

// Development mode: scan bin directory and create full manifest
async function generateDevManifest() {
  console.log('🔄 Generating development manifest...');
  
  const expectedBinaries = {
    'win32-x64': 'mcp-optimizer-windows-x64.exe',
    'darwin-x64': 'mcp-optimizer-macos-x64',
    'darwin-arm64': 'mcp-optimizer-macos-arm64',
    'linux-x64': 'mcp-optimizer-linux-x64',
    'linux-arm64': 'mcp-optimizer-linux-arm64'
  };

  const manifest = {
    version: tryGetPackageVersion(),
    build_commit: tryGetGitCommit(),
    build_date: new Date().toISOString(),
    binaries: {},
    security: {
      requires_api_key: true,
      verification_required: true,
      signature_required: false
    },
    features: [
      'mega_prompt_context_detection',
      'simplicity_enum_fix',
      'hybrid_llm_optimization',
      'universal_parameter_preservation',
      'cross_platform_support'
    ],
    platforms_supported: Object.keys(expectedBinaries),
    generation: {
      timestamp: new Date().toISOString(),
      dev_mode: true,
      generator_version: '1.0.0'
    }
  };

  const binDir = path.join(process.cwd(), 'bin');
  let foundBinaries = 0;
  let placeholderBinaries = 0;

  for (const [platform, filename] of Object.entries(expectedBinaries)) {
    const filePath = path.join(binDir, filename);
    
    console.log(`🔍 Scanning ${platform}: ${filename}`);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const isPlaceholder = stats.size < 10000 && content.includes('placeholder');
      
      if (isPlaceholder) {
        console.log(`  ⚠️  Development placeholder (${stats.size} bytes)`);
        manifest.binaries[platform] = {
          filename: filename,
          sha256: sha256File(filePath),
          size: stats.size,
          build_date: stats.mtime.toISOString(),
          verified: false,
          missing: false,
          is_primary: true,
          dev_placeholder: true
        };
        placeholderBinaries++;
      } else {
        console.log(`  ✅ Real binary (${Math.round(stats.size/1024/1024)}MB)`);
        manifest.binaries[platform] = {
          filename: filename,
          sha256: sha256File(filePath),
          size: stats.size,
          build_date: stats.mtime.toISOString(),
          verified: true,
          missing: false,
          is_primary: true
        };
        foundBinaries++;
      }
    } else {
      console.log(`  ❌ Missing: ${filename}`);
      manifest.binaries[platform] = {
        filename: filename,
        sha256: null,
        size: null,
        build_date: null,
        verified: false,
        missing: true,
        is_primary: true,
        dev_placeholder: true
      };
    }
  }

  manifest.build_summary = {
    total_platforms: Object.keys(expectedBinaries).length,
    binaries_found: foundBinaries,
    placeholders_found: placeholderBinaries,
    binaries_missing: Object.keys(expectedBinaries).length - foundBinaries - placeholderBinaries,
    build_complete: foundBinaries === Object.keys(expectedBinaries).length
  };

  const manifestPath = path.resolve('manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`📄 Development manifest written to ${manifestPath}`);
  console.log(`📊 Summary: ${foundBinaries} real, ${placeholderBinaries} placeholders, ${manifest.build_summary.binaries_missing} missing`);
  
  return manifest;
}

// Validation mode: check existing manifest against actual files
async function validateManifest() {
  console.log('🔍 Validating manifest...');
  
  const manifestPath = path.resolve('manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ manifest.json not found');
    return false;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let allValid = true;

  for (const [platform, binary] of Object.entries(manifest.binaries)) {
    if (binary.missing || binary.dev_placeholder) {
      console.log(`  ⚠️  ${platform}: Development placeholder`);
      continue;
    }

    const binaryPath = path.join(process.cwd(), 'bin', binary.filename);
    if (!fs.existsSync(binaryPath)) {
      console.log(`  ❌ ${platform}: Binary not found: ${binary.filename}`);
      allValid = false;
      continue;
    }

    const actualHash = sha256File(binaryPath);
    if (actualHash !== binary.sha256) {
      console.log(`  ❌ ${platform}: Hash mismatch!`);
      allValid = false;
    } else {
      console.log(`  ✅ ${platform}: ${binary.filename} verified`);
    }
  }

  console.log(allValid ? '🎉 Validation passed!' : '❌ Validation failed!');
  return allValid;
}

// CI mode: update specific platform entry
async function updatePlatformEntry(platform, binaryPath) {
  console.log(`🔄 Updating manifest for ${platform}...`);
  
  const resolvedBinaryPath = path.resolve(binaryPath);
  if (!fs.existsSync(resolvedBinaryPath)) {
    console.error(`❌ Binary file not found: ${resolvedBinaryPath}`);
    process.exit(1);
  }

  const manifestPath = path.resolve('manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ manifest.json not found in: ${process.cwd()}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  
  // Find platform entry
  if (!manifest.binaries || !manifest.binaries[platform]) {
    console.error(`❌ No entry for platform "${platform}" in manifest.json`);
    console.error(`Available platforms: ${Object.keys(manifest.binaries || {}).join(', ')}`);
    process.exit(1);
  }

  // Calculate hash and get file stats
  const hash = sha256File(resolvedBinaryPath);
  const stats = fs.statSync(resolvedBinaryPath);
  
  // Update platform entry
  manifest.binaries[platform].sha256 = hash;
  manifest.binaries[platform].verified = true;
  manifest.binaries[platform].size = stats.size;
  manifest.binaries[platform].build_date = stats.mtime.toISOString();
  manifest.binaries[platform].last_updated = new Date().toISOString();
  
  // Remove development flags
  delete manifest.binaries[platform].dev_placeholder;
  delete manifest.binaries[platform].missing;

  // Update global manifest metadata
  manifest.build_date = new Date().toISOString();
  manifest.build_commit = process.env.GITHUB_SHA || tryGetGitCommit();

  // Write updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`✅ Updated manifest.json for ${platform}`);
  console.log(`   SHA256: ${hash}`);
  console.log(`   Size: ${Math.round(stats.size/1024/1024)}MB (${stats.size} bytes)`);
  console.log(`   File: ${path.basename(resolvedBinaryPath)}`);
  
  return { platform, hash, size: stats.size };
}

async function main() {
  const args = getArgs();
  
  if (args.help) {
    console.log(`
📋 MCP Prompt Optimizer - Manifest Generator

Usage:
  CI Mode (update specific platform):
    node secure-update/generate-manifest.js --platform <platform> --binary <path>
    
  Development Mode (scan all binaries):
    node secure-update/generate-manifest.js --dev-mode
    
  Validation Mode:
    node secure-update/generate-manifest.js --validate

Examples:
  node secure-update/generate-manifest.js --platform linux-x64 --binary dist/mcp-optimizer-linux-x64
  node secure-update/generate-manifest.js --dev-mode
  node secure-update/generate-manifest.js --validate
`);
    return;
  }
  
  if (args['dev-mode']) {
    await generateDevManifest();
    return;
  }
  
  if (args.validate) {
    const isValid = await validateManifest();
    process.exit(isValid ? 0 : 1);
    return;
  }
  
  // CI mode: update specific platform
  const { platform, binary } = args;
  if (!platform || !binary) {
    console.error('❌ Missing required arguments for CI mode.');
    console.error('Usage: node secure-update/generate-manifest.js --platform <platform> --binary <path-to-binary>');
    console.error('   or: node secure-update/generate-manifest.js --dev-mode');
    console.error('   or: node secure-update/generate-manifest.js --validate');
    process.exit(1);
  }
  
  await updatePlatformEntry(platform, binary);
}

main().catch(err => {
  console.error('💥 Error generating manifest:', err.message);
  process.exit(1);
});

module.exports = { updatePlatformEntry, generateDevManifest, validateManifest };