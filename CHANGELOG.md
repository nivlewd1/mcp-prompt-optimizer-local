# Changelog

All notable changes to MCP Prompt Optimizer Local will be documented in this file.

## [3.1.0] - 2025-08-12

### 🌍 Cross-Platform Support Release

**NEW PLATFORM SUPPORT:**
- **macOS Intel (x64)** - Full support for Intel-based Macs with native binary
- **macOS Apple Silicon (ARM64)** - Full support for M1, M2, M3+ Macs with native ARM binary  
- **Linux x64** - Full support for 64-bit Linux distributions
- **Linux ARM64** - Full support for ARM64 Linux (Raspberry Pi, ARM servers)
- **Universal Installation** - Single `npm install` command works across all platforms

### 🏗️ Enhanced Infrastructure
- **GitHub Actions CI Pipeline** - Automated cross-platform binary builds
- **Advanced Manifest Generation** - SHA256 verification for all platform binaries
- **Intelligent Platform Detection** - Automatic architecture and OS detection
- **Development Mode Support** - Placeholder binaries for development workflow

### ✅ Added
- **Cross-Platform Binary Manager** (`lib/binary-manager.js` enhanced) - Intelligent binary selection across platforms
- **Multi-Platform Manifest Generator** (`secure-update/generate-manifest.js`) - Automated manifest creation with integrity hashes
- **Enhanced Security Validation** (`lib/binary-integrity-verifier.js` updated) - Multi-platform binary verification
- **CI/CD Pipeline** (`.github/workflows/build-binaries.yml`) - Automated builds for Windows, macOS, and Linux
- **Platform-Specific Metadata** - Detailed platform support information in package.json
- **Development Placeholders** - Temporary binaries for local development and testing

### 🔧 Enhanced
- **Security Validation** - Now verifies binaries across all supported platforms
- **Installation Process** - Automatic platform detection and binary selection
- **Error Messages** - Platform-specific troubleshooting guidance
- **Binary Integrity** - SHA256 verification for each platform's binary
- **Package Metadata** - Rich platform support information and capabilities

### 🚀 New NPM Scripts
- `npm run generate-manifest` - Generate production manifest with all platform hashes
- `npm run generate-manifest-dev` - Generate development manifest with placeholder support
- `npm run validate-manifest` - Validate existing manifest integrity
- `npm run build-ci` - CI-specific build command for automated pipelines

### 🌐 Platform Support Matrix
| Platform | Architecture | Binary Name | Status |
|----------|-------------|-------------|---------|
| Windows | x64 | `mcp-optimizer-windows-x64.exe` | ✅ Production Ready |
| macOS | Intel x64 | `mcp-optimizer-macos-x64` | 🚀 New in v3.1.0 |
| macOS | Apple Silicon | `mcp-optimizer-macos-arm64` | 🚀 New in v3.1.0 |
| Linux | x64 | `mcp-optimizer-linux-x64` | 🚀 New in v3.1.0 |
| Linux | ARM64 | `mcp-optimizer-linux-arm64` | 🚀 New in v3.1.0 |

### 🛡️ Security Enhancements
- **Multi-Platform Verification** - Binary integrity checking across all platforms
- **Architecture Detection** - Automatic CPU architecture identification (x64, ARM64)
- **Platform-Specific Validation** - Tailored security checks for each operating system
- **Development Mode Detection** - Safe handling of placeholder binaries during development

### 🔄 CI/CD Automation
- **Automated Binary Builds** - GitHub Actions builds real binaries for all platforms
- **Cross-Platform Testing** - Automated testing on Windows, macOS, and Linux runners
- **Integrity Verification** - Automatic SHA256 hash generation and validation
- **Artifact Management** - Secure binary distribution and version management

### 💡 Maintained
- **All Core Functionality** - Zero breaking changes to existing optimization features
- **Security Standards** - All v3.0.1 security features preserved and enhanced
- **Backward Compatibility** - Existing Windows users seamlessly upgrade
- **Performance** - No performance impact from multi-platform support
- **Privacy Features** - 100% local processing maintained across all platforms

### 📋 Migration Notes
- **Existing Users** - Seamless upgrade, all functionality preserved
- **New macOS Users** - Install works immediately with `npm install -g mcp-prompt-optimizer-local`
- **New Linux Users** - Full support with automatic architecture detection
- **Developers** - Use `--dev-mode` flag for development with placeholder binaries
- **CI/CD** - GitHub Actions automatically builds and validates all platform binaries

### 🧪 Testing & Validation
- **Comprehensive Test Suite** - 8 security tests covering all platforms
- **Cross-Platform Validation** - Automated testing on all supported platforms
- **Binary Integrity Testing** - SHA256 verification for all binaries
- **Installation Testing** - Complete installation flow validation

### 🚀 Future Roadmap Enabled
- **Container Support** - Foundation for Docker and Kubernetes deployments
- **Package Managers** - Future support for Homebrew, apt, yum
- **Cloud Deployments** - Infrastructure for cloud-native deployments
- **Enterprise Features** - Multi-platform enterprise deployment capabilities

## [3.0.1] - 2025-08-12

### 🔐 Security Enhancement Release

**NEW SECURITY FEATURES:**
- **API Key Authentication** - Installation now requires valid API key to prevent unauthorized usage
- **Binary Integrity Verification** - SHA256 hash validation ensures binaries haven't been tampered with
- **Multi-Gate Security Installation** - Four-layer validation during npm install (API key, binary integrity, platform compatibility, permissions)
- **Tamper Detection** - Detects and prevents execution of modified or corrupted binaries

### ✅ Added
- **Enhanced API Key Validation** (`lib/enhanced-api-key-check.js`) - Support for multiple key sources (env, config, .env file)
- **Binary Integrity Verifier** (`lib/binary-integrity-verifier.js`) - SHA256 verification with detailed error reporting
- **Secure Post-Install Handler** (`secure-postinstall.js`) - Multi-gate security validation during installation
- **Binary Manifest System** (`manifest.json`) - Integrity hashes and metadata for all binaries
- **Security Metadata** - Package metadata indicating security features and requirements

### 🔧 Enhanced
- **Installation Security** - Four security gates that must pass: API key validation, binary integrity, platform compatibility, permission verification
- **Error Messages** - Comprehensive troubleshooting guidance with multiple solution paths
- **User Experience** - Clear success/failure messages with actionable next steps
- **Developer Experience** - New `verify-security` npm script for validation

### 🛡️ Security Improvements
- **Fail-Safe Installation** - Installation aborts immediately on any security failure
- **Multiple API Key Sources** - Environment variables, config files, and .env file support
- **Key Format Validation** - Strong validation with entropy checking and test key detection
- **Comprehensive Logging** - Detailed security validation logs for troubleshooting

### 🐛 Fixed
- **Mega Prompt Context Detection** - Improved handling of very large prompts (>10k characters)
- **Simplicity Enum Handling** - Better parameter preservation in optimization requests  
- **Hybrid LLM Optimization** - Enhanced AI model integration with fallback mechanisms
- **Universal Parameter Preservation** - Maintains technical details across all content types

### 💡 Maintained
- **All Core Functionality** - Zero breaking changes to existing optimization features
- **Backward Compatibility** - Existing users with valid API keys seamlessly upgrade
- **Privacy Features** - 100% local processing maintained
- **Performance** - No performance impact from security enhancements
- **MCP Protocol Compliance** - Full compatibility with MCP 2024-11-05 specification

### 📋 Migration Notes
- **Existing Users** - Automatic upgrade, existing `OPTIMIZER_API_KEY` continues to work
- **New Users** - Must set `OPTIMIZER_API_KEY` before installation
- **Enterprise** - Contact support@promptoptimizer.help for bulk licensing

## [3.0.0] - 2025-07-30

### 🚀 Major Simplification Release

**BREAKING CHANGES:**
- Simplified setup process - now requires single environment variable `OPTIMIZER_API_KEY`
- Removed complex auto-discovery system
- Eliminated Basic/Pro tier differences - all features available with any valid license
- Reduced npm scripts from 17 to 6 essential commands

### ✅ Added
- **Simplified License Manager** - Single environment variable validation
- **Streamlined Main Entry Point** - Removed complex automation layers
- **Unified Feature Set** - All features available regardless of license tier
- **Integration Testing** - New test suite for validation
- **Clean Package Structure** - Removed unnecessary complexity

### 🗑️ Removed
- `lib/auto-license.js` - Complex 300+ line auto-discovery system
- `lib/smart-setup.js` - Over-engineered setup automation
- `setup-quick.js` - Multiple setup path confusion
- Complex tier management system
- 11 unnecessary npm scripts

### 🔧 Changed
- **Setup Time**: 2-10 minutes → 2-3 minutes
- **Success Rate**: 70% → 95%+ expected
- **User Steps**: 5-7 manual steps → 2 steps
- **Environment Variables**: Multiple discovery sources → Single `OPTIMIZER_API_KEY`
- **Package Size**: Reduced by removing complex automation code

### 💡 Improved
- **User Experience**: Dramatically simplified setup flow
- **Documentation**: Clear, focused instructions
- **Error Messages**: More helpful and actionable
- **Support**: Fewer setup-related issues expected

### 🔒 Maintained
- **All Core Functionality** - Sophisticated optimization capabilities preserved
- **Source Protection** - Compiled components remain protected
- **Privacy Features** - 100% local processing maintained
- **Binary System** - Platform-specific binaries unchanged
- **Template Management** - Save and reuse patterns
- **LLM Integration** - Optional OpenAI integration available

## [2.0.5] - Previous Release

### Features (Pre-Simplification)
- Complex auto-discovery system
- Multiple license discovery methods
- Tiered feature system
- Smart setup automation
- 17+ npm scripts
- Multiple setup paths

---

**Migration Guide v3.0.1 → v3.1.0:**
- **No breaking changes** - Seamless upgrade with enhanced cross-platform support
- **New Platforms** - macOS and Linux users can now install and use the tool
- **Enhanced CI/CD** - Automated builds ensure all platforms have verified binaries
- **Development Workflow** - New scripts for manifest generation and validation

**Migration Guide v3.0.0 → v3.1.0:**
- **No breaking changes** - All existing functionality preserved
- **Enhanced Security** - Multi-platform binary verification
- **Broader Compatibility** - Works on Windows, macOS, and Linux
- **Improved Developer Experience** - Better tooling and CI/CD integration

**Migration Guide v2.0.5 → v3.1.0:**
1. **Environment Variable**: Change from `MCP_LICENSE_KEY` to `OPTIMIZER_API_KEY`
2. **Commands**: Use simplified command set (8 scripts instead of 17)
3. **Setup**: Follow new 2-step setup process with automatic platform detection
4. **Features**: All features available with any valid license + security + cross-platform support

**Compatibility**: All existing license keys continue to work with enhanced security and cross-platform support.