import { generateId } from '../utils/idGenerator.js';

/**
 * @typedef {Object} NoteEntry
 * @property {string} id - Unique ID for the note
 * @property {string} text - Note content
 * @property {string} createdAt - ISO timestamp
 * @property {string} [createdBy] - User email who created
 */

/**
 * @typedef {Object} FollowUpTracker
 * @property {boolean} isActive - Whether follow-up tracking is active
 * @property {number} attempts - Number of follow-up attempts made
 * @property {string|null} lastFollowUpAt - ISO timestamp of last follow-up
 * @property {string|null} nextReminderAt - ISO timestamp when next reminder fires
 * @property {number|null} hrDeadlineDays - HR-specified deadline in days (overrides default)
 * @property {string} waitingContext - What we're waiting for (e.g., 'screening', 'feedback_round_2')
 */

/**
 * @typedef {Object} ApplicationData
 * @property {string} [id]
 * @property {string} companyName
 * @property {string} role
 *
 * @property {boolean} [isVendor] - true if contact is via vendor
 * @property {string} [vendorCompanyName] - Vendor company name (if isVendor)
 * @property {string} [contactPersonName] - Contact person name (HR or Vendor rep)
 * @property {string} [contactPhone] - Contact phone number
 * @property {string} [contactEmail] - Contact email address
 *
 * @property {string} [opportunityType] - C2H or Company Payroll
 * @property {string} [location] - Remote/WFO/Hybrid
 * @property {string} [city]
 * @property {number} [expectedSalary] - Salary as number
 * @property {string} [noticePeriod]
 *
 * @property {string[]} [skillTags] - Array of skill tags
 * @property {string} [jobDescription] - Job description text
 * @property {NoteEntry[]} [notes] - Timestamped notes array
 *
 * @property {number} currentStage - 1-6 active, 0=Closed
 * @property {string} [finalResult] - Set only by stage transition, not user form
 * @property {string} [createdAt]
 * @property {string} [lastUpdated]
 * @property {string} [createdBy] - UID of user who created
 * @property {string} [createdByEmail] - Email of user who created
 * @property {string} [lastModifiedBy] - UID of user who last modified
 * @property {string} [lastModifiedByEmail] - Email of user who last modified
 * @property {import('./Interaction.js').InteractionData[]} [interactions]
 * @property {FollowUpTracker} [followUpTracker]
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

            // Contact source
            isVendor: data.isVendor ?? false,
            vendorCompanyName: data.vendorCompanyName || '',
            contactPersonName: data.contactPersonName || '',
            contactPhone: data.contactPhone || '',
            contactEmail: data.contactEmail || '',

            // Opportunity details
            opportunityType: data.opportunityType || '',
            location: data.location || '',
            city: data.city || '',
            expectedSalary: data.expectedSalary ?? null,
            noticePeriod: data.noticePeriod || '',

            // Skills & Description
            skillTags: Array.isArray(data.skillTags) ? data.skillTags : [],
            jobDescription: data.jobDescription || '',
            notes: Array.isArray(data.notes) ? data.notes : [],

            // Stage tracking
            currentStage: data.currentStage ?? 1,
            finalResult: data.finalResult || '',
            createdAt: data.createdAt || now,
            lastUpdated: data.lastUpdated || now,
            interactions: data.interactions || [],

            // Follow-up tracker
            followUpTracker: data.followUpTracker || Application.createFollowUpTracker()
        };
    }

    /**
     * Create a fresh follow-up tracker object
     * @returns {FollowUpTracker}
     */
    static createFollowUpTracker() {
        return {
            isActive: false,
            attempts: 0,
            lastFollowUpAt: null,
            nextReminderAt: null,
            hrDeadlineDays: null,
            waitingContext: ''
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
            id: existing.id,
            createdAt: existing.createdAt,
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
