/**
 * AppLoader - Dynamic App Loading System
 * Loads apps on-demand with dependency management
 */

class AppLoader {
    constructor() {
        this.manifest = null;
        this.loadedScripts = new Set();
        this.loadedStyles = new Set();
        this.initPromise = this.loadManifest();
    }

    async loadManifest() {
        try {
            const response = await fetch('manifest.json');
            this.manifest = await response.json();
            console.log('Manifest loaded:', this.manifest.version);
        } catch (error) {
            console.error('Failed to load manifest:', error);
            this.manifest = { apps: [] };
        }
    }

    /**
     * Load an app dynamically
     * @param {string} appId - App identifier (e.g., "CoordinateGrid")
     * @returns {Promise}
     */
    async loadApp(appId) {
        await this.initPromise; // Ensure manifest is loaded

        const appConfig = this.manifest.apps.find(app => app.id === appId);
        if (!appConfig) {
            throw new Error(`App "${appId}" not found in manifest`);
        }

        console.log(`Loading app: ${appId}`);

        // Load dependencies first
        if (appConfig.dependencies && appConfig.dependencies.length > 0) {
            for (const dep of appConfig.dependencies) {
                await this.loadLibrary(dep);
            }
        }

        // Load CSS
        if (appConfig.css && !this.loadedStyles.has(appConfig.css)) {
            await this.loadStylesheet(appConfig.css);
            this.loadedStyles.add(appConfig.css);
        }

        // Load JavaScript
        if (appConfig.file && !this.loadedScripts.has(appConfig.file)) {
            await this.loadScript(appConfig.file);
            this.loadedScripts.add(appConfig.file);
        }

        console.log(`App ${appId} loaded successfully`);
    }

    /**
     * Load external library
     * @param {string} libraryName - Library identifier from manifest
     * @returns {Promise}
     */
    async loadLibrary(libraryName) {
        if (!this.manifest.libraries || !this.manifest.libraries[libraryName]) {
            throw new Error(`Library "${libraryName}" not found in manifest`);
        }

        const lib = this.manifest.libraries[libraryName];
        if (this.loadedScripts.has(lib.url)) return;

        console.log(`Loading library: ${libraryName}`);
        await this.loadScript(lib.url);
        this.loadedScripts.add(lib.url);
    }

    /**
     * Dynamically load a script
     * @param {string} src - Script URL
     * @returns {Promise}
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    /**
     * Dynamically load a stylesheet
     * @param {string} href - CSS URL
     * @returns {Promise}
     */
    loadStylesheet(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));
            document.head.appendChild(link);
        });
    }

    /**
     * Unload an app to free memory
     * @param {string} appId - App identifier
     */
    unloadApp(appId) {
        const appConfig = this.manifest.apps.find(app => app.id === appId);
        if (!appConfig) return;

        // Remove from loaded sets (script/css remain in DOM for now)
        // Full unloading would require tracking which apps share resources
        console.log(`Unloading app: ${appId}`);
        
        // Clear app container
        const container = document.getElementById('app-panel-content');
        if (container) container.innerHTML = '';
    }

    /**
     * Get apps filtered by criteria
     * @param {Object} filters - { category, gradeLevel }
     * @returns {Array} Matching app configs
     */
    getApps(filters = {}) {
        if (!this.manifest || !this.manifest.apps) return [];

        return this.manifest.apps.filter(app => {
            if (filters.category && app.category !== filters.category) return false;
            if (filters.gradeLevel && !app.gradeLevels.includes(filters.gradeLevel)) return false;
            return true;
        });
    }
}
