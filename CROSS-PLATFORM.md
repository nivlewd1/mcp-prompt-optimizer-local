# 🌍 Cross-Platform Installation Guide

## Platform Support Matrix

MCP Prompt Optimizer Local v3.1.0+ supports all major platforms with native binaries:

| Platform | Architecture | Status | Installation Command |
|----------|-------------|--------|---------------------|
| 🪟 **Windows** | x64 | ✅ Production Ready | `npm install -g mcp-prompt-optimizer-local` |
| 🍎 **macOS** | Intel (x64) | ✅ Full Support | `npm install -g mcp-prompt-optimizer-local` |
| 🍎 **macOS** | Apple Silicon (M1/M2/M3+) | ✅ Full Support | `npm install -g mcp-prompt-optimizer-local` |
| 🐧 **Linux** | x64 | ✅ Full Support | `npm install -g mcp-prompt-optimizer-local` |
| 🐧 **Linux** | ARM64 | ✅ Full Support | `npm install -g mcp-prompt-optimizer-local` |

## Quick Start (Any Platform)

1. **Get your API key**: Visit [https://promptoptimizer-blog.vercel.app/local-license](https://promptoptimizer-blog.vercel.app/local-license)

2. **Set your API key**:
   ```bash
   # Option 1: Environment variable (recommended)
   export OPTIMIZER_API_KEY="your-key-here"
   
   # Option 2: Add to your shell profile (.bashrc, .zshrc, etc.)
   echo 'export OPTIMIZER_API_KEY="your-key-here"' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Install globally**:
   ```bash
   npm install -g mcp-prompt-optimizer-local
   ```

4. **Verify installation**:
   ```bash
   mcp-prompt-optimizer-local --version
   mcp-prompt-optimizer-local check-license
   ```

## Platform-Specific Notes

### 🍎 macOS Installation

**Intel Macs** and **Apple Silicon** are both fully supported with native binaries.

```bash
# Set API key
export OPTIMIZER_API_KEY="your-key-here"

# Install
npm install -g mcp-prompt-optimizer-local

# The installer automatically detects your Mac architecture
# Intel Macs get: mcp-optimizer-macos-x64
# Apple Silicon gets: mcp-optimizer-macos-arm64
```

**macOS Security**: On first run, you may see a security dialog. This is normal for new binaries. Click "Allow" or go to System Preferences > Security & Privacy to allow the binary.

### 🐧 Linux Installation

Works on **all major Linux distributions** with automatic architecture detection.

```bash
# Set API key
export OPTIMIZER_API_KEY="your-key-here"

# Install
npm install -g mcp-prompt-optimizer-local

# Supports both x64 and ARM64 (Raspberry Pi, ARM servers)
```

**Linux Permissions**: The installer automatically sets executable permissions (`chmod +x`) for the binary. If you encounter permission issues, run:

```bash
sudo chmod +x ~/.npm-global/lib/node_modules/mcp-prompt-optimizer-local/bin/mcp-optimizer-linux-*
```

**Tested Distributions**:
- Ubuntu 20.04+
- Debian 11+
- CentOS 8+
- RHEL 8+
- Fedora 35+
- Arch Linux
- Alpine Linux
- Raspberry Pi OS

### 🪟 Windows Installation

Windows support has been available since v3.0.0 and continues to work perfectly.

```cmd
:: Set API key (Command Prompt)
set OPTIMIZER_API_KEY=your-key-here

:: Set API key (PowerShell)
$env:OPTIMIZER_API_KEY="your-key-here"

:: Install
npm install -g mcp-prompt-optimizer-local
```

## Troubleshooting Cross-Platform Issues

### Architecture Detection
```bash
# Check what platform was detected
mcp-prompt-optimizer-local check-license

# View detailed platform information
node -e "console.log('Platform:', process.platform, 'Arch:', process.arch)"
```

### Binary Verification
```bash
# Verify all binaries are properly installed
npm run verify-security

# Check specific platform binary
ls -la ~/.npm-global/lib/node_modules/mcp-prompt-optimizer-local/bin/
```

### Permission Issues (macOS/Linux)
```bash
# Fix permissions manually if needed
chmod +x ~/.npm-global/lib/node_modules/mcp-prompt-optimizer-local/bin/mcp-optimizer-*

# Or use npm's global directory
chmod +x $(npm root -g)/mcp-prompt-optimizer-local/bin/mcp-optimizer-*
```

### Path Issues
```bash
# Check if global npm bin is in PATH
npm config get prefix

# Add to PATH if needed (add to ~/.bashrc or ~/.zshrc)
export PATH=$PATH:$(npm config get prefix)/bin
```

## Configuration Options

### API Key Sources (Priority Order)
1. **Environment Variable**: `OPTIMIZER_API_KEY`
2. **User Config File**: `~/.mcp_optimizer/config.json`
3. **Project .env File**: `.env` in current directory

### Example Config File
```json
{
  "apiKey": "your-key-here",
  "version": "3.1.0",
  "installation_date": "2025-08-12T15:30:00.000Z",
  "features_enabled": [
    "local_processing",
    "template_management",
    "cross_platform_support"
  ]
}
```

## Development Setup

For developers working on the package:

```bash
# Clone the repository
git clone https://github.com/prompt-optimizer/mcp-prompt-optimizer-local.git
cd mcp-prompt-optimizer-local

# Install dependencies
npm install

# Generate development manifest (includes placeholders)
npm run generate-manifest-dev

# Run security tests
npm test

# Validate manifest
npm run validate-manifest
```

## CI/CD Integration

The package uses GitHub Actions to build binaries for all platforms:

```yaml
# Example GitHub Actions integration
- name: Install MCP Prompt Optimizer
  run: |
    export OPTIMIZER_API_KEY="${{ secrets.OPTIMIZER_API_KEY }}"
    npm install -g mcp-prompt-optimizer-local
    mcp-prompt-optimizer-local check-license
```

## Enterprise Deployment

For enterprise environments with multiple platforms:

### Centralized Configuration
```bash
# Create organization-wide config
mkdir -p /etc/mcp-optimizer
echo '{"apiKey": "org-key-here"}' > /etc/mcp-optimizer/config.json

# Or use environment variables in deployment
export OPTIMIZER_API_KEY="org-key-here"
```

### Docker Support
```dockerfile
FROM node:18-alpine

# Install global package
RUN npm install -g mcp-prompt-optimizer-local

# Set API key
ENV OPTIMIZER_API_KEY="your-key-here"

# Verify installation
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
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-optimizer
spec:
  template:
    spec:
      containers:
      - name: app
        image: node:18
        envFrom:
        - secretRef:
            name: mcp-optimizer-key
        command:
        - sh
        - -c
        - |
          npm install -g mcp-prompt-optimizer-local
          mcp-prompt-optimizer-local check-license
```

## Support & Community

- **GitHub Issues**: [Report platform-specific issues](https://github.com/prompt-optimizer/mcp-prompt-optimizer-local/issues)
- **Email Support**: support@promptoptimizer.help
- **Documentation**: [https://promptoptimizer-blog.vercel.app/docs](https://promptoptimizer-blog.vercel.app/docs)

### Reporting Platform Issues

When reporting issues, please include:

```bash
# Run this command and include output
node -e "
console.log('Platform Info:');
console.log('  OS:', process.platform);
console.log('  Arch:', process.arch);
console.log('  Node:', process.version);
console.log('  NPM:', require('child_process').execSync('npm --version', {encoding: 'utf8'}).trim());
"

# Also include this if installation completed
mcp-prompt-optimizer-local check-license
npm run verify-security
```

---

🎉 **Cross-platform support is here!** MCP Prompt Optimizer Local now works seamlessly on Windows, macOS, and Linux with automatic architecture detection and native performance.