import { getSettingsService } from './SettingsService.js';
import { getInterviewService } from './InterviewService.js';

/**
 * NotificationService - Manages browser notifications for interview reminders
 */
class NotificationService {
    constructor() {
        this.checkInterval = null;
        this.CHECK_FREQUENCY_MS = 60000; // Check every minute
    }

    /**
     * Request notification permission from user
     * @returns {Promise<boolean>} Whether permission was granted
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('Browser does not support notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission === 'denied') {
            return false;
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    /**
     * Check if notification permission is granted
     * @returns {boolean}
     */
    hasPermission() {
        return 'Notification' in window && Notification.permission === 'granted';
    }

    /**
     * Check if notifications are supported and enabled
     * @returns {boolean}
     */
    isEnabled() {
        const settings = getSettingsService();
        return this.hasPermission() && settings.areNotificationsEnabled();
    }

    /**
     * Show a browser notification
     * @param {string} title
     * @param {Object} options
     * @param {string} [options.body]
     * @param {string} [options.icon]
     * @param {string} [options.tag]
     * @param {Function} [onClick]
     */
    showNotification(title, options = {}, onClick = null) {
        if (!this.isEnabled()) return;

        try {
            const notification = new Notification(title, {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                ...options
            });

            if (onClick) {
                notification.onclick = () => {
                    window.focus();
                    onClick();
                    notification.close();
                };
            }

            // Auto-close after 10 seconds
            setTimeout(() => notification.close(), 10000);
        } catch (e) {
            console.error('Failed to show notification:', e);
        }
    }

    /**
     * Show interview reminder notification
     * @param {import('../models/Interview.js').InterviewData} interview
     * @param {Object} application - The linked application data
     */
    showInterviewReminder(interview, application) {
        const scheduledDate = new Date(interview.scheduledAt);
        const timeStr = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        this.showNotification(
            `🎤 Interview Reminder`,
            {
                body: `${application.companyName} - ${application.role}\nStarting at ${timeStr}`,
                tag: `interview-${interview.id}`,
                requireInteraction: true
            },
            () => {
                if (window.app?.openDetail) {
                    window.app.openDetail(interview.applicationId);
                }
            }
        );
    }

    /**
     * Show follow-up reminder notification
     * @param {{appId: string, companyName: string, role: string, context: string, daysSinceReminder: number}} reminder
     */
    showFollowUpReminder(reminder) {
        this.showNotification(
            `📱 Follow Up Needed`,
            {
                body: `No update from ${reminder.companyName} (${reminder.role}) for ${reminder.daysSinceReminder + 3} days.\nContext: ${reminder.context}`,
                tag: `followup-${reminder.appId}`,
                requireInteraction: true
            },
            () => {
                if (window.app?.openDetail) {
                    window.app.openDetail(reminder.appId);
                }
            }
        );
    }

    /**
     * Show ghosting alert notification
     * @param {{appId: string, companyName: string, role: string, attempts: number}} reminder
     */
    showGhostingAlert(reminder) {
        this.showNotification(
            `👻 Possible Ghosting`,
            {
                body: `${reminder.companyName} (${reminder.role}) — ${reminder.attempts} follow-ups with no response.\nConsider closing this application.`,
                tag: `ghost-${reminder.appId}`,
                requireInteraction: true
            },
            () => {
                if (window.app?.openDetail) {
                    window.app.openDetail(reminder.appId);
                }
            }
        );
    }

    /**
     * Start checking for interviews that need reminders
     */
    startReminderScheduler() {
        if (this.checkInterval) return;

        // Initial check
        this.checkReminders();

        // Check every minute
        this.checkInterval = setInterval(() => {
            this.checkReminders();
        }, this.CHECK_FREQUENCY_MS);
    }

    /**
     * Stop the reminder scheduler
     */
    stopReminderScheduler() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Check for interviews needing reminders and send notifications
     * @private
     */
    checkReminders() {
        if (!this.isEnabled()) return;

        const interviewService = getInterviewService();
        const interviews = interviewService.getInterviewsNeedingReminder();

        interviews.forEach(interview => {
            // We need to get the application data to show in notification
            // This will be called from UIController which has access to ApplicationEngine
            const event = new CustomEvent('interview-reminder', {
                detail: { interview }
            });
            window.dispatchEvent(event);

            // Mark reminder as sent
            interviewService.markReminderSent(interview.id);
        });
    }
}

// Singleton instance
let serviceInstance = null;

/**
 * Get or create the NotificationService instance
 * @returns {NotificationService}
 */
export function getNotificationService() {
    if (!serviceInstance) {
        serviceInstance = new NotificationService();
    }
    return serviceInstance;
}

export { NotificationService };
