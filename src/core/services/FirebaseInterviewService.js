/**
 * FirebaseInterviewService - Firestore CRUD for Interviews
 * Mirrors the InterviewService interface for seamless swapping
 */
import { db } from './firebase-config.js';
import { getAuthService } from './AuthService.js';
import { Interview } from '../models/Interview.js';
import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    where,
    writeBatch
} from 'firebase/firestore';

/**
 * @typedef {import('../models/Interview.js').InterviewData} InterviewData
 */

class FirebaseInterviewService {
    constructor() {
        /** @type {InterviewData[]} */
        this.interviews = [];
        /** @type {Function[]} */
        this.listeners = [];
        /** @type {Function | null} */
        this.unsubscribeSnapshot = null;
        this.initialized = false;
    }

    /**
     * Get the shared interviews collection reference
     * @private
     * @returns {import('firebase/firestore').CollectionReference}
     */
    getCollectionRef() {
        // Verify user is authenticated (access control is in Firestore rules)
        if (!getAuthService().isAuthenticated()) {
            throw new Error('User not authenticated');
        }
        return collection(db, 'interviews');
    }

    /**
     * Add user attribution to interview data
     * @private
     * @param {InterviewData} data
     * @param {boolean} isNew - Whether this is a new record
     * @returns {InterviewData}
     */
    addAttribution(data, isNew = false) {
        const auth = getAuthService();
        const user = auth.getCurrentUser();
        const attribution = {
            lastModifiedBy: user?.uid || '',
            lastModifiedByEmail: user?.email || ''
        };
        if (isNew) {
            attribution.createdBy = user?.uid || '';
            attribution.createdByEmail = user?.email || '';
        }
        return { ...data, ...attribution };
    }

    /**
     * Initialize real-time listener for interviews
     * Waits for first data load before resolving
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) return;

        const uid = getAuthService().getUid();
        if (!uid) return;

        // Return a promise that resolves after first snapshot
        return new Promise((resolve, reject) => {
            const q = query(this.getCollectionRef(), orderBy('scheduledAt', 'asc'));

            let firstSnapshot = true;

            this.unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                this.interviews = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                }));
                this.notifyListeners();

                // Resolve on first snapshot
                if (firstSnapshot) {
                    firstSnapshot = false;
                    this.initialized = true;
                    resolve();
                }
            }, (error) => {
                console.error('Firestore interview snapshot error:', error);
                if (firstSnapshot) {
                    firstSnapshot = false;
                    reject(error);
                }
            });
        });
    }

    /**
     * Load interviews asynchronously
     * @returns {Promise<void>}
     */
    async load() {
        try {
            const snapshot = await getDocs(this.getCollectionRef());
            this.interviews = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));
        } catch (error) {
            console.error('Failed to load interviews:', error);
        }
    }

    // ==================== CRUD Operations ====================

    /**
     * Create a new interview
     * @param {Partial<InterviewData>} data
     * @returns {Promise<{success: boolean, data?: InterviewData, errors?: string[]}>}
     */
    async create(data) {
        const validation = Interview.validate(data);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        const interview = Interview.create(data);
        const interviewWithAttribution = this.addAttribution(interview, true);

        try {
            const docRef = doc(this.getCollectionRef(), interview.id);
            await setDoc(docRef, interviewWithAttribution);
            return { success: true, data: interviewWithAttribution };
        } catch (error) {
            console.error('Failed to create interview:', error);
            return { success: false, errors: ['Failed to save interview'] };
        }
    }

    /**
     * Update an existing interview
     * @param {string} id
     * @param {Partial<InterviewData>} data
     * @returns {Promise<{success: boolean, data?: InterviewData, errors?: string[]}>}
     */
    async update(id, data) {
        const existing = this.interviews.find(i => i.id === id);
        if (!existing) {
            return { success: false, errors: ['Interview not found'] };
        }

        const validationData = { ...data, id };
        const validation = Interview.validate({ ...existing, ...validationData });
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        const updated = Interview.update(existing, data);
        const updatedWithAttribution = this.addAttribution(updated, false);

        try {
            const docRef = doc(this.getCollectionRef(), id);
            await setDoc(docRef, updatedWithAttribution);
            return { success: true, data: updatedWithAttribution };
        } catch (error) {
            console.error('Failed to update interview:', error);
            return { success: false, errors: ['Failed to update interview'] };
        }
    }

    /**
     * Delete an interview
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async delete(id) {
        try {
            const docRef = doc(this.getCollectionRef(), id);
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error('Failed to delete interview:', error);
            return false;
        }
    }

    /**
     * Get interview by ID
     * @param {string} id
     * @returns {InterviewData | undefined}
     */
    getById(id) {
        return this.interviews.find(i => i.id === id);
    }

    // ==================== Query Operations ====================

    /**
     * Get all interviews
     * @returns {InterviewData[]}
     */
    getAll() {
        return [...this.interviews];
    }

    /**
     * Get interviews for a specific application
     * @param {string} appId
     * @returns {InterviewData[]}
     */
    getByApplication(appId) {
        return this.interviews
            .filter(i => i.applicationId === appId)
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    }

    /**
     * Get upcoming interviews (scheduled and in the future)
     * @param {number} [limit]
     * @returns {InterviewData[]}
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
     * @returns {InterviewData[]}
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
     * @returns {InterviewData[]}
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
     * @param {number} month - 0-indexed
     * @returns {InterviewData[]}
     */
    getByMonth(year, month) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return this.getByDateRange(start, end);
    }

    /**
     * Get interviews for a specific week
     * @param {Date} weekStart
     * @returns {InterviewData[]}
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
     * @returns {InterviewData[]}
     */
    getInterviewsNeedingReminder() {
        return this.interviews.filter(i => Interview.needsReminder(i));
    }

    /**
     * Mark reminder as sent for an interview
     * @param {string} id
     */
    async markReminderSent(id) {
        const interview = this.interviews.find(i => i.id === id);
        if (interview) {
            await this.update(id, { reminderSent: true });
        }
    }

    /**
     * Delete all interviews for an application
     * @param {string} appId
     * @returns {Promise<number>}
     */
    async deleteByApplication(appId) {
        const toDelete = this.interviews.filter(i => i.applicationId === appId);

        if (toDelete.length === 0) return 0;

        try {
            const batch = writeBatch(db);
            toDelete.forEach(interview => {
                const docRef = doc(this.getCollectionRef(), interview.id);
                batch.delete(docRef);
            });
            await batch.commit();
            return toDelete.length;
        } catch (error) {
            console.error('Failed to delete interviews:', error);
            return 0;
        }
    }

    // ==================== Subscriptions ====================

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
     * Notify all listeners
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

    /**
     * Cleanup - remove snapshot listener
     */
    cleanup() {
        if (this.unsubscribeSnapshot) {
            this.unsubscribeSnapshot();
            this.unsubscribeSnapshot = null;
        }
        this.initialized = false;
        this.interviews = [];
    }
}

// Singleton instance
let serviceInstance = null;

/**
 * Get or create the FirebaseInterviewService instance
 * @returns {FirebaseInterviewService}
 */
export function getFirebaseInterviewService() {
    if (!serviceInstance) {
        serviceInstance = new FirebaseInterviewService();
    }
    return serviceInstance;
}

/**
 * Reset the service (for logout)
 */
export function resetFirebaseInterviewService() {
    if (serviceInstance) {
        serviceInstance.cleanup();
        serviceInstance = null;
    }
}

export { FirebaseInterviewService };
