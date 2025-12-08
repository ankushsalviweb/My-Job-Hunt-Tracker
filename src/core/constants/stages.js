/**
 * Stage definitions matching user's job hunting process
 * @type {Object.<number, {name: string, icon: string, color: string, desc: string}>}
 */
export const STAGES = {
    1: { name: 'Initial Contact', icon: 'fa-phone-volume', color: 'bg-blue-500', desc: 'HR/Vendor call based on CV' },
    2: { name: 'Discussion', icon: 'fa-comments', color: 'bg-purple-500', desc: 'Role, Skills, Salary, Location discussed' },
    3: { name: 'CV Screening', icon: 'fa-file-alt', color: 'bg-yellow-500', desc: 'Following up on screening status' },
    4: { name: 'Shortlisted', icon: 'fa-check-circle', color: 'bg-teal-500', desc: 'CV shortlisted for interview' },
    5: { name: 'Interview Set', icon: 'fa-calendar-check', color: 'bg-indigo-500', desc: 'Interview scheduled on calendar' },
    6: { name: 'Awaiting Feedback', icon: 'fa-hourglass-half', color: 'bg-orange-500', desc: 'Interview given, tracking feedback' },
    7: { name: 'Further Rounds', icon: 'fa-layer-group', color: 'bg-pink-500', desc: 'Additional interview rounds' },
    8: { name: 'Final Result', icon: 'fa-flag-checkered', color: 'bg-green-500', desc: 'Application reached final stage' },
    0: { name: 'Closed', icon: 'fa-times-circle', color: 'bg-gray-500', desc: 'Application closed/discarded' }
};

/**
 * Ordered list of stages for display purposes
 * @type {number[]}
 */
export const STAGE_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 0];

/**
 * Get stage info by stage number
 * @param {number} stageNum
 * @returns {{name: string, icon: string, color: string, desc: string}}
 */
export function getStage(stageNum) {
    return STAGES[stageNum] || STAGES[0];
}
