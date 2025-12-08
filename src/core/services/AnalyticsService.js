import { STAGES, STAGE_ORDER } from '../constants/stages.js';
import { RESULT_LABELS } from '../constants/results.js';
import { getWeekKey } from '../utils/dateUtils.js';

/**
 * @typedef {Object} StageStats
 * @property {number} stage
 * @property {string} name
 * @property {number} count
 * @property {string} color
 */

/**
 * @typedef {Object} ResultStats
 * @property {string} result
 * @property {string} label
 * @property {number} count
 */

/**
 * @typedef {Object} TimelineData
 * @property {string} week
 * @property {number} count
 */

/**
 * @typedef {Object} AnalyticsData
 * @property {number} total
 * @property {number} active
 * @property {number} closed
 * @property {StageStats[]} byStage
 * @property {ResultStats[]} byResult
 * @property {TimelineData[]} timeline
 * @property {number} successRate
 * @property {number} responseRate
 */

/**
 * Analytics service for computing statistics
 */
export class AnalyticsService {
    /**
     * Compute all analytics data
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @returns {AnalyticsData}
     */
    compute(applications) {
        return {
            total: applications.length,
            active: applications.filter(a => a.currentStage !== 0).length,
            closed: applications.filter(a => a.currentStage === 0).length,
            byStage: this.computeByStage(applications),
            byResult: this.computeByResult(applications),
            timeline: this.computeTimeline(applications),
            successRate: this.computeSuccessRate(applications),
            responseRate: this.computeResponseRate(applications)
        };
    }

    /**
     * Compute counts by stage
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @returns {StageStats[]}
     */
    computeByStage(applications) {
        const counts = {};
        STAGE_ORDER.forEach(s => counts[s] = 0);

        applications.forEach(app => {
            counts[app.currentStage] = (counts[app.currentStage] || 0) + 1;
        });

        return STAGE_ORDER.map(stage => ({
            stage,
            name: STAGES[stage].name,
            count: counts[stage] || 0,
            color: STAGES[stage].color
        }));
    }

    /**
     * Compute counts by result
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @returns {ResultStats[]}
     */
    computeByResult(applications) {
        const counts = {
            inprogress: 0,
            offered: 0,
            accepted: 0,
            rejected: 0,
            declined: 0,
            ghosted: 0
        };

        applications.forEach(app => {
            if (!app.finalResult) {
                counts.inprogress++;
            } else if (counts[app.finalResult] !== undefined) {
                counts[app.finalResult]++;
            }
        });

        return [
            { result: 'inprogress', label: '⏳ In Progress', count: counts.inprogress },
            { result: 'offered', label: RESULT_LABELS.offered.text, count: counts.offered },
            { result: 'accepted', label: RESULT_LABELS.accepted.text, count: counts.accepted },
            { result: 'rejected', label: RESULT_LABELS.rejected.text, count: counts.rejected },
            { result: 'declined', label: RESULT_LABELS.declined.text, count: counts.declined },
            { result: 'ghosted', label: RESULT_LABELS.ghosted.text, count: counts.ghosted }
        ].filter(r => r.count > 0);
    }

    /**
     * Compute applications added per week (last 12 weeks)
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @returns {TimelineData[]}
     */
    computeTimeline(applications) {
        const weekCounts = {};

        applications.forEach(app => {
            if (app.createdAt) {
                const weekKey = getWeekKey(new Date(app.createdAt));
                weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1;
            }
        });

        // Get last 12 weeks
        const weeks = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - (i * 7));
            const weekKey = getWeekKey(d);
            weeks.push({
                week: weekKey,
                count: weekCounts[weekKey] || 0
            });
        }

        return weeks;
    }

    /**
     * Compute success rate (offers / completed applications)
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @returns {number}
     */
    computeSuccessRate(applications) {
        const completed = applications.filter(a => a.finalResult);
        if (completed.length === 0) return 0;

        const successful = completed.filter(a =>
            a.finalResult === 'offered' || a.finalResult === 'accepted'
        );

        return Math.round((successful.length / completed.length) * 100);
    }

    /**
     * Compute response rate (not ghosted / all with result)
     * @param {import('../models/Application.js').ApplicationData[]} applications
     * @returns {number}
     */
    computeResponseRate(applications) {
        const withResult = applications.filter(a => a.finalResult);
        if (withResult.length === 0) return 0;

        const gotResponse = withResult.filter(a => a.finalResult !== 'ghosted');

        return Math.round((gotResponse.length / withResult.length) * 100);
    }
}
