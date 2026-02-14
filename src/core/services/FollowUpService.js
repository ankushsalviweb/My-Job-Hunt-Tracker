import { FOLLOWUP_DEFAULTS } from '../constants/interview-constants.js';
import { Application } from '../models/Application.js';

/**
 * FollowUpService — Manages follow-up timers, attempt tracking, and ghosting detection
 */
class FollowUpService {
    /**
     * Start follow-up tracking for an application
     * @param {import('../models/Application.js').ApplicationData} app
     * @param {string} context - What we're waiting for (e.g., 'screening', 'feedback_round_1')
     * @param {number} [hrDeadlineDays] - HR-specified deadline in days (overrides default)
     * @returns {import('../models/Application.js').FollowUpTracker}
     */
    startTracking(app, context, hrDeadlineDays = null) {
        const waitDays = hrDeadlineDays || FOLLOWUP_DEFAULTS.initialWaitDays;
        const nextReminder = new Date();
        nextReminder.setDate(nextReminder.getDate() + waitDays);

        const tracker = {
            isActive: true,
            attempts: 0,
            lastFollowUpAt: null,
            nextReminderAt: nextReminder.toISOString(),
            hrDeadlineDays: hrDeadlineDays,
            waitingContext: context
        };

        app.followUpTracker = tracker;
        return tracker;
    }

    /**
     * Record a follow-up attempt
     * @param {import('../models/Application.js').ApplicationData} app
     * @returns {{isGhostCandidate: boolean, attempts: number}}
     */
    recordFollowUp(app) {
        if (!app.followUpTracker) {
            app.followUpTracker = Application.createFollowUpTracker();
        }

        const tracker = app.followUpTracker;
        tracker.attempts += 1;
        tracker.lastFollowUpAt = new Date().toISOString();

        const nextReminder = new Date();
        nextReminder.setDate(nextReminder.getDate() + FOLLOWUP_DEFAULTS.subsequentWaitDays);
        tracker.nextReminderAt = nextReminder.toISOString();

        const isGhostCandidate = tracker.attempts >= FOLLOWUP_DEFAULTS.maxAttempts;

        return { isGhostCandidate, attempts: tracker.attempts };
    }

    /**
     * Record HR response — resets follow-up state
     * @param {import('../models/Application.js').ApplicationData} app
     */
    recordHRResponse(app) {
        if (!app.followUpTracker) return;
        // HR responded, so reset the follow-up cycle
        app.followUpTracker.attempts = 0;
        app.followUpTracker.lastFollowUpAt = null;
        // Keep tracking active if context still applies (e.g., still in screening)
    }

    /**
     * Stop tracking for an application
     * @param {import('../models/Application.js').ApplicationData} app
     */
    stopTracking(app) {
        if (app.followUpTracker) {
            app.followUpTracker.isActive = false;
            app.followUpTracker.nextReminderAt = null;
        }
    }

    /**
     * Check all applications for pending reminders
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @returns {Array<{appId: string, companyName: string, context: string, attempts: number, isGhostCandidate: boolean, daysSinceReminder: number}>}
     */
    checkReminders(applications) {
        const now = new Date();
        const reminders = [];

        for (const app of applications) {
            const tracker = app.followUpTracker;
            if (!tracker || !tracker.isActive || !tracker.nextReminderAt) continue;

            const reminderDate = new Date(tracker.nextReminderAt);
            if (now >= reminderDate) {
                const daysSince = Math.floor((now - reminderDate) / (1000 * 60 * 60 * 24));
                reminders.push({
                    appId: app.id,
                    companyName: app.companyName,
                    role: app.role,
                    context: tracker.waitingContext,
                    attempts: tracker.attempts,
                    isGhostCandidate: tracker.attempts >= FOLLOWUP_DEFAULTS.maxAttempts,
                    daysSinceReminder: daysSince
                });
            }
        }

        return reminders;
    }

    /**
     * Get all applications with active follow-up tracking
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @returns {import('../models/Application.js').ApplicationData[]}
     */
    getActiveFollowUps(applications) {
        return applications.filter(app =>
            app.followUpTracker?.isActive && app.currentStage !== 0
        );
    }

    /**
     * Dismiss nudge — stop auto-nudging but keep app open
     * @param {import('../models/Application.js').ApplicationData} app
     */
    dismissNudge(app) {
        if (app.followUpTracker) {
            app.followUpTracker.isActive = false;
            app.followUpTracker.nextReminderAt = null;
        }
    }
}

// Singleton
let serviceInstance = null;

/**
 * @returns {FollowUpService}
 */
export function getFollowUpService() {
    if (!serviceInstance) {
        serviceInstance = new FollowUpService();
    }
    return serviceInstance;
}

export { FollowUpService };
