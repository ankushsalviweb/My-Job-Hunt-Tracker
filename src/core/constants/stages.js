/**
 * Stage definitions — 6 active stages + Closed
 * Matches the real-world job hunting pipeline
 * @type {Object.<number, {name: string, icon: string, color: string, desc: string}>}
 */
export const STAGES = {
    1: { name: 'Opportunity Received', icon: 'fa-phone-volume', color: 'bg-blue-500', desc: 'First HR/Vendor call logged' },
    2: { name: 'Under Discussion', icon: 'fa-comments', color: 'bg-purple-500', desc: 'Role, salary, JD being discussed' },
    3: { name: 'Screening', icon: 'fa-file-alt', color: 'bg-yellow-500', desc: 'CV submitted for screening' },
    4: { name: 'Shortlisted', icon: 'fa-check-circle', color: 'bg-teal-500', desc: 'CV cleared, interviews expected' },
    5: { name: 'Interviewing', icon: 'fa-user-check', color: 'bg-indigo-500', desc: 'Active interview rounds' },
    6: { name: 'Offer Stage', icon: 'fa-trophy', color: 'bg-green-500', desc: 'All rounds cleared, offer phase' },
    0: { name: 'Closed', icon: 'fa-times-circle', color: 'bg-gray-500', desc: 'Disposed with reason' }
};

/**
 * Ordered list of stages for display purposes
 * @type {number[]}
 */
export const STAGE_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Get stage info by stage number
 * @param {number} stageNum
 * @returns {{name: string, icon: string, color: string, desc: string}}
 */
export function getStage(stageNum) {
    return STAGES[stageNum] || STAGES[0];
}

/**
 * Stage transition action map — what the UI should do when moving to each stage
 * @type {Object.<number, string|null>}
 */
export const STAGE_ACTIONS = {
    1: null,
    2: 'prompt_details',
    3: 'start_followup',
    4: null,
    5: 'schedule_interview',
    6: 'prompt_result',
    0: 'prompt_close_reason'
};
