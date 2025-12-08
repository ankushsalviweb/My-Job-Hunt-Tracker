/**
 * Interaction type icons
 * @type {Object.<string, string>}
 */
export const INTERACTION_ICONS = {
    'call_received': '📞',
    'call_made': '📱',
    'email_received': '📧',
    'email_sent': '📤',
    'interview': '🎤',
    'followup': '🔄',
    'update': '📝',
    'other': '📌'
};

/**
 * Interaction type labels for dropdown
 * @type {Array<{value: string, label: string}>}
 */
export const INTERACTION_TYPES = [
    { value: 'call_received', label: '📞 Call Received' },
    { value: 'call_made', label: '📱 Call Made' },
    { value: 'email_received', label: '📧 Email Received' },
    { value: 'email_sent', label: '📤 Email Sent' },
    { value: 'interview', label: '🎤 Interview' },
    { value: 'followup', label: '🔄 Follow Up' },
    { value: 'update', label: '📝 Status Update' },
    { value: 'other', label: '📌 Other' }
];

/**
 * Get interaction icon
 * @param {string} type
 * @returns {string}
 */
export function getInteractionIcon(type) {
    return INTERACTION_ICONS[type] || '📌';
}
