/**
 * Context Detection System - Enhanced context detection with specific patterns
 * Matches Python implementation from ai_aware_optimization_rules.py
 */

class ContextDetector {
    constructor(logger = null) {
        this.logger = logger;
        this.MIN_CONFIDENCE = 0.3;
    }

    /**
     * Detect enhanced context patterns in text
     * @param {string} text - Text to analyze
     * @returns {Object} - Context scores by type
     */
    detectEnhancedContextPatterns(text) {
        const textLower = text.toLowerCase();
        const contextScores = {};

        // BUSINESS/PROFESSIONAL CONTEXT (Enhanced)
        const businessPatterns = {
            'strategy': ['strategic plan', 'business strategy', 'market analysis', 'competitive advantage'],
            'proposal': ['business proposal', 'project proposal', 'budget proposal', 'funding request'],
            'management': ['team management', 'project management', 'stakeholder management', 'risk management'],
            'analysis': ['financial analysis', 'market research', 'performance metrics', 'ROI analysis'],
            'communication': ['executive summary', 'stakeholder update', 'client presentation', 'board meeting']
        };

        let businessScore = 0;
        for (const [category, patterns] of Object.entries(businessPatterns)) {
            const matches = patterns.filter(pattern => textLower.includes(pattern)).length;
            businessScore += matches * 0.3;
        }

        // Add single-word business indicators
        const businessWords = ['revenue', 'profit', 'budget', 'stakeholder', 'client', 'customer', 'market', 'sales'];
        businessScore += businessWords.filter(word => textLower.includes(word)).length * 0.2;

        contextScores['business'] = Math.min(businessScore, 1.0);

        // ACADEMIC/RESEARCH CONTEXT (New)
        const academicPatterns = {
            'research': ['research paper', 'literature review', 'methodology', 'hypothesis', 'peer review'],
            'analysis': ['data analysis', 'statistical analysis', 'qualitative analysis', 'quantitative research'],
            'writing': ['thesis', 'dissertation', 'academic paper', 'journal article', 'conference paper'],
            'education': ['curriculum', 'lesson plan', 'learning objectives', 'assessment criteria']
        };

        let academicScore = 0;
        for (const [category, patterns] of Object.entries(academicPatterns)) {
            const matches = patterns.filter(pattern => textLower.includes(pattern)).length;
            academicScore += matches * 0.35;
        }

        const academicWords = ['study', 'research', 'analysis', 'findings', 'conclusion', 'methodology', 'bibliography'];
        academicScore += academicWords.filter(word => textLower.includes(word)).length * 0.15;

        contextScores['academic'] = Math.min(academicScore, 1.0);

        // CREATIVE CONTEXT (Enhanced)
        const creativePatterns = {
            'writing': ['creative writing', 'story', 'narrative', 'character development', 'plot'],
            'content': ['blog post', 'article', 'newsletter', 'social media', 'marketing copy'],
            'design': ['design brief', 'creative brief', 'brand guidelines', 'visual identity'],
            'media': ['video script', 'podcast', 'documentary', 'advertisement']
        };

        let creativeScore = 0;
        for (const [category, patterns] of Object.entries(creativePatterns)) {
            const matches = patterns.filter(pattern => textLower.includes(pattern)).length;
            creativeScore += matches * 0.4;
        }

        const creativeWords = ['creative', 'original', 'engaging', 'compelling', 'innovative', 'artistic'];
        creativeScore += creativeWords.filter(word => textLower.includes(word)).length * 0.2;

        contextScores['creative'] = Math.min(creativeScore, 1.0);

        // IMAGE GENERATION CONTEXT (Enhanced)
        const imagePatterns = {
            'style': ['photorealistic', 'artistic style', 'digital art', 'illustration', 'painting style'],
            'technical': ['--ar', '--style', '--v', 'aspect ratio', 'resolution', 'quality'],
            'composition': ['composition', 'lighting', 'perspective', 'depth of field', 'framing'],
            'subjects': ['portrait', 'landscape', 'still life', 'architectural', 'product photo']
        };

        let imageScore = 0;
        for (const [category, patterns] of Object.entries(imagePatterns)) {
            const matches = patterns.filter(pattern => textLower.includes(pattern)).length;
            imageScore += matches * 0.4;
        }

        const imageWords = ['image', 'picture', 'photo', 'visual', 'draw', 'create', 'generate'];
        imageScore += imageWords.filter(word => textLower.includes(word)).length * 0.25;

        contextScores['image'] = Math.min(imageScore, 1.0);

        // TECHNICAL CONTEXT (Enhanced)
        const technicalPatterns = {
            'programming': ['function', 'script', 'algorithm', 'code', 'programming'],
            'debugging': ['debug', 'error', 'bug', 'fix', 'troubleshoot'],
            'documentation': ['documentation', 'API', 'guide', 'manual', 'reference'],
            'development': ['development', 'implementation', 'deployment', 'testing']
        };

        let technicalScore = 0;
        for (const [category, patterns] of Object.entries(technicalPatterns)) {
            const matches = patterns.filter(pattern => textLower.includes(pattern)).length;
            technicalScore += matches * 0.4;
        }

        const technicalWords = ['technical', 'code', 'software', 'system', 'database', 'API'];
        technicalScore += technicalWords.filter(word => textLower.includes(word)).length * 0.2;

        contextScores['technical'] = Math.min(technicalScore, 1.0);

        return contextScores;
    }

    /**
     * Get primary context from context scores with confidence threshold
     * @param {Object} contextScores - Context scores by type
     * @returns {string} - Primary context type
     */
    getPrimaryContextFromScores(contextScores) {
        // Get highest scoring context above threshold
        const validContexts = Object.fromEntries(
            Object.entries(contextScores).filter(([, score]) => score >= this.MIN_CONFIDENCE)
        );

        if (Object.keys(validContexts).length === 0) {
            return 'general';
        }

        const primaryContext = Object.keys(validContexts).reduce((a, b) => 
            validContexts[a] > validContexts[b] ? a : b
        );
        const confidence = validContexts[primaryContext];

        this._logDebug(`Primary context: ${primaryContext} (confidence: ${confidence.toFixed(2)})`);
        return primaryContext;
    }

    /**
     * Detect AI context for given text
     * @param {string} text - Text to analyze
     * @returns {Object} - AI context result
     */
    async detectContext(text) {
        const contextScores = this.detectEnhancedContextPatterns(text);
        const primaryContext = this.getPrimaryContextFromScores(contextScores);
        
        // Map internal contexts to AI context types
        const contextMapping = {
            'business': 'human-communication',
            'academic': 'llm-interaction',
            'creative': 'llm-interaction',
            'image': 'image-generation',
            'technical': 'technical-automation',
            'general': 'llm-interaction'
        };

        const aiContext = contextMapping[primaryContext] || 'llm-interaction';
        const confidence = contextScores[primaryContext] || 0.1;

        return {
            primaryContext: aiContext,
            secondaryContexts: [],
            confidence: confidence,
            reasoning: {
                detectedPattern: primaryContext,
                contextScores: contextScores,
                method: 'enhanced_pattern_detection'
            },
            contextWeights: contextScores,
            detectionMetadata: {
                textLength: text.length,
                wordCount: text.split(/\s+/).length,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Get list of supported AI contexts
     * @returns {Array<string>} - Supported context types
     */
    getSupportedContexts() {
        return [
            'llm-interaction',
            'technical-automation',
            'code-generation',
            'human-communication',
            'image-generation',
            'structured-output',
            'api-automation'
        ];
    }

    /**
     * Validate if context is appropriate for the text
     * @param {string} context - AI context type
     * @param {string} text - Text to validate against
     * @returns {boolean} - True if context is appropriate
     */
    async validateContext(context, text) {
        try {
            const detectedContext = await this.detectContext(text);
            return detectedContext.primaryContext === context || 
                   detectedContext.confidence < this.MIN_CONFIDENCE;
        } catch (error) {
            this._logError(`Error validating context: ${error.message}`);
            return false;
        }
    }

    /**
     * Get metadata about analysis capabilities
     * @returns {Object} - Analysis metadata
     */
    getAnalysisMetadata() {
        return {
            supportedContexts: this.getSupportedContexts(),
            minConfidenceThreshold: this.MIN_CONFIDENCE,
            patternCategories: [
                'business', 'academic', 'creative', 'image', 'technical'
            ],
            version: '1.0.0'
        };
    }

    // Logging helper methods
    _logDebug(message) {
        if (this.logger && this.logger.debug) {
            this.logger.debug(`[ContextDetector] ${message}`);
        }
    }

    _logError(message) {
        if (this.logger && this.logger.error) {
            this.logger.error(`[ContextDetector] ${message}`);
        }
    }
}

module.exports = {
    ContextDetector
};