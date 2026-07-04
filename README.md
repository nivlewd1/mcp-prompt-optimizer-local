# 🌍 MCP Prompt Optimizer Local - Cross-Platform Edition

[![NPM Version](https://img.shields.io/npm/v/mcp-prompt-optimizer-local)](https://www.npmjs.com/package/mcp-prompt-optimizer-local)
[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)
[![Security Policy](https://img.shields.io/badge/security-policy-green.svg)](SECURITY.md)
[![Snyk Health](https://snyk.io/advisor/npm-package/mcp-prompt-optimizer-local/badge.svg)](https://snyk.io/advisor/npm-package/mcp-prompt-optimizer-local)

Advanced Local Prompt Intelligence Engine with complete privacy and sophisticated content analysis. Now with **universal cross-platform support** for Windows, macOS, and Linux.


## 🚀 Quick Start

### 1. Get Your API Key (REQUIRED)

**⚠️ Important:** An API key is REQUIRED to use this package. Choose your tier:

- **🆓 FREE Tier** (`sk-local-basic-*`): 5 daily optimizations, perfect for testing
- **⭐ PRO Tier** (`sk-local-pro-*`): Unlimited optimizations, best for production

Visit [https://promptoptimizer.xyz/local-license](https://promptoptimizer.xyz/local-license) to get your API key.

### 2. Set Your API Key
```bash
# Option 1: Environment variable (recommended)
export OPTIMIZER_API_KEY="sk-local-basic-your-key-here"

# Option 2: Add to shell profile (persistent)
echo 'export OPTIMIZER_API_KEY="sk-local-basic-your-key-here"' >> ~/.bashrc
source ~/.bashrc
```

> **Note:** Without a valid API key, the package will not work. All API keys are validated against our backend server for security.

### 3. Install Globally
```bash
npm install -g mcp-prompt-optimizer-local
```

### 4. Verify Installation
```bash
mcp-prompt-optimizer-local --version
mcp-prompt-optimizer-local check-license
```

## 🌍 Platform Support

| Platform | Architecture | Status | Auto-Install |
|----------|-------------|--------|--------------|
| 🪟 **Windows** | x64 | ✅ Production Ready | ✅ |
| 🍎 **macOS** | Intel (x64) | ✅ Full Support | ✅ |
| 🍎 **macOS** | Apple Silicon (M1/M2/M3+) | ✅ Full Support | ✅ |
| 🐧 **Linux** | x64 | ✅ Full Support | ✅ |
| 🐧 **Linux** | ARM64 | ✅ Full Support | ✅ |

**Single command works everywhere!** The installer automatically:
- Detects your platform and architecture
- Downloads the correct native binary
- Verifies integrity with SHA256 checksums
- Sets proper permissions and validates installation

## 🛡️ Security Features

- **🔑 Backend API Key Validation** - All keys validated against server (no bypasses)
- **📊 Server-Side Quota Enforcement** - Usage limits tracked in database
- **🔒 Required Authentication** - No anonymous usage permitted
- **🔍 Binary Integrity Verification** - SHA256 hash validation
- **🚪 Multi-Gate Installation** - Four-layer security validation
- **🏠 100% Local Processing** - Complete privacy, no prompt data collection
- **🛡️ Tamper Detection** - Detects modified or corrupted binaries

> **Security Update:** As of v4.0.0, all API keys require backend validation. Client-side bypasses have been eliminated for enhanced security.

## 🎯 Key Features

- **🧠 Intelligent Content Analysis** - Advanced prompt optimization
- **🔧 Technical Parameter Preservation** - Maintains code and technical details
- **🐛 Debugging Scenario Detection** - Context-aware optimization
- **📝 Template Management** - Save and reuse optimization patterns
- **🤖 LLM Integration** - Optional OpenAI integration
- **⚡ Performance Optimized** - <2s startup, <500ms per optimization

## 📖 Usage Examples

### Basic Optimization
```bash
# Start MCP server
mcp-prompt-optimizer-local

# Check license status
mcp-prompt-optimizer-local check-license

# Show help
mcp-prompt-optimizer-local help
```

### Configuration Options

#### API Key Sources (Priority Order)
1. **Environment Variable**: `OPTIMIZER_API_KEY`
2. **User Config File**: `~/.mcp_optimizer/config.json`
3. **Project .env File**: `.env` in current directory

#### Example Config File
```json
{
  "apiKey": "your-key-here",
  "version": "3.1.0",
  "features_enabled": [
    "local_processing",
    "template_management",
    "cross_platform_support"
  ]
}
```

## 🔧 Platform-Specific Notes

### 🍎 macOS
- **Security**: First run may show security dialog - click "Allow"
- **Architectures**: Automatic detection of Intel vs Apple Silicon
- **Permissions**: Installer sets executable permissions automatically

### 🐧 Linux
- **Distributions**: Tested on Ubuntu, Debian, CentOS, Fedora, Arch
- **ARM64**: Full support for Raspberry Pi and ARM servers
- **Permissions**: Automatic `chmod +x` during installation

### 🪟 Windows
- **Versions**: Windows 10, 11, Server 2019/2022
- **Architecture**: x64 support with native binary
- **Antivirus**: May require approval for new binary execution

## 🚨 Troubleshooting

### API Key Issues

**Error: "API key required"**
```bash
# Get a free API key at:
# https://promptoptimizer.xyz/local-license

# Set the API key
export OPTIMIZER_API_KEY="sk-local-basic-your-key-here"

# Verify it's set
echo $OPTIMIZER_API_KEY
```

**Error: "Invalid API key"**
- Ensure key starts with `sk-local-basic-` or `sk-local-pro-`
- Check for typos or extra spaces
- Verify key hasn't been revoked

**Error: "Daily optimization limit reached"**
- Free tier allows 5 daily optimizations
- Limit resets every 24 hours
- Upgrade to Pro for unlimited: https://promptoptimizer.xyz/pricing

### Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall package
npm uninstall -g mcp-prompt-optimizer-local
npm install -g mcp-prompt-optimizer-local

# Check platform detection
node -e "console.log('Platform:', process.platform, 'Arch:', process.arch)"
```

### Binary Issues
```bash
# Verify security components
npm run verify-security

# Check binary integrity
npm run validate-manifest

# Manual download (if automatic fails)
# Binaries available at: https://github.com/nivlewd1/mcp-prompt-optimizer-local/releases
```

### Permission Issues (macOS/Linux)
```bash
# Fix permissions manually
chmod +x ~/.npm-global/lib/node_modules/mcp-prompt-optimizer-local/bin/mcp-optimizer-*
```

## 🏢 Enterprise Deployment

### Docker Support
```dockerfile
FROM node:18-alpine
RUN npm install -g mcp-prompt-optimizer-local
ENV OPTIMIZER_API_KEY="your-key-here"
RUN mcp-prompt-optimizer-local check-license
```

### Kubernetes Deployment
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mcp-optimizer-key
type: Opaque
stringData:
  OPTIMIZER_API_KEY: "your-key-here"
```

### CI/CD Integration
```yaml
- name: Install MCP Optimizer
  run: |
    export OPTIMIZER_API_KEY="${{ secrets.OPTIMIZER_API_KEY }}"
    npm install -g mcp-prompt-optimizer-local
    mcp-prompt-optimizer-local check-license
```

## 🔄 Migration from Previous Versions

### ⚠️ From v3.x to v4.0.0 (BREAKING CHANGES)

**IMPORTANT:** v4.0.0 requires an API key. Previous versions allowed usage without keys.

```bash
# Step 1: Get your FREE API key (5 daily optimizations)
# Visit: https://promptoptimizer.xyz/local-license

# Step 2: Set your API key
export OPTIMIZER_API_KEY="sk-local-basic-your-key-here"

# Step 3: Upgrade
npm update -g mcp-prompt-optimizer-local

# Step 4: Verify upgrade
mcp-prompt-optimizer-local --version  # Should show 4.0.0
mcp-prompt-optimizer-local check-license  # Should validate your key
```

**Breaking Changes in v4.0.0:**
- ❌ No longer works without API key
- ❌ Free tier bypass removed
- ✅ All users must have valid API key (free or paid)
- ✅ Free tier: 5 daily optimizations
- ✅ Pro tier: unlimited optimizations

### From v2.x
```bash
# Step 1: Get API key at https://promptoptimizer.xyz/local-license

# Step 2: Set API key (replaces old license key)
export OPTIMIZER_API_KEY="sk-local-basic-your-key-here"

# Step 3: Install new version
npm install -g mcp-prompt-optimizer-local
```

## 📚 Documentation

- **📖 Full Documentation**: [https://promptoptimizer-blog.vercel.app/docs](https://promptoptimizer-blog.vercel.app/docs)
- **🌍 Cross-Platform Guide**: [CROSS-PLATFORM.md](./CROSS-PLATFORM.md)
- **📝 Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **🏗️ Implementation Details**: [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)

## 🛠️ Support & Resources

- 📖 **Full Documentation**: [promptoptimizer-blog.vercel.app/docs](https://promptoptimizer-blog.vercel.app/docs)
- 🚀 **License & API Keys**: [promptoptimizer-blog.vercel.app/local-license](https://promptoptimizer.xyz/local-license)
- 🔒 **Security Policy**: [SECURITY.md](SECURITY.md)
- 🤝 **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- 📜 **Code of Conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- 📝 **Changelog**: [CHANGELOG.md](CHANGELOG.md)
- 🐛 **Issues**: [GitHub Issues](https://github.com/mcp-prompt-optimizer/local-npm/issues)
- 📧 **Email**: support@promptoptimizer.xyz


## 🏆 What's New in v4.0.0

### 🔒 Security Enhancements (v4.0.0 - BREAKING CHANGES)
- ✅ **Backend API Key Validation** - All keys validated against server
- ✅ **Server-Side Quota Enforcement** - Usage tracked in database (no client-side bypasses)
- ✅ **Required Authentication** - API key mandatory for all operations
- ✅ **Free Tier Support** - 5 daily optimizations with `sk-local-basic-*` keys
- ✅ **Pro Tier Support** - Unlimited optimizations with `sk-local-pro-*` keys
- ✅ **Eliminated Bypasses** - All authentication bypasses removed
- ✅ **Comprehensive Testing** - 7 security tests ensure proper enforcement

### 🌍 Cross-Platform Support (v3.1.0)
- ✅ **macOS Intel & Apple Silicon** - Native binaries for all Mac architectures
- ✅ **Linux x64 & ARM64** - Universal Linux support including Raspberry Pi
- ✅ **Automatic Downloads** - Missing binaries fetched from GitHub releases
- ✅ **Enhanced Security** - Multi-platform integrity verification

### 🚀 CI/CD Automation
- ✅ **GitHub Actions Pipeline** - Automated builds for all platforms
- ✅ **Release Automation** - Automatic releases with verified binaries
- ✅ **Quality Assurance** - Comprehensive testing across platforms

## 📊 Technical Specifications

- **Node.js**: >=16.0.0
- **npm**: >=8.0.0
- **Binary Size**: ~15-20MB per platform
- **Memory Usage**: <100MB typical
- **Startup Time**: <2 seconds
- **Optimization Speed**: <500ms per request

## 🎉 Success Stories

> *"Finally works on my M2 MacBook! The installation was seamless and performance is excellent."* - **macOS User**

> *"Perfect for our Linux ARM64 servers. Auto-detection worked flawlessly."* - **DevOps Engineer**

> *"Love the enhanced security features. Enterprise deployment was straightforward."* - **Security Architect**

---

**Ready to optimize prompts on any platform? Install now and experience the future of cross-platform prompt intelligence!** 🚀

## 🏷️ License

MIT License - see [LICENSE](./LICENSE) for details.

---

<div align="center">

**⭐ Star this repo if you find it useful!**

[🚀 Install Now](https://www.npmjs.com/package/mcp-prompt-optimizer-local) • [📖 Documentation](https://promptoptimizer-blog.vercel.app/docs) • [🌍 Cross-Platform Guide](./CROSS-PLATFORM.md)

</div>.vercel.app/docs) • [🌍 Cross-Platform Guide](./CROSS-PLATFORM.md)

</div>