/**
 * ContentFilter - Filters inappropriate content from messages
 * Loads blocked words/phrases from external JSON file
 */

class ContentFilter {
    constructor() {
        this.blockedWords = [];
        this.blockedPhrases = [];
        this.replacements = {};
        this.warningPatterns = [];
        this.isLoaded = false;
        this.initPromise = this.loadFilter();
    }

    async loadFilter() {
        try {
            const response = await fetch('data/content-filter.json');
            const data = await response.json();
            
            this.blockedWords = data.blockedWords || [];
            this.blockedPhrases = data.blockedPhrases || [];
            this.replacements = data.replacements || {};
            this.warningPatterns = data.warningPatterns || [];
            this.isLoaded = true;
            
            console.log('Content filter loaded:', {
                blockedWords: this.blockedWords.length,
                blockedPhrases: this.blockedPhrases.length
            });
        } catch (error) {
            console.error('Failed to load content filter:', error);
            // Use minimal defaults if file fails to load
            this.blockedWords = ['porn', 'xxx', 'nude'];
            this.blockedPhrases = [];
            this.replacements = {};
            this.warningPatterns = [];
            this.isLoaded = true;
        }
    }

    async ensureLoaded() {
        if (!this.isLoaded) {
            await this.initPromise;
        }
    }

    /**
     * Check if text contains blocked content
     * @param {string} text - Text to check
     * @returns {object} - { isBlocked: boolean, reason: string }
     */
    async checkContent(text) {
        await this.ensureLoaded();
        
        const lowerText = text.toLowerCase();
        
        // Check blocked phrases first (more specific)
        for (const phrase of this.blockedPhrases) {
            if (lowerText.includes(phrase.toLowerCase())) {
                return {
                    isBlocked: true,
                    reason: 'This question contains content that isn\'t appropriate for our learning environment.'
                };
            }
        }
        
        // Check blocked words
        const words = lowerText.split(/\s+/);
        for (const word of words) {
            const cleanWord = word.replace(/[^a-z]/g, '');
            if (this.blockedWords.includes(cleanWord)) {
                return {
                    isBlocked: true,
                    reason: 'Please keep our conversation focused on math learning!'
                };
            }
        }
        
        return { isBlocked: false, reason: null };
    }

    /**
     * Filter and replace mild inappropriate words
     * @param {string} text - Text to filter
     * @returns {string} - Filtered text
     */
    async filterText(text) {
        await this.ensureLoaded();
        
        let filtered = text;
        
        // Apply replacements
        for (const [bad, good] of Object.entries(this.replacements)) {
            const regex = new RegExp(`\\b${bad}\\b`, 'gi');
            filtered = filtered.replace(regex, good);
        }
        
        return filtered;
    }

    /**
     * Check for warning patterns (like PII)
     * @param {string} text - Text to check
     * @returns {string|null} - Warning message or null
     */
    async checkWarnings(text) {
        await this.ensureLoaded();
        
        const lowerText = text.toLowerCase();
        
        for (const pattern of this.warningPatterns) {
            if (lowerText.includes(pattern.toLowerCase())) {
                return `Please don't share ${pattern} in our conversation.`;
            }
        }
        
        return null;
    }
}

// Export singleton instance
window.contentFilter = new ContentFilter();