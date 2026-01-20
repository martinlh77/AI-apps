/**
 * LanguageManager - Translation System
 * Loads language data from external JSON and handles dynamic translation
 */

class LanguageManager {
    constructor() {
        this.languages = {};
        this.currentLang = 'en';
        this.currentStrings = {};
        this.currentPrompts = {};
        this.initPromise = this.loadLanguages();
    }

    async loadLanguages() {
        try {
            const response = await fetch('data/languages.json');
            this.languages = await response.json();
            console.log('Languages loaded:', Object.keys(this.languages).length);
        } catch (error) {
            console.error('Failed to load languages:', error);
            this.languages = { en: this.getDefaultEnglish() };
        }
    }

    getDefaultEnglish() {
        return {
            code: 'en',
            name: 'English',
            dir: 'ltr',
            strings: {
                appTitle: "AI Math Tutor",
                appSubtitle: "Safe, Guided Learning",
                welcomeTitle: "Welcome to your Math Tutor!",
                welcomeDesc: "I'm here to help you understand math concepts.",
                promptsTitle: "🌟 Ask me about...",
                feat1: "Interactive graphs & charts",
                feat2: "2D & 3D visualizations",
                feat3: "Probability models",
                feat4: "Text-to-speech support",
                inputPlaceholder: "Ask a math question...",
                safetyBadge: "School-Safe AI",
                newChat: "New Chat"
            },
            prompts: {
                elementary: ["What is multiplication?"],
                middle: ["How do I solve for x?"],
                high: ["How do I factor quadratics?"],
                general: ["Explain derivatives"]
            }
        };
    }

    async applyLanguage(langCode) {
        await this.initPromise;

        if (this.languages[langCode]) {
            this.currentLang = langCode;
            this.currentStrings = this.languages[langCode].strings;
            this.currentPrompts = this.languages[langCode].prompts;
            this.updateUI();
            this.applyDirection(this.languages[langCode].dir);
        } else if (langCode !== 'en' && langCode !== 'other') {
            console.log(`Language ${langCode} not found, will need translation`);
            return false;
        }
        return true;
    }

    async translateAndApply(targetLang, apiBase, apiKey) {
        await this.initPromise;
        document.body.style.cursor = 'wait';

        const cacheKey = `lang_cache_${targetLang.toLowerCase().replace(/\s+/g, '_')}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                this.currentStrings = cachedData.strings;
                this.currentPrompts = cachedData.prompts;
                this.currentLang = targetLang;
                this.updateUI();
                document.body.style.cursor = 'default';
                return;
            } catch (e) {
                console.error('Cache parse error:', e);
            }
        }

        console.log(`Translating interface to ${targetLang}...`);

        const englishData = this.languages['en'];
        const toTranslate = {
            strings: englishData.strings,
            prompts: englishData.prompts
        };

        const prompt = `Translate this JSON to ${targetLang}. Keep the same keys, translate only the values. Output valid JSON only:\n${JSON.stringify(toTranslate)}`;

        try {
            const seed = Math.floor(Math.random() * 1000000);
            const url = `${apiBase}/${encodeURIComponent(prompt)}?model=gemini-fast&seed=${seed}&key=${apiKey}`;

            const response = await fetch(url);
            const text = await response.text();
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const translatedData = JSON.parse(jsonString);

            localStorage.setItem(cacheKey, JSON.stringify(translatedData));

            this.currentStrings = translatedData.strings;
            this.currentPrompts = translatedData.prompts;
            this.currentLang = targetLang;
            this.updateUI();

        } catch (error) {
            console.error("Translation failed:", error);
            alert(`Could not translate to ${targetLang}. Using English.`);
            this.applyLanguage('en');
        } finally {
            document.body.style.cursor = 'default';
        }
    }

    updateUI() {
        const s = this.currentStrings;
        const setIfExists = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setIfExists('app-title', s.appTitle);
        setIfExists('app-subtitle', s.appSubtitle);
        setIfExists('welcome-title', s.welcomeTitle);
        setIfExists('welcome-desc', s.welcomeDesc);
        setIfExists('prompts-title', s.promptsTitle);
        setIfExists('feat-1', s.feat1);
        setIfExists('feat-2', s.feat2);
        setIfExists('feat-3', s.feat3);
        setIfExists('feat-4', s.feat4);
        setIfExists('safety-badge', s.safetyBadge);
        setIfExists('new-chat-text', s.newChat);

        const input = document.getElementById('chat-input');
        if (input) input.placeholder = s.inputPlaceholder;
    }

    renderStarterPrompts(grade) {
        const grid = document.getElementById('prompts-grid');
        if (!grid) return;

        const prompts = this.currentPrompts?.[grade] || 
                       this.languages['en']?.prompts?.[grade] || [];

        grid.innerHTML = '';
        prompts.forEach(prompt => {
            const card = document.createElement('div');
            card.className = 'prompt-card';
            card.textContent = prompt;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.onclick = () => {
                const input = document.getElementById('chat-input');
                if (input) {
                    input.value = prompt;
                    input.focus();
                }
            };
            card.onkeypress = (e) => {
                if (e.key === 'Enter') card.click();
            };
            grid.appendChild(card);
        });
    }

    applyDirection(dir) {
        if (dir === 'rtl') {
            document.body.classList.add('rtl');
            document.documentElement.setAttribute('dir', 'rtl');
        } else {
            document.body.classList.remove('rtl');
            document.documentElement.setAttribute('dir', 'ltr');
        }
    }

    getString(key) {
        return this.currentStrings[key] || this.languages['en']?.strings?.[key] || key;
    }

    getLanguageCode() {
        return this.currentLang;
    }

    getLanguageName() {
        if (this.languages[this.currentLang]) {
            return this.languages[this.currentLang].name;
        }
        return this.currentLang;
    }
}
