import { Application } from './models/Application.js';
import { Interaction } from './models/Interaction.js';
import { getStorageService } from './services/StorageServiceAdapter.js';
import { FilterService } from './services/FilterService.js';
import { SortService } from './services/SortService.js';
import { AnalyticsService } from './services/AnalyticsService.js';
import { getInterviewService } from './services/InterviewService.js';
import { getSettingsService } from './services/SettingsService.js';
import { getFollowUpService } from './services/FollowUpService.js';
import { STAGES, STAGE_ACTIONS } from './constants/stages.js';

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
     * Get the current storage service
     * @returns {import('./services/StorageService.js').StorageService | import('./services/FirebaseStorageService.js').FirebaseStorageService}
     */
    getStorage() {
        return getStorageService();
    }

    /**
     * Initialize the engine - load data from storage and set up real-time sync
     */
    init() {
        const storage = this.getStorage();
        this.applications = storage.load();

        // Subscribe to real-time changes if storage supports it (Firebase)
        if (typeof storage.subscribe === 'function') {
            storage.subscribe((applications) => {
                this.applications = applications;
                this.notify();
            });
        }

        this.notify();
    }

    /**
     * Reload data from storage
     */
    reloadFromStorage() {
        this.applications = this.getStorage().load();
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
     * @returns {Promise<{success: boolean, data?: ApplicationData, errors?: string[]}>}
     */
    async create(data) {
        const validation = Application.validate(data);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        const app = Application.create(data);
        this.applications.push(app);

        const storage = this.getStorage();
        if (storage.saveOne) {
            await storage.saveOne(app, true);
        } else {
            await this.save();
        }

        this.notify();
        return { success: true, data: app };
    }

    /**
     * Update an existing application
     * @param {string} id
     * @param {Partial<ApplicationData>} data
     * @returns {Promise<{success: boolean, data?: ApplicationData, errors?: string[]}>}
     */
    async update(id, data) {
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

        const storage = this.getStorage();
        if (storage.saveOne) {
            await storage.saveOne(updated, false);
        } else {
            await this.save();
        }

        this.notify();
        return { success: true, data: updated };
    }

    /**
     * Delete an application
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    /**
     * Delete an application
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async delete(id) {
        const index = this.applications.findIndex(app => app.id === id);
        if (index === -1) return false;

        this.applications.splice(index, 1);

        const storage = this.getStorage();
        if (typeof storage.delete === 'function') {
            await storage.delete(id);
        } else {
            await this.save();
        }

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

    /** @param {Partial<FilterOptions>} filters */
    setFilters(filters) {
        this.currentFilters = { ...this.currentFilters, ...filters };
        this.notify();
    }

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

    /** @param {string} column */
    toggleSort(column) {
        this.currentSort = this.sortService.toggle(this.currentSort, column);
        this.notify();
    }

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
    async addInteraction(appId, data, newStage) {
        const app = this.getById(appId);
        if (!app) {
            return { success: false, errors: ['Application not found'] };
        }

        const interaction = Interaction.create(data);
        if (!app.interactions) app.interactions = [];
        app.interactions.push(interaction);
        app.lastUpdated = new Date().toISOString();

        // If HR called or document received, record HR response to reset follow-up
        if (data.type === 'hr_called' || data.type === 'document_received') {
            getFollowUpService().recordHRResponse(app);
        }

        // If user followed up, record the follow-up attempt
        if (data.type === 'followed_up' && app.followUpTracker?.isActive) {
            getFollowUpService().recordFollowUp(app);
        }

        if (newStage !== undefined) {
            app.currentStage = newStage;
        }

        const storage = this.getStorage();
        if (storage.saveOne) {
            await storage.saveOne(app, false);
        } else {
            await this.save();
        }
        this.notify();

        return { success: true, data: interaction };
    }

    /**
     * Remove interaction from an application
     * @param {string} appId
     * @param {string} interactionId
     * @returns {boolean}
     */
    async removeInteraction(appId, interactionId) {
        const app = this.getById(appId);
        if (!app || !app.interactions) return false;

        const index = app.interactions.findIndex(i => i.id === interactionId);
        if (index === -1) return false;

        app.interactions.splice(index, 1);
        app.lastUpdated = new Date().toISOString();
        const storage = this.getStorage();
        if (storage.saveOne) {
            await storage.saveOne(app, false);
        } else {
            await this.save();
        }
        this.notify();

        return true;
    }

    // ═══════════════════════════════════════════════════════════════
    // STAGE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Move application to a new stage with action metadata
     * @param {string} appId
     * @param {number} newStage
     * @returns {{success: boolean, action: string|null}}
     */
    async moveToStage(appId, newStage) {
        const app = this.getById(appId);
        if (!app || app.currentStage === newStage) return { success: false, action: null };

        const oldStage = app.currentStage;
        app.currentStage = newStage;
        app.lastUpdated = new Date().toISOString();

        // Auto-log stage change
        if (!app.interactions) app.interactions = [];
        app.interactions.push(Interaction.create({
            type: 'note',
            notes: `Stage: ${STAGES[oldStage]?.name || oldStage} → ${STAGES[newStage]?.name || newStage}`
        }));

        // If moving to Screening, start follow-up tracking
        if (newStage === 3) {
            getFollowUpService().startTracking(app, 'screening');
        }

        // If leaving a waiting state, stop follow-up tracking
        if (newStage !== 3 && oldStage === 3) {
            getFollowUpService().stopTracking(app);
        }

        const storage = this.getStorage();
        if (storage.saveOne) {
            await storage.saveOne(app, false);
        } else {
            await this.save();
        }
        this.notify();

        // Return the UI action associated with this stage
        const action = STAGE_ACTIONS[newStage] || null;
        return { success: true, action };
    }

    /**
     * Close an application with a reason
     * @param {string} appId
     * @param {string} reason - rejected/declined/ghosted/withdrawn
     * @param {string} [notes] - Optional closure notes
     * @returns {boolean}
     */
    async closeApplication(appId, reason, notes = '') {
        const app = this.getById(appId);
        if (!app) return false;

        const oldStage = app.currentStage;
        app.currentStage = 0;
        app.finalResult = reason;
        app.lastUpdated = new Date().toISOString();

        // Stop follow-up tracking
        getFollowUpService().stopTracking(app);

        // Auto-log the closure
        if (!app.interactions) app.interactions = [];
        app.interactions.push(Interaction.create({
            type: 'note',
            notes: `Closed: ${STAGES[oldStage]?.name} → Closed (${reason})${notes ? '. ' + notes : ''}`
        }));

        const storage = this.getStorage();
        if (storage.saveOne) {
            await storage.saveOne(app, false);
        } else {
            await this.save();
        }
        this.notify();

        return true;
    }

    /**
     * Get interview sub-status for an application (derived from latest round)
     * @param {string} appId
     * @returns {string}
     */
    getInterviewSubStatus(appId) {
        const interviewService = getInterviewService();
        const rounds = interviewService.getByApplication(appId);
        if (!rounds || rounds.length === 0) return '';

        // Sort by round number descending
        const sorted = [...rounds].sort((a, b) => (b.roundNumber || 0) - (a.roundNumber || 0));
        const latest = sorted[0];

        const roundLabel = `Round ${latest.roundNumber}`;

        if (latest.status === 'scheduled') {
            const date = new Date(latest.scheduledAt);
            const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            return `${roundLabel} — Scheduled ${dateStr}`;
        }

        if (latest.status === 'completed') {
            if (latest.roundOutcome === 'cleared') return `${roundLabel} — Cleared ✅`;
            if (latest.roundOutcome === 'not_cleared') return `${roundLabel} — Not Cleared ❌`;
            return `${roundLabel} — Awaiting Feedback`;
        }

        if (latest.status === 'cancelled') return `${roundLabel} — Cancelled`;
        if (latest.status === 'rescheduled') return `${roundLabel} — Rescheduled`;

        return roundLabel;
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
        return JSON.stringify(this.applications, null, 2);
    }

    /**
     * Import data from JSON
     * @param {string} jsonString
     * @param {boolean} [merge=false]
     * @returns {{success: boolean, error?: string}}
     */
    importData(jsonString, merge = false) {
        try {
            const data = JSON.parse(jsonString);
            if (!Array.isArray(data)) {
                return { success: false, error: 'Invalid data format: expected array' };
            }
            if (merge) {
                const existingIds = new Set(this.applications.map(a => a.id));
                const newApps = data.filter(a => !existingIds.has(a.id));
                this.applications.push(...newApps);
            } else {
                this.applications = data;
            }
            this.save();
            this.notify();
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Invalid JSON format' };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENT SYSTEM
    // ═══════════════════════════════════════════════════════════════

    /** @param {Function} callback */
    subscribe(callback) { this.listeners.add(callback); }

    /** @param {Function} callback */
    unsubscribe(callback) { this.listeners.delete(callback); }

    /** Notify all subscribers */
    notify() {
        this.listeners.forEach(callback => {
            try { callback(); }
            catch (error) { console.error('Error in subscriber callback:', error); }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // INTERVIEW MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Schedule a new interview round for an application
     * Auto-assigns round number and moves app to Interviewing stage
     * @param {string} appId
     * @param {Partial<import('./models/Interview.js').InterviewData>} interviewData
     * @returns {Promise<{success: boolean, data?: import('./models/Interview.js').InterviewData, errors?: string[]}>}
     */
    async scheduleInterview(appId, interviewData) {
        const app = this.getById(appId);
        if (!app) {
            return { success: false, errors: ['Application not found'] };
        }

        const interviewService = getInterviewService();

        // Auto-assign round number
        const nextRound = interviewService.getNextRoundNumber
            ? interviewService.getNextRoundNumber(appId)
            : 1;

        const result = await interviewService.create({
            ...interviewData,
            applicationId: appId,
            roundNumber: interviewData.roundNumber ?? nextRound
        });

        if (result.success) {
            // Move to Interviewing stage if not already there
            if (app.currentStage >= 1 && app.currentStage <= 4) {
                this.moveToStage(appId, 5);
            }

            // Stop follow-up tracking (interview is scheduled now)
            getFollowUpService().stopTracking(app);

            // Log interaction
            this.addInteraction(appId, {
                type: 'interview_round',
                notes: `Round ${result.data.roundNumber} scheduled`,
                interviewId: result.data.id
            });
        }

        return result;
    }

    /**
     * Set round outcome and return suggested next action
     * @param {string} interviewId
     * @param {string} outcome - 'cleared' or 'not_cleared'
     * @param {string} [notes] - Outcome notes
     * @returns {Promise<{success: boolean, suggestedAction: string|null}>}
     */
    async setRoundOutcome(interviewId, outcome, notes = '') {
        const interviewService = getInterviewService();
        const interview = interviewService.getById(interviewId);
        if (!interview) {
            return { success: false, suggestedAction: null };
        }

        await interviewService.update(interviewId, {
            status: 'completed',
            roundOutcome: outcome,
            outcome: notes
        });

        const app = this.getById(interview.applicationId);

        if (outcome === 'cleared') {
            // Start follow-up tracking for next round/offer
            if (app) {
                getFollowUpService().startTracking(
                    app,
                    `feedback_round_${interview.roundNumber}`,
                    null
                );
                this.save();
                this.notify();
            }
            return { success: true, suggestedAction: 'schedule_next_or_offer' };
        }

        if (outcome === 'not_cleared') {
            return { success: true, suggestedAction: 'close_rejected' };
        }

        return { success: true, suggestedAction: null };
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
        })).filter(item => item.application);
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
     * @returns {Promise<{success: boolean, data?: import('./models/Interview.js').InterviewData, errors?: string[]}>}
     */
    async updateInterview(interviewId, data) {
        const interviewService = getInterviewService();
        return await interviewService.update(interviewId, data);
    }

    /**
     * Delete an interview
     * @param {string} interviewId
     * @returns {Promise<boolean>}
     */
    async deleteInterview(interviewId) {
        const interviewService = getInterviewService();
        return await interviewService.delete(interviewId);
    }

    /**
     * Get interview types
     * @returns {Object.<string, {name: string, icon: string}>}
     */
    getInterviewTypes() {
        return getSettingsService().getInterviewTypes();
    }

    /**
     * Get interview modes
     * @returns {Object.<string, {name: string, icon: string}>}
     */
    getInterviewModes() {
        return getSettingsService().getInterviewModes();
    }

    // ═══════════════════════════════════════════════════════════════
    // FOLLOW-UP
    // ═══════════════════════════════════════════════════════════════

    /**
     * Check for pending follow-up reminders
     * @returns {Array<{appId: string, companyName: string, context: string, attempts: number, isGhostCandidate: boolean}>}
     */
    checkFollowUpReminders() {
        return getFollowUpService().checkReminders(this.applications);
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE
    // ═══════════════════════════════════════════════════════════════

    /** @private */
    async save() {
        const storage = this.getStorage();
        await storage.save(this.applications);
    }
}

// Singleton instance
let engineInstance = null;

/** @returns {ApplicationEngine} */
export function getEngine() {
    if (!engineInstance) {
        engineInstance = new ApplicationEngine();
    }
    return engineInstance;
}

/** Reset the engine instance (call after auth changes) */
export function resetEngine() {
    engineInstance = null;
}
