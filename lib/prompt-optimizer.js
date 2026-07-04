/**
 * Advanced Prompt Optimizer - Complete implementation matching MCP Server
 * Integrates Rules Engine, Goal Alignment, Context Detection, and License Management
 */

const { RulesEngine } = require('./optimization-rules');
const { ContextDetector } = require('./context-detector');
const { GoalAlignmentCalculator } = require('./goal-alignment');
const SimplifiedLicenseManager = require('./license-manager');

class PromptOptimizer {
    constructor(config = {}) {
        this.config = config;
        this.logger = this._createLogger();
        
        // Initialize core components
        this.rulesEngine = new RulesEngine(this.logger);
        this.contextDetector = new ContextDetector(this.logger);
        this.goalCalculator = new GoalAlignmentCalculator(this.logger);
        
        // NEW: Initialize license manager
        this.licenseManager = new SimplifiedLicenseManager();
        
        // State tracking
        this.initialized = false;
        this.componentState = 'uninitialized';
        
        // Configuration
        this.sophisticationThresholds = config.sophisticationThresholds || {
            basic: 0.3,
            intermediate: 0.6,
            advanced: 0.8
        };

        this.logger.info('PromptOptimizer initialized with advanced engine and license management');
    }

    /**
     * Initialize the optimizer (async compatibility)
     * @returns {boolean} - True if initialization successful
     */
    async initialize() {
        if (this.initialized) {
            return true;
        }

        try {
            this.componentState = 'initializing';
            this.logger.info('Initializing Advanced Prompt Optimizer...');

            // Validate components
            if (!this.rulesEngine || !this.contextDetector) {
                throw new Error('Required components not properly initialized');
            }

            // Validate rule set
            const ruleCount = this.rulesEngine.rules ? this.rulesEngine.rules.length : 0;
            if (ruleCount < 100) {
                this.logger.warn(`Rule count (${ruleCount}) is lower than expected (120+)`);
            } else {
                this.logger.info(`✅ Rules engine loaded with ${ruleCount} optimization rules`);
            }

            this.initialized = true;
            this.componentState = 'ready';
            this.logger.info('✅ Advanced Prompt Optimizer initialization complete');
            return true;

        } catch (error) {
            this.componentState = 'error';
            this.logger.error(`❌ Initialization failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Main optimization method with full pipeline and license validation
     * @param {string} text - Text to optimize
     * @param {string} context - AI context type
     * @param {Array<string>} goals - Optimization goals
     * @param {Object} options - Additional options
     * @returns {Object} - Optimization result
     */
    async optimizeForContext(text, context = 'llm-interaction', goals = ['clarity'], options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        // SECURITY: Backend license validation - NO CLIENT-SIDE QUOTA CHECKING
        try {
            const licenseResult = await this.licenseManager.validateLicense();

            if (!licenseResult.valid) {
                throw new Error(`License validation failed: ${licenseResult.error}`);
            }

            // Display quota info (from backend validation response)
            if (licenseResult.quota && licenseResult.quota.unlimited) {
                this.logger.info(`✅ License validated. Unlimited optimizations available.`);
            } else if (licenseResult.quota) {
                const remaining = licenseResult.quota.remaining;
                const used = licenseResult.quota.used;
                const limit = licenseResult.quota.limit;

                // Check if quota is exceeded (backend should prevent this, but double-check)
                if (remaining <= 0) {
                    throw new Error(`Daily optimization limit (${limit}) reached. You've used ${used}/${limit} optimizations. Upgrade to Pro for unlimited optimizations at https://promptoptimizer.xyz/local-license`);
                }

                this.logger.info(`✅ License validated. Remaining optimizations: ${remaining}/${limit}`);
            }

        } catch (licenseError) {
            this.logger.error(`❌ License validation failed: ${licenseError.message}`);
            throw licenseError;
        }

        const startTime = Date.now();
        
        try {
            this.logger.info(`🔄 Starting optimization: context=${context}, goals=[${goals.join(', ')}]`);

            // Build comprehensive optimization context
            const optimizationContext = await this.buildContext(text, { 
                aiContext: context, 
                goals: goals,
                ...options 
            });

            // Apply rules engine optimization
            const result = await this.rulesEngine.optimizeForContext(
                text, 
                context, 
                goals
            );

            // Calculate confidence and quality metrics
            result.confidence = this._calculateConfidence(
                result.appliedRules,
                text,
                result.optimizedText,
                goals
            );

            result.goalAchievementScores = this._calculateGoalAchievementScores(
                result.appliedRules,
                goals
            );

            // Add processing metadata
            result.processingTime = Date.now() - startTime;
            result.optimizationContext = optimizationContext;
            result.timestamp = new Date().toISOString();

            this.logger.info(`✅ Optimization complete: applied ${result.appliedRules.length} rules in ${result.processingTime}ms`);

            return result;

        } catch (error) {
            this.logger.error(`❌ Optimization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check quota status from backend
     * @returns {Object} - Quota status from server
     */
    async checkQuotaStatus() {
        try {
            // Get quota from backend (no client-side tracking)
            return await this.licenseManager.getQuotaStatus();
        } catch (error) {
            this.logger.error(`Error checking quota: ${error.message}`);
            return { error: error.message };
        }
    }

    /**
     * Build comprehensive optimization context
     * @param {string} text - Text to analyze
     * @param {Object} hints - Context hints
     * @returns {Object} - Optimization context
     */
    async buildContext(text, hints = {}) {
        try {
            // Detect AI context
            const aiContext = await this.contextDetector.detectContext(text);
            
            // Analyze sophistication
            const sophisticationScore = this._detectPromptSophistication(text);
            const sophisticationLevel = this._determineSophisticationLevel(sophisticationScore);

            // Content analysis
            const contentAnalysis = this._analyzeContent(text);

            return {
                sophistication: {
                    sophisticationScore,
                    level: sophisticationLevel,
                    confidence: 0.8,
                    factors: contentAnalysis,
                    recommendations: this._getSophisticationRecommendations(sophisticationScore)
                },
                aiContext,
                contentAnalysis,
                userPreferences: hints.userPreferences || {},
                technicalConstraints: hints.technicalConstraints || {},
                processingMode: hints.processingMode || 'batch',
                optimizationStrategy: hints.optimizationStrategy || 'balanced'
            };

        } catch (error) {
            this.logger.error(`Error building context: ${error.message}`);
            // Return minimal context on error
            return {
                sophistication: {
                    sophisticationScore: 0.5,
                    level: 'intermediate',
                    confidence: 0.1,
                    factors: {},
                    recommendations: []
                },
                aiContext: {
                    primaryContext: 'llm-interaction',
                    confidence: 0.1,
                    reasoning: { method: 'fallback' }
                },
                contentAnalysis: { segments: [], overallMetrics: {} }
            };
        }
    }

    /**
     * Optimize prompt with streaming results (for compatibility)
     * @param {Object} request - Optimization request
     * @returns {AsyncIterator} - Stream of optimization results
     */
    async* optimizeStream(request) {
        try {
            const text = request.base_prompt || request.prompt || '';
            const goals = request.goals || ['clarity'];
            const context = request.ai_context || 'llm-interaction';

            // Initial progress
            yield {
                interim_result: text,
                confidence_score: 0.1,
                complete: false,
                metadata: { stage: 'initializing' }
            };

            // Run optimization
            const result = await this.optimizeForContext(text, context, goals);

            // Final result
            yield {
                interim_result: result.optimizedText,
                confidence_score: result.confidence || 0.8,
                complete: true,
                metadata: {
                    stage: 'complete',
                    appliedRules: result.appliedRules,
                    processingTime: result.processingTime,
                    goalAchievementScores: result.goalAchievementScores
                }
            };

        } catch (error) {
            this.logger.error(`Stream optimization failed: ${error.message}`);
            yield {
                interim_result: request.base_prompt || request.prompt || '',
                confidence_score: 0.1,
                complete: true,
                metadata: { 
                    stage: 'error',
                    error: error.message 
                }
            };
        }
    }

    /**
     * Legacy compatibility method
     * @param {string} prompt - Prompt to optimize
     * @param {string} context - Context type
     * @param {Array<string>} goals - Optimization goals
     * @returns {string} - Optimized prompt
     */
    optimizePrompt(prompt, context = "llm-interaction", goals = ["clarity"]) {
        // For synchronous compatibility, return a simplified optimization
        try {
            // Basic rule applications for immediate response
            let optimized = prompt;

            // Apply most common transformations
            if (goals.includes("clarity")) {
                optimized = optimized.replace(/\bthis\b/g, "the following");
                optimized = optimized.replace(/\bthat\b/g, "the specified");
            }

            if (goals.includes("specificity")) {
                optimized = optimized.replace(/\bthings\b/g, "elements");
                optimized = optimized.replace(/\bstuff\b/g, "items");
            }

            if (goals.includes("actionability")) {
                if (!optimized.match(/^(please|create|write|analyze|explain)/i)) {
                    optimized = `Please ${optimized}`;
                }
            }

            // Add context-specific improvements
            switch (context) {
                case "llm-interaction":
                    if (!optimized.includes("step") && goals.includes("structure")) {
                        optimized += " Please provide a step-by-step approach.";
                    }
                    break;
                case "image-generation":
                    if (goals.includes("specificity") && !optimized.includes("style")) {
                        optimized += " Include specific visual style and composition details.";
                    }
                    break;
                case "code-generation":
                    if (goals.includes("technical-precision") && !optimized.includes("best practices")) {
                        optimized += " Follow best practices with proper error handling.";
                    }
                    break;
            }

            return optimized;

        } catch (error) {
            this.logger.error(`Legacy optimization failed: ${error.message}`);
            return prompt; // Return original on error
        }
    }

    /**
     * Check if optimizer is healthy
     * @returns {boolean} - Health status
     */
    async isHealthy() {
        try {
            return this.initialized && 
                   this.componentState === 'ready' &&
                   this.rulesEngine &&
                   this.contextDetector &&
                   this.rulesEngine.rules &&
                   this.rulesEngine.rules.length > 0;
        } catch (error) {
            this.logger.error(`Health check failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Get component metrics
     * @returns {Object} - Component metrics
     */
    async getMetrics() {
        try {
            const ruleMetrics = this.rulesEngine ? this.rulesEngine.getRuleMetrics() : {};
            const ruleSummary = this.rulesEngine ? this.rulesEngine.getRulePerformanceSummary() : {};

            return {
                componentState: this.componentState,
                initialized: this.initialized,
                ruleCount: this.rulesEngine ? this.rulesEngine.rules.length : 0,
                ruleMetrics,
                ruleSummary,
                contextDetector: {
                    supportedContexts: this.contextDetector ? this.contextDetector.getSupportedContexts() : [],
                    analysisMetadata: this.contextDetector ? this.contextDetector.getAnalysisMetadata() : {}
                }
            };
        } catch (error) {
            this.logger.error(`Error getting metrics: ${error.message}`);
            return {
                componentState: 'error',
                initialized: false,
                error: error.message
            };
        }
    }

    /**
     * Get component state
     * @returns {string} - Component state
     */
    async getComponentState() {
        return this.componentState;
    }

    // Private helper methods
    _detectPromptSophistication(text) {
        const wordCount = text.split(/\s+/).length;
        const sophisticatedWords = (text.match(/\b(?:analyze|synthesize|comprehensive|optimize|implement|framework|methodology|strategic|systematic)\b/gi) || []).length;
        const technicalTerms = (text.match(/\b(?:algorithm|function|parameter|variable|database|API|architecture|deployment|scalability)\b/gi) || []).length;
        const structureIndicators = (text.match(/\b(?:step-by-step|systematic|methodical|structured|organized|detailed)\b/gi) || []).length;

        const baseScore = Math.min(wordCount / 50.0, 0.6);
        const vocabularyBonus = sophisticatedWords * 0.1;
        const technicalBonus = technicalTerms * 0.08;
        const structureBonus = structureIndicators * 0.05;
        const complexityPenalty = wordCount > 200 ? 0.1 : 0.0;

        const finalScore = baseScore + vocabularyBonus + technicalBonus + structureBonus - complexityPenalty;
        return Math.min(Math.max(finalScore, 0.0), 1.0);
    }

    _determineSophisticationLevel(score) {
        if (score < this.sophisticationThresholds.basic) return 'basic';
        if (score < this.sophisticationThresholds.intermediate) return 'intermediate';
        if (score < this.sophisticationThresholds.advanced) return 'advanced';
        return 'expert';
    }

    _analyzeContent(text) {
        return {
            segments: [{
                content: text,
                segmentType: 'natural_text',
                preservationRules: [],
                metadata: {}
            }],
            overallMetrics: {
                wordCount: text.split(/\s+/).length,
                charCount: text.length,
                sentenceCount: text.split(/[.!?]+/).filter(s => s.trim()).length
            },
            structureAnalysis: {
                hasQuestions: /\?/.test(text),
                hasCommands: /^(create|write|make|generate)/i.test(text),
                hasLists: /(\n\s*[-*]|\d+\.)/.test(text)
            }
        };
    }

    _getSophisticationRecommendations(score) {
        const recommendations = [];
        if (score < 0.3) {
            recommendations.push('Consider adding more specific details');
            recommendations.push('Include technical terms where appropriate');
        }
        if (score < 0.6) {
            recommendations.push('Add structured approach indicators');
            recommendations.push('Include outcome specifications');
        }
        return recommendations;
    }

    _calculateConfidence(appliedRules, originalText, optimizedText, goals) {
        if (!appliedRules || appliedRules.length === 0) {
            return 0.3; // Low confidence if no rules applied
        }

        // Base confidence from number of applied rules
        const baseConfidence = Math.min(0.5 + appliedRules.length * 0.1, 0.9);

        // Quality bonus for high-priority rules
        let qualityBonus = 0.0;
        for (const ruleName of appliedRules) {
            if (this.rulesEngine && this.rulesEngine.rules) {
                const rule = this.rulesEngine.rules.find(r => r.name === ruleName);
                if (rule && rule.priority >= 10) {
                    qualityBonus += 0.05;
                }
            }
        }

        // Length change factor
        let lengthBonus = 0.0;
        if (originalText.length > 0) {
            const lengthChange = Math.abs(optimizedText.length - originalText.length) / originalText.length;
            if (lengthChange >= 0.1 && lengthChange <= 0.3) {
                lengthBonus = 0.1; // Moderate improvement
            } else if (lengthChange > 0.5) {
                lengthBonus = -0.1; // Too much change
            }
        }

        const finalConfidence = Math.min(baseConfidence + qualityBonus + lengthBonus, 1.0);
        return Math.max(finalConfidence, 0.1);
    }

    _calculateGoalAchievementScores(appliedRules, goals) {
        const goalScores = {};

        for (const goal of goals) {
            let contributingRules = 0;
            let totalWeight = 0.0;

            for (const ruleName of appliedRules) {
                if (this.rulesEngine && this.rulesEngine.rules) {
                    const rule = this.rulesEngine.rules.find(r => r.name === ruleName);
                    if (rule && rule.goals && rule.goals.includes(goal)) {
                        contributingRules++;
                        totalWeight += rule.goalWeight || 1.0;
                    }
                }
            }

            if (contributingRules > 0) {
                const baseScore = Math.min(0.3 + contributingRules * 0.2, 0.8);
                const weightBonus = Math.min(totalWeight * 0.1, 0.2);
                goalScores[goal] = Math.min(baseScore + weightBonus, 1.0);
            } else {
                goalScores[goal] = 0.1; // Minimal achievement if no rules applied
            }
        }

        return goalScores;
    }

    _createLogger() {
        return {
            debug: (msg) => this.config.debug && console.log(`[DEBUG] ${msg}`),
            info: (msg) => console.log(`[INFO] ${msg}`),
            warn: (msg) => console.warn(`[WARN] ${msg}`),
            error: (msg) => console.error(`[ERROR] ${msg}`)
        };
    }
}

module.exports = PromptOptimizer;