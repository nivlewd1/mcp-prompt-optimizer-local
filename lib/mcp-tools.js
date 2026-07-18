/**
 * MCP Tool Definitions - Complete tool schema matching Python implementation
 * Provides MCP-compatible tool definitions for Claude Desktop integration
 * NOW WITH LICENSE VALIDATION
 */

// MCP Tool Definitions matching Python protocol_handler.py
const MCP_TOOLS = {
    "optimize_prompt": {
        "description": "Optimizes prompt text based on specified goals like clarity, conciseness, and effectiveness. Enhances prompts for better AI model performance.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "The prompt text to optimize."
                },
                "goals": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "Optimization goals (e.g., 'clarity', 'conciseness').",
                    "default": ["clarity"]
                },
                "ai_context": {
                    "type": "string",
                    "enum": [
                        "human-communication",
                        "llm-interaction", 
                        "image-generation",
                        "technical-automation",
                        "structured-output",
                        "code-generation",
                        "api-automation"
                    ],
                    "description": "The context for the AI's task (e.g., generating an image, writing code)."
                },
                "target_ai_model": {
                    "type": "string",
                    "description": "Optional target AI model for optimization.",
                    "enum": ["claude", "gpt", "gemini", "general"]
                }
            },
            "required": ["prompt"]
        }
    },
    "get_quota_status": {
        "description": "Check current license quota status and remaining optimizations",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    "list_saved_templates": {
        "description": "Browse saved prompt optimization templates with optional category filtering",
        "inputSchema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["technical", "business", "creative", "educational", "analytical", "communication", "general"],
                    "description": "Filter templates by category"
                },
                "limit": {
                    "type": "integer",
                    "default": 20,
                    "minimum": 1,
                    "maximum": 100,
                    "description": "Maximum number of templates to return"
                }
            }
        }
    },
    "search_templates": {
        "description": "Search saved templates by content, tags, or metadata with relevance scoring",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query text to match against template content and metadata"
                },
                "category": {
                    "type": "string",
                    "enum": ["technical", "business", "creative", "educational", "analytical", "communication", "general"],
                    "description": "Filter results by category"
                },
                "limit": {
                    "type": "integer",
                    "default": 10,
                    "minimum": 1,
                    "maximum": 50,
                    "description": "Maximum number of results to return"
                }
            },
            "required": ["query"]
        }
    },
    "get_template": {
        "description": "Retrieve a specific template by ID with full metadata and analytics",
        "inputSchema": {
            "type": "object",
            "properties": {
                "template_id": {
                    "type": "string",
                    "description": "Unique template identifier to retrieve"
                },
                "include_metadata": {
                    "type": "boolean",
                    "default": true,
                    "description": "Include enhanced metadata and analytics in response"
                }
            },
            "required": ["template_id"]
        }
    },
    "get_template_stats": {
        "description": "Get comprehensive statistics about saved template collection",
        "inputSchema": {
            "type": "object",
            "properties": {
                "detailed": {
                    "type": "boolean",
                    "default": false,
                    "description": "Include detailed analytics and usage patterns"
                }
            }
        }
    },
    "use_template_as_base": {
        "description": "Start new optimization using an existing template as foundation with optional modifications",
        "inputSchema": {
            "type": "object",
            "properties": {
                "template_id": {
                    "type": "string",
                    "description": "Template ID to use as starting point"
                },
                "modifications": {
                    "type": "string",
                    "description": "Optional additional requirements or modifications to apply"
                },
                "new_goals": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "New optimization goals to apply (overrides template goals if provided)"
                }
            },
            "required": ["template_id"]
        }
    }
};

/**
 * MCP Tool Handler - Handles tool invocations WITH LICENSE VALIDATION
 */
class MCPToolHandler {
    constructor(optimizer, logger = null) {
        this.optimizer = optimizer;
        this.logger = logger || this._createLogger();
        this.templateSystem = new TemplateSystemMock(); // Mock for now
    }

    /**
     * Get list of available tools
     * @param {Object} options - Tool listing options
     * @returns {Object} - MCP tools list response
     */
    async getToolsList(options = {}) {
        const toolsArray = [];
        
        // Always include core optimization tool
        toolsArray.push({
            name: "optimize_prompt",
            description: MCP_TOOLS.optimize_prompt.description,
            inputSchema: MCP_TOOLS.optimize_prompt.inputSchema
        });

        // Always include quota status tool
        toolsArray.push({
            name: "get_quota_status",
            description: MCP_TOOLS.get_quota_status.description,
            inputSchema: MCP_TOOLS.get_quota_status.inputSchema
        });

        // Add template tools if system is available
        const templateToolsEnabled = options.templateToolsEnabled || false;
        if (templateToolsEnabled) {
            for (const [toolName, toolDef] of Object.entries(MCP_TOOLS)) {
                if (toolName !== "optimize_prompt" && toolName !== "get_quota_status") {
                    toolsArray.push({
                        name: toolName,
                        description: toolDef.description,
                        inputSchema: toolDef.inputSchema
                    });
                }
            }
        }

        this.logger.info(`Responding with ${toolsArray.length} available tools`);
        
        return {
            tools: toolsArray
        };
    }

    /**
     * Handle tool invocation
     * @param {string} toolName - Name of tool to invoke
     * @param {Object} toolArguments - Tool arguments
     * @param {string} messageId - Message ID for response
     * @returns {Object} - Tool response
     */
    async handleToolInvoke(toolName, toolArguments, messageId = null) {
        this.logger.info(`Handling tool invoke: '${toolName}' with args:`, toolArguments);

        try {
            switch (toolName) {
                case "optimize_prompt":
                    return await this._handleOptimizePrompt(toolArguments, messageId);
                
                case "get_quota_status":
                    return await this._handleGetQuotaStatus(toolArguments, messageId);
                
                case "list_saved_templates":
                    return await this._handleListTemplates(toolArguments, messageId);
                
                case "search_templates":
                    return await this._handleSearchTemplates(toolArguments, messageId);
                
                case "get_template":
                    return await this._handleGetTemplate(toolArguments, messageId);
                
                case "get_template_stats":
                    return await this._handleTemplateStats(toolArguments, messageId);
                
                case "use_template_as_base":
                    return await this._handleUseTemplateBase(toolArguments, messageId);
                
                default:
                    return this._createErrorResponse({
                        code: -32601,
                        message: `Tool '${toolName}' not found or not available.`
                    }, messageId);
            }
        } catch (error) {
            this.logger.error(`Tool invocation failed for '${toolName}': ${error.message}`);
            return this._createErrorResponse({
                code: -32603,
                message: `Internal error during tool invocation: ${error.constructor.name}`
            }, messageId);
        }
    }

    /**
     * Handle optimize_prompt tool WITH LICENSE VALIDATION
     * @param {Object} params - Tool parameters
     * @param {string} messageId - Message ID
     * @returns {Object} - Tool response
     */
    async _handleOptimizePrompt(params, messageId) {
        const prompt = params.prompt;
        const goals = params.goals || ["clarity"];
        const aiContext = params.ai_context || "llm-interaction";

        this.logger.info(`Executing optimize_prompt: prompt length=${prompt?.length || 0}, goals=[${goals.join(', ')}]`);

        // NEW: License validation before optimization
        if (this.optimizer && this.optimizer.licenseManager) {
            try {
                // validateLicense() is the real method; validateLicenseAndQuota() never existed
                // and threw on every optimize call.
                const licenseResult = await this.optimizer.licenseManager.validateLicense();
                
                if (!licenseResult.valid) {
                    return this._createErrorResponse({
                        code: -32001,
                        message: `License validation failed: ${licenseResult.error}`
                    }, messageId);
                }

                // Check quota for limited users. licenseResult.quota (when present) is the raw
                // backend shape {limit,used,remaining,unlimited} — it has no "allowed"/"resetsAt"
                // fields, so checking those directly always evaluated to "blocked" for every
                // non-unlimited keyed tier regardless of actual remaining quota. checkDailyQuota
                // is the same gate optimizeForContext uses and normalizes this correctly.
                const quota = await this.optimizer.licenseManager.checkDailyQuota(licenseResult);
                if (!quota.allowed) {
                    return this._createErrorResponse({
                        code: -32000,
                        message: `Daily optimization limit (${quota.limit}) reached. Upgrade to Pro for unlimited optimizations.`
                    }, messageId);
                }

                this.logger.info(`✅ License validated. Proceeding with optimization.`);

            } catch (licenseError) {
                this.logger.error(`License validation error: ${licenseError.message}`);
                return this._createErrorResponse({
                    code: -32001,
                    message: `License validation failed: ${licenseError.message}`
                }, messageId);
            }
        }

        try {
            if (!this.optimizer) {
                throw new Error("Optimizer not available");
            }

            // Use the advanced optimization method (which now includes license checking)
            const result = await this.optimizer.optimizeForContext(prompt, aiContext, goals);

            // Get updated quota status for response metadata
            let quotaInfo = {};
            try {
                quotaInfo = await this.optimizer.checkQuotaStatus();
            } catch (quotaError) {
                this.logger.warn(`Could not get quota status: ${quotaError.message}`);
            }

            const toolResponse = {
                content: [{
                    type: "text",
                    text: result.optimizedText
                }],
                metadata: {
                    appliedRules: result.appliedRules,
                    confidence: result.confidence,
                    processingTime: result.processingTime,
                    goalAchievementScores: result.goalAchievementScores,
                    quotaStatus: quotaInfo
                }
            };

            this.logger.info(`Optimization successful: applied ${result.appliedRules.length} rules, confidence=${result.confidence?.toFixed(2) || 'N/A'}`);

            return this._createResponse(toolResponse, messageId);

        } catch (error) {
            this.logger.error(`Optimization failed: ${error.message}`);
            
            // Handle quota exceeded errors specifically
            if (error.message.includes('Daily optimization limit')) {
                return this._createErrorResponse({
                    code: -32000,
                    message: error.message
                }, messageId);
            }

            return this._createErrorResponse({
                code: -32603,
                message: `Optimization process failed: ${error.message}`
            }, messageId);
        }
    }

    /**
     * NEW: Handle get_quota_status tool
     * @param {Object} params - Tool parameters
     * @param {string} messageId - Message ID
     * @returns {Object} - Tool response
     */
    async _handleGetQuotaStatus(params, messageId) {
        try {
            if (!this.optimizer || !this.optimizer.licenseManager) {
                return this._createErrorResponse({
                    code: -32603,
                    message: "License manager not available"
                }, messageId);
            }

            const quotaStatus = await this.optimizer.checkQuotaStatus();

            let responseText;
            if (quotaStatus.error) {
                responseText = `❌ Error checking quota: ${quotaStatus.error}`;
            } else if (quotaStatus.unlimited) {
                responseText = `✅ **${quotaStatus.tier.toUpperCase()} TIER** - Unlimited optimizations available`;
            } else {
                const resetLine = quotaStatus.resetsAt
                    ? `Resets: ${new Date(quotaStatus.resetsAt).toLocaleString()}\n\n`
                    : quotaStatus.resetsAtText
                        ? `Resets: ${quotaStatus.resetsAtText}\n\n`
                        : '';
                responseText = `📊 **${quotaStatus.tier.toUpperCase()} TIER** - Quota Status\n\n` +
                             `Used: ${quotaStatus.used}/${quotaStatus.limit} optimizations\n` +
                             `Remaining: ${quotaStatus.remaining}\n` +
                             resetLine +
                             (quotaStatus.remaining === 0 ?
                               `⚠️ Limit reached. Consider upgrading to Pro for unlimited optimizations.` :
                               `✅ ${quotaStatus.remaining} optimizations remaining.`);
            }

            return this._createResponse({
                content: [{
                    type: "text",
                    text: responseText
                }],
                metadata: quotaStatus
            }, messageId);

        } catch (error) {
            this.logger.error(`Get quota status failed: ${error.message}`);
            return this._createErrorResponse({
                code: -32603,
                message: `Failed to get quota status: ${error.message}`
            }, messageId);
        }
    }

    /**
     * Handle list_saved_templates tool (mock implementation)
     * @param {Object} params - Tool parameters
     * @param {string} messageId - Message ID
     * @returns {Object} - Tool response
     */
    async _handleListTemplates(params, messageId) {
        const category = params.category;
        const limit = params.limit || 20;

        // Mock template data
        const mockTemplates = this.templateSystem.getMockTemplates(category, limit);

        const responseText = mockTemplates.length > 0 
            ? this._formatTemplateList(mockTemplates, category)
            : `No saved templates found${category ? ` in category '${category}'` : ''}.`;

        return this._createResponse({
            content: [{
                type: "text",
                text: responseText
            }]
        }, messageId);
    }

    /**
     * Handle search_templates tool (mock implementation)
     * @param {Object} params - Tool parameters  
     * @param {string} messageId - Message ID
     * @returns {Object} - Tool response
     */
    async _handleSearchTemplates(params, messageId) {
        const query = params.query;
        const category = params.category;
        const limit = params.limit || 10;

        if (!query) {
            return this._createErrorResponse({
                code: -32602,
                message: "Search query required."
            }, messageId);
        }

        // Mock search results
        const searchResults = this.templateSystem.searchMockTemplates(query, category, limit);

        const responseText = searchResults.length > 0
            ? this._formatSearchResults(searchResults, query)
            : `No templates found for '${query}'${category ? ` in '${category}'` : ''}.`;

        return this._createResponse({
            content: [{
                type: "text", 
                text: responseText
            }]
        }, messageId);
    }

    /**
     * Handle get_template tool (mock implementation)
     * @param {Object} params - Tool parameters
     * @param {string} messageId - Message ID
     * @returns {Object} - Tool response
     */
    async _handleGetTemplate(params, messageId) {
        const templateId = params.template_id;
        const includeMeta = params.include_metadata !== false;

        if (!templateId) {
            return this._createErrorResponse({
                code: -32602,
                message: "template_id required."
            }, messageId);
        }

        // Mock template retrieval
        const template = this.templateSystem.getMockTemplate(templateId);

        if (!template) {
            return this._createErrorResponse({
                code: -32000,
                message: `Template '${templateId}' not found`
            }, messageId);
        }

        const responseText = this._formatTemplateDetails(template, includeMeta);

        return this._createResponse({
            content: [{
                type: "text",
                text: responseText
            }]
        }, messageId);
    }

    /**
     * Handle get_template_stats tool (mock implementation)
     * @param {Object} params - Tool parameters
     * @param {string} messageId - Message ID
     * @returns {Object} - Tool response
     */
    async _handleTemplateStats(params, messageId) {
        const stats = this.templateSystem.getMockStats();

        const responseText = this._formatTemplateStats(stats);

        return this._createResponse({
            content: [{
                type: "text",
                text: responseText
            }]
        }, messageId);
    }

    /**
     * Handle use_template_as_base tool (mock implementation)
     * @param {Object} params - Tool parameters
     * @param {string} messageId - Message ID
     * @returns {Object} - Tool response
     */
    async _handleUseTemplateBase(params, messageId) {
        const templateId = params.template_id;
        const modifications = params.modifications || "";
        const newGoals = params.new_goals || [];

        if (!templateId) {
            return this._createErrorResponse({
                code: -32602,
                message: "template_id required."
            }, messageId);
        }

        // Mock template retrieval
        const baseTemplate = this.templateSystem.getMockTemplate(templateId);

        if (!baseTemplate) {
            return this._createErrorResponse({
                code: -32000,
                message: `Base template '${templateId}' not found.`
            }, messageId);
        }

        // Combine base template with modifications
        const finalPrompt = baseTemplate.optimized_prompt + 
            (modifications ? `\n\nAdditional requirements:\n${modifications}` : "");
        
        const finalGoals = newGoals.length > 0 ? newGoals : baseTemplate.optimization_goals;

        // Run optimization (this will also handle license validation)
        try {
            const result = await this.optimizer.optimizeForContext(finalPrompt, "llm-interaction", finalGoals);

            return this._createResponse({
                content: [{
                    type: "text",
                    text: result.optimizedText
                }],
                metadata: {
                    baseTemplate: templateId,
                    appliedRules: result.appliedRules,
                    confidence: result.confidence
                }
            }, messageId);

        } catch (error) {
            // Handle quota errors specifically
            if (error.message.includes('Daily optimization limit')) {
                return this._createErrorResponse({
                    code: -32000,
                    message: error.message
                }, messageId);
            }

            return this._createErrorResponse({
                code: -32603,
                message: `Failed to optimize using template base: ${error.message}`
            }, messageId);
        }
    }

    // Helper methods for formatting responses
    _formatTemplateList(templates, category) {
        const header = `Found ${templates.length} templates${category ? ` for '${category}'` : ''}:\n\n`;
        const templateList = templates.map(tpl => 
            `**${tpl.category} | ${tpl.complexity}**\n` +
            `ID: \`${tpl.id.slice(0, 8)}\` | Confidence: ${tpl.confidence_score.toFixed(2)} | Uses: ${tpl.usage_stats.total_uses}\n` +
            `Original: "${tpl.original_prompt.slice(0, 80)}..."\n` +
            `Optimized: "${tpl.optimized_prompt.slice(0, 80)}..."`
        ).join('\n---\n');
        
        return header + templateList + "\n\nUse `get_template` with ID for full details.";
    }

    _formatSearchResults(results, query) {
        const header = `Found ${results.length} templates for '${query}':\n\n`;
        const resultList = results.map(res =>
            `**Relevance: ${res.relevance_score.toFixed(2)} | ${res.category}**\n` +
            `ID: \`${res.id.slice(0, 8)}\` | Tags: ${res.tags.slice(0, 3).join(', ')}\n` +
            `Original: "${res.original_prompt.slice(0, 70)}..."\n` +
            `Optimized: "${res.optimized_prompt.slice(0, 70)}..."`
        ).join('\n---\n');
        
        return header + resultList + "\n\nUse `get_template` with ID for full details.";
    }

    _formatTemplateDetails(template, includeMeta) {
        let details = `**Template: ${template.id.slice(0, 8)}**\n\n` +
            `**Category:** ${template.metadata.primary_category} | **Complexity:** ${template.metadata.complexity_level}\n` +
            `**Confidence:** ${template.confidence_score.toFixed(2)} | **Uses:** ${template.usage_stats.total_uses}\n` +
            `**Goals:** ${template.optimization_goals.join(', ')}\n\n` +
            `**Original:**\n\`\`\`\n${template.original_prompt}\n\`\`\`\n\n` +
            `**Optimized:**\n\`\`\`\n${template.optimized_prompt}\n\`\`\`\n`;

        if (includeMeta) {
            details += `\n**Use Cases:** ${template.metadata.use_cases.join(', ')}\n` +
                      `**Tags:** ${template.metadata.searchable_tags.join(', ')}\n`;
        }

        details += "\nUse `use_template_as_base` with this ID to start new optimization.";
        return details;
    }

    _formatTemplateStats(stats) {
        return `**Template Statistics** (${new Date().toISOString().split('T')[0]})\n\n` +
               `Total: ${stats.total_templates}\nActive: ${stats.active_templates}\n` +
               `Average Confidence: ${stats.average_confidence.toFixed(2)}\n` +
               `Total Usage: ${stats.total_usage}\n\n` +
               `**Top Categories:**\n${Object.entries(stats.categories).map(([cat, count]) => 
                   `  - ${cat}: ${count}`).join('\n')}`;
    }

    _createResponse(result, messageId) {
        return {
            jsonrpc: "2.0",
            result: result,
            id: messageId
        };
    }

    _createErrorResponse(error, messageId) {
        return {
            jsonrpc: "2.0",
            error: error,
            id: messageId
        };
    }

    _createLogger() {
        return {
            debug: (msg) => console.log(`[DEBUG] ${msg}`),
            info: (msg) => console.log(`[INFO] ${msg}`),
            warn: (msg) => console.warn(`[WARN] ${msg}`),
            error: (msg) => console.error(`[ERROR] ${msg}`)
        };
    }
}

/**
 * Mock Template System for development/testing
 */
class TemplateSystemMock {
    constructor() {
        this.mockTemplates = [
            {
                id: "tpl_001_business_proposal",
                category: "business",
                complexity: "intermediate",
                confidence_score: 0.87,
                optimization_goals: ["structure", "professionalism", "actionability"],
                original_prompt: "write a business proposal",
                optimized_prompt: "Create a comprehensive business proposal with the following structure:\n\n## Executive Summary\n## Problem Statement\n## Proposed Solution\n## Implementation Timeline\n## Budget and Resources\n## Success Metrics and ROI",
                metadata: {
                    primary_category: "business",
                    complexity_level: "intermediate",
                    use_cases: ["funding", "project approval", "client proposals"],
                    searchable_tags: ["business", "proposal", "structure", "professional"]
                },
                usage_stats: {
                    total_uses: 23,
                    average_rating: 4.2,
                    last_used: "2024-09-10"
                },
                tags: ["business", "proposal", "structure"],
                relevance_score: 0.95
            },
            {
                id: "tpl_002_technical_debug",
                category: "technical",
                complexity: "advanced", 
                confidence_score: 0.92,
                optimization_goals: ["structure", "technical-precision", "actionability"],
                original_prompt: "help debug my code",
                optimized_prompt: "I need help debugging this code issue:\n\n**Problem Description:**\nMy code is experiencing an error that needs resolution.\n\n**Please provide:**\n1. Root cause analysis\n2. Step-by-step debugging approach\n3. Corrected code with explanations\n4. Best practices to prevent similar issues",
                metadata: {
                    primary_category: "technical",
                    complexity_level: "advanced",
                    use_cases: ["debugging", "code review", "error resolution"],
                    searchable_tags: ["debug", "code", "technical", "troubleshoot"]
                },
                usage_stats: {
                    total_uses: 45,
                    average_rating: 4.6,
                    last_used: "2024-09-12"
                },
                tags: ["technical", "debug", "code"],
                relevance_score: 0.88
            }
        ];
    }

    getMockTemplates(category = null, limit = 20) {
        let filtered = this.mockTemplates;
        if (category) {
            filtered = filtered.filter(t => t.category === category);
        }
        return filtered.slice(0, limit);
    }

    searchMockTemplates(query, category = null, limit = 10) {
        let results = this.mockTemplates.filter(t => {
            const matchesQuery = t.original_prompt.toLowerCase().includes(query.toLowerCase()) ||
                               t.optimized_prompt.toLowerCase().includes(query.toLowerCase()) ||
                               t.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
            const matchesCategory = !category || t.category === category;
            return matchesQuery && matchesCategory;
        });

        // Add relevance scores based on query match
        results = results.map(t => ({
            ...t,
            relevance_score: this._calculateRelevance(t, query)
        }));

        results.sort((a, b) => b.relevance_score - a.relevance_score);
        return results.slice(0, limit);
    }

    getMockTemplate(templateId) {
        return this.mockTemplates.find(t => t.id === templateId || t.id.startsWith(templateId));
    }

    getMockStats() {
        return {
            total_templates: this.mockTemplates.length,
            active_templates: this.mockTemplates.length,
            archived_templates: 0,
            average_confidence: 0.895,
            total_usage: this.mockTemplates.reduce((sum, t) => sum + t.usage_stats.total_uses, 0),
            categories: {
                business: 1,
                technical: 1,
                creative: 0,
                academic: 0
            }
        };
    }

    _calculateRelevance(template, query) {
        const queryLower = query.toLowerCase();
        let score = 0;

        // Original prompt match
        if (template.original_prompt.toLowerCase().includes(queryLower)) score += 0.4;
        
        // Tag matches
        const tagMatches = template.tags.filter(tag => 
            tag.toLowerCase().includes(queryLower)).length;
        score += tagMatches * 0.2;

        // Category match
        if (template.category.toLowerCase().includes(queryLower)) score += 0.3;

        return Math.min(score, 1.0);
    }
}

module.exports = {
    MCP_TOOLS,
    MCPToolHandler,
    TemplateSystemMock
};