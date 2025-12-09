import { generateId } from '../utils/idGenerator.js';

/**
 * @typedef {Object} ApplicationData
 * @property {string} [id]
 * @property {string} companyName
 * @property {string} role
 * @property {string} [hrName]
 * @property {string} [hrContact]
 * @property {string} [opportunityType]
 * @property {string} [location]
 * @property {string} [city]
 * @property {string} [salary]
 * @property {string} [noticePeriod]
 * @property {string} [keySkills]
 * @property {string} [jdNotes]
 * @property {number} currentStage
 * @property {string} [finalResult]
 * @property {string} [createdAt]
 * @property {string} [lastUpdated]
 * @property {string} [createdBy] - UID of user who created
 * @property {string} [createdByEmail] - Email of user who created
 * @property {string} [lastModifiedBy] - UID of user who last modified
 * @property {string} [lastModifiedByEmail] - Email of user who last modified
 * @property {import('./Interaction.js').InteractionData[]} [interactions]
 */

/**
 * Application model factory
 */
export class Application {
    /**
     * Create a new application object
     * @param {Partial<ApplicationData>} data
     * @returns {ApplicationData}
     */
    static create(data) {
        const now = new Date().toISOString();
        return {
            id: data.id || generateId(),
            companyName: data.companyName || '',
            role: data.role || '',
            hrName: data.hrName || '',
            hrContact: data.hrContact || '',
            opportunityType: data.opportunityType || '',
            location: data.location || '',
            city: data.city || '',
            salary: data.salary || '',
            noticePeriod: data.noticePeriod || '',
            keySkills: data.keySkills || '',
            jdNotes: data.jdNotes || '',
            currentStage: data.currentStage ?? 1,
            finalResult: data.finalResult || '',
            createdAt: data.createdAt || now,
            lastUpdated: data.lastUpdated || now,
            interactions: data.interactions || []
        };
    }

    /**
     * Update an application with new data
     * @param {ApplicationData} existing
     * @param {Partial<ApplicationData>} updates
     * @returns {ApplicationData}
     */
    static update(existing, updates) {
        return {
            ...existing,
            ...updates,
            id: existing.id, // Preserve ID
            createdAt: existing.createdAt, // Preserve creation date
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Validate application data
     * @param {Partial<ApplicationData>} data
     * @returns {{valid: boolean, errors: string[]}}
     */
    static validate(data) {
        const errors = [];
        if (!data.companyName?.trim()) {
            errors.push('Company name is required');
        }
        if (!data.role?.trim()) {
            errors.push('Role is required');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
