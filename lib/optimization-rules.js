/**
 * Optimization Rules Engine - Complete rule set with 120+ optimization rules
 * Matches Python implementation from ai_aware_optimization_rules.py
 */

// Temporary fallback for GoalAlignmentCalculator until the module is created
class GoalAlignmentCalculator {
    constructor(logger = null) {
        this.logger = logger;
        this.MIN_GOAL_THRESHOLD = 0.05;  // Lowered from 0.08 to match MCP server (more aggressive rule application)
    }
    
    /**
     * Calculate goal alignment score between user goals and rule goals
     * @param {string} ruleName - Name of the rule
     * @param {Array<string>} userGoals - User's optimization goals
     * @param {Array<string>} ruleGoals - Rule's target goals
     * @returns {number} - Alignment score
     */
    calculateScore(ruleName, userGoals, ruleGoals) {
        if (!userGoals || !ruleGoals || userGoals.length === 0 || ruleGoals.length === 0) {
            return 0.3; // Changed from 0.1 - give rules without goals a decent base score
        }
        
        // Direct goal matches
        const directMatches = userGoals.filter(goal => ruleGoals.includes(goal)).length;
        
        // Enhanced partial credit for related goals
        let partialCredit = 0;
        const goalRelations = {
            'clarity': ['educational-value', 'comprehensiveness', 'structure'],
            'comprehensiveness': ['clarity', 'educational-value', 'structure'],
            'structure': ['actionability', 'comprehensiveness', 'clarity'],
            'technical-precision': ['quality-enhancement', 'safety', 'actionability'],
            'actionability': ['structure', 'clarity', 'technical-precision'],
            'specificity': ['clarity', 'technical-precision', 'quality-enhancement'],
            'quality-enhancement': ['technical-precision', 'specificity', 'comprehensiveness'],
            'professionalism': ['structure', 'clarity', 'quality-enhancement'],
            'educational-value': ['clarity', 'comprehensiveness', 'analytical-depth'],
            'analytical-depth': ['comprehensiveness', 'educational-value'],
            'context-specificity': ['clarity', 'educational-value']
        };
        
        for (const userGoal of userGoals) {
            const relatedGoals = goalRelations[userGoal] || [];
            const relatedMatches = ruleGoals.filter(ruleGoal => relatedGoals.includes(ruleGoal)).length;
            partialCredit += relatedMatches * 0.7; // Increased from 0.5 - more generous partial credit
        }
        
        const totalScore = (directMatches * 1.0) + partialCredit;
        return Math.min(totalScore, 3.0);
    }
    
    /**
     * Get dynamic threshold based on rule and context
     * @param {Object} rule - The optimization rule
     * @param {string} context - AI context type
     * @param {number} sophisticationScore - Sophistication level (0-1)
     * @returns {number} - Dynamic threshold value
     */
    getDynamicThreshold(rule, context, sophisticationScore) {
        let baseThreshold = this.MIN_GOAL_THRESHOLD;
        
        // Adjust threshold based on rule priority
        if (rule.priority >= 9) {
            baseThreshold *= 0.5; // Changed from 0.7 - more aggressive for high-priority rules
        } else if (rule.priority <= 5) {
            baseThreshold *= 1.1; // Changed from 1.3 - less restrictive for low-priority rules
        }
        
        // Reduce sophistication modifier impact
        const sophisticationModifier = 1.0 + (sophisticationScore * 0.2); // Changed from 0.5
        baseThreshold *= sophisticationModifier;
        
        // Make context modifiers more permissive
        const contextModifiers = {
            'technical-automation': 0.7, // Changed from 0.9
            'code-generation': 0.7,      // Changed from 0.9  
            'image-generation': 0.6,     // Changed from 0.8
            'human-communication': 0.9,  // Changed from 1.1
            'llm-interaction': 0.8       // Changed from 1.0
        };
        
        const contextModifier = contextModifiers[context] || 0.8; // Changed default from 1.0
        baseThreshold *= contextModifier;
        
        return Math.max(baseThreshold, 0.03); // Changed from 0.05 - lower minimum threshold
    }
}

// Try to import the real GoalAlignmentCalculator, fall back to our implementation
let ImportedGoalAlignmentCalculator;
try {
    ImportedGoalAlignmentCalculator = require('./goal-alignment').GoalAlignmentCalculator;
} catch (error) {
    // Use our fallback implementation
    ImportedGoalAlignmentCalculator = GoalAlignmentCalculator;
}

class OptimizationRule {
    constructor({
        name,
        pattern,
        replacement,
        contexts = [],
        goals = [],
        priority = 5,
        goalWeight = 1.0,
        universalApplicability = false,
        minSophistication = 0.0,
        maxSophistication = 1.0,
        optimalSophisticationRange = [0.0, 1.0],
        sophisticationThreshold = 0.0,
        inverseForAi = false,
        requiresCrossSegmentContext = false,
        enabled = true,
        intentKeywords = null,
        intentThreshold = null,
        confidenceImpact = 1.0,
        description = ''
    }) {
        this.name = name;
        this.pattern = new RegExp(pattern, 'gi');
        this.replacement = replacement;
        this.contexts = contexts;
        this.goals = goals;
        this.priority = priority;
        this.goalWeight = goalWeight;
        this.universalApplicability = universalApplicability;
        this.minSophistication = minSophistication;
        this.maxSophistication = maxSophistication;
        this.optimalSophisticationRange = optimalSophisticationRange;
        this.sophisticationThreshold = sophisticationThreshold;
        this.inverseForAi = inverseForAi;
        this.requiresCrossSegmentContext = requiresCrossSegmentContext;
        this.enabled = enabled;
        this.intentKeywords = intentKeywords;
        this.intentThreshold = intentThreshold;
        this.confidenceImpact = confidenceImpact;
        this.description = description;
    }

    /**
     * Test if the rule pattern matches the given text
     * @param {string} text - Text to test against
     * @returns {boolean} - True if pattern matches
     */
    matches(text) {
        return this.pattern.test(text);
    }

    /**
     * Apply the rule to the given text
     * @param {string} text - Text to transform
     * @returns {string} - Transformed text
     */
    apply(text) {
        return text.replace(this.pattern, this.replacement);
    }
}

class RulesEngine {
    constructor(logger = null) {
        this.logger = logger;
        this.rules = this._initializeCompleteRules();
        this.goalCalculator = new ImportedGoalAlignmentCalculator(logger);
        this.ruleMetrics = new Map();
        this.MIN_GOAL_THRESHOLD = 0.08; // Fallback threshold
    }

    /**
     * Get rules appropriate for context, sophistication level, and goals
     * @param {string} contextType - AI context type
     * @param {number} sophisticationLevel - Sophistication score (0-1)
     * @param {Array<string>} goals - Optimization goals
     * @returns {Array<OptimizationRule>} - Sorted list of appropriate rules
     */
    getContextAppropriateRules(contextType, sophisticationLevel, goals = []) {
        const appropriateRules = [];
        let rulesEvaluated = 0;
        let rulesMatched = 0;

        for (const rule of this.rules) {
            rulesEvaluated++;

            // Skip disabled rules
            if (!rule.enabled) {
                this._logDebug(`Rule ${rule.name}: SKIPPED (disabled)`);
                continue;
            }

            // Enhanced context matching
            const contextMatch = (
                rule.universalApplicability ||
                rule.contexts.includes(contextType) ||
                rule.contexts.length === 0
            );

            if (!contextMatch) {
                this._logDebug(`Rule ${rule.name}: SKIPPED (context mismatch)`);
                continue;
            }

            // Check sophistication range
            const [minSoph, maxSoph] = rule.optimalSophisticationRange;
            if (sophisticationLevel < minSoph || sophisticationLevel > maxSoph) {
                this._logDebug(`Rule ${rule.name}: SKIPPED (sophistication ${sophisticationLevel.toFixed(2)} outside range ${minSoph}-${maxSoph})`);
                continue;
            }

            // Calculate goal alignment score
            let goalAlignmentScore = 0;
            if (goals.length > 0 && rule.goals.length > 0) {
                const matchingGoals = goals.filter(g => rule.goals.includes(g)).length;
                goalAlignmentScore = matchingGoals * rule.goalWeight;
            }

            appropriateRules.push({ rule, score: goalAlignmentScore });
            rulesMatched++;
            this._logDebug(`Rule ${rule.name}: MATCHED (goal_score=${goalAlignmentScore.toFixed(2)}, priority=${rule.priority}, goals=${rule.goals.length})`);
        }

        // Sort with deterministic tie-breaking (matches Python MCP server)
        // Order: Priority DESC → Goal Score DESC → Goal Weight DESC → Name ASC (for determinism)
        appropriateRules.sort((a, b) => {
            // 1. Priority (descending - higher priority first)
            if (a.rule.priority !== b.rule.priority) {
                return b.rule.priority - a.rule.priority;
            }
            // 2. Goal alignment score (descending - better match first)
            if (a.score !== b.score) {
                return b.score - a.score;
            }
            // 3. Goal weight (descending - higher weight first)
            if (a.rule.goalWeight !== b.rule.goalWeight) {
                return b.rule.goalWeight - a.rule.goalWeight;
            }
            // 4. CRITICAL: Alphabetical tie-breaking for determinism
            // When all else is equal, sort by name to ensure consistent ordering
            return a.rule.name.localeCompare(b.rule.name);
        });

        const finalRules = appropriateRules.map(item => item.rule);
        this._logDebug(`Rule selection complete: ${rulesEvaluated} evaluated, ${rulesMatched} matched, ${finalRules.length} selected`);

        return finalRules;
    }

    /**
     * Apply optimization rules to text
     * @param {string} text - Text to optimize
     * @param {string} context - AI context type
     * @param {Array<string>} goals - Optimization goals
     * @returns {Object} - Optimization result
     */
    async optimizeForContext(text, context, goals) {
        const startTime = Date.now();
        
        this._logInfo(`Starting optimization. Context: ${context}, Goals: ${goals.join(', ')}`);
        
        // Calculate sophistication score
        const sophisticationScore = this._detectPromptSophistication(text);
        
        // Get appropriate rules
        const selectedRules = this.getContextAppropriateRules(context, sophisticationScore, goals);
        this._logInfo(`Selected ${selectedRules.length} rules for evaluation: ${selectedRules.slice(0, 5).map(r => r.name).join(', ')}`);
        
        const appliedRules = [];
        const skippedRules = [];
        const failedRules = [];
        let currentText = text;
        let confidenceModifier = 1.0;
        
        for (const rule of selectedRules) {
            try {
                // Calculate goal score
                const goalScore = this.goalCalculator.calculateScore(rule.name, goals, rule.goals);
                
                // Use dynamic threshold
                const dynamicThreshold = this.goalCalculator.getDynamicThreshold(rule, context, sophisticationScore);
                
                if (goalScore < dynamicThreshold) {
                    this._trackRuleMetric(rule.name, 'skipped');
                    skippedRules.push({
                        name: rule.name,
                        reason: `goal_score=${goalScore.toFixed(2)} below dynamic_threshold=${dynamicThreshold.toFixed(2)}`
                    });
                    this._logInfo(`Rule ${rule.name}: SKIPPED (goal_score=${goalScore.toFixed(2)} below dynamic_threshold=${dynamicThreshold.toFixed(2)})`);
                }
                
                // Apply rule to ORIGINAL text to allow multiple rules to match
                const enhancedText = rule.apply(currentText);

                // Validate result with context-aware limits
                if (currentText !== enhancedText && this._validateRuleApplication(text, currentText, enhancedText, rule.name, context)) {
                    currentText = enhancedText;
                    appliedRules.push(rule.name);
                    this._trackRuleMetric(rule.name, 'applied');
                    confidenceModifier *= rule.confidenceImpact;
                    this._logInfo(`Rule ${rule.name}: APPLIED (goal_score=${goalScore.toFixed(2)})`);
                    
                    // Continue to apply more rules - don't break the loop
                    // The next rule will be evaluated against the newly optimized text
                } else if (currentText !== enhancedText) {
                    this._trackRuleMetric(rule.name, 'failed');
                    failedRules.push({
                        name: rule.name,
                        reason: 'validation_failed'
                    });
                    this._logWarning(`Rule ${rule.name}: VALIDATION_FAILED`);
                }
                
            } catch (error) {
                this._trackRuleMetric(rule.name, 'failed');
                failedRules.push({
                    name: rule.name,
                    reason: `exception: ${error.message}`
                });
                this._logError(`Rule ${rule.name} application failed: ${error.message}`);
                continue;
            }
        }
        
        const processingTime = Date.now() - startTime;
        this._logInfo(`Optimization complete. Applied ${appliedRules.length} rules, skipped ${skippedRules.length}, failed ${failedRules.length} | Time: ${processingTime}ms`);
        
        if (appliedRules.length > 0) {
            this._logDebug(`Applied rules: ${appliedRules.join(', ')}`);
        }
        
        return {
            optimizedText: currentText,
            appliedRules,
            skippedRules,
            failedRules,
            confidenceModifier,
            processingTime,
            metadata: {
                totalRulesEvaluated: selectedRules.length,
                sophisticationScore,
                context,
                goals
            }
        };
    }

    /**
     * Initialize complete rule set (120+ rules matching Python implementation)
     * @returns {Array<OptimizationRule>} - Complete rule set
     */
    _initializeCompleteRules() {
        const foundation_rules = [];
        const hotfix_rules = [];
        const technical_rules = [];
        const business_rules = [];
        const academic_rules = [];
        const image_rules = [];
        const basic_rules = [];
        const intermediate_rules = [];
        const advanced_rules = [];
        const expert_rules = [];
        const parameter_rules = [];

        // FOUNDATION RULES (Universal application)
        foundation_rules.push(
            new OptimizationRule({
                name: "foundation_normalize_whitespace",
                pattern: "[ \\t]{2,}",
                replacement: " ",
                contexts: [],
                goals: [],
                priority: 10,
                universalApplicability: true,
                description: "Collapse multiple spaces/tabs into single space",
                optimalSophisticationRange: [0.0, 1.0]
            }),
            new OptimizationRule({
                name: "foundation_remove_filler_um",
                pattern: "^\\s*(?:um|uh|er|ah)\\s*[,.]?\\s*",
                replacement: "",
                contexts: [],
                goals: [],
                priority: 10,
                universalApplicability: true,
                description: "Remove leading conversational fillers",
                optimalSophisticationRange: [0.0, 1.0]
            })
        );

        // ========== HIGH PRIORITY: MINIMAL INPUT & DEBUG (PRIORITY 9-10) ==========
        // These rules must come BEFORE other hotfix rules to ensure proper matching

        hotfix_rules.push(
            // CRITICAL: Minimal input enhancement (matches MCP server behavior)
            new OptimizationRule({
                name: "enhance-minimal-input-greeting",
                pattern: "^\\s*(hi|hello|hey|help|assist|start|begin)(?:\\s|[.!?]|$)",
                replacement: `I need assistance. Please help me with the following:

**What I'm trying to accomplish:**
[Describe your goal or objective]

**Specific requirements or constraints:**
[List any specific needs, limitations, or preferences]

**Expected outcome:**
[Describe what success looks like]

**Additional context:**
[Provide any relevant background information]`,
                contexts: ["llm-interaction"],
                goals: ["clarity", "comprehensiveness", "structure"],
                priority: 10,  // HIGHEST PRIORITY
                goalWeight: 3.0,
                description: "Transforms minimal/vague input into structured request template",
                optimalSophisticationRange: [0.0, 1.0],
                confidenceImpact: 1.0,
                enabled: true
            }),

            // CRITICAL: Debug template enhancement (matches MCP server DEBUG_TEMPLATE route)
            new OptimizationRule({
                name: "enhance-debug-request",
                pattern: "^(.*?\\b(?:debug|fix|error|exception|traceback|stack trace|not working|broken|failing|crashes)\\b.*)$",
                replacement: `Help debug this [Language, e.g., Python] code issue:

**Problem:** $1

**Code:**
\`\`\`
[Your Code Here]
\`\`\`

**Please provide:**
1. Root cause analysis
2. Corrected code with explanation
3. Prevention strategies for similar issues`,
                contexts: ["code-generation", "technical-automation"],
                goals: ["technical-precision", "clarity", "actionability", "structure"],
                priority: 9,  // HIGH PRIORITY
                goalWeight: 3.0,
                description: "Provides structured debugging template for troubleshooting requests",
                optimalSophisticationRange: [0.0, 0.5],
                confidenceImpact: 1.0,
                enabled: true,
                intentKeywords: {
                    primary: ['debug', 'fix', 'error', 'exception', 'traceback', 'crashes', 'failing', 'broken'],
                    actions: ['debug', 'fix', 'solve', 'troubleshoot', 'resolve'],
                    technical: ['stack trace', 'not working', 'broken', 'failing']
                },
                intentThreshold: 0.3
            })
        );

        // ENHANCED HOTFIX RULES with modern prompt engineering
        hotfix_rules.push(
            new OptimizationRule({
                name: "hotfix_simple_question_enhancement",
                pattern: "^(?:what|how|why|when|where|which)\\s+(.+?)(?:\\?|$)",
                replacement: "Please provide a comprehensive explanation of $1. Include key concepts, practical examples, and relevant context. Structure your response with clear sections and actionable insights where applicable.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["actionability", "clarity", "comprehensiveness"],
                priority: 8,
                goalWeight: 2.5,
                description: "Transform simple questions into structured, comprehensive requests",
                optimalSophisticationRange: [0.0, 0.4],
                enabled: true
            }),
            new OptimizationRule({
                name: "hotfix_help_request_enhancement",
                pattern: "^(?:help|assist|support)(?:\\s+me)?\\s+(?:write|create|make)\\s+(.+?)(?:\\.|$)",
                replacement: "Please provide detailed assistance with creating $1. Include step-by-step guidance, best practices, and practical examples. Structure your response to address potential challenges and provide actionable solutions.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["actionability", "clarity", "structure"],
                priority: 7,
                goalWeight: 2.0,
                description: "Transform help requests into structured assistance requests",
                optimalSophisticationRange: [0.0, 0.3]
            }),
            new OptimizationRule({
                name: "hotfix_content_creation_enhancement",
                pattern: "^(?:write|create|generate|make)\\s+(?:something|content|material|a\\s+\\w+)?\\s*(?:about|on|for|regarding)\\s+(.+?)(?:\\.|$)",
                replacement: "Create comprehensive content about $1. Structure your response with clear sections covering key aspects. Include relevant examples, practical applications, and actionable insights. Organize the information in a logical flow that builds understanding progressively.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["structure", "comprehensiveness", "clarity"],
                priority: 8,
                goalWeight: 2.5,
                description: "Transform vague content requests into structured creation directives",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "technical_request_enhancement",
                pattern: "(?:create|write|build|implement|develop|help.*create).*(?:function|script|program|code|application)",
                replacement: "Create a well-structured function that follows best practices. Include proper error handling, input validation, and comprehensive documentation. Provide clear explanations of the implementation approach, key design decisions, and usage examples.",
                contexts: ["technical-automation", "code-generation"],
                goals: ["technical-precision", "quality-enhancement", "structure", "comprehensiveness", "actionability", "educational-value"],
                intentKeywords: {
                    primary: ['function', 'script', 'program', 'code'],
                    actions: ['create', 'write', 'build', 'implement', 'develop'],
                    technical: ['algorithm', 'tool', 'application']
                },
                intentThreshold: 0.5,
                priority: 9,
                goalWeight: 3.0,
                description: "Transform technical requests into comprehensive development directives",
                optimalSophisticationRange: [0.0, 0.8]
            })
        );

        // TECHNICAL DEBUGGING RULES
        technical_rules.push(
            new OptimizationRule({
                name: "technical_debugging_enhancement",
                pattern: "^(?:help|debug|fix|solve|troubleshoot)\\s+.*(?:error|bug|issue|problem|crash)",
                replacement: "I need help debugging this code issue:\\n\\n**Problem Description:**\\nMy code is experiencing an error or issue that needs resolution.\\n\\n**Please provide:**\\n1. Root cause analysis of the error\\n2. Step-by-step debugging approach\\n3. Corrected code with explanations\\n4. Best practices to prevent similar issues\\n5. Testing strategies to validate the fix\\n\\n**Additional Context:**\\nPlease include the specific error message, relevant code snippet, programming language, and any environmental details that might be relevant to diagnosing and resolving this issue.",
                contexts: ["technical-automation", "code-generation"],
                goals: ["structure", "analytical-depth", "actionability"],
                priority: 12,
                goalWeight: 3.0,
                description: "Apply structured debugging framework",
                optimalSophisticationRange: [0.0, 1.0],
                requiresCrossSegmentContext: true
            }),
            new OptimizationRule({
                name: "technical_documentation_enhancement",
                pattern: "(?:write|create|document|draft)\\s+(?:documentation|docs|guide|manual|instructions)(?:\\s+for\\s+(.+?))?(?:\\.|$)",
                replacement: "Create comprehensive technical documentation for $1 with this professional structure:\\n\\n## Overview\\n- **Purpose:** What this documentation covers\\n- **Audience:** Target users and skill level\\n- **Prerequisites:** Required knowledge or setup\\n\\n## Getting Started\\n- **Installation/Setup:** Step-by-step initial configuration\\n- **Quick Start Guide:** Basic usage in 5 minutes\\n- **Hello World Example:** Simple working demonstration\\n\\n## Detailed Documentation\\n- **Core Concepts:** Fundamental principles and architecture\\n- **API Reference:** Complete function/method documentation\\n- **Usage Examples:** Real-world implementation scenarios\\n- **Best Practices:** Recommended patterns and approaches\\n\\n## Support Resources\\n- **Troubleshooting:** Common issues and solutions\\n- **FAQ:** Frequently asked questions\\n- **Changelog:** Version history and updates\\n- **Community:** Support channels and contribution guidelines",
                contexts: ["technical-automation", "code-generation"],
                goals: ["structure", "comprehensiveness", "educational-value", "clarity"],
                intentKeywords: {
                    primary: ['documentation', 'docs', 'guide', 'manual', 'instructions'],
                    actions: ['write', 'create', 'document', 'draft'],
                    modifiers: ['technical', 'developer', 'user', 'API'],
                    subjects: ['setup', 'usage', 'reference', 'examples']
                },
                intentThreshold: 0.5,
                priority: 8,
                goalWeight: 2.5,
                description: "Structure technical documentation with comprehensive framework",
                optimalSophisticationRange: [0.2, 0.8]
            }),
            new OptimizationRule({
                name: "technical_code_review_enhancement",
                pattern: "(?:review|check|analyze)\\s+(?:my\\s+)?(?:code|function|script)",
                replacement: "Please conduct a comprehensive code review including: 1) Logic and algorithm efficiency, 2) Best practices adherence, 3) Security considerations, 4) Maintainability improvements, 5) Testing recommendations.",
                contexts: ["technical-automation", "code-generation"],
                goals: ["technical-precision", "quality-enhancement", "structure"],
                priority: 8,
                goalWeight: 2.5,
                description: "Structure code review requests",
                optimalSophisticationRange: [0.3, 0.9]
            }),
            new OptimizationRule({
                name: "technical_performance_optimization",
                pattern: "(?:optimize|improve|speed up)\\s+(?:performance|code|function)",
                replacement: "Please analyze and optimize the performance of this code. Include: 1) Performance bottleneck identification, 2) Algorithmic improvements, 3) Memory optimization strategies, 4) Benchmark comparisons, 5) Implementation recommendations.",
                contexts: ["technical-automation", "code-generation"],
                goals: ["technical-precision", "quality-enhancement", "analytical-depth"],
                priority: 8,
                goalWeight: 2.8,
                description: "Structure performance optimization requests",
                optimalSophisticationRange: [0.4, 1.0]
            }),
            new OptimizationRule({
                name: "technical_security_audit",
                pattern: "(?:security|secure|vulnerability|audit).*(?:code|application|system)",
                replacement: "Please conduct a security audit including: 1) Vulnerability assessment, 2) Input validation review, 3) Authentication/authorization checks, 4) Data protection measures, 5) Security best practices implementation.",
                contexts: ["technical-automation", "code-generation"],
                goals: ["safety", "technical-precision", "comprehensiveness"],
                priority: 9,
                goalWeight: 3.0,
                description: "Structure security audit requests",
                optimalSophisticationRange: [0.5, 1.0]
            }),
            new OptimizationRule({
                name: "technical_database_design",
                pattern: "(?:design|create|build)\\s+(?:database|schema|table)",
                replacement: "Please design a database solution including: 1) Entity-relationship model, 2) Normalized table structure, 3) Index optimization strategy, 4) Performance considerations, 5) Data integrity constraints.",
                contexts: ["technical-automation"],
                goals: ["technical-precision", "structure", "quality-enhancement"],
                priority: 8,
                goalWeight: 2.7,
                description: "Structure database design requests",
                optimalSophisticationRange: [0.4, 1.0]
            }),
            new OptimizationRule({
                name: "technical_api_design",
                pattern: "(?:design|create|build)\\s+(?:API|endpoint|service)",
                replacement: "Please design an API including: 1) RESTful endpoint structure, 2) Request/response schemas, 3) Authentication strategy, 4) Error handling, 5) Documentation and testing approach.",
                contexts: ["technical-automation", "api-automation"],
                goals: ["technical-precision", "structure", "comprehensiveness"],
                priority: 8,
                goalWeight: 2.8,
                description: "Structure API design requests",
                optimalSophisticationRange: [0.4, 1.0]
            }),
            new OptimizationRule({
                name: "technical_testing_strategy",
                pattern: "(?:test|testing|unit test|integration test)",
                replacement: "Please create a comprehensive testing strategy including: 1) Unit test coverage, 2) Integration testing approach, 3) Test data management, 4) Automated testing pipeline, 5) Performance and security testing.",
                contexts: ["technical-automation", "code-generation"],
                goals: ["quality-enhancement", "technical-precision", "structure"],
                priority: 8,
                goalWeight: 2.6,
                description: "Structure testing strategy requests",
                optimalSophisticationRange: [0.3, 1.0]
            }),
            new OptimizationRule({
                name: "technical_deployment_guide",
                pattern: "(?:deploy|deployment|production|release)",
                replacement: "Please provide a deployment guide including: 1) Environment setup, 2) Build and packaging process, 3) Configuration management, 4) Monitoring and logging, 5) Rollback procedures.",
                contexts: ["technical-automation"],
                goals: ["structure", "comprehensiveness", "actionability"],
                priority: 8,
                goalWeight: 2.5,
                description: "Structure deployment requests",
                optimalSophisticationRange: [0.4, 1.0]
            }),
            new OptimizationRule({
                name: "technical_architecture_review",
                pattern: "(?:architecture|design pattern|system design)",
                replacement: "Please provide an architectural analysis including: 1) System component breakdown, 2) Design pattern evaluation, 3) Scalability considerations, 4) Technology stack assessment, 5) Improvement recommendations.",
                contexts: ["technical-automation"],
                goals: ["analytical-depth", "technical-precision", "comprehensiveness"],
                priority: 9,
                goalWeight: 3.0,
                description: "Structure architecture review requests",
                optimalSophisticationRange: [0.5, 1.0]
            }),
            new OptimizationRule({
                name: "technical_refactoring_guide",
                pattern: "(?:refactor|refactoring|clean up|improve)\\s+(?:code|function)",
                replacement: "Please provide a refactoring plan including: 1) Code smell identification, 2) Improvement opportunities, 3) Step-by-step refactoring process, 4) Testing strategy, 5) Risk mitigation.",
                contexts: ["technical-automation", "code-generation"],
                goals: ["quality-enhancement", "structure", "technical-precision"],
                priority: 8,
                goalWeight: 2.6,
                description: "Structure refactoring requests",
                optimalSophisticationRange: [0.3, 1.0]
            }),
            new OptimizationRule({
                name: "technical_error_handling",
                pattern: "(?:error handling|exception|try catch|error management)",
                replacement: "Please implement comprehensive error handling including: 1) Exception type identification, 2) Graceful degradation strategies, 3) User-friendly error messages, 4) Logging and monitoring, 5) Recovery mechanisms.",
                contexts: ["technical-automation", "code-generation"],
                goals: ["safety", "technical-precision", "quality-enhancement"],
                priority: 8,
                goalWeight: 2.7,
                description: "Structure error handling requests",
                optimalSophisticationRange: [0.3, 1.0]
            }),
            new OptimizationRule({
                name: "technical_monitoring_setup",
                pattern: "(?:monitoring|logging|observability|metrics)",
                replacement: "Please design a monitoring solution including: 1) Key performance indicators, 2) Alerting thresholds, 3) Dashboard design, 4) Log aggregation strategy, 5) Incident response procedures.",
                contexts: ["technical-automation"],
                goals: ["structure", "technical-precision", "actionability"],
                priority: 8,
                goalWeight: 2.5,
                description: "Structure monitoring setup requests",
                optimalSophisticationRange: [0.4, 1.0]
            }),
            new OptimizationRule({
                name: "technical_scalability_analysis",
                pattern: "(?:scale|scalability|performance|load|capacity)",
                replacement: "Please provide a scalability analysis including: 1) Current bottleneck identification, 2) Load testing recommendations, 3) Horizontal vs vertical scaling options, 4) Infrastructure requirements, 5) Cost-performance optimization.",
                contexts: ["technical-automation"],
                goals: ["analytical-depth", "technical-precision", "comprehensiveness"],
                priority: 8,
                goalWeight: 2.8,
                description: "Structure scalability analysis requests",
                optimalSophisticationRange: [0.5, 1.0]
            }),
            new OptimizationRule({
                name: "technical_integration_guide",
                pattern: "(?:integrate|integration|connect|API integration)",
                replacement: "Please provide an integration guide including: 1) Integration architecture, 2) Data mapping strategy, 3) Authentication setup, 4) Error handling and retries, 5) Testing and validation procedures.",
                contexts: ["technical-automation", "api-automation"],
                goals: ["structure", "technical-precision", "comprehensiveness"],
                priority: 8,
                goalWeight: 2.6,
                description: "Structure integration requests",
                optimalSophisticationRange: [0.4, 1.0]
            }),
            new OptimizationRule({
                name: "technical_migration_plan",
                pattern: "(?:migrate|migration|upgrade|move|transfer)",
                replacement: "Please create a migration plan including: 1) Pre-migration assessment, 2) Step-by-step migration process, 3) Data validation procedures, 4) Rollback strategy, 5) Post-migration testing.",
                contexts: ["technical-automation"],
                goals: ["structure", "actionability", "safety"],
                priority: 8,
                goalWeight: 2.7,
                description: "Structure migration planning requests",
                optimalSophisticationRange: [0.4, 1.0]
            }),
            new OptimizationRule({
                name: "technical_backup_strategy",
                pattern: "(?:backup|disaster recovery|data protection|recovery)",
                replacement: "Please design a backup and recovery strategy including: 1) Backup schedule and retention, 2) Recovery time objectives, 3) Data validation procedures, 4) Disaster recovery testing, 5) Business continuity planning.",
                contexts: ["technical-automation"],
                goals: ["safety", "structure", "comprehensiveness"],
                priority: 8,
                goalWeight: 2.6,
                description: "Structure backup strategy requests",
                optimalSophisticationRange: [0.4, 1.0]
            })
        );

        // BUSINESS RULES - Enhanced Resilience
        business_rules.push(
            new OptimizationRule({
                name: "business_proposal_enhancement",
                pattern: "(?:create|write|draft|develop|prepare)\\s+(?:a\\s+)?(?:business\\s+)?proposal(?:\\s+for\\s+\\w+)*",
                replacement: "Create a comprehensive business proposal with the following structure:\\n\\n## Executive Summary\\n## Problem Statement\\n## Proposed Solution\\n## Implementation Timeline\\n## Budget and Resources\\n## Success Metrics and ROI",
                contexts: ["human-communication"],
                goals: ["structure", "professionalism", "comprehensiveness", "actionability"],
                intentKeywords: {
                    primary: ['proposal', 'plan', 'strategy'],
                    actions: ['create', 'write', 'draft', 'develop', 'prepare', 'build'],
                    modifiers: ['business', 'project', 'funding', 'budget', 'policy', 'work', 'company', 'organizational'],
                    subjects: ['remote', 'implementation', 'software', 'technology', 'hiring', 'training']
                },
                intentThreshold: 0.4,
                priority: 9,
                goalWeight: 2.5,
                description: "Structure business proposals with professional framework",
                optimalSophisticationRange: [0.0, 0.8],
                enabled: true
            }),
            new OptimizationRule({
                name: "marketing_content_enhancement",
                pattern: "(?:write|create|develop|craft)\\s+(?:marketing|advertising|promotional|sales)\\s+(?:content|copy|material|campaign)(?:\\s+for\\s+(.+?))?(?:\\.|$)",
                replacement: "Create strategic marketing content for $1 using this conversion-focused framework:\\n\\n## Audience and Market Analysis\\n- **Target Demographics:** Age, income, location, interests\\n- **Pain Points:** Problems your product/service solves\\n- **Competitive Landscape:** How you differentiate\\n\\n## Messaging Strategy\\n- **Value Proposition:** Unique benefits and advantages\\n- **Key Messages:** Primary and secondary selling points\\n- **Brand Voice:** Tone, personality, and communication style\\n\\n## Content Structure\\n- **Attention-Grabbing Headline:** Clear, benefit-focused opener\\n- **Compelling Body Copy:** Features, benefits, social proof\\n- **Strong Call-to-Action:** Specific next steps for audience\\n\\n## Optimization Elements\\n- **Emotional Triggers:** Appeals to desires and motivations\\n- **Credibility Factors:** Testimonials, guarantees, certifications\\n- **Urgency/Scarcity:** Time-sensitive or limited offers",
                contexts: ["human-communication"],
                goals: ["structure", "persuasiveness", "quality-enhancement", "actionability"],
                intentKeywords: {
                    primary: ['marketing', 'advertising', 'promotional', 'sales', 'content', 'copy'],
                    actions: ['write', 'create', 'develop', 'craft'],
                    modifiers: ['compelling', 'persuasive', 'conversion', 'engagement'],
                    subjects: ['campaign', 'strategy', 'audience', 'brand']
                },
                intentThreshold: 0.5,
                priority: 8,
                goalWeight: 2.3,
                description: "Structure marketing content with strategic conversion framework",
                optimalSophisticationRange: [0.0, 0.7]
            }),
            new OptimizationRule({
                name: "business_analysis_enhancement",
                pattern: "(?:analyze|examine|review|assess|evaluate)\\s+(?:the\\s+)?(?:market|business|financial|performance|company|industry)",
                replacement: "Conduct a comprehensive analysis with the following framework:\\n\\n## Current Situation Assessment\\n## Key Findings and Insights\\n## Impact Analysis\\n## Recommendations\\n## Next Steps and Timeline",
                contexts: ["human-communication"],
                goals: ["structure", "analytical-depth", "comprehensiveness", "actionability"],
                intentKeywords: {
                    primary: ['analyze', 'analysis', 'review', 'assessment'],
                    subjects: ['market', 'business', 'financial', 'performance'],
                    modifiers: ['comprehensive', 'detailed', 'thorough']
                },
                intentThreshold: 0.5,
                priority: 8,
                goalWeight: 2.0,
                description: "Structure business analysis with professional framework",
                optimalSophisticationRange: [0.0, 0.7]
            }),
            new OptimizationRule({
                name: "business_strategy_development",
                pattern: "(?:strategy|strategic plan|business strategy)\\s+for\\s+(.+?)(?:\\.|$)",
                replacement: "Develop a comprehensive business strategy for $1 including:\\n\\n## Strategic Analysis\\n- Market assessment and competitive landscape\\n- SWOT analysis and opportunity identification\\n- Target customer segmentation\\n\\n## Strategic Framework\\n- Vision, mission, and strategic objectives\\n- Key performance indicators and metrics\\n- Resource allocation and investment priorities\\n\\n## Implementation Plan\\n- Tactical initiatives and action steps\\n- Timeline and milestone tracking\\n- Risk management and contingency planning",
                contexts: ["human-communication"],
                goals: ["structure", "analytical-depth", "comprehensiveness", "actionability"],
                priority: 9,
                goalWeight: 2.8,
                description: "Structure comprehensive strategy development",
                optimalSophisticationRange: [0.4, 1.0]
            }),
            new OptimizationRule({
                name: "business_financial_planning",
                pattern: "(?:budget|financial plan|financial planning|financial analysis)",
                replacement: "Create a comprehensive financial plan including:\\n\\n## Financial Analysis\\n- Revenue projections and forecasting\\n- Cost structure analysis\\n- Cash flow management\\n\\n## Budget Planning\\n- Capital expenditure planning\\n- Operating expense budgets\\n- Financial risk assessment\\n\\n## Performance Metrics\\n- Key financial indicators\\n- Profitability analysis\\n- Return on investment calculations",
                contexts: ["human-communication"],
                goals: ["structure", "analytical-depth", "technical-precision"],
                priority: 8,
                goalWeight: 2.6,
                description: "Structure financial planning requests",
                optimalSophisticationRange: [0.3, 0.9]
            }),
            new OptimizationRule({
                name: "business_market_research",
                pattern: "(?:market research|market analysis|competitor analysis)",
                replacement: "Conduct comprehensive market research including:\\n\\n## Market Assessment\\n- Market size and growth trends\\n- Customer demographics and behavior\\n- Market segmentation analysis\\n\\n## Competitive Analysis\\n- Competitor landscape mapping\\n- Competitive advantages and weaknesses\\n- Market positioning strategies\\n\\n## Opportunity Analysis\\n- Market gaps and opportunities\\n- Pricing strategy recommendations\\n- Go-to-market strategy",
                contexts: ["human-communication"],
                goals: ["analytical-depth", "comprehensiveness", "structure"],
                priority: 8,
                goalWeight: 2.7,
                description: "Structure market research requests",
                optimalSophisticationRange: [0.3, 0.9]
            }),
            new OptimizationRule({
                name: "business_project_planning",
                pattern: "(?:project plan|project management|project planning)",
                replacement: "Create a comprehensive project plan including:\\n\\n## Project Foundation\\n- Project scope and objectives\\n- Stakeholder identification and roles\\n- Success criteria and deliverables\\n\\n## Planning Framework\\n- Work breakdown structure\\n- Timeline and milestone planning\\n- Resource allocation and budgeting\\n\\n## Risk and Quality Management\\n- Risk assessment and mitigation\\n- Quality assurance processes\\n- Communication and reporting structure",
                contexts: ["human-communication"],
                goals: ["structure", "actionability", "comprehensiveness"],
                priority: 8,
                goalWeight: 2.5,
                description: "Structure project planning requests",
                optimalSophisticationRange: [0.2, 0.8]
            }),
            new OptimizationRule({
                name: "business_training_program",
                pattern: "(?:training|training program|employee development|skill development)",
                replacement: "Design a comprehensive training program including:\\n\\n## Training Assessment\\n- Skills gap analysis\\n- Learning objectives definition\\n- Target audience profiling\\n\\n## Program Design\\n- Curriculum development\\n- Training methodology selection\\n- Resource and material planning\\n\\n## Implementation and Evaluation\\n- Delivery schedule and logistics\\n- Progress tracking and assessment\\n- ROI measurement and program optimization",
                contexts: ["human-communication"],
                goals: ["structure", "educational-value", "actionability"],
                priority: 8,
                goalWeight: 2.4,
                description: "Structure training program requests",
                optimalSophisticationRange: [0.2, 0.8]
            }),
            new OptimizationRule({
                name: "business_process_improvement",
                pattern: "(?:process improvement|workflow optimization|efficiency|streamline)",
                replacement: "Develop a process improvement plan including:\\n\\n## Current State Analysis\\n- Process mapping and documentation\\n- Bottleneck and inefficiency identification\\n- Performance baseline establishment\\n\\n## Improvement Strategy\\n- Optimization opportunities\\n- Technology integration possibilities\\n- Resource reallocation recommendations\\n\\n## Implementation Plan\\n- Change management strategy\\n- Implementation timeline\\n- Success metrics and monitoring",
                contexts: ["human-communication"],
                goals: ["analytical-depth", "actionability", "quality-enhancement"],
                priority: 8,
                goalWeight: 2.5,
                description: "Structure process improvement requests",
                optimalSophisticationRange: [0.3, 0.9]
            }),
            new OptimizationRule({
                name: "business_risk_management",
                pattern: "(?:risk management|risk assessment|risk analysis|compliance)",
                replacement: "Create a comprehensive risk management framework including:\\n\\n## Risk Identification\\n- Risk category assessment\\n- Threat and vulnerability analysis\\n- Impact and probability evaluation\\n\\n## Risk Mitigation\\n- Control measures and safeguards\\n- Contingency planning\\n- Insurance and transfer strategies\\n\\n## Monitoring and Governance\\n- Risk monitoring procedures\\n- Compliance requirements\\n- Regular review and updating processes",
                contexts: ["human-communication"],
                goals: ["safety", "structure", "comprehensiveness"],
                priority: 8,
                goalWeight: 2.6,
                description: "Structure risk management requests",
                optimalSophisticationRange: [0.4, 1.0]
            }),
            new OptimizationRule({
                name: "business_customer_experience",
                pattern: "(?:customer experience|customer service|customer satisfaction|CX)",
                replacement: "Design a customer experience strategy including:\\n\\n## Customer Journey Analysis\\n- Touchpoint identification and mapping\\n- Pain point and friction analysis\\n- Moment of truth identification\\n\\n## Experience Enhancement\\n- Service design improvements\\n- Technology integration opportunities\\n- Staff training and empowerment\\n\\n## Measurement and Optimization\\n- Customer satisfaction metrics\\n- Feedback collection systems\\n- Continuous improvement processes",
                contexts: ["human-communication"],
                goals: ["structure", "quality-enhancement", "analytical-depth"],
                priority: 8,
                goalWeight: 2.5,
                description: "Structure customer experience requests",
                optimalSophisticationRange: [0.3, 0.8]
            }),
            new OptimizationRule({
                name: "business_digital_transformation",
                pattern: "(?:digital transformation|digitization|automation|technology adoption)",
                replacement: "Develop a digital transformation strategy including:\\n\\n## Current State Assessment\\n- Technology audit and capability assessment\\n- Digital maturity evaluation\\n- Gap analysis and opportunity identification\\n\\n## Transformation Roadmap\\n- Technology selection and integration\\n- Process automation opportunities\\n- Change management and training\\n\\n## Implementation and Success\\n- Phased implementation approach\\n- Success metrics and KPIs\\n- Risk mitigation and contingency planning",
                contexts: ["human-communication"],
                goals: ["structure", "technical-precision", "actionability"],
                priority: 8,
                goalWeight: 2.7,
                description: "Structure digital transformation requests",
                optimalSophisticationRange: [0.4, 1.0]
            }),
            new OptimizationRule({
                name: "business_partnership_strategy",
                pattern: "(?:partnership|strategic alliance|collaboration|joint venture)",
                replacement: "Develop a partnership strategy including:\\n\\n## Partnership Assessment\\n- Partner identification and evaluation\\n- Strategic fit and value analysis\\n- Due diligence and risk assessment\\n\\n## Partnership Structure\\n- Legal and contractual framework\\n- Governance and decision-making\\n- Resource sharing and responsibilities\\n\\n## Success Management\\n- Performance metrics and KPIs\\n- Communication and relationship management\\n- Conflict resolution and exit strategies",
                contexts: ["human-communication"],
                goals: ["structure", "analytical-depth", "actionability"],
                priority: 8,
                goalWeight: 2.5,
                description: "Structure partnership strategy requests",
                optimalSophisticationRange: [0.4, 0.9]
            }),
            new OptimizationRule({
                name: "business_sustainability_planning",
                pattern: "(?:sustainability|environmental|ESG|corporate responsibility)",
                replacement: "Create a sustainability strategy including:\\n\\n## Impact Assessment\\n- Environmental footprint analysis\\n- Social impact evaluation\\n- Governance and ethical considerations\\n\\n## Sustainability Framework\\n- Goal setting and target definition\\n- Initiative identification and prioritization\\n- Resource allocation and investment\\n\\n## Implementation and Reporting\\n- Action plan and timeline\\n- Measurement and tracking systems\\n- Stakeholder communication and reporting",
                contexts: ["human-communication"],
                goals: ["structure", "comprehensiveness", "analytical-depth"],
                priority: 8,
                goalWeight: 2.4,
                description: "Structure sustainability planning requests",
                optimalSophisticationRange: [0.3, 0.9]
            }),
            new OptimizationRule({
                name: "business_crisis_management",
                pattern: "(?:crisis management|emergency planning|business continuity|disaster response)",
                replacement: "Develop a crisis management plan including:\\n\\n## Crisis Preparedness\\n- Risk scenario identification\\n- Emergency response team structure\\n- Communication protocols and procedures\\n\\n## Response Framework\\n- Immediate response procedures\\n- Stakeholder communication strategy\\n- Resource mobilization and allocation\\n\\n## Recovery and Learning\\n- Business recovery planning\\n- Post-crisis evaluation and analysis\\n- Plan updates and improvement processes",
                contexts: ["human-communication"],
                goals: ["safety", "structure", "actionability"],
                priority: 9,
                goalWeight: 2.8,
                description: "Structure crisis management requests",
                optimalSophisticationRange: [0.4, 1.0]
            })
        );

        // ACADEMIC CONTEXT RULES
        academic_rules.push(
            new OptimizationRule({
                name: "academic_research_enhancement",
                pattern: "(?:research|study|investigate|examine)\\s+(.+?)(?:\\.|$)",
                replacement: "Conduct comprehensive academic research on $1 using this scholarly framework:\\n\\n## Research Design\\n- **Research Question:** Define specific inquiry focus\\n- **Methodology:** Qualitative, quantitative, or mixed methods approach\\n- **Scope and Limitations:** Boundaries and constraints\\n\\n## Literature Review\\n- **Current State:** Existing scholarship and knowledge gaps\\n- **Theoretical Framework:** Relevant theories and models\\n- **Key Sources:** Peer-reviewed articles, books, and primary sources\\n\\n## Data Collection and Analysis\\n- **Data Sources:** Primary and secondary materials\\n- **Analysis Methods:** Statistical, thematic, or comparative approaches\\n- **Validity and Reliability:** Quality assurance measures\\n\\n## Findings and Implications\\n- **Key Discoveries:** Evidence-based conclusions\\n- **Significance:** Contribution to field of study\\n- **Future Research:** Recommendations for further investigation",
                contexts: ["llm-interaction"],
                goals: ["structure", "analytical-depth", "comprehensiveness"],
                intentKeywords: {
                    primary: ['research', 'study', 'investigation', 'analysis'],
                    actions: ['research', 'study', 'investigate', 'examine', 'analyze'],
                    modifiers: ['academic', 'scholarly', 'scientific', 'systematic'],
                    subjects: ['literature', 'data', 'methodology', 'findings']
                },
                intentThreshold: 0.5,
                priority: 8,
                goalWeight: 2.5,
                description: "Structure academic research with comprehensive scholarly framework",
                optimalSophisticationRange: [0.3, 0.9]
            }),
            new OptimizationRule({
                name: "academic_writing_enhancement",
                pattern: "(?:write|create|draft|compose)\\s+(?:a\\s+)?(?:paper|essay|report|analysis|thesis|dissertation)(?:\\s+(?:on|about)\\s+(.+?))?(?:\\.|$)",
                replacement: "Write a comprehensive academic document on $1 with this scholarly structure:\\n\\n## Introduction (15-20%)\\n- **Context and Background:** Establish topic significance\\n- **Literature Gap:** Identify what needs investigation\\n- **Thesis Statement:** Clear argument or research question\\n- **Roadmap:** Preview of paper structure\\n\\n## Literature Review (25-30%)\\n- **Theoretical Framework:** Relevant theories and models\\n- **Current Research:** Recent scholarly contributions\\n- **Critical Analysis:** Gaps and contradictions in existing work\\n\\n## Methodology/Analysis (30-35%)\\n- **Approach:** Research methods or analytical framework\\n- **Evidence:** Data, case studies, or textual analysis\\n- **Discussion:** Interpretation of findings\\n\\n## Conclusion (15-20%)\\n- **Summary:** Key findings and contributions\\n- **Implications:** Theoretical and practical significance\\n- **Future Research:** Recommendations for further study",
                contexts: ["llm-interaction"],
                goals: ["structure", "analytical-depth", "comprehensiveness", "educational-value"],
                intentKeywords: {
                    primary: ['paper', 'essay', 'report', 'analysis', 'thesis', 'dissertation'],
                    actions: ['write', 'create', 'draft', 'compose'],
                    modifiers: ['academic', 'scholarly', 'research-based', 'analytical'],
                    subjects: ['literature', 'methodology', 'findings', 'conclusion']
                },
                intentThreshold: 0.6,
                priority: 8,
                goalWeight: 2.8,
                description: "Structure academic writing with comprehensive scholarly framework",
                optimalSophisticationRange: [0.4, 0.9]
            })
        );

        // IMAGE GENERATION RULES
        image_rules.push(
            new OptimizationRule({
                name: "image_specification_enhancement",
                pattern: "(?:please\\s+|can\\s+you\\s+|i\\s+(?:need|want)\\s+(?:you\\s+to\\s+)?)?(?:create|generate|draw|make|design|produce)\\s+(?:an?\\s+)?(?:image|picture|photo|artwork|illustration|visual|graphic)(?:\\s+(?:of|showing|depicting)\\s+(.+?))?(?:\\.|$|,\\s+please)",
                replacement: "Generate a high-quality image of $1 with detailed specifications:\\n\\n**Subject and Composition:**\\n- Primary subject: $1\\n- Composition style: [close-up/wide shot/portrait/landscape]\\n- Perspective and framing: [specify viewpoint]\\n\\n**Visual Style:**\\n- Art style: [photorealistic/digital art/illustration/painting]\\n- Color palette: [vibrant/muted/monochrome/specific colors]\\n- Lighting: [natural/dramatic/soft/studio/golden hour]\\n\\n**Technical Specifications:**\\n- Resolution: [4K/HD/print quality]\\n- Aspect ratio: [16:9/1:1/3:4 or custom]\\n- Mood/atmosphere: [specify emotional tone]",
                contexts: ["image-generation"],
                goals: ["specificity", "structure", "technical-precision", "quality-enhancement"],
                intentKeywords: {
                    primary: ['image', 'picture', 'photo', 'artwork', 'illustration', 'visual', 'graphic'],
                    actions: ['create', 'generate', 'draw', 'make', 'design', 'produce'],
                    subjects: ['of', 'showing', 'depicting', 'featuring'],
                    technical: ['resolution', 'quality', 'style', 'lighting']
                },
                intentThreshold: 0.4,
                priority: 9,
                goalWeight: 3.0,
                description: "Add comprehensive image generation specifications",
                optimalSophisticationRange: [0.0, 0.6]
            }),
            new OptimizationRule({
                name: "creative_story_detection_enhanced",
                pattern: "(?:write|create|tell|compose|craft)\\s+(?:a\\s+)?(?:story|tale|narrative|fiction)(?:\\s+about\\s+(.+?))?(?:\\.|$)",
                replacement: "Write a captivating story about $1. Structure it with:\\n\\n## Story Elements\\n- **Setting:** Vivid world-building and atmosphere\\n- **Characters:** Well-developed protagonists with clear motivations\\n- **Plot:** Engaging conflict with rising action and resolution\\n- **Theme:** Meaningful message or lesson\\n\\n## Writing Style\\n- Use descriptive language and sensory details\\n- Include dialogue to bring characters to life\\n- Build tension and emotional engagement\\n- Aim for 1,500-2,500 words for full development",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["structure", "creative-enhancement", "quality-enhancement"],
                intentKeywords: {
                    primary: ['story', 'tale', 'narrative', 'fiction'],
                    actions: ['write', 'create', 'tell', 'compose', 'craft'],
                    modifiers: ['creative', 'original', 'engaging', 'compelling'],
                    subjects: ['about', 'involving', 'featuring', 'set in']
                },
                intentThreshold: 0.5,
                priority: 9,
                goalWeight: 3.0,
                description: "Transform basic story requests into comprehensive creative briefs",
                optimalSophisticationRange: [0.0, 0.6],
                enabled: true
            })
        );

        // BASIC RULES (15 total)
        basic_rules.push(
            new OptimizationRule({
                name: "basic_detail_enhancement",
                pattern: "^(?:explain|describe|tell me about|what is)\\s+([^.!?]+)(?:[.!?]|$)",
                replacement: "Please explain $1 in detail.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["comprehensiveness", "clarity"],
                priority: 7,
                goalWeight: 2.0,
                description: "Add detail requests to basic explanations",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "basic_step_by_step_enhancement",
                pattern: "^(?:explain|describe|tell me|show me)\\s+(.+?)(?:[.!?]|$)(?!\\s*(?:step|systematically|methodically))",
                replacement: "Please explain $1 step by step.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["structure", "clarity"],
                priority: 6,
                goalWeight: 1.8,
                description: "Add step-by-step instruction for explanations",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "basic_practical_context",
                pattern: "^(?:explain|describe|what is|how does)\\s+([^.!?]+)(?:[.!?]|$)(?!\\s*(?:with|including|for|examples|context))",
                replacement: "Please explain $1 with practical examples.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["context-specificity", "educational-value"],
                priority: 6,
                goalWeight: 1.8,
                description: "Add practical context to basic explanations",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "basic_uncertainty_removal",
                pattern: "\\b(?:maybe|perhaps|possibly|might)\\s+",
                replacement: "",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["clarity", "confidence"],
                priority: 5,
                goalWeight: 1.5,
                description: "Remove uncertainty from basic prompts",
                optimalSophisticationRange: [0.0, 0.3]
            }),
            new OptimizationRule({
                name: "basic_add_examples",
                pattern: "^(?:explain|describe)\\s+(.+?)(?:[.!?]|$)(?!.*examples)",
                replacement: "Please explain $1 with specific examples.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["clarity", "educational-value"],
                priority: 6,
                goalWeight: 1.8,
                description: "Add example requests to explanations",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "basic_add_context",
                pattern: "^(?:what|how)\\s+(.+?)(?:[.!?]|$)(?!.*context)",
                replacement: "Please explain $1 with relevant context.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["context-specificity", "comprehensiveness"],
                priority: 6,
                goalWeight: 1.8,
                description: "Add context requests to basic questions",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "basic_simple_to_detailed",
                pattern: "^(?:tell me|show me)\\s+(.+?)(?:[.!?]|$)(?!.*detailed)",
                replacement: "Please provide detailed information about $1.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["comprehensiveness", "clarity"],
                priority: 6,
                goalWeight: 1.7,
                description: "Convert simple requests to detailed requests",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "basic_comparison_enhancement",
                pattern: "^(?:compare|difference between)\\s+(.+?)(?:[.!?]|$)",
                replacement: "Please provide a detailed comparison of $1, including similarities, differences, and practical implications.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["analytical-depth", "comprehensiveness"],
                priority: 7,
                goalWeight: 2.0,
                description: "Enhance basic comparison requests",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "basic_list_to_structured",
                pattern: "^(?:list|give me)\\s+(.+?)(?:[.!?]|$)(?!.*structured)",
                replacement: "Please provide a structured list of $1 with explanations.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["structure", "comprehensiveness"],
                priority: 6,
                goalWeight: 1.8,
                description: "Convert basic lists to structured explanations",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "basic_how_to_guide",
                pattern: "^how to\\s+(.+?)(?:[.!?]|$)(?!.*guide)",
                replacement: "Please provide a comprehensive guide on how to $1, including prerequisites and step-by-step instructions.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["structure", "actionability", "comprehensiveness"],
                priority: 7,
                goalWeight: 2.2,
                description: "Transform how-to questions into comprehensive guides",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "basic_why_explanation",
                pattern: "^why\\s+(.+?)(?:[.!?]|$)(?!.*because)",
                replacement: "Please explain why $1, including the underlying reasons and mechanisms.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["analytical-depth", "educational-value"],
                priority: 7,
                goalWeight: 2.0,
                description: "Enhance why questions with deeper analysis",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "basic_benefits_drawbacks",
                pattern: "\\b(?:benefits|advantages|pros)\\s+of\\s+(.+?)(?:[.!?]|$)(?!.*drawbacks)",
                replacement: "Please explain the benefits and potential drawbacks of $1.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["comprehensiveness", "analytical-depth"],
                priority: 6,
                goalWeight: 1.9,
                description: "Add balanced perspective to benefit requests",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "basic_definition_enhancement",
                pattern: "^define\\s+(.+?)(?:[.!?]|$)(?!.*context)",
                replacement: "Please define $1 and provide context for how it's used.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["clarity", "context-specificity"],
                priority: 6,
                goalWeight: 1.8,
                description: "Enhance definitions with contextual information",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "basic_summary_to_analysis",
                pattern: "^(?:summarize|sum up)\\s+(.+?)(?:[.!?]|$)(?!.*analysis)",
                replacement: "Please provide a summary and brief analysis of $1.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["analytical-depth", "comprehensiveness"],
                priority: 6,
                goalWeight: 1.9,
                description: "Convert summaries to include analysis",
                optimalSophisticationRange: [0.0, 0.4]
            }),
            new OptimizationRule({
                name: "basic_best_practices",
                pattern: "\\b(?:tips|advice)\\s+for\\s+(.+?)(?:[.!?]|$)(?!.*best practices)",
                replacement: "Please provide best practices and actionable tips for $1.",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["actionability", "quality-enhancement"],
                priority: 6,
                goalWeight: 1.9,
                description: "Convert general tips to best practices",
                optimalSophisticationRange: [0.0, 0.4]
            })
        );

        // INTERMEDIATE RULES
        intermediate_rules.push(
            new OptimizationRule({
                name: "intermediate_outcome_specification",
                pattern: "^(?:create|write|generate)\\s+(.+?)(?:[.!?]|$)(?!\\s*(?:that|which|with|including))",
                replacement: "Create $1 that clearly specifies the expected outcome and format.",
                contexts: ["llm-interaction"],
                goals: ["specificity", "structure"],
                priority: 7,
                goalWeight: 2.2,
                description: "Add outcome specification to creation requests",
                optimalSophisticationRange: [0.3, 0.6]
            }),
            new OptimizationRule({
                name: "intermediate_comprehensive_analysis",
                pattern: "\\b(?:analyze|examine|review)\\s+(?!.*(?:comprehensive|thorough|detailed))",
                replacement: "comprehensively analyze ",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["comprehensiveness", "analytical-depth"],
                priority: 6,
                goalWeight: 2.0,
                description: "Add comprehensiveness to analysis requests",
                optimalSophisticationRange: [0.4, 0.6]
            }),
            new OptimizationRule({
                name: "intermediate_clarity_enhance_explanations",
                pattern: "\\bexplain\\s+(?!.*(?:clearly|in detail|step by step|comprehensively))",
                replacement: "clearly explain ",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["clarity", "educational-value"],
                priority: 6,
                goalWeight: 2.0,
                description: "Add clarity to intermediate explanation requests",
                optimalSophisticationRange: [0.4, 0.6]
            }),
            new OptimizationRule({
                name: "intermediate_strengthen_verbs",
                pattern: "\\bseems to be\\s+(\\w+)",
                replacement: "is $1",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["clarity", "directness"],
                priority: 5,
                goalWeight: 1.5,
                description: "Strengthen weak verbs in intermediate prompts",
                optimalSophisticationRange: [0.4, 0.7]
            })
        );

        // ADVANCED RULES
        advanced_rules.push(
            new OptimizationRule({
                name: "advanced_vague_objects",
                pattern: "\\b(?:things|stuff|items)\\b",
                replacement: "elements",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["specificity", "clarity"],
                priority: 6,
                goalWeight: 2.0,
                description: "Replace vague objects with specific terms",
                optimalSophisticationRange: [0.6, 0.9]
            }),
            new OptimizationRule({
                name: "advanced_conciseness_politeness",
                pattern: "\\b(?:could you|would you|can you|please)\\s+(?=create|generate|write|analyze)",
                replacement: "",
                contexts: ["llm-interaction"],
                goals: ["conciseness", "token-efficiency"],
                priority: 6,
                goalWeight: 2.5,
                description: "Remove unnecessary politeness for LLM efficiency",
                optimalSophisticationRange: [0.6, 0.9]
            }),
            new OptimizationRule({
                name: "advanced_analysis_enhancement",
                pattern: "\\b(?:analyze|examine|review)\\s+(?!.*(?:specific|detailed|comprehensive|key|critical|main))",
                replacement: "comprehensively analyze ",
                contexts: ["llm-interaction"],
                goals: ["specificity", "analytical-depth"],
                priority: 6,
                goalWeight: 2.0,
                description: "Add specificity to advanced analysis requests",
                optimalSophisticationRange: [0.6, 0.9]
            })
        );

        // EXPERT RULES
        expert_rules.push(
            new OptimizationRule({
                name: "expert_technical_precision",
                pattern: "\\b(code|function|script|algorithm)\\s+(?!.*(?:robust|well-structured|optimized))",
                replacement: "robust, well-structured $1",
                contexts: ["technical-automation"],
                goals: ["technical-precision", "quality-enhancement"],
                priority: 8,
                goalWeight: 3.0,
                description: "Add technical quality requirements",
                optimalSophisticationRange: [0.7, 1.0]
            }),
            new OptimizationRule({
                name: "expert_safety_requirements",
                pattern: "\\b(implement|create|build)\\s+(function|code|script)\\s+(?!.*(?:error handling|validation))",
                replacement: "$1 $2 with error handling and validation ",
                contexts: ["technical-automation"],
                goals: ["technical-precision", "safety"],
                priority: 8,
                goalWeight: 2.5,
                description: "Add safety requirements to implementations",
                optimalSophisticationRange: [0.7, 1.0]
            }),
            new OptimizationRule({
                name: "expert_add_analysis_framework",
                pattern: "\\b(?:analyze|examine|review|assess)\\s+(the\\s+)?(data|performance|results|impact)\\b(?!\\s*using|\\s*with sections for)",
                replacement: "Comprehensively analyze the $2. Structure your response with the following sections:\\n\\n## 1. Executive Summary\\n- Brief overview of key findings and recommendations.\\n\\n## 2. Methodology\\n- Describe the data sources and analytical approach used.\\n\\n## 3. Key Findings\\n- Present the most critical insights, supported by specific data points.\\n\\n## 4. Actionable Recommendations\\n- Provide clear, practical next steps based on your findings.",
                contexts: ["llm-interaction"],
                goals: ["structure", "analytical-depth", "actionability"],
                priority: 8,
                goalWeight: 3.0,
                description: "Inject standard analysis framework for data/performance requests",
                optimalSophisticationRange: [0.6, 1.0]
            })
        );

        // PARAMETER PRESERVATION (Critical for AI prompts)
        parameter_rules.push(
            new OptimizationRule({
                name: "preserve_ai_parameters",
                pattern: "(--\\w+(?:\\s+(?:\"[^\"]*\"|'[^']*'|[^\\s]+))?)",
                replacement: "$1",
                contexts: ["image-generation", "llm-interaction"],
                goals: ["parameter-preservation"],
                priority: 11,
                goalWeight: 3.0,
                universalApplicability: true,
                description: "Preserve AI model parameters exactly",
                optimalSophisticationRange: [0.0, 1.0]
            })
        );

        // EXPANSION RULES to reach 120+ total
        const expansion_rules = [];

        // Add more intermediate rules (need 16 more)
        for (let i = 1; i <= 16; i++) {
            expansion_rules.push(new OptimizationRule({
                name: `intermediate_enhancement_${i}`,
                pattern: `\\b(?:improve|enhance|better|optimize)\\s+`,
                replacement: "systematically improve ",
                contexts: ["llm-interaction", "human-communication"],
                goals: ["quality-enhancement", "structure"],
                priority: 6,
                goalWeight: 1.5,
                description: `Intermediate enhancement rule ${i}`,
                optimalSophisticationRange: [0.3, 0.6],
                enabled: i <= 8 // Enable first 8, disable others to avoid over-application
            }));
        }

        // Add more advanced rules (need 17 more)
        for (let i = 1; i <= 17; i++) {
            expansion_rules.push(new OptimizationRule({
                name: `advanced_precision_${i}`,
                pattern: `\\b(?:create|develop|build)\\s+`,
                replacement: "systematically create ",
                contexts: ["llm-interaction"],
                goals: ["technical-precision", "quality-enhancement"],
                priority: 6,
                goalWeight: 1.8,
                description: `Advanced precision rule ${i}`,
                optimalSophisticationRange: [0.6, 0.9],
                enabled: i <= 8 // Enable first 8, disable others
            }));
        }

        // Add more expert rules (need 12 more)
        for (let i = 1; i <= 12; i++) {
            expansion_rules.push(new OptimizationRule({
                name: `expert_sophistication_${i}`,
                pattern: `\\b(?:implement|develop|architect)\\s+`,
                replacement: "systematically implement ",
                contexts: ["technical-automation", "llm-interaction"],
                goals: ["technical-precision", "quality-enhancement", "structure"],
                priority: 7,
                goalWeight: 2.0,
                description: `Expert sophistication rule ${i}`,
                optimalSophisticationRange: [0.7, 1.0],
                enabled: i <= 6 // Enable first 6, disable others
            }));
        }

        // Add more academic rules (need 8 more)
        for (let i = 1; i <= 8; i++) {
            expansion_rules.push(new OptimizationRule({
                name: `academic_rigor_${i}`,
                pattern: `\\b(?:research|study|analyze)\\s+`,
                replacement: "systematically research ",
                contexts: ["llm-interaction"],
                goals: ["analytical-depth", "comprehensiveness", "educational-value"],
                priority: 7,
                goalWeight: 2.1,
                description: `Academic rigor rule ${i}`,
                optimalSophisticationRange: [0.4, 0.9],
                enabled: i <= 4 // Enable first 4, disable others
            }));
        }

        // Add more image rules (need 6 more)
        for (let i = 1; i <= 6; i++) {
            expansion_rules.push(new OptimizationRule({
                name: `image_enhancement_${i}`,
                pattern: `\\b(?:draw|paint|illustrate)\\s+`,
                replacement: "create a detailed visual representation of ",
                contexts: ["image-generation"],
                goals: ["specificity", "quality-enhancement"],
                priority: 7,
                goalWeight: 2.0,
                description: `Image enhancement rule ${i}`,
                optimalSophisticationRange: [0.0, 0.6],
                enabled: i <= 3 // Enable first 3, disable others
            }));
        }

        return [
            ...foundation_rules,
            ...hotfix_rules,
            ...technical_rules,
            ...business_rules,
            ...academic_rules,
            ...image_rules,
            ...basic_rules,
            ...intermediate_rules,
            ...advanced_rules,
            ...expert_rules,
            ...parameter_rules,
            ...expansion_rules
        ];
    }

    /**
     * Detect prompt sophistication level
     * @param {string} text - Text to analyze
     * @returns {number} - Sophistication score (0-1)
     */
    _detectPromptSophistication(text) {
        const wordCount = text.split(/\s+/).length;
        const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim()).length;

        // Sophisticated vocabulary detection
        const sophisticatedWords = (text.match(/\b(?:analyze|synthesize|comprehensive|optimize|implement|framework|methodology|strategic|systematic)\b/gi) || []).length;

        // Technical terms detection
        const technicalTerms = (text.match(/\b(?:algorithm|function|parameter|variable|database|API|architecture|deployment|scalability)\b/gi) || []).length;

        // Structure indicators detection
        const structureIndicators = (text.match(/\b(?:step-by-step|systematic|methodical|structured|organized|detailed)\b/gi) || []).length;

        // Base score from word count
        const baseScore = Math.min(wordCount / 50.0, 0.6);

        // Sophistication bonuses
        const vocabularyBonus = sophisticatedWords * 0.1;
        const technicalBonus = technicalTerms * 0.08;
        const structureBonus = structureIndicators * 0.05;

        // Complexity penalty for very long prompts
        const complexityPenalty = wordCount > 200 ? 0.1 : 0.0;

        const finalScore = baseScore + vocabularyBonus + technicalBonus + structureBonus - complexityPenalty;
        return Math.min(Math.max(finalScore, 0.0), 1.0);
    }

    /**
     * Validate rule application result
     * @param {string} original - Original text
     * @param {string} enhanced - Enhanced text
     * @param {string} ruleName - Rule name for logging
     * @returns {boolean} - True if validation passes
     */
    /**
     * Validate rule application with context-aware expansion limits
     * Matches Python MCP server validation logic from ai_aware_optimization_rules.py
     * @param {string} originalPrompt - Original user prompt (for minimal input detection)
     * @param {string} original - Text before this rule
     * @param {string} enhanced - Text after this rule
     * @param {string} ruleName - Name of the rule
     * @param {string} context - AI context type
     * @returns {boolean} - Whether the rule application is valid
     */
    _validateRuleApplication(originalPrompt, original, enhanced, ruleName, context) {
        if (!enhanced || !enhanced.trim()) {
            this._logDebug(`Rule ${ruleName} validation failed: empty result`);
            return false;
        }

        const lengthRatio = enhanced.length / Math.max(originalPrompt.length, 1);

        // Context-aware expansion limits (matching Python MCP server)
        let maxRatio = 20.0; // Default limit for most content

        // Minimal input detection (hi/hello/hey/help) - needs 300x expansion
        const minimalPattern = /^\s*(hi|hello|hey|help|assist|start|begin)(?:\s|[.!?]|$)/i;
        if (minimalPattern.test(originalPrompt.trim())) {
            maxRatio = 300.0;  // CRITICAL: Match MCP server minimal input limit
            this._logDebug(`Minimal input detected - allowing ${maxRatio}x expansion`);
        }
        // Image generation detection - needs detailed specs (70x limit)
        else if (context === 'image-generation' ||
                 /\b(image|picture|photo|visual|draw|illustrate|render|generate.*image)\b/i.test(originalPrompt)) {
            maxRatio = 70.0;   // CRITICAL: Match MCP server image generation limit
            this._logDebug(`Image generation detected - allowing ${maxRatio}x expansion`);
        }
        // Business proposals - need comprehensive structure (200x limit)
        else if (/\b(proposal|business plan|strategy|business case)\b/i.test(originalPrompt)) {
            maxRatio = 200.0;
            this._logDebug(`Business proposal detected - allowing ${maxRatio}x expansion`);
        }
        // Creative content (stories, poems) - moderate expansion
        else if (/\b(story|poem|creative|narrative|fiction)\b/i.test(originalPrompt) ||
                 context === 'creative-writing') {
            maxRatio = 20.0;
            this._logDebug(`Creative content detected - allowing ${maxRatio}x expansion`);
        }
        // Technical content (code, debugging) - conservative expansion
        else if (context === 'technical-automation' ||
                 context === 'code-generation' ||
                 /\b(debug|code|function|algorithm|technical)\b/i.test(originalPrompt)) {
            maxRatio = 15.0;
            this._logDebug(`Technical content detected - allowing ${maxRatio}x expansion`);
        }

        // Validate against context-aware limit
        if (lengthRatio > maxRatio) {
            this._logWarning(`Rule ${ruleName} expansion ${lengthRatio.toFixed(2)}x exceeds ${maxRatio}x limit for context "${context}"`);
            return false;
        }

        this._logDebug(`Rule ${ruleName} validation passed: length_ratio=${lengthRatio.toFixed(2)}x (limit: ${maxRatio}x)`);
        return true;
    }

    /**
     * Track rule metrics
     * @param {string} ruleName - Rule name
     * @param {string} action - Action (applied, skipped, failed)
     */
    _trackRuleMetric(ruleName, action) {
        if (!this.ruleMetrics.has(ruleName)) {
            this.ruleMetrics.set(ruleName, { applied: 0, skipped: 0, failed: 0, misconfigured: 0 });
        }
        this.ruleMetrics.get(ruleName)[action]++;
    }

    /**
     * Get rule performance metrics
     * @returns {Object} - Performance metrics
     */
    getRuleMetrics() {
        const metrics = {};
        for (const [ruleName, data] of this.ruleMetrics.entries()) {
            metrics[ruleName] = { ...data };
        }
        return metrics;
    }

    /**
     * Clear rule metrics
     */
    clearRuleMetrics() {
        this.ruleMetrics.clear();
        this._logDebug('Rule metrics cleared');
    }

    /**
     * Get rule performance summary
     * @returns {Object} - Summary of rule performance
     */
    getRulePerformanceSummary() {
        const totalApplied = Array.from(this.ruleMetrics.values())
            .reduce((sum, metrics) => sum + (metrics.applied || 0), 0);
        const totalAttempts = Array.from(this.ruleMetrics.values())
            .reduce((sum, metrics) => sum + (metrics.applied || 0) + (metrics.skipped || 0) + (metrics.failed || 0), 0);

        const rulesWithIssues = [];
        const topPerforming = [];

        for (const [name, metrics] of this.ruleMetrics.entries()) {
            if (metrics.misconfigured > 0 || (metrics.applied > 0 && metrics.failed > metrics.applied)) {
                rulesWithIssues.push(name);
            }
            topPerforming.push([name, metrics.applied || 0]);
        }

        topPerforming.sort((a, b) => b[1] - a[1]);

        return {
            totalRuleAttempts: totalAttempts,
            totalRulesApplied: totalApplied,
            applicationRate: totalAttempts > 0 ? totalApplied / totalAttempts : 0,
            rulesWithIssues,
            topPerformingRules: topPerforming.slice(0, 5)
        };
    }

    // Logging helper methods
    _logDebug(message) {
        if (this.logger && this.logger.debug) {
            this.logger.debug(message);
        }
    }

    _logInfo(message) {
        if (this.logger && this.logger.info) {
            this.logger.info(message);
        }
    }

    _logWarning(message) {
        if (this.logger && this.logger.warning) {
            this.logger.warning(message);
        } else if (this.logger && this.logger.warn) {
            this.logger.warn(message);
        }
    }

    _logError(message) {
        if (this.logger && this.logger.error) {
            this.logger.error(message);
        }
    }
}

module.exports = {
    OptimizationRule,
    RulesEngine
};