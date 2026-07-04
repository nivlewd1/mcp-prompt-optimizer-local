# Changelog

All notable changes to the MCP Prompt Optimizer Local package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.4] - 2026-04-13

### Changed
- 📦 **Version Bump**: Incremented version to 4.0.4 to resolve npm publishing conflict with existing v4.0.3 on the registry.
- 🔗 **Link Alignment**: Unified all license and API key signup links to https://promptoptimizer.xyz/local-license.

## [4.0.3] - 2026-04-13

### Changed
- 📦 **Version Bump**: Incremented version to 4.0.3 to resolve npm publishing conflict with existing v4.0.2 on the registry.
- 🛡️ **Health & Documentation**: Finalized professional health documentation and community guidelines.

## [4.0.2] - 2026-04-12

### Added
- 🛡️ **Security Policy**: Added `SECURITY.md` for coordinated vulnerability disclosure.
- 🤝 **Community Guidelines**: Added `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` to foster open-source participation.
- 🤖 **CI/CD Visibility**: Added GitHub Actions workflow for cross-platform binary builds.
- 🏷️ **Snyk Health Badges**: Added professional health and status badges to `README.md`.

### Changed
- 📝 **Metadata Optimization**: Standardized `package.json` keywords and license strings for better registry visibility.
- 📂 **Package Distribution**: Updated included files list to include new community and security documentation.
- 📄 **Documentation Refresh**: Centralized resource links in README for better developer experience.

## [4.0.1] - 2026-04-09

### Added
- 🔒 **Security Hardening**: Backend API key validation enforced for all users (free and pro).
- 📊 **Server-Side Quota**: Quota tracking moved from local files to backend database to prevent bypasses.
- 🚫 **Bypass Removal**: Eliminated all client-side authentication and quota bypasses.

## [4.0.0] - 2026-04-01

### Changed (Breaking)
- ⚠️ **API Key Required**: Version 4.0.0 and above require a valid API key for all operations.
- 💰 **New Tiers**: Introduced Free (5/day) and Pro (unlimited) optimization tiers.

## [3.2.0] - 2025-11-02

### 🎉 Added
- **Minimal Input Enhancement Rule** (Priority 10): Transforms minimal/vague inputs like "hi", "hello", "hey" into structured request templates with 175x expansion
- **Debug Template Enhancement Rule** (Priority 9): Provides structured debugging framework for "debug", "fix", "error" requests with 10x expansion
- **Context-Aware Validation System**: Intelligent expansion limits based on content type:
  - Minimal input: 300x (e.g., "hi" → comprehensive template)
  - Image generation: 70x (detailed visual specifications)
  - Creative content: 20x (stories, poems)
  - Technical content: 15x (code, debugging)
  - Business proposals: 200x (comprehensive structure)
- **Deterministic Routing**: Alphabetical tie-breaking ensures identical outputs across multiple runs (eliminates variance)

### 🔧 Changed
- **Goal Threshold**: Lowered from 0.08 to 0.05 for more aggressive optimization and better rule application
- **Rule Selection**: Improved sorting algorithm with 4-level deterministic tie-breaking (priority → score → weight → alphabetical)
- **Validation Logic**: Enhanced per-rule validation with context-specific expansion limits

### 🐛 Fixed
- **Non-Deterministic Behavior**: Eliminated random variance in rule selection (achieved 100% determinism)
- **Minimal Input Handling**: "hi", "hello", "hey" now properly enhanced instead of returned unchanged
- **Debug Request Processing**: "debug my python function" now receives structured template instead of unchanged output
- **Validation Accuracy**: Context-aware limits prevent inappropriate expansions while allowing necessary enhancements

### 📊 Performance
- **100% Determinism**: Identical outputs across multiple runs for all test cases
- **100% Validation Rate**: All 6/6 test scenarios pass expansion requirements (improved from 66.7%)
- **Full Feature Parity**: Complete alignment with Python MCP server behavior
- **Cross-Platform Stable**: All improvements work identically on Windows, macOS, and Linux

### 🎯 Impact
This release achieves full feature parity with the Python MCP server, providing:
- Predictable, consistent optimization results
- Proper handling of minimal inputs (no more unchanged "hi" responses)
- Structured debugging templates for technical requests
- Context-aware validation preventing runaway expansions
- Production-ready reliability with zero variance

## [3.1.1] - 2025-09-15

### 🔧 Fixed
- **NPM Publishing**: Updated version to resolve npm registry version conflict
- **Package Configuration**: Optimized package.json for production deployment
- **Production Security**: Removed development-only scripts from published package

### 📦 Deployment
- **Ready for Production**: All QA checks passed, 100% test suite success
- **Cross-Platform Verified**: All 5 platform binaries tested and verified
- **Zero Dependencies**: Maintains security-first approach with no external dependencies

## [3.1.0] - 2025-09-15

### 🚀 Added
- **Cross-Platform Support**: Native binaries for Windows, macOS (Intel & Apple Silicon), and Linux (x64 & ARM64)
- **Free Tier**: 5 daily optimizations without API key required
- **Enhanced Quota System**: Persistent daily usage tracking with automatic reset
- **Advanced Rules Engine**: 127 optimization rules with context-aware selection
- **MCP Protocol Compliance**: Full Model Context Protocol integration with proper tool schemas
- **Binary Integrity Verification**: SHA256 checksums for all platform binaries
- **Automatic Platform Detection**: Seamless installation across all supported platforms

### 🔧 Enhanced
- **License Manager**: Multi-tier validation (Free/Basic/Pro) with quota enforcement
- **Error Handling**: Comprehensive error scenarios with user-friendly messages
- **Security Validation**: Multi-gate installation process with API key validation
- **Optimization Engine**: Context-aware prompt enhancement with goal alignment
- **Tool Integration**: MCP tools with quota validation and status monitoring

### 🛡️ Security
- **API Key Validation**: Format validation for Basic and Pro tier keys
- **Binary Verification**: SHA256 integrity checking for all downloaded binaries
- **Quota Enforcement**: Daily limits enforced before optimization processing
- **Local Processing**: Complete privacy with no data transmission

### 🌍 Cross-Platform
- **Windows**: x64 support with native .exe binary
- **macOS**: Universal support for Intel (x64) and Apple Silicon (ARM64)
- **Linux**: Support for x64 and ARM64 architectures
- **Automatic Downloads**: Missing binaries fetched from verified GitHub releases
- **CI/CD Pipeline**: Automated builds and releases for all platforms

### 📦 Distribution
- **Zero Dependencies**: No third-party packages for maximum security
- **Universal Installation**: Single `npm install` command works everywhere
- **Bandwidth Optimized**: Platform-specific binary downloads only when needed
- **GitHub Releases**: Verified binaries with checksums available

### 🔄 Migration
- **Backward Compatible**: Seamless upgrade from v3.0.x
- **Environment Variables**: Support for both `OPTIMIZER_API_KEY` and legacy `MCP_LICENSE_KEY`
- **Configuration Migration**: Automatic detection and upgrade of existing configurations

## [3.0.1] - 2025-08-12

### 🐛 Fixed
- Package manifest generation for development environments
- Binary availability checking on different platforms
- Installation security validation edge cases

### 🔧 Improved
- Development mode manifest generation
- Cross-platform binary detection
- Error messaging for missing components

## [3.0.0] - 2025-08-10

### 🚀 Initial Release
- Basic prompt optimization functionality
- Windows x64 binary support
- API key-based licensing
- MCP tool integration foundation
- Local processing engine

### 📝 Features
- Advanced prompt optimization with multiple rules
- Context detection and goal alignment
- Template management system
- Security validation framework

---

## 📋 Version History Summary

| Version | Release Date | Key Features |
|---------|-------------|--------------|
| 3.1.1 | 2025-09-15 | 🔧 Production fixes, npm publishing ready |
| 3.1.0 | 2025-09-15 | 🌍 Cross-platform, 🆓 Free tier, 🔒 Enhanced security |
| 3.0.1 | 2025-08-12 | 🐛 Bug fixes, 🔧 Improvements |
| 3.0.0 | 2025-08-10 | 🚀 Initial release |

## 🔮 Upcoming Features

### v3.2.0 (Planned)
- **Template Marketplace**: Shared optimization templates
- **Performance Analytics**: Detailed optimization metrics
- **Plugin System**: Extensible rule architecture
- **Web Interface**: Optional browser-based configuration

### v3.3.0 (Planned)
- **Cloud Sync**: Optional cloud backup for templates
- **Team Features**: Shared configurations for organizations
- **Advanced Context Detection**: Enhanced AI context recognition
- **Custom Rules Engine**: User-defined optimization rules

---

## 🆘 Support & Migration

For migration assistance or support questions:
- 📧 Email: support@promptoptimizer.help
- 🐛 Issues: [GitHub Issues](https://github.com/mcp-prompt-optimizer/local-npm/issues)
- 📖 Docs: [Documentation](https://promptoptimizer-blog.vercel.app/docs)

## 📜 License

This project is licensed under a Commercial License. See the LICENSE file for details.
