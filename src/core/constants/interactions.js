/**
 * Interaction type icons
 * @type {Object.<string, string>}
 */
export const INTERACTION_ICONS = {
    'hr_called': '📞',
    'followed_up': '📱',
    'document_received': '📧',
    'interview_round': '🎤',
    'note': '📝'
};

/**
 * Interaction type labels for dropdown
 * @type {Array<{value: string, label: string}>}
 */
export const INTERACTION_TYPES = [
    { value: 'hr_called', label: '📞 HR/Vendor Called Me' },
    { value: 'followed_up', label: '📱 I Followed Up' },
    { value: 'document_received', label: '📧 Document Received' },
    { value: 'interview_round', label: '🎤 Interview Round' },
    { value: 'note', label: '📝 Note' }
];

/**
 * Get interaction icon
 * @param {string} type
 * @returns {string}
 */
export function getInteractionIcon(type) {
    return INTERACTION_ICONS[type] || '📝';
}
