# 🌍 MCP Prompt Optimizer Local - Cross-Platform Edition

Advanced Local Prompt Intelligence Engine with complete privacy and sophisticated content analysis. Now with **universal cross-platform support** for Windows, macOS, and Linux.

## 🚀 Quick Start

### 1. Get Your API Key
Visit [https://promptoptimizer-blog.vercel.app/local-license](https://promptoptimizer-blog.vercel.app/local-license) to get your API key.

### 2. Set Your API Key
```bash
# Option 1: Environment variable (recommended)
export OPTIMIZER_API_KEY="your-key-here"

# Option 2: Add to shell profile
echo 'export OPTIMIZER_API_KEY="your-key-here"' >> ~/.bashrc
source ~/.bashrc
```

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

- **🔑 API Key Authentication** - Prevents unauthorized usage
- **🔍 Binary Integrity Verification** - SHA256 hash validation
- **🚪 Multi-Gate Installation** - Four-layer security validation
- **🏠 100% Local Processing** - Complete privacy, no data collection
- **🛡️ Tamper Detection** - Detects modified or corrupted binaries

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

### From v3.0.x
```bash
# Seamless upgrade - no breaking changes
npm update -g mcp-prompt-optimizer-local

# Verify upgrade
mcp-prompt-optimizer-local --version  # Should show 3.1.0
```

### From v2.x
```bash
# Update environment variable name
# Old: MCP_LICENSE_KEY
# New: OPTIMIZER_API_KEY
export OPTIMIZER_API_KEY="$MCP_LICENSE_KEY"

# Install new version
npm install -g mcp-prompt-optimizer-local
```

## 📚 Documentation

- **📖 Full Documentation**: [https://promptoptimizer-blog.vercel.app/docs](https://promptoptimizer-blog.vercel.app/docs)
- **🌍 Cross-Platform Guide**: [CROSS-PLATFORM.md](./CROSS-PLATFORM.md)
- **📝 Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **🏗️ Implementation Details**: [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)

## 🆘 Support

- **🐛 Issues**: [GitHub Issues](https://github.com/nivlewd1/mcp-prompt-optimizer-local/issues)
- **📧 Email**: support@promptoptimizer.help
- **💬 Discussions**: [GitHub Discussions](https://github.com/nivlewd1/mcp-prompt-optimizer-local/discussions)

## 🏆 What's New in v3.1.0

### 🌍 Cross-Platform Support
- ✅ **macOS Intel & Apple Silicon** - Native binaries for all Mac architectures
- ✅ **Linux x64 & ARM64** - Universal Linux support including Raspberry Pi
- ✅ **Automatic Downloads** - Missing binaries fetched from GitHub releases
- ✅ **Enhanced Security** - Multi-platform integrity verification

### 🚀 CI/CD Automation
- ✅ **GitHub Actions Pipeline** - Automated builds for all platforms
- ✅ **Release Automation** - Automatic releases with verified binaries
- ✅ **Quality Assurance** - Comprehensive testing across platforms

### 🛡️ Security Enhancements
- ✅ **Binary Integrity** - SHA256 verification for all platforms
- ✅ **Download Security** - Verified downloads from GitHub releases
- ✅ **Multi-Gate Validation** - Enhanced installation security

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

</div>