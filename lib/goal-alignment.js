/**
 * Goal Alignment Calculator - Core optimization goal scoring system
 * Implements weighted goal matching with partial credit scoring
 * Matches Python implementation from ai_aware_optimization_rules.py
 */

// Goal importance weights based on frequency of user requests
const GOAL_WEIGHTS = {
    'clarity': 1.0,                    // Most commonly requested
    'actionability': 1.0,              // Very common in user requests
    'structure': 0.9,                  // Frequently requested
    'comprehensiveness': 0.8,          // Often requested for complex tasks
    'quality-enhancement': 0.7,        // Common for content creation
    'specificity': 0.7,               // Important for detailed requests
    'creative-enhancement': 0.6,       // For creative tasks
    'technical-precision': 0.6,        // For technical contexts
    'analytical-depth': 0.5,          // For analysis tasks
    'educational-value': 0.5,         // For learning-focused requests
    'professionalism': 0.4,           // Less commonly explicit
    'safety': 0.4,                   // Important but implicit
    'conciseness': 0.3,              // Sometimes requested
    'token-efficiency': 0.2,         // Rarely explicit
    'parameter-preservation': 0.2,    // Context-specific
    'persuasiveness': 0.6,           // For marketing/sales content
    'context-specificity': 0.5,     // For contextual requests
    'outcome-specification': 0.5,    // For specific outcomes
    'confidence': 0.4,               // For decisive language
    'directness': 0.4,               // For clear communication
};

// Goal relationships for partial credit scoring
const GOAL_RELATIONSHIPS = {
    'clarity': ['comprehensiveness', 'structure', 'educational-value', 'specificity'],
    'actionability': ['structure', 'specificity', 'technical-precision', 'clarity'],
    'structure': ['clarity', 'comprehensiveness', 'actionability', 'specificity'],
    'comprehensiveness': ['clarity', 'analytical-depth', 'quality-enhancement', 'educational-value'],
    'technical-precision': ['actionability', 'safety', 'quality-enhancement', 'specificity'],
    'quality-enhancement': ['comprehensiveness', 'technical-precision', 'professionalism', 'creative-enhancement'],
    'creative-enhancement': ['quality-enhancement', 'comprehensiveness', 'specificity'],
    'analytical-depth': ['comprehensiveness', 'structure', 'educational-value'],
    'specificity': ['clarity', 'actionability', 'technical-precision', 'structure'],
    'persuasiveness': ['quality-enhancement', 'structure', 'professionalism'],
    'educational-value': ['clarity', 'comprehensiveness', 'structure', 'analytical-depth'],
    'professionalism': ['quality-enhancement', 'structure', 'clarity'],
    'safety': ['technical-precision', 'quality-enhancement'],
    'conciseness': ['clarity', 'token-efficiency'],
    'token-efficiency': ['conciseness', 'directness'],
    'parameter-preservation': ['technical-precision', 'safety'],
    'context-specificity': ['clarity', 'actionability', 'specificity'],
    'outcome-specification': ['specificity', 'actionability', 'structure'],
    'confidence': ['directness', 'clarity'],
    'directness': ['clarity', 'confidence', 'conciseness']
};

class GoalAlignmentCalculator {
    constructor(logger = null) {
        this.logger = logger;
        this.ruleMetrics = new Map();
    }

    /**
     * Calculate goal alignment score for a rule against user goals
     * @param {string} ruleName - Name of the optimization rule
     * @param {Array<string>} userGoals - List of user optimization goals
     * @param {Array<string>} ruleGoals - Goals that the rule addresses
     * @returns {number} - Alignment score between 0.0 and 1.0
     */
    calculateScore(ruleName, userGoals, ruleGoals) {
        if (!ruleGoals || ruleGoals.length === 0) {
            // Foundation/universal rules get high baseline score
            if (ruleName.includes('foundation') || ruleName.includes('universal')) {
                return 0.8;
            }
            this._logWarning(ruleName, `Rule missing target goals; using default score 0.4`);
            this._trackMisconfigured(ruleName);
            return 0.4;
        }

        const directMatches = new Set(userGoals.filter(goal => ruleGoals.includes(goal)));

        if (directMatches.size === 0) {
            // Check for related goal matches (partial credit)
            let relatedScore = 0;
            for (const userGoal of userGoals) {
                const relatedGoals = GOAL_RELATIONSHIPS[userGoal] || [];
                const relatedMatches = relatedGoals.filter(goal => ruleGoals.includes(goal));
                if (relatedMatches.length > 0) {
                    // Give 40% credit for related goals
                    const relatedWeight = relatedMatches.reduce(
                        (sum, goal) => sum + (GOAL_WEIGHTS[goal] || 0.5), 0
                    );
                    relatedScore += relatedWeight * 0.4;
                }
            }

            if (relatedScore > 0) {
                // Normalize related score and ensure minimum threshold
                const totalTargetWeight = ruleGoals.reduce(
                    (sum, goal) => sum + (GOAL_WEIGHTS[goal] || 0.5), 0
                );
                const finalScore = Math.min(relatedScore / totalTargetWeight, 0.5);
                const result = Math.max(finalScore, 0.1); // Minimum for related matches
                this._logDebug(ruleName, `Related goal alignment: ${result.toFixed(2)} (0 direct, related matches found)`);
                return result;
            } else {
                return 0.0;
            }
        }

        // Calculate weighted match score for direct matches
        const totalMatchWeight = Array.from(directMatches).reduce(
            (sum, goal) => sum + (GOAL_WEIGHTS[goal] || 0.5), 0
        );
        const totalTargetWeight = ruleGoals.reduce(
            (sum, goal) => sum + (GOAL_WEIGHTS[goal] || 0.5), 0
        );

        const weightedScore = totalMatchWeight / totalTargetWeight;

        // Bonus for covering multiple user goals
        const coverageBonus = userGoals.length > 0 ? (directMatches.size / userGoals.length) * 0.2 : 0;

        // Additional related goal bonus
        let relatedBonus = 0;
        for (const userGoal of userGoals) {
            if (!directMatches.has(userGoal)) {
                const relatedGoals = GOAL_RELATIONSHIPS[userGoal] || [];
                const relatedMatches = relatedGoals.filter(goal => ruleGoals.includes(goal));
                if (relatedMatches.length > 0) {
                    relatedBonus += 0.1; // Small bonus for related goals
                }
            }
        }

        // Combine scores
        let finalScore = weightedScore + coverageBonus + Math.min(relatedBonus, 0.3);

        // Minimum score for any direct match (prevents complete exclusion)
        finalScore = Math.max(finalScore, 0.15);

        this._logDebug(ruleName, `Weighted goal alignment: ${finalScore.toFixed(2)} (matched ${directMatches.size}/${ruleGoals.length} goals, coverage: ${coverageBonus.toFixed(2)})`);
        return Math.min(finalScore, 1.0);
    }

    /**
     * Get dynamic threshold based on rule characteristics
     * @param {Object} rule - Optimization rule object
     * @param {string} context - AI context type
     * @param {number} sophistication - Sophistication score
     * @returns {number} - Dynamic threshold value
     */
    getDynamicThreshold(rule, context, sophistication) {
        // Foundation rules have very low threshold
        if (rule.universalApplicability || rule.name.includes('foundation')) {
            return 0.01;
        }

        // High-priority rules get lower threshold
        if (rule.priority >= 10) {
            return 0.05;
        }

        // Rules with many goals get lower threshold (they're harder to match)
        const numGoals = rule.goals ? rule.goals.length : 0;
        if (numGoals >= 5) {
            return 0.06;  // Very low for complex rules
        } else if (numGoals >= 4) {
            return 0.08;
        } else if (numGoals >= 3) {
            return 0.10;
        } else {
            return 0.12;  // Higher threshold for simple rules
        }

        // Context-specific thresholds
        if (rule.contexts && rule.contexts.includes(context)) {
            return 0.08;  // Lower threshold for context-matched rules
        }

        // Hotfix rules get special treatment
        if (rule.name.includes('hotfix')) {
            return 0.05;
        }

        return 0.08; // Default fallback threshold
    }

    /**
     * Get rule performance metrics
     * @returns {Object} - Performance metrics by rule
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
        this._logDebug('goal-alignment', 'Rule metrics cleared');
    }

    /**
     * Get performance summary
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

    // Private helper methods
    _logDebug(ruleName, message) {
        if (this.logger && this.logger.debug) {
            this.logger.debug(`Rule ${ruleName}: ${message}`);
        }
    }

    _logWarning(ruleName, message) {
        if (this.logger && this.logger.warning) {
            this.logger.warning(`Rule ${ruleName}: ${message}`);
        }
    }

    _trackMisconfigured(ruleName) {
        if (!this.ruleMetrics.has(ruleName)) {
            this.ruleMetrics.set(ruleName, { applied: 0, skipped: 0, failed: 0, misconfigured: 0 });
        }
        this.ruleMetrics.get(ruleName).misconfigured++;
    }
}

module.exports = {
    GoalAlignmentCalculator,
    GOAL_WEIGHTS,
    GOAL_RELATIONSHIPS
};
