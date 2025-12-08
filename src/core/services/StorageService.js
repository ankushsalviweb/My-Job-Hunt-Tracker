const STORAGE_KEY = 'jobApplications';

/**
 * Storage service for persisting application data
 */
export class StorageService {
    /**
     * Load all applications from storage
     * @returns {import('../models/Application.js').ApplicationData[]}
     */
    load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to load data from storage:', error);
            return [];
        }
    }

    /**
     * Save all applications to storage
     * @param {import('../models/Application.js').ApplicationData[]} applications
     */
    save(applications) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
        } catch (error) {
            console.error('Failed to save data to storage:', error);
        }
    }

    /**
     * Export data as JSON string
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @returns {string}
     */
    exportData(applications) {
        return JSON.stringify(applications, null, 2);
    }

    /**
     * Import data from JSON string
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
    }
}
