# Contributing to MCP Prompt Optimizer Local

Thank you for your interest in contributing to the Local Edition of MCP Prompt Optimizer! We welcome contributions that help improve our local optimization rules and cross-platform support.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Rule Improvements

The heart of the local edition is the `lib/optimization-rules.js` engine. You can contribute by:
- Suggesting new optimization rules for specific domains.
- Refining existing regex patterns for better accuracy.
- Improving the prose quality of optimization templates.

### Bug Reports

If you find a bug, especially regarding cross-platform binary execution, please open an issue with:
- Your OS and architecture (e.g., macOS Sonoma, M2 chip).
- The exact error message.
- Steps to reproduce.

### Pull Requests

1. **Fork the repository** and create your branch from `main`.
2. **Install dependencies**: `npm install`
3. **Make your changes**: Ensure your code follows the existing style.
4. **Test your changes**: Run `npm test` and `node test-determinism.js`.
5. **Submit a Pull Request**: Provide a clear description of the changes.

## Development Setup

```bash
git clone https://github.com/mcp-prompt-optimizer/local-npm.git
cd local-npm
npm install
```

### Running Tests

- `npm test`: Basic functionality check.
- `node test-determinism.js`: Verifies that optimizations are consistent and meet expansion requirements.
- `node test-authentication.js`: Verifies API key and quota logic.

## Security

For security vulnerabilities, please email support@promptoptimizer.xyz. Do not open public issues for security-related items.

## License

By contributing, you agree that your contributions will be licensed under the project's [LICENSE](LICENSE).
