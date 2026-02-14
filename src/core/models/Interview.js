import { generateId } from '../utils/idGenerator.js';
import { DEFAULT_REMINDER_MINUTES } from '../constants/interview-constants.js';

/**
 * @typedef {Object} InterviewData
 * @property {string} id - Unique interview ID
 * @property {string} applicationId - Link to parent application
 * @property {number} roundNumber - Round number (auto-incremented per application)
 * @property {string} type - Interview type key (technical, hr, manager, coding, etc.)
 * @property {string} mode - Interview mode key (video, onsite, phone)
 * @property {string} scheduledAt - ISO datetime of interview
 * @property {number} duration - Duration in minutes
 * @property {string} [meetingLink] - Video call URL
 * @property {string} [location] - Onsite address
 * @property {string} [interviewerName] - Name of interviewer(s)
 * @property {string} [notes] - Preparation notes
 * @property {string} status - scheduled/completed/cancelled/rescheduled
 * @property {string} roundOutcome - pending/cleared/not_cleared
 * @property {number} reminderMinutes - Reminder time before interview
 * @property {boolean} reminderSent - Whether reminder was already sent
 * @property {string} [outcome] - Result notes after interview
 * @property {string} createdAt - Creation timestamp
 * @property {string} [createdBy] - UID of user who created
 * @property {string} [createdByEmail] - Email of user who created
 * @property {string} [lastModifiedBy] - UID of user who last modified
 * @property {string} [lastModifiedByEmail] - Email of user who last modified
 */

/**
 * Interview model factory
 */
export class Interview {
    /**
     * Create a new interview object
     * @param {Partial<InterviewData>} data
     * @returns {InterviewData}
     */
    static create(data) {
        const now = new Date().toISOString();
        return {
            id: data.id || generateId('int'),
            applicationId: data.applicationId || '',
            roundNumber: data.roundNumber ?? 1,
            type: data.type || 'technical',
            mode: data.mode || 'video',
            scheduledAt: data.scheduledAt || '',
            duration: data.duration ?? 60,
            meetingLink: data.meetingLink || '',
            location: data.location || '',
            interviewerName: data.interviewerName || '',
            notes: data.notes || '',
            status: data.status || 'scheduled',
            roundOutcome: data.roundOutcome || 'pending',
            reminderMinutes: data.reminderMinutes ?? DEFAULT_REMINDER_MINUTES,
            reminderSent: data.reminderSent || false,
            outcome: data.outcome || '',
            createdAt: data.createdAt || now
        };
    }

    /**
     * Update an interview with new data
     * @param {InterviewData} existing
     * @param {Partial<InterviewData>} updates
     * @returns {InterviewData}
     */
    static update(existing, updates) {
        return {
            ...existing,
            ...updates,
            id: existing.id,
            applicationId: existing.applicationId,
            roundNumber: existing.roundNumber,
            createdAt: existing.createdAt
        };
    }

    /**
     * Validate interview data
     * @param {Partial<InterviewData>} data
     * @returns {{valid: boolean, errors: string[]}}
     */
    static validate(data) {
        const errors = [];

        if (!data.applicationId?.trim()) {
            errors.push('Application is required');
        }
        if (!data.scheduledAt) {
            errors.push('Interview date/time is required');
        }
        if (!data.type) {
            errors.push('Interview type is required');
        }
        if (!data.mode) {
            errors.push('Interview mode is required');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if an interview is upcoming (scheduled and in the future)
     * @param {InterviewData} interview
     * @returns {boolean}
     */
    static isUpcoming(interview) {
        if (interview.status !== 'scheduled') return false;
        return new Date(interview.scheduledAt) > new Date();
    }

    /**
     * Check if reminder should be sent for this interview
     * @param {InterviewData} interview
     * @returns {boolean}
     */
    static needsReminder(interview) {
        if (interview.reminderSent || interview.status !== 'scheduled') {
            return false;
        }

        const now = new Date();
        const scheduled = new Date(interview.scheduledAt);
        const reminderTime = new Date(scheduled.getTime() - interview.reminderMinutes * 60 * 1000);

        return now >= reminderTime && now < scheduled;
    }
}
