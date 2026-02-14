/**
 * @typedef {Object} FilterOptions
 * @property {string} [search] - Search term for company, role, HR, skills
 * @property {number[]} [stages] - Array of stage numbers to include
 * @property {string[]} [types] - Array of opportunity types
 * @property {string[]} [locations] - Array of locations (Remote, WFO, Hybrid)
 * @property {string[]} [results] - Array of result keys (including 'inprogress')
 */

/**
 * Filter service for applying filters to applications
 */
export class FilterService {
    /**
     * Apply filters to applications
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @param {FilterOptions} filters
     * @returns {import('../models/Application.js').ApplicationData[]}
     */
    apply(applications, filters) {
        let filtered = [...applications];

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(app =>
                app.companyName?.toLowerCase().includes(searchLower) ||
                app.role?.toLowerCase().includes(searchLower) ||
                app.contactPersonName?.toLowerCase().includes(searchLower) ||
                app.vendorCompanyName?.toLowerCase().includes(searchLower) ||
                (Array.isArray(app.skillTags) && app.skillTags.some(s => s.toLowerCase().includes(searchLower)))
            );
        }

        // Stage filter
        if (filters.stages && filters.stages.length > 0) {
            filtered = filtered.filter(app =>
                filters.stages.includes(app.currentStage)
            );
        }

        // Type filter
        if (filters.types && filters.types.length > 0) {
            filtered = filtered.filter(app =>
                filters.types.includes(app.opportunityType)
            );
        }

        // Location filter
        if (filters.locations && filters.locations.length > 0) {
            filtered = filtered.filter(app =>
                filters.locations.includes(app.location)
            );
        }

        // Result filter
        if (filters.results && filters.results.length > 0) {
            filtered = filtered.filter(app => {
                if (filters.results.includes('inprogress') && !app.finalResult) {
                    return true;
                }
                return filters.results.includes(app.finalResult);
            });
        }

        return filtered;
    }

    /**
     * Get unique values for filter dropdowns
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @returns {{types: string[], locations: string[]}}
     */
    getFilterOptions(applications) {
        const types = [...new Set(applications.map(a => a.opportunityType).filter(Boolean))];
        const locations = [...new Set(applications.map(a => a.location).filter(Boolean))];
        return { types, locations };
    }
}
