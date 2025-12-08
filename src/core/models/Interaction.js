import { generateId } from '../utils/idGenerator.js';

/**
 * @typedef {Object} InteractionData
 * @property {string} id
 * @property {string} type
 * @property {string} date
 * @property {string} notes
 */

/**
 * Interaction model factory
 */
export class Interaction {
    /**
     * Create a new interaction object
     * @param {Partial<InteractionData>} data
     * @returns {InteractionData}
     */
    static create(data) {
        return {
            id: data.id || generateId(),
            type: data.type || 'other',
            date: data.date || new Date().toISOString(),
            notes: data.notes || ''
        };
    }

    /**
     * Validate interaction data
     * @param {Partial<InteractionData>} data
     * @returns {{valid: boolean, errors: string[]}}
     */
    static validate(data) {
        const errors = [];
        if (!data.notes?.trim()) {
            errors.push('Notes are required');
        }
        if (!data.date) {
            errors.push('Date is required');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
