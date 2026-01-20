/**
 * ConversationManager - Save, load, and manage chat conversations locally
 * Stores conversations with messages and images in localStorage/IndexedDB
 */

class ConversationManager {
    constructor() {
        this.dbName = 'MathTutorDB';
        this.storeName = 'conversations';
        this.db = null;
        this.initPromise = this.initDB();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            
            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                // Fallback to localStorage
                this.db = null;
                resolve();
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('name', 'name', { unique: false });
                }
            };
        });
    }

    async ensureDB() {
        await this.initPromise;
    }

    generateId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Save current conversation
     * @param {object} data - { name, messages, images, grade, lang }
     * @returns {string} - Conversation ID
     */
    async saveConversation(data) {
        await this.ensureDB();
        
        const conversation = {
            id: data.id || this.generateId(),
            name: data.name || 'Conversation ' + new Date().toLocaleString(),
            date: new Date().toISOString(),
            messages: data.messages || [],
            images: data.images || {},
            grade: data.grade || 'middle',
            lang: data.lang || 'en'
        };
        
        if (this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(conversation);
                
                request.onsuccess = () => resolve(conversation.id);
                request.onerror = () => reject(request.error);
            });
        } else {
            // Fallback to localStorage
            const conversations = this.getLocalStorageConversations();
            const index = conversations.findIndex(c => c.id === conversation.id);
            
            if (index >= 0) {
                conversations[index] = conversation;
            } else {
                conversations.push(conversation);
            }
            
            // Limit storage size
            while (conversations.length > 20) {
                conversations.shift();
            }
            
            localStorage.setItem('mathTutorConversations', JSON.stringify(conversations));
            return conversation.id;
        }
    }

    /**
     * Get all saved conversations
     * @returns {Array} - List of conversation summaries
     */
    async getConversations() {
        await this.ensureDB();
        
        if (this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const conversations = request.result.map(c => ({
                        id: c.id,
                        name: c.name,
                        date: c.date,
                        messageCount: c.messages.length
                    }));
                    // Sort by date descending
                    conversations.sort((a, b) => new Date(b.date) - new Date(a.date));
                    resolve(conversations);
                };
                request.onerror = () => reject(request.error);
            });
        } else {
            const conversations = this.getLocalStorageConversations();
            return conversations.map(c => ({
                id: c.id,
                name: c.name,
                date: c.date,
                messageCount: c.messages.length
            })).sort((a, b) => new Date(b.date) - new Date(a.date));
        }
    }

    /**
     * Load a specific conversation
     * @param {string} id - Conversation ID
     * @returns {object|null} - Full conversation data
     */
    async loadConversation(id) {
        await this.ensureDB();
        
        if (this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(id);
                
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } else {
            const conversations = this.getLocalStorageConversations();
            return conversations.find(c => c.id === id) || null;
        }
    }

    /**
     * Delete a conversation
     * @param {string} id - Conversation ID
     */
    async deleteConversation(id) {
        await this.ensureDB();
        
        if (this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete(id);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } else {
            const conversations = this.getLocalStorageConversations();
            const filtered = conversations.filter(c => c.id !== id);
            localStorage.setItem('mathTutorConversations', JSON.stringify(filtered));
        }
    }

    /**
     * Rename a conversation
     * @param {string} id - Conversation ID
     * @param {string} newName - New name
     */
    async renameConversation(id, newName) {
        await this.ensureDB();
        
        const conversation = await this.loadConversation(id);
        if (conversation) {
            conversation.name = newName;
            await this.saveConversation(conversation);
        }
    }

    getLocalStorageConversations() {
        try {
            const data = localStorage.getItem('mathTutorConversations');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Export conversation as JSON file
     * @param {string} id - Conversation ID
     */
    async exportConversation(id) {
        const conversation = await this.loadConversation(id);
        if (!conversation) return;
        
        const blob = new Blob([JSON.stringify(conversation, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${conversation.name.replace(/[^a-z0-9]/gi, '_')}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Import conversation from JSON file
     * @param {File} file - JSON file
     * @returns {string} - New conversation ID
     */
    async importConversation(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    // Generate new ID to avoid conflicts
                    data.id = this.generateId();
                    data.name = data.name + ' (imported)';
                    const id = await this.saveConversation(data);
                    resolve(id);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }
}

// Export singleton instance
window.conversationManager = new ConversationManager();