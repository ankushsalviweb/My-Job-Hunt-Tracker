/**
 * Result labels for final application outcomes
 * @type {Object.<string, {text: string, class: string}>}
 */
export const RESULT_LABELS = {
    'offered': { text: '🎉 Offer Received', class: 'text-green-400' },
    'accepted': { text: '✅ Offer Accepted', class: 'text-green-400' },
    'rejected': { text: '❌ Rejected', class: 'text-red-400' },
    'declined': { text: '🚫 Declined by Me', class: 'text-yellow-400' },
    'ghosted': { text: '👻 Ghosted', class: 'text-gray-400' },
    'withdrawn': { text: '🚪 Withdrawn', class: 'text-amber-400' }
};

/**
 * Get result label info
 * @param {string} resultKey
 * @returns {{text: string, class: string} | null}
 */
export function getResultLabel(resultKey) {
    return RESULT_LABELS[resultKey] || null;
}

/**
 * All possible result keys
 * @type {string[]}
 */
export const RESULT_KEYS = Object.keys(RESULT_LABELS);

/**
 * Close reasons — shown when user moves an app to Closed stage
 * @type {Array<{value: string, label: string}>}
 */
export const CLOSE_REASONS = [
    { value: 'rejected', label: '❌ Rejected by Company' },
    { value: 'declined', label: '🚫 Declined by Me' },
    { value: 'ghosted', label: '👻 Ghosted / No Response' },
    { value: 'withdrawn', label: '🚪 Withdrawn from Process' }
];
