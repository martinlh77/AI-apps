/**
 * LanguageManager - Translation System
 * Handles UI strings in 8+ languages with dynamic translation
 */

class LanguageManager {
    constructor() {
        // Master English strings
        this.masterStrings = {
            appTitle: "AI Math Tutor",
            appSubtitle: "Safe, Guided Learning",
            welcomeTitle: "Welcome to your Math Tutor!",
            welcomeDesc: "I'm here to help you understand math concepts. I won't just give you the answers—I want to help you learn how to solve problems yourself!",
            promptsTitle: "🌟 Ask me about...",
            feat1: "Ask specific questions",
            feat2: "Get step-by-step help",
            feat3: "Check your work",
            feat4: "Learn real-world examples",
            inputPlaceholder: "Ask a math question...",
            safetyBadge: "School-Safe AI",
            newChat: "New Chat",
            
            // Grade-specific prompts
            prompts: {
                elementary: [
                    "What is multiplication?",
                    "How do fractions work?",
                    "Explain shapes to me",
                    "How do I tell time?",
                    "What is area and perimeter?",
                    "Help me count by 5s",
                    "What are even and odd numbers?",
                    "Show me how to add big numbers"
                ],
                middle: [
                    "How do I solve for x?",
                    "What is a coordinate plane?",
                    "Explain ratios and proportions",
                    "What is slope?",
                    "How do percentages work?",
                    "What are exponents?",
                    "Explain negative numbers",
                    "What is the Pythagorean theorem?"
                ],
                high: [
                    "How do I factor quadratics?",
                    "Explain the quadratic formula",
                    "What is trigonometry?",
                    "How do logarithms work?",
                    "What are polynomials?",
                    "Explain function transformations",
                    "What is the unit circle?",
                    "How do I graph inequalities?"
                ],
                general: [
                    "Explain derivatives",
                    "What is integration?",
                    "How do matrices work?",
                    "What is a limit?",
                    "Explain statistical distributions",
                    "What are vectors?",
                    "How does optimization work?",
                    "What is linear algebra?"
                ]
            }
        };

        // Built-in translations (fast)
        this.builtInTranslations = {
            es: {
                welcomeTitle: "¡Bienvenido a tu Tutor de Matemáticas!",
                welcomeDesc: "¡Estoy aquí para ayudarte a entender conceptos matemáticos. No solo te daré las respuestas, ¡quiero ayudarte a aprender a resolver problemas tú mismo!",
                promptsTitle: "🌟 Pregúntame sobre...",
                feat1: "Haz preguntas específicas",
                feat2: "Obtén ayuda paso a paso",
                feat3: "Revisa tu trabajo",
                feat4: "Aprende ejemplos del mundo real",
                inputPlaceholder: "Haz una pregunta de matemáticas...",
                safetyBadge: "IA Segura para la Escuela",
                newChat: "Nuevo Chat"
            },
            ar: {
                welcomeTitle: "مرحباً بك في مدرس الرياضيات الخاص بك!",
                welcomeDesc: "أنا هنا لمساعدتك على فهم مفاهيم الرياضيات. لن أعطيك الإجابات فحسب، أريد مساعدتك على تعلم حل المشكلات بنفسك!",
                promptsTitle: "🌟 اسألني عن...",
                feat1: "اطرح أسئلة محددة",
                feat2: "احصل على مساعدة خطوة بخطوة",
                feat3: "تحقق من عملك",
                feat4: "تعلم أمثلة من العالم الحقيقي",
                inputPlaceholder: "اطرح سؤالاً رياضياً...",
                safetyBadge: "ذكاء اصطناعي آمن للمدرسة",
                newChat: "محادثة جديدة"
            },
            fr: {
                welcomeTitle: "Bienvenue dans votre Tuteur de Maths !",
                welcomeDesc: "Je suis là pour vous aider à comprendre les concepts mathématiques. Je ne vais pas seulement vous donner les réponses, je veux vous aider à apprendre à résoudre les problèmes par vous-même !",
                promptsTitle: "🌟 Demandez-moi...",
                feat1: "Posez des questions spécifiques",
                feat2: "Obtenez de l'aide étape par étape",
                feat3: "Vérifiez votre travail",
                feat4: "Apprenez des exemples concrets",
                inputPlaceholder: "Posez une question de maths...",
                safetyBadge: "IA Sûre pour l'École",
                newChat: "Nouvelle Discussion"
            },
            de: {
                welcomeTitle: "Willkommen bei deinem Mathetutor!",
                welcomeDesc: "Ich bin hier, um dir zu helfen, mathematische Konzepte zu verstehen. Ich werde dir nicht einfach die Antworten geben – ich möchte dir helfen zu lernen, wie du Probleme selbst löst!",
                promptsTitle: "🌟 Frage mich nach...",
                feat1: "Stelle spezifische Fragen",
                feat2: "Erhalte Schritt-für-Schritt-Hilfe",
                feat3: "Überprüfe deine Arbeit",
                feat4: "Lerne reale Beispiele",
                inputPlaceholder: "Stelle eine Mathefrage...",
                safetyBadge: "Schul-Sichere KI",
                newChat: "Neuer Chat"
            },
            ru: {
                welcomeTitle: "Добро пожаловать к репетитору по математике!",
                welcomeDesc: "Я здесь, чтобы помочь вам понять математические концепции. Я не просто дам вам ответы — я хочу помочь вам научиться решать задачи самостоятельно!",
                promptsTitle: "🌟 Спросите меня о...",
                feat1: "Задавайте конкретные вопросы",
                feat2: "Получите пошаговую помощь",
                feat3: "Проверьте свою работу",
                feat4: "Узнайте примеры из реальной жизни",
                inputPlaceholder: "Задайте вопрос по математике...",
                safetyBadge: "Безопасный ИИ для Школы",
                newChat: "Новый чат"
            },
            it: {
                welcomeTitle: "Benvenuto nel tuo Tutore di Matematica!",
                welcomeDesc: "Sono qui per aiutarti a capire i concetti matematici. Non ti darò solo le risposte, voglio aiutarti ad imparare a risolvere i problemi da solo!",
                promptsTitle: "🌟 Chiedimi di...",
                feat1: "Fai domande specifiche",
                feat2: "Ottieni aiuto passo dopo passo",
                feat3: "Verifica il tuo lavoro",
                feat4: "Impara esempi dal mondo reale",
                inputPlaceholder: "Fai una domanda di matematica...",
                safetyBadge: "IA Sicura per la Scuola",
                newChat: "Nuova Chat"
            },
            pt: {
                welcomeTitle: "Bem-vindo ao seu Tutor de Matemática!",
                welcomeDesc: "Estou aqui para ajudá-lo a entender conceitos matemáticos. Não vou apenas dar as respostas, quero ajudá-lo a aprender a resolver problemas sozinho!",
                promptsTitle: "🌟 Pergunte-me sobre...",
                feat1: "Faça perguntas específicas",
                feat2: "Obtenha ajuda passo a passo",
                feat3: "Verifique seu trabalho",
                feat4: "Aprenda exemplos do mundo real",
                inputPlaceholder: "Faça uma pergunta de matemática...",
                safetyBadge: "IA Segura para a Escola",
                newChat: "Novo Chat"
            }
        };

        this.currentStrings = this.masterStrings;
    }

    async applyLanguage(lang) {
        if (this.builtInTranslations[lang]) {
            this.currentStrings = { 
                ...this.masterStrings, 
                ...this.builtInTranslations[lang] 
            };
        } else if (lang !== 'en') {
            // Will be handled by translateAndApply
            return;
        } else {
            this.currentStrings = this.masterStrings;
        }

        this.updateUI();
        this.applyRTL(lang);
    }

    async translateAndApply(targetLang, apiBase, apiKey) {
        document.body.style.cursor = 'wait';
        const cacheKey = `lang_cache_${targetLang.toLowerCase().replace(/\s+/g, '_')}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            try {
                this.currentStrings = JSON.parse(cached);
                this.updateUI();
                document.body.style.cursor = 'default';
                return;
            } catch (e) {
                console.error('Cache parse error:', e);
            }
        }

        console.log(`Translating interface to ${targetLang}...`);
        
        // Simplified translation request
        const stringsToTranslate = {
            welcomeTitle: this.masterStrings.welcomeTitle,
            welcomeDesc: this.masterStrings.welcomeDesc,
            promptsTitle: this.masterStrings.promptsTitle,
            feat1: this.masterStrings.feat1,
            feat2: this.masterStrings.feat2,
            feat3: this.masterStrings.feat3,
            feat4: this.masterStrings.feat4,
            inputPlaceholder: this.masterStrings.inputPlaceholder,
            safetyBadge: this.masterStrings.safetyBadge,
            newChat: this.masterStrings.newChat
        };

        const prompt = `Translate this JSON to ${targetLang}. Output valid JSON only:\n${JSON.stringify(stringsToTranslate)}`;

        try {
            const seed = Math.floor(Math.random() * 1000000);
            const url = `${apiBase}/${encodeURIComponent(prompt)}?model=nova-micro&seed=${seed}&key=${apiKey}`;
            
            const response = await fetch(url);
            const text = await response.text();
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const translatedData = JSON.parse(jsonString);

            const fullTranslation = { ...this.masterStrings, ...translatedData };
            localStorage.setItem(cacheKey, JSON.stringify(fullTranslation));
            
            this.currentStrings = fullTranslation;
            this.updateUI();

        } catch (error) {
            console.error("Translation failed:", error);
            alert(`Could not translate to ${targetLang}. Using English.`);
            this.currentStrings = this.masterStrings;
            this.updateUI();
        } finally {
            document.body.style.cursor = 'default';
        }
    }

    updateUI() {
        const s = this.currentStrings;
        
        document.getElementById('app-title').textContent = s.appTitle;
        document.getElementById('app-subtitle').textContent = s.appSubtitle;
        document.getElementById('welcome-title').textContent = s.welcomeTitle;
        document.getElementById('welcome-desc').textContent = s.welcomeDesc;
        document.getElementById('prompts-title').textContent = s.promptsTitle;
        document.getElementById('feat-1').textContent = s.feat1;
        document.getElementById('feat-2').textContent = s.feat2;
        document.getElementById('feat-3').textContent = s.feat3;
        document.getElementById('feat-4').textContent = s.feat4;
        document.getElementById('chat-input').placeholder = s.inputPlaceholder;
        document.getElementById('safety-badge').textContent = s.safetyBadge;
        document.getElementById('new-chat-text').textContent = s.newChat;
    }

    renderStarterPrompts(grade) {
        const grid = document.getElementById('prompts-grid');
        const prompts = this.currentStrings.prompts?.[grade] || this.masterStrings.prompts[grade];
        
        grid.innerHTML = '';
        prompts.forEach(prompt => {
            const card = document.createElement('div');
            card.className = 'prompt-card';
            card.textContent = prompt;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.onclick = () => {
                document.getElementById('chat-input').value = prompt;
                document.getElementById('chat-input').focus();
            };
            card.onkeypress = (e) => {
                if (e.key === 'Enter') card.click();
            };
            grid.appendChild(card);
        });
    }

    applyRTL(lang) {
        if (lang === 'ar') {
            document.body.classList.add('rtl');
            document.documentElement.setAttribute('dir', 'rtl');
        } else {
            document.body.classList.remove('rtl');
            document.documentElement.setAttribute('dir', 'ltr');
        }
    }
}