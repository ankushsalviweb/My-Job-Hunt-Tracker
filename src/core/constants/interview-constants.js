/**
 * Interview constants - types, modes, statuses
 * Users can customize types and modes via SettingsService
 */

/** 
 * Default interview types (user-customizable)
 * @type {Object.<string, {name: string, icon: string}>}
 */
export const DEFAULT_INTERVIEW_TYPES = {
    technical: { name: 'Technical Round', icon: 'fa-code' },
    hr: { name: 'HR Round', icon: 'fa-user-tie' },
    round1: { name: 'Round 1', icon: 'fa-1' },
    round2: { name: 'Round 2', icon: 'fa-2' },
    round3: { name: 'Round 3', icon: 'fa-3' },
    final: { name: 'Final Round', icon: 'fa-flag' },
    manager: { name: 'Manager Round', icon: 'fa-user-shield' }
};

/**
 * Default interview modes (user-customizable)
 * @type {Object.<string, {name: string, icon: string}>}
 */
export const DEFAULT_INTERVIEW_MODES = {
    video: { name: 'Video Call', icon: 'fa-video' },
    onsite: { name: 'Onsite', icon: 'fa-building' },
    phone: { name: 'Phone', icon: 'fa-phone' }
};

/**
 * Interview statuses (fixed)
 * @type {Object.<string, {name: string, color: string, icon: string}>}
 */
export const INTERVIEW_STATUS = {
    scheduled: { name: 'Scheduled', color: 'bg-blue-500', icon: 'fa-calendar-check' },
    completed: { name: 'Completed', color: 'bg-green-500', icon: 'fa-check-circle' },
    cancelled: { name: 'Cancelled', color: 'bg-red-500', icon: 'fa-times-circle' },
    rescheduled: { name: 'Rescheduled', color: 'bg-yellow-500', icon: 'fa-calendar-alt' }
};

/**
 * Available reminder options in minutes
 * @type {number[]}
 */
export const REMINDER_OPTIONS = [15, 30];

/**
 * Default reminder setting in minutes
 * @type {number}
 */
export const DEFAULT_REMINDER_MINUTES = 30;

/**
 * Get status info by key
 * @param {string} statusKey
 * @returns {{name: string, color: string, icon: string}}
 */
export function getInterviewStatus(statusKey) {
    return INTERVIEW_STATUS[statusKey] || INTERVIEW_STATUS.scheduled;
}
