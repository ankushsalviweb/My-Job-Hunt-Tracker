/**
 * Result labels for final application outcomes
 * @type {Object.<string, {text: string, class: string}>}
 */
export const RESULT_LABELS = {
    'offered': { text: '🎉 Offer Received', class: 'text-green-400' },
    'accepted': { text: '✅ Offer Accepted', class: 'text-green-400' },
    'rejected': { text: '❌ Rejected', class: 'text-red-400' },
    'declined': { text: '🚫 Declined', class: 'text-yellow-400' },
    'ghosted': { text: '👻 Ghosted', class: 'text-gray-400' }
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
