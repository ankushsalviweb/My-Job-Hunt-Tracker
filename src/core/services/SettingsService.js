import {
    DEFAULT_INTERVIEW_TYPES,
    DEFAULT_INTERVIEW_MODES,
    DEFAULT_REMINDER_MINUTES
} from '../constants/interview-constants.js';

const STORAGE_KEY = 'job_tracker_settings';

/**
 * @typedef {Object} Settings
 * @property {Object.<string, {name: string, icon: string}>} interviewTypes
 * @property {Object.<string, {name: string, icon: string}>} interviewModes
 * @property {number} defaultReminderMinutes
 * @property {boolean} notificationsEnabled
 */

/**
 * SettingsService - Manages user preferences and customizations
 * Allows users to add custom interview types and modes
 */
class SettingsService {
    constructor() {
        /** @type {Settings} */
        this.settings = this.getDefaultSettings();
        this.load();
    }

    /**
     * Get default settings
     * @returns {Settings}
     */
    getDefaultSettings() {
        return {
            interviewTypes: { ...DEFAULT_INTERVIEW_TYPES },
            interviewModes: { ...DEFAULT_INTERVIEW_MODES },
            defaultReminderMinutes: DEFAULT_REMINDER_MINUTES,
            notificationsEnabled: true
        };
    }

    /**
     * Load settings from localStorage
     * @private
     */
    load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                // Merge with defaults to ensure all fields exist
                this.settings = {
                    ...this.getDefaultSettings(),
                    ...parsed,
                    // Ensure types and modes include defaults
                    interviewTypes: { ...DEFAULT_INTERVIEW_TYPES, ...(parsed.interviewTypes || {}) },
                    interviewModes: { ...DEFAULT_INTERVIEW_MODES, ...(parsed.interviewModes || {}) }
                };
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
            this.settings = this.getDefaultSettings();
        }
    }

    /**
     * Save settings to localStorage
     * @private
     */
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    // ==================== Interview Types ====================

    /**
     * Get all interview types (default + custom)
     * @returns {Object.<string, {name: string, icon: string}>}
     */
    getInterviewTypes() {
        return { ...this.settings.interviewTypes };
    }

    /**
     * Add or update an interview type
     * @param {string} key - Unique key (e.g., 'system_design')
     * @param {string} name - Display name
     * @param {string} [icon='fa-circle'] - Font Awesome icon class
     */
    addInterviewType(key, name, icon = 'fa-circle') {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
        this.settings.interviewTypes[normalizedKey] = { name, icon };
        this.save();
    }

    /**
     * Remove a custom interview type
     * @param {string} key
     * @returns {boolean} True if removed, false if it's a default type
     */
    removeInterviewType(key) {
        // Don't allow removing default types
        if (DEFAULT_INTERVIEW_TYPES[key]) {
            return false;
        }
        if (this.settings.interviewTypes[key]) {
            delete this.settings.interviewTypes[key];
            this.save();
            return true;
        }
        return false;
    }

    /**
     * Check if a type is a default (non-removable) type
     * @param {string} key
     * @returns {boolean}
     */
    isDefaultType(key) {
        return !!DEFAULT_INTERVIEW_TYPES[key];
    }

    // ==================== Interview Modes ====================

    /**
     * Get all interview modes (default + custom)
     * @returns {Object.<string, {name: string, icon: string}>}
     */
    getInterviewModes() {
        return { ...this.settings.interviewModes };
    }

    /**
     * Add or update an interview mode
     * @param {string} key - Unique key (e.g., 'hybrid')
     * @param {string} name - Display name
     * @param {string} [icon='fa-circle'] - Font Awesome icon class
     */
    addInterviewMode(key, name, icon = 'fa-circle') {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
        this.settings.interviewModes[normalizedKey] = { name, icon };
        this.save();
    }

    /**
     * Remove a custom interview mode
     * @param {string} key
     * @returns {boolean} True if removed, false if it's a default mode
     */
    removeInterviewMode(key) {
        // Don't allow removing default modes
        if (DEFAULT_INTERVIEW_MODES[key]) {
            return false;
        }
        if (this.settings.interviewModes[key]) {
            delete this.settings.interviewModes[key];
            this.save();
            return true;
        }
        return false;
    }

    /**
     * Check if a mode is a default (non-removable) mode
     * @param {string} key
     * @returns {boolean}
     */
    isDefaultMode(key) {
        return !!DEFAULT_INTERVIEW_MODES[key];
    }

    // ==================== General Settings ====================

    /**
     * Get default reminder minutes
     * @returns {number}
     */
    getDefaultReminderMinutes() {
        return this.settings.defaultReminderMinutes;
    }

    /**
     * Set default reminder minutes
     * @param {number} minutes
     */
    setDefaultReminderMinutes(minutes) {
        this.settings.defaultReminderMinutes = minutes;
        this.save();
    }

    /**
     * Check if notifications are enabled
     * @returns {boolean}
     */
    areNotificationsEnabled() {
        return this.settings.notificationsEnabled;
    }

    /**
     * Enable or disable notifications
     * @param {boolean} enabled
     */
    setNotificationsEnabled(enabled) {
        this.settings.notificationsEnabled = enabled;
        this.save();
    }

    /**
     * Reset all settings to defaults
     */
    resetToDefaults() {
        this.settings = this.getDefaultSettings();
        this.save();
    }
}

// Singleton instance
let serviceInstance = null;

/**
 * Get or create the SettingsService instance
 * @returns {SettingsService}
 */
export function getSettingsService() {
    if (!serviceInstance) {
        serviceInstance = new SettingsService();
    }
    return serviceInstance;
}

export { SettingsService };
