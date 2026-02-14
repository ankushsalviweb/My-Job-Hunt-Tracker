import { Interview } from '../models/Interview.js';

const STORAGE_KEY = 'job_tracker_interviews';

/**
 * InterviewService - Manages interview CRUD and queries
 * Stores data separately in localStorage to avoid breaking existing application data
 */
class InterviewService {
    constructor() {
        /** @type {import('../models/Interview.js').InterviewData[]} */
        this.interviews = [];
        this.listeners = [];
        this.load();
    }

    /**
     * Load interviews from localStorage
     * @private
     */
    load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            this.interviews = data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load interviews:', e);
            this.interviews = [];
        }
    }

    /**
     * Save interviews to localStorage
     * @private
     */
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.interviews));
            this.notifyListeners();
        } catch (e) {
            console.error('Failed to save interviews:', e);
        }
    }

    /**
     * Subscribe to interview changes
     * @param {Function} callback
     */
    subscribe(callback) {
        this.listeners.push(callback);
    }

    /**
     * Unsubscribe from interview changes
     * @param {Function} callback
     */
    unsubscribe(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    /**
     * Notify all listeners of changes
     * @private
     */
    notifyListeners() {
        this.listeners.forEach(cb => {
            try {
                cb(this.interviews);
            } catch (e) {
                console.error('Interview listener error:', e);
            }
        });
    }

    // ==================== CRUD Operations ====================

    /**
     * Create a new interview
     * @param {Partial<import('../models/Interview.js').InterviewData>} data
     * @returns {{success: boolean, data?: import('../models/Interview.js').InterviewData, errors?: string[]}}
     */
    create(data) {
        const validation = Interview.validate(data);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        const interview = Interview.create(data);
        this.interviews.push(interview);
        this.save();
        return { success: true, data: interview };
    }

    /**
     * Update an existing interview
     * @param {string} id
     * @param {Partial<import('../models/Interview.js').InteractionData>} data
     * @returns {{success: boolean, data?: import('../models/Interview.js').InterviewData, errors?: string[]}}
     */
    update(id, data) {
        const index = this.interviews.findIndex(i => i.id === id);
        if (index === -1) {
            return { success: false, errors: ['Interview not found'] };
        }

        // Skip future date validation for updates
        const validationData = { ...data, id };
        const validation = Interview.validate({ ...this.interviews[index], ...validationData });
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        this.interviews[index] = Interview.update(this.interviews[index], data);
        this.save();
        return { success: true, data: this.interviews[index] };
    }

    /**
     * Delete an interview
     * @param {string} id
     * @returns {boolean}
     */
    delete(id) {
        const index = this.interviews.findIndex(i => i.id === id);
        if (index === -1) return false;

        this.interviews.splice(index, 1);
        this.save();
        return true;
    }

    /**
     * Get interview by ID
     * @param {string} id
     * @returns {import('../models/Interview.js').InterviewData | undefined}
     */
    getById(id) {
        return this.interviews.find(i => i.id === id);
    }

    // ==================== Query Operations ====================

    /**
     * Get all interviews
     * @returns {import('../models/Interview.js').InterviewData[]}
     */
    getAll() {
        return [...this.interviews];
    }

    /**
     * Get interviews for a specific application
     * @param {string} appId
     * @returns {import('../models/Interview.js').InterviewData[]}
     */
    getByApplication(appId) {
        return this.interviews
            .filter(i => i.applicationId === appId)
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    }

    /**
     * Get upcoming interviews (scheduled and in the future)
     * @param {number} [limit] - Max number to return
     * @returns {import('../models/Interview.js').InterviewData[]}
     */
    getUpcoming(limit) {
        const now = new Date();
        const upcoming = this.interviews
            .filter(i => i.status === 'scheduled' && new Date(i.scheduledAt) > now)
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

        return limit ? upcoming.slice(0, limit) : upcoming;
    }

    /**
     * Get interviews within a date range
     * @param {Date} start
     * @param {Date} end
     * @returns {import('../models/Interview.js').InterviewData[]}
     */
    getByDateRange(start, end) {
        return this.interviews
            .filter(i => {
                const date = new Date(i.scheduledAt);
                return date >= start && date <= end;
            })
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    }

    /**
     * Get today's interviews
     * @returns {import('../models/Interview.js').InterviewData[]}
     */
    getToday() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return this.getByDateRange(startOfDay, endOfDay);
    }

    /**
     * Get interviews for a specific month
     * @param {number} year
     * @param {number} month - 0-indexed (0 = January)
     * @returns {import('../models/Interview.js').InterviewData[]}
     */
    getByMonth(year, month) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return this.getByDateRange(start, end);
    }

    /**
     * Get interviews for a specific week
     * @param {Date} weekStart - Start of the week (e.g., Monday)
     * @returns {import('../models/Interview.js').InterviewData[]}
     */
    getByWeek(weekStart) {
        const start = new Date(weekStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return this.getByDateRange(start, end);
    }

    // ==================== Notification Support ====================

    /**
     * Get interviews that need reminder notifications
     * @returns {import('../models/Interview.js').InterviewData[]}
     */
    getInterviewsNeedingReminder() {
        return this.interviews.filter(i => Interview.needsReminder(i));
    }

    /**
     * Mark reminder as sent for an interview
     * @param {string} id
     */
    markReminderSent(id) {
        const index = this.interviews.findIndex(i => i.id === id);
        if (index !== -1) {
            this.interviews[index].reminderSent = true;
            this.save();
        }
    }

    /**
     * Delete all interviews for an application (used when app is deleted)
     * @param {string} appId
     * @returns {number} Number of interviews deleted
     */
    deleteByApplication(appId) {
        const before = this.interviews.length;
        this.interviews = this.interviews.filter(i => i.applicationId !== appId);
        if (this.interviews.length !== before) {
            this.save();
        }
        return before - this.interviews.length;
    }

    /**
     * Get the next round number for an application
     * @param {string} appId
     * @returns {number}
     */
    getNextRoundNumber(appId) {
        const rounds = this.getByApplication(appId);
        if (rounds.length === 0) return 1;
        const maxRound = Math.max(...rounds.map(r => r.roundNumber || 0));
        return maxRound + 1;
    }

    /**
     * Get the latest (most recent) round for an application
     * @param {string} appId
     * @returns {import('../models/Interview.js').InterviewData | null}
     */
    getLatestRound(appId) {
        const rounds = this.getByApplication(appId);
        if (rounds.length === 0) return null;
        return rounds.sort((a, b) => (b.roundNumber || 0) - (a.roundNumber || 0))[0];
    }
}

// Import Firebase services for runtime switching
import { getAuthService } from './AuthService.js';
import { getFirebaseInterviewService } from './FirebaseInterviewService.js';

// Singleton instance for local storage version
let localServiceInstance = null;

/**
 * Get the appropriate interview service based on auth state
 * Returns FirebaseInterviewService when user is authenticated, otherwise local InterviewService
 * @returns {InterviewService | import('./FirebaseInterviewService.js').FirebaseInterviewService}
 */
export function getInterviewService() {
    try {
        if (getAuthService().isAuthenticated()) {
            return getFirebaseInterviewService();
        }
    } catch (e) {
        // Firebase not available, use local storage
    }

    if (!localServiceInstance) {
        localServiceInstance = new InterviewService();
    }
    return localServiceInstance;
}

export { InterviewService };
