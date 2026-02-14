/**
 * Interview constants — types, modes, statuses, round outcomes
 */

/**
 * Default interview types (user-customizable)
 * @type {Object.<string, {name: string, icon: string}>}
 */
export const DEFAULT_INTERVIEW_TYPES = {
    technical: { name: 'Technical', icon: 'fa-code' },
    hr: { name: 'HR', icon: 'fa-user-tie' },
    manager: { name: 'Managerial', icon: 'fa-user-shield' },
    coding: { name: 'Coding / DSA', icon: 'fa-laptop-code' },
    system_design: { name: 'System Design', icon: 'fa-diagram-project' },
    culture_fit: { name: 'Culture Fit', icon: 'fa-people-group' },
    final: { name: 'Final Round', icon: 'fa-flag' }
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
    completed: { name: 'Completed', color: 'bg-amber-500', icon: 'fa-check' },
    cancelled: { name: 'Cancelled', color: 'bg-red-500', icon: 'fa-times-circle' },
    rescheduled: { name: 'Rescheduled', color: 'bg-yellow-500', icon: 'fa-calendar-alt' }
};

/**
 * Round outcome statuses
 * @type {Object.<string, {name: string, color: string, icon: string}>}
 */
export const ROUND_OUTCOMES = {
    pending: { name: 'Pending', color: 'bg-blue-500', icon: 'fa-hourglass-half' },
    cleared: { name: 'Cleared', color: 'bg-green-500', icon: 'fa-check-circle' },
    not_cleared: { name: 'Not Cleared', color: 'bg-red-500', icon: 'fa-times-circle' }
};

/**
 * Follow-up defaults
 * @type {{initialWaitDays: number, subsequentWaitDays: number, maxAttempts: number}}
 */
export const FOLLOWUP_DEFAULTS = {
    initialWaitDays: 3,
    subsequentWaitDays: 5,
    maxAttempts: 3
};

/**
 * Available reminder options in minutes
 * @type {number[]}
 */
export const REMINDER_OPTIONS = [15, 30, 60];

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

/**
 * Get round outcome info by key
 * @param {string} outcomeKey
 * @returns {{name: string, color: string, icon: string}}
 */
export function getRoundOutcome(outcomeKey) {
    return ROUND_OUTCOMES[outcomeKey] || ROUND_OUTCOMES.pending;
}
