import { generateId } from '../utils/idGenerator.js';

/**
 * @typedef {Object} InteractionData
 * @property {string} id
 * @property {string} type - hr_called | followed_up | document_received | interview_round | note
 * @property {string} notes - Description of the interaction
 * @property {string} date - ISO timestamp
 * @property {number} [stage] - Optional stage update triggered by this interaction
 * @property {string} [interviewId] - Links to Interview record (for interview_round type)
 */

/**
 * Interaction model factory
 */
export class Interaction {
    /**
     * Valid interaction types
     * @type {string[]}
     */
    static VALID_TYPES = ['hr_called', 'followed_up', 'document_received', 'interview_round', 'note'];

    /**
     * Create a new interaction
     * @param {Partial<InteractionData>} data
     * @returns {InteractionData}
     */
    static create(data) {
        return {
            id: data.id || generateId('ix'),
            type: Interaction.VALID_TYPES.includes(data.type) ? data.type : 'note',
            notes: data.notes || '',
            date: data.date || new Date().toISOString(),
            stage: data.stage ?? null,
            interviewId: data.interviewId || null
        };
    }
}
