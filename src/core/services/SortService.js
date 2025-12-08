/**
 * @typedef {Object} SortOptions
 * @property {string} column - Column to sort by
 * @property {'asc' | 'desc'} direction - Sort direction
 */

/**
 * Sort service for ordering applications
 */
export class SortService {
    /**
     * Apply sorting to applications
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @param {SortOptions} options
     * @returns {import('../models/Application.js').ApplicationData[]}
     */
    apply(applications, options) {
        const sorted = [...applications];

        sorted.sort((a, b) => {
            let aVal, bVal;

            switch (options.column) {
                case 'companyName':
                case 'company':
                    aVal = a.companyName || '';
                    bVal = b.companyName || '';
                    break;
                case 'role':
                    aVal = a.role || '';
                    bVal = b.role || '';
                    break;
                case 'hrName':
                    aVal = a.hrName || '';
                    bVal = b.hrName || '';
                    break;
                case 'currentStage':
                case 'stage':
                    aVal = a.currentStage;
                    bVal = b.currentStage;
                    break;
                case 'lastUpdated':
                case 'updated':
                    aVal = new Date(a.lastUpdated || 0);
                    bVal = new Date(b.lastUpdated || 0);
                    break;
                case 'createdAt':
                    aVal = new Date(a.createdAt || 0);
                    bVal = new Date(b.createdAt || 0);
                    break;
                default:
                    aVal = a[options.column] || '';
                    bVal = b[options.column] || '';
            }

            if (aVal < bVal) return options.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return options.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }

    /**
     * Toggle sort direction
     * @param {SortOptions} current
     * @param {string} column
     * @returns {SortOptions}
     */
    toggle(current, column) {
        if (current.column === column) {
            return {
                column,
                direction: current.direction === 'asc' ? 'desc' : 'asc'
            };
        }
        return { column, direction: 'asc' };
    }
}
