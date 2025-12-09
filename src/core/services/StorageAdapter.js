/**
 * StorageAdapter - Abstracts storage provider (LocalStorage vs Firebase)
 * Allows seamless switching between providers without changing ApplicationEngine
 */
import { StorageService } from './StorageService.js';
import { getFirebaseStorageService, resetFirebaseStorageService } from './FirebaseStorageService.js';
import { getFirebaseInterviewService, resetFirebaseInterviewService } from './FirebaseInterviewService.js';
import { getAuthService } from './AuthService.js';

// Storage provider type
const PROVIDER = {
    LOCAL: 'local',
    FIREBASE: 'firebase'
};

// Current provider - defaults to Firebase when authenticated
let currentProvider = PROVIDER.FIREBASE;

/**
 * Get the current storage provider instance
 * @returns {StorageService | import('./FirebaseStorageService.js').FirebaseStorageService}
 */
function getStorageProvider() {
    if (currentProvider === PROVIDER.FIREBASE && getAuthService().isAuthenticated()) {
        return getFirebaseStorageService();
    }
    return new StorageService();
}

/**
 * StorageAdapter - Unified storage interface
 */
export const StorageAdapter = {
    /**
     * Initialize the storage adapter
     * Must be called after authentication
     * @returns {Promise<void>}
     */
    async initialize() {
        if (currentProvider === PROVIDER.FIREBASE && getAuthService().isAuthenticated()) {
            const firebaseStorage = getFirebaseStorageService();
            const firebaseInterviews = getFirebaseInterviewService();
            await firebaseStorage.initialize();
            await firebaseInterviews.initialize();
        }
    },

    /**
     * Load applications from current provider
     * @returns {Promise<import('../models/Application.js').ApplicationData[]>}
     */
    async loadApplications() {
        const provider = getStorageProvider();
        if (currentProvider === PROVIDER.FIREBASE) {
            return await provider.loadAsync();
        }
        return provider.load();
    },

    /**
     * Load applications synchronously (for engine compatibility)
     * @returns {import('../models/Application.js').ApplicationData[]}
     */
    loadApplicationsSync() {
        const provider = getStorageProvider();
        return provider.load();
    },

    /**
     * Save a single application
     * @param {import('../models/Application.js').ApplicationData} application
     * @returns {Promise<void>}
     */
    async saveApplication(application) {
        const provider = getStorageProvider();
        if (currentProvider === PROVIDER.FIREBASE) {
            await provider.saveOne(application);
        } else {
            // For local storage, we need to save all applications
            const apps = provider.load();
            const index = apps.findIndex(a => a.id === application.id);
            if (index >= 0) {
                apps[index] = application;
            } else {
                apps.push(application);
            }
            provider.save(apps);
        }
    },

    /**
     * Save all applications (for batch operations like import)
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @returns {Promise<void>}
     */
    async saveAllApplications(applications) {
        const provider = getStorageProvider();
        if (currentProvider === PROVIDER.FIREBASE) {
            await provider.save(applications);
        } else {
            provider.save(applications);
        }
    },

    /**
     * Delete an application
     * @param {string} appId
     * @returns {Promise<void>}
     */
    async deleteApplication(appId) {
        const provider = getStorageProvider();
        if (currentProvider === PROVIDER.FIREBASE) {
            await provider.delete(appId);
            // Also delete associated interviews
            await getFirebaseInterviewService().deleteByApplication(appId);
        } else {
            const apps = provider.load();
            const filtered = apps.filter(a => a.id !== appId);
            provider.save(filtered);
        }
    },

    /**
     * Export data as JSON
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @returns {string}
     */
    exportData(applications) {
        return JSON.stringify(applications, null, 2);
    },

    /**
     * Import data from JSON
     * @param {string} jsonString
     * @returns {{success: boolean, data?: import('../models/Application.js').ApplicationData[], error?: string}}
     */
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!Array.isArray(data)) {
                return { success: false, error: 'Invalid data format: expected array' };
            }
            return { success: true, data };
        } catch (error) {
            return { success: false, error: 'Invalid JSON format' };
        }
    },

    /**
     * Get the current provider name
     * @returns {'local' | 'firebase'}
     */
    getProvider() {
        return currentProvider;
    },

    /**
     * Set the storage provider
     * @param {'local' | 'firebase'} provider
     */
    setProvider(provider) {
        currentProvider = provider;
    },

    /**
     * Reset/cleanup on logout
     */
    cleanup() {
        resetFirebaseStorageService();
        resetFirebaseInterviewService();
    }
};

export { PROVIDER };
