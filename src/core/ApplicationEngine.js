import { Application } from './models/Application.js';
import { Interaction } from './models/Interaction.js';
import { StorageService } from './services/StorageService.js';
import { FilterService } from './services/FilterService.js';
import { SortService } from './services/SortService.js';
import { AnalyticsService } from './services/AnalyticsService.js';
import { getInterviewService } from './services/InterviewService.js';
import { getSettingsService } from './services/SettingsService.js';
import { STAGES } from './constants/stages.js';

/**
 * @typedef {import('./services/FilterService.js').FilterOptions} FilterOptions
 * @typedef {import('./services/SortService.js').SortOptions} SortOptions
 * @typedef {import('./models/Application.js').ApplicationData} ApplicationData
 * @typedef {import('./models/Interaction.js').InteractionData} InteractionData
 */

/**
 * Main Application Engine - Orchestrates all business logic
 * UI-agnostic, event-driven
 */
export class ApplicationEngine {
    constructor() {
        /** @type {ApplicationData[]} */
        this.applications = [];

        /** @type {Set<Function>} */
        this.listeners = new Set();

        // Services
        this.storage = new StorageService();
        this.filterService = new FilterService();
        this.sortService = new SortService();
        this.analyticsService = new AnalyticsService();

        // Current state
        /** @type {FilterOptions} */
        this.currentFilters = {
            search: '',
            stages: [],
            types: [],
            locations: [],
            results: []
        };

        /** @type {SortOptions} */
        this.currentSort = {
            column: 'lastUpdated',
            direction: 'desc'
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Initialize the engine - load data from storage
     */
    init() {
        this.applications = this.storage.load();
        this.notify();
    }

    // ═══════════════════════════════════════════════════════════════
    // CRUD OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get all applications (unfiltered)
     * @returns {ApplicationData[]}
     */
    getAll() {
        return [...this.applications];
    }

    /**
     * Get application by ID
     * @param {string} id
     * @returns {ApplicationData | undefined}
     */
    getById(id) {
        return this.applications.find(app => app.id === id);
    }

    /**
     * Create a new application
     * @param {Partial<ApplicationData>} data
     * @returns {{success: boolean, data?: ApplicationData, errors?: string[]}}
     */
    create(data) {
        const validation = Application.validate(data);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        const app = Application.create(data);
        this.applications.push(app);
        this.save();
        this.notify();

        return { success: true, data: app };
    }

    /**
     * Update an existing application
     * @param {string} id
     * @param {Partial<ApplicationData>} data
     * @returns {{success: boolean, data?: ApplicationData, errors?: string[]}}
     */
    update(id, data) {
        const index = this.applications.findIndex(app => app.id === id);
        if (index === -1) {
            return { success: false, errors: ['Application not found'] };
        }

        const validation = Application.validate({ ...this.applications[index], ...data });
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        const updated = Application.update(this.applications[index], data);
        this.applications[index] = updated;
        this.save();
        this.notify();

        return { success: true, data: updated };
    }

    /**
     * Delete an application
     * @param {string} id
     * @returns {boolean}
     */
    delete(id) {
        const index = this.applications.findIndex(app => app.id === id);
        if (index === -1) return false;

        this.applications.splice(index, 1);
        this.save();
        this.notify();

        return true;
    }

    // ═══════════════════════════════════════════════════════════════
    // FILTERING & SORTING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get filtered and sorted applications
     * @param {FilterOptions} [filters]
     * @param {SortOptions} [sort]
     * @returns {ApplicationData[]}
     */
    query(filters, sort) {
        const f = filters || this.currentFilters;
        const s = sort || this.currentSort;

        let result = this.filterService.apply(this.applications, f);
        result = this.sortService.apply(result, s);

        return result;
    }

    /**
     * Set current filters
     * @param {Partial<FilterOptions>} filters
     */
    setFilters(filters) {
        this.currentFilters = { ...this.currentFilters, ...filters };
        this.notify();
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.currentFilters = {
            search: '',
            stages: [],
            types: [],
            locations: [],
            results: []
        };
        this.notify();
    }

    /**
     * Set sort options
     * @param {string} column
     */
    toggleSort(column) {
        this.currentSort = this.sortService.toggle(this.currentSort, column);
        this.notify();
    }

    /**
     * Get filter dropdown options based on current data
     * @returns {{types: string[], locations: string[]}}
     */
    getFilterOptions() {
        return this.filterService.getFilterOptions(this.applications);
    }

    // ═══════════════════════════════════════════════════════════════
    // INTERACTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Add interaction to an application
     * @param {string} appId
     * @param {Partial<InteractionData>} data
     * @param {number} [newStage] - Optional stage to update to
     * @returns {{success: boolean, errors?: string[]}}
     */
    addInteraction(appId, data, newStage) {
        const app = this.getById(appId);
        if (!app) {
            return { success: false, errors: ['Application not found'] };
        }

        const validation = Interaction.validate(data);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        const interaction = Interaction.create(data);
        if (!app.interactions) app.interactions = [];
        app.interactions.push(interaction);
        app.lastUpdated = new Date().toISOString();

        if (newStage !== undefined) {
            app.currentStage = newStage;
        }

        this.save();
        this.notify();

        return { success: true };
    }

    /**
     * Remove interaction from an application
     * @param {string} appId
     * @param {string} interactionId
     * @returns {boolean}
     */
    removeInteraction(appId, interactionId) {
        const app = this.getById(appId);
        if (!app || !app.interactions) return false;

        const index = app.interactions.findIndex(i => i.id === interactionId);
        if (index === -1) return false;

        app.interactions.splice(index, 1);
        app.lastUpdated = new Date().toISOString();
        this.save();
        this.notify();

        return true;
    }

    // ═══════════════════════════════════════════════════════════════
    // STAGE MANAGEMENT (for Kanban drag-drop)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Move application to a new stage
     * @param {string} appId
     * @param {number} newStage
     * @returns {boolean}
     */
    moveToStage(appId, newStage) {
        const app = this.getById(appId);
        if (!app || app.currentStage === newStage) return false;

        const oldStage = app.currentStage;
        app.currentStage = newStage;
        app.lastUpdated = new Date().toISOString();

        // Auto-log stage change
        if (!app.interactions) app.interactions = [];
        app.interactions.push(Interaction.create({
            type: 'update',
            notes: `Stage changed: ${STAGES[oldStage]?.name || oldStage} → ${STAGES[newStage]?.name || newStage}`
        }));

        this.save();
        this.notify();

        return true;
    }

    // ═══════════════════════════════════════════════════════════════
    // ANALYTICS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get stage counts for dashboard
     * @returns {Object.<number, number>}
     */
    getStageCounts() {
        const counts = {};
        Object.keys(STAGES).forEach(s => counts[s] = 0);

        this.applications.forEach(app => {
            counts[app.currentStage] = (counts[app.currentStage] || 0) + 1;
        });

        return counts;
    }

    /**
     * Get full analytics data
     * @returns {import('./services/AnalyticsService.js').AnalyticsData}
     */
    getAnalytics() {
        return this.analyticsService.compute(this.applications);
    }

    // ═══════════════════════════════════════════════════════════════
    // DATA IMPORT/EXPORT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Export all data as JSON
     * @returns {string}
     */
    exportData() {
        return this.storage.exportData(this.applications);
    }

    /**
     * Import data from JSON
     * @param {string} jsonString
     * @param {boolean} [merge=false] - If true, merge with existing data
     * @returns {{success: boolean, error?: string}}
     */
    importData(jsonString, merge = false) {
        const result = this.storage.importData(jsonString);
        if (!result.success) {
            return { success: false, error: result.error };
        }

        if (merge) {
            // Add only new applications (by ID)
            const existingIds = new Set(this.applications.map(a => a.id));
            const newApps = result.data.filter(a => !existingIds.has(a.id));
            this.applications.push(...newApps);
        } else {
            this.applications = result.data;
        }

        this.save();
        this.notify();

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENT SYSTEM (Observer Pattern)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Subscribe to data changes
     * @param {Function} callback
     */
    subscribe(callback) {
        this.listeners.add(callback);
    }

    /**
     * Unsubscribe from data changes
     * @param {Function} callback
     */
    unsubscribe(callback) {
        this.listeners.delete(callback);
    }

    /**
     * Notify all subscribers of data change
     */
    notify() {
        this.listeners.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in subscriber callback:', error);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // INTERVIEW MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Schedule a new interview for an application
     * Automatically moves the application to Stage 5 (Interview Set) if currently at Stage 4 or below
     * @param {string} appId
     * @param {Partial<import('./models/Interview.js').InterviewData>} interviewData
     * @returns {{success: boolean, data?: import('./models/Interview.js').InterviewData, errors?: string[]}}
     */
    scheduleInterview(appId, interviewData) {
        const app = this.getById(appId);
        if (!app) {
            return { success: false, errors: ['Application not found'] };
        }

        const interviewService = getInterviewService();
        const result = interviewService.create({
            ...interviewData,
            applicationId: appId
        });

        if (result.success) {
            // Auto-update stage to 5 (Interview Set) if appropriate
            if (app.currentStage >= 1 && app.currentStage <= 4) {
                this.moveToStage(appId, 5);
            }
        }

        return result;
    }

    /**
     * Get all interviews for an application
     * @param {string} appId
     * @returns {import('./models/Interview.js').InterviewData[]}
     */
    getInterviewsForApplication(appId) {
        const interviewService = getInterviewService();
        return interviewService.getByApplication(appId);
    }

    /**
     * Get upcoming interviews across all applications
     * @param {number} [limit=5]
     * @returns {Array<{interview: import('./models/Interview.js').InterviewData, application: ApplicationData}>}
     */
    getUpcomingInterviews(limit = 5) {
        const interviewService = getInterviewService();
        const interviews = interviewService.getUpcoming(limit);

        return interviews.map(interview => ({
            interview,
            application: this.getById(interview.applicationId)
        })).filter(item => item.application); // Filter out orphaned interviews
    }

    /**
     * Get today's interviews
     * @returns {Array<{interview: import('./models/Interview.js').InterviewData, application: ApplicationData}>}
     */
    getTodaysInterviews() {
        const interviewService = getInterviewService();
        const interviews = interviewService.getToday();

        return interviews.map(interview => ({
            interview,
            application: this.getById(interview.applicationId)
        })).filter(item => item.application);
    }

    /**
     * Update an interview
     * @param {string} interviewId
     * @param {Partial<import('./models/Interview.js').InterviewData>} data
     * @returns {{success: boolean, data?: import('./models/Interview.js').InterviewData, errors?: string[]}}
     */
    updateInterview(interviewId, data) {
        const interviewService = getInterviewService();
        return interviewService.update(interviewId, data);
    }

    /**
     * Delete an interview
     * @param {string} interviewId
     * @returns {boolean}
     */
    deleteInterview(interviewId) {
        const interviewService = getInterviewService();
        return interviewService.delete(interviewId);
    }

    /**
     * Get interview types (including user customizations)
     * @returns {Object.<string, {name: string, icon: string}>}
     */
    getInterviewTypes() {
        return getSettingsService().getInterviewTypes();
    }

    /**
     * Get interview modes (including user customizations)
     * @returns {Object.<string, {name: string, icon: string}>}
     */
    getInterviewModes() {
        return getSettingsService().getInterviewModes();
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Save data to storage
     * @private
     */
    save() {
        this.storage.save(this.applications);
    }
}

// Singleton instance
let engineInstance = null;

/**
 * Get or create the engine instance
 * @returns {ApplicationEngine}
 */
export function getEngine() {
    if (!engineInstance) {
        engineInstance = new ApplicationEngine();
    }
    return engineInstance;
}
