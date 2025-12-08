import { getEngine } from '../core/ApplicationEngine.js';
import { getInterviewService } from '../core/services/InterviewService.js';
import { getSettingsService } from '../core/services/SettingsService.js';
import { INTERVIEW_STATUS } from '../core/constants/interview-constants.js';

/**
 * Lightweight Calendar Component
 * Renders Month, Week, and Day views for interview scheduling
 */

/**
 * Get the start of the week (Monday) for a given date
 * @param {Date} date
 * @returns {Date}
 */
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(d.setDate(diff));
}

/**
 * Format time for display
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date for display
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Check if two dates are the same day
 * @param {Date} d1
 * @param {Date} d2
 * @returns {boolean}
 */
function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

/**
 * Get month name
 * @param {number} month - 0-indexed month
 * @returns {string}
 */
function getMonthName(month) {
    return new Date(2000, month, 1).toLocaleString('default', { month: 'long' });
}

/**
 * Get number of days in a month
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {number}
 */
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Render the calendar view (main container)
 * @param {string} view - 'month' | 'week' | 'day'
 * @param {Date} currentDate - The current view date
 * @param {Function} onNavigate - Callback for navigation
 * @param {Function} onViewChange - Callback for view change
 * @param {Function} onInterviewClick - Callback when interview is clicked
 * @param {Function} onEmptyDayClick - Callback when empty day is clicked
 * @returns {string} HTML string
 */
export function renderCalendarView(view, currentDate, onNavigate, onViewChange, onInterviewClick, onEmptyDayClick) {
    const engine = getEngine();
    const interviewService = getInterviewService();
    const settings = getSettingsService();
    const types = settings.getInterviewTypes();
    const modes = settings.getInterviewModes();

    return `
        <div class="calendar-container bg-gray-800 rounded-xl border border-gray-700">
            ${renderCalendarHeader(view, currentDate)}
            <div id="calendarContent" class="p-4">
                ${view === 'month' ? renderMonthView(currentDate, interviewService, engine, types) : ''}
                ${view === 'week' ? renderWeekView(currentDate, interviewService, engine, types) : ''}
                ${view === 'day' ? renderDayView(currentDate, interviewService, engine, types, modes) : ''}
            </div>
        </div>
    `;
}

/**
 * Render calendar header with navigation and view switcher
 * @param {string} view
 * @param {Date} currentDate
 * @returns {string}
 */
function renderCalendarHeader(view, currentDate) {
    let title = '';
    if (view === 'month') {
        title = `${getMonthName(currentDate.getMonth())} ${currentDate.getFullYear()}`;
    } else if (view === 'week') {
        const weekStart = getWeekStart(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        title = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
    } else {
        title = formatDate(currentDate);
    }

    return `
        <div class="calendar-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-gray-700">
            <div class="flex items-center gap-3">
                <button onclick="window.app.calendarNavigate('prev')" 
                    class="p-2 hover:bg-gray-700 rounded-lg transition">
                    <i class="fas fa-chevron-left text-gray-400"></i>
                </button>
                <h3 class="text-lg font-semibold text-white min-w-[200px] text-center">${title}</h3>
                <button onclick="window.app.calendarNavigate('next')" 
                    class="p-2 hover:bg-gray-700 rounded-lg transition">
                    <i class="fas fa-chevron-right text-gray-400"></i>
                </button>
                <button onclick="window.app.calendarNavigate('today')" 
                    class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition ml-2">
                    Today
                </button>
            </div>
            <div class="flex items-center gap-2">
                <div class="flex bg-gray-900 rounded-lg p-1">
                    <button onclick="window.app.setCalendarView('month')" 
                        class="calendar-view-btn px-3 py-1 rounded text-sm ${view === 'month' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}">
                        Month
                    </button>
                    <button onclick="window.app.setCalendarView('week')" 
                        class="calendar-view-btn px-3 py-1 rounded text-sm ${view === 'week' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}">
                        Week
                    </button>
                    <button onclick="window.app.setCalendarView('day')" 
                        class="calendar-view-btn px-3 py-1 rounded text-sm ${view === 'day' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}">
                        Day
                    </button>
                </div>
                <button onclick="window.app.openScheduleInterviewModal()" 
                    class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
                    <i class="fas fa-plus"></i> Schedule Interview
                </button>
            </div>
        </div>
    `;
}

/**
 * Render month view grid
 * @param {Date} currentDate
 * @param {InterviewService} interviewService
 * @param {ApplicationEngine} engine
 * @param {Object} types
 * @returns {string}
 */
function renderMonthView(currentDate, interviewService, engine, types) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();

    // Get first day of month and days count
    const firstDay = new Date(year, month, 1);
    const daysInMonth = getDaysInMonth(year, month);
    const startingDayOfWeek = firstDay.getDay() || 7; // Monday = 1, Sunday = 7

    // Get interviews for this month
    const interviews = interviewService.getByMonth(year, month);

    // Group interviews by date
    const interviewsByDate = {};
    interviews.forEach(int => {
        const dateKey = new Date(int.scheduledAt).toDateString();
        if (!interviewsByDate[dateKey]) interviewsByDate[dateKey] = [];
        interviewsByDate[dateKey].push(int);
    });

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    let html = `
        <div class="month-grid">
            <div class="grid grid-cols-7 gap-1 mb-2">
                ${dayNames.map(day => `
                    <div class="text-center text-sm font-medium text-gray-500 py-2">${day}</div>
                `).join('')}
            </div>
            <div class="grid grid-cols-7 gap-1">
    `;

    // Empty cells before first day
    for (let i = 1; i < startingDayOfWeek; i++) {
        html += `<div class="calendar-day empty min-h-[100px] bg-gray-900/30 rounded-lg"></div>`;
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = date.toDateString();
        const dayInterviews = interviewsByDate[dateKey] || [];
        const isToday = isSameDay(date, today);
        const isPast = date < today && !isToday;

        html += `
            <div class="calendar-day min-h-[100px] bg-gray-900/50 rounded-lg p-2 hover:bg-gray-700/50 transition cursor-pointer ${isToday ? 'ring-2 ring-indigo-500' : ''} ${isPast ? 'opacity-60' : ''}"
                onclick="window.app.calendarDayClick('${date.toISOString()}')">
                <div class="flex justify-between items-start mb-1">
                    <span class="text-sm font-medium ${isToday ? 'text-indigo-400' : 'text-gray-300'}">${day}</span>
                    ${dayInterviews.length > 0 ? `<span class="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">${dayInterviews.length}</span>` : ''}
                </div>
                <div class="space-y-1">
                    ${dayInterviews.slice(0, 2).map(int => {
            const app = engine.getById(int.applicationId);
            const typeName = types[int.type]?.name || int.type;
            const status = INTERVIEW_STATUS[int.status];
            return `
                            <div class="calendar-event text-xs p-1 rounded ${status.color} bg-opacity-20 truncate cursor-pointer"
                                onclick="event.stopPropagation(); window.app.viewInterview('${int.id}')"
                                title="${app?.companyName || 'Unknown'} - ${typeName}">
                                <span class="font-medium">${formatTime(new Date(int.scheduledAt))}</span>
                                <span class="text-gray-300">${app?.companyName || 'Unknown'}</span>
                            </div>
                        `;
        }).join('')}
                    ${dayInterviews.length > 2 ? `<div class="text-xs text-gray-500">+${dayInterviews.length - 2} more</div>` : ''}
                </div>
            </div>
        `;
    }

    // Empty cells after last day to complete the grid
    const totalCells = startingDayOfWeek - 1 + daysInMonth;
    const remainingCells = 7 - (totalCells % 7);
    if (remainingCells < 7) {
        for (let i = 0; i < remainingCells; i++) {
            html += `<div class="calendar-day empty min-h-[100px] bg-gray-900/30 rounded-lg"></div>`;
        }
    }

    html += `
            </div>
        </div>
    `;

    return html;
}

/**
 * Render week view
 * @param {Date} currentDate
 * @param {InterviewService} interviewService
 * @param {ApplicationEngine} engine
 * @param {Object} types
 * @returns {string}
 */
function renderWeekView(currentDate, interviewService, engine, types) {
    const weekStart = getWeekStart(currentDate);
    const today = new Date();
    const interviews = interviewService.getByWeek(weekStart);

    // Group by day
    const interviewsByDay = {};
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        interviewsByDay[day.toDateString()] = [];
    }

    interviews.forEach(int => {
        const dateKey = new Date(int.scheduledAt).toDateString();
        if (interviewsByDay[dateKey]) {
            interviewsByDay[dateKey].push(int);
        }
    });

    let html = `<div class="week-view grid grid-cols-7 gap-2">`;

    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        const dateKey = day.toDateString();
        const dayInterviews = interviewsByDay[dateKey] || [];
        const isToday = isSameDay(day, today);
        const isPast = day < today && !isToday;

        html += `
            <div class="week-day ${isToday ? 'ring-2 ring-indigo-500' : ''} ${isPast ? 'opacity-60' : ''} bg-gray-900/50 rounded-lg overflow-hidden">
                <div class="text-center py-2 ${isToday ? 'bg-indigo-600' : 'bg-gray-700'}">
                    <div class="text-xs text-gray-300">${day.toLocaleDateString([], { weekday: 'short' })}</div>
                    <div class="text-lg font-bold text-white">${day.getDate()}</div>
                </div>
                <div class="p-2 space-y-2 min-h-[200px]" onclick="window.app.calendarDayClick('${day.toISOString()}')">
                    ${dayInterviews.map(int => {
            const app = engine.getById(int.applicationId);
            const typeName = types[int.type]?.name || int.type;
            const status = INTERVIEW_STATUS[int.status];
            return `
                            <div class="week-event p-2 rounded ${status.color} bg-opacity-20 cursor-pointer hover:bg-opacity-30 transition"
                                onclick="event.stopPropagation(); window.app.viewInterview('${int.id}')">
                                <div class="text-xs font-medium text-indigo-300">${formatTime(new Date(int.scheduledAt))}</div>
                                <div class="text-sm font-medium text-white truncate">${app?.companyName || 'Unknown'}</div>
                                <div class="text-xs text-gray-400 truncate">${typeName}</div>
                            </div>
                        `;
        }).join('')}
                    ${dayInterviews.length === 0 ? `<div class="text-center text-gray-600 text-sm py-4">No interviews</div>` : ''}
                </div>
            </div>
        `;
    }

    html += `</div>`;
    return html;
}

/**
 * Render day view with hourly slots
 * @param {Date} currentDate
 * @param {InterviewService} interviewService
 * @param {ApplicationEngine} engine
 * @param {Object} types
 * @param {Object} modes
 * @returns {string}
 */
function renderDayView(currentDate, interviewService, engine, types, modes) {
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(currentDate);
    end.setHours(23, 59, 59, 999);

    const interviews = interviewService.getByDateRange(start, end);
    const today = new Date();
    const isToday = isSameDay(currentDate, today);

    // Create hourly slots (8 AM to 8 PM)
    const hours = [];
    for (let h = 8; h <= 20; h++) {
        hours.push(h);
    }

    // Map interviews to hours
    const interviewsByHour = {};
    interviews.forEach(int => {
        const hour = new Date(int.scheduledAt).getHours();
        if (!interviewsByHour[hour]) interviewsByHour[hour] = [];
        interviewsByHour[hour].push(int);
    });

    let html = `
        <div class="day-view">
            <div class="text-center mb-4">
                <div class="text-2xl font-bold text-white">${currentDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                ${isToday ? '<span class="text-sm text-indigo-400">Today</span>' : ''}
            </div>
            <div class="day-schedule space-y-1">
    `;

    hours.forEach(hour => {
        const hourInterviews = interviewsByHour[hour] || [];
        const hourDate = new Date(currentDate);
        hourDate.setHours(hour, 0, 0, 0);
        const timeLabel = hourDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isPastHour = isToday && hour < today.getHours();

        html += `
            <div class="hour-row flex gap-4 ${isPastHour ? 'opacity-50' : ''}">
                <div class="hour-label w-20 text-right text-sm text-gray-500 py-3">${timeLabel}</div>
                <div class="hour-content flex-1 min-h-[60px] bg-gray-900/30 rounded-lg p-2 hover:bg-gray-700/30 transition cursor-pointer"
                    onclick="window.app.openScheduleInterviewModal(null, '${hourDate.toISOString()}')">
                    ${hourInterviews.map(int => {
            const app = engine.getById(int.applicationId);
            const typeName = types[int.type]?.name || int.type;
            const modeName = modes[int.mode]?.name || int.mode;
            const status = INTERVIEW_STATUS[int.status];
            return `
                            <div class="day-event p-3 rounded-lg ${status.color} bg-opacity-20 mb-2 cursor-pointer hover:bg-opacity-30 transition"
                                onclick="event.stopPropagation(); window.app.viewInterview('${int.id}')">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <div class="font-semibold text-white">${app?.companyName || 'Unknown'}</div>
                                        <div class="text-sm text-gray-300">${app?.role || ''}</div>
                                    </div>
                                    <span class="text-xs px-2 py-1 rounded ${status.color} text-white">${status.name}</span>
                                </div>
                                <div class="mt-2 flex flex-wrap gap-2 text-xs">
                                    <span class="bg-gray-700 px-2 py-1 rounded text-gray-300">
                                        <i class="fas ${types[int.type]?.icon || 'fa-circle'} mr-1"></i>${typeName}
                                    </span>
                                    <span class="bg-gray-700 px-2 py-1 rounded text-gray-300">
                                        <i class="fas ${modes[int.mode]?.icon || 'fa-circle'} mr-1"></i>${modeName}
                                    </span>
                                    <span class="text-gray-400">
                                        <i class="fas fa-clock mr-1"></i>${int.duration} min
                                    </span>
                                </div>
                                ${int.meetingLink ? `<div class="mt-2 text-xs text-indigo-400 truncate"><i class="fas fa-link mr-1"></i>${int.meetingLink}</div>` : ''}
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    return html;
}

/**
 * Render upcoming interviews widget for dashboard
 * @param {number} limit
 * @returns {string}
 */
export function renderUpcomingInterviewsWidget(limit = 5) {
    const engine = getEngine();
    const settings = getSettingsService();
    const types = settings.getInterviewTypes();
    const modes = settings.getInterviewModes();

    const upcoming = engine.getUpcomingInterviews(limit);

    if (upcoming.length === 0) {
        return `
            <div class="upcoming-interviews-widget bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                        <i class="fas fa-calendar-alt text-indigo-400"></i>
                        Upcoming Interviews
                    </h3>
                    <button onclick="window.app.switchView('calendar')" class="text-sm text-indigo-400 hover:text-indigo-300">
                        View Calendar <i class="fas fa-arrow-right ml-1"></i>
                    </button>
                </div>
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-calendar-check text-4xl mb-3"></i>
                    <p>No upcoming interviews</p>
                    <button onclick="window.app.openScheduleInterviewModal()" 
                        class="mt-3 text-indigo-400 hover:text-indigo-300 text-sm">
                        Schedule one now <i class="fas fa-plus ml-1"></i>
                    </button>
                </div>
            </div>
        `;
    }

    return `
        <div class="upcoming-interviews-widget bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                    <i class="fas fa-calendar-alt text-indigo-400"></i>
                    Upcoming Interviews
                    <span class="text-sm bg-indigo-600 px-2 py-0.5 rounded-full">${upcoming.length}</span>
                </h3>
                <button onclick="window.app.switchView('calendar')" class="text-sm text-indigo-400 hover:text-indigo-300">
                    View Calendar <i class="fas fa-arrow-right ml-1"></i>
                </button>
            </div>
            <div class="space-y-3">
                ${upcoming.map(({ interview, application }) => {
        const scheduled = new Date(interview.scheduledAt);
        const isToday = isSameDay(scheduled, new Date());
        const typeName = types[interview.type]?.name || interview.type;
        const modeName = modes[interview.mode]?.name || interview.mode;

        return `
                        <div class="interview-item flex gap-3 p-3 bg-gray-900/50 rounded-lg hover:bg-gray-700/50 transition cursor-pointer"
                            onclick="window.app.viewInterview('${interview.id}')">
                            <div class="interview-date text-center min-w-[50px]">
                                <div class="text-xs ${isToday ? 'text-indigo-400 font-bold' : 'text-gray-500'}">${isToday ? 'TODAY' : scheduled.toLocaleDateString([], { weekday: 'short' }).toUpperCase()}</div>
                                <div class="text-xl font-bold text-white">${scheduled.getDate()}</div>
                                <div class="text-xs text-gray-500">${scheduled.toLocaleDateString([], { month: 'short' })}</div>
                            </div>
                            <div class="interview-info flex-1">
                                <div class="font-medium text-white">${application.companyName}</div>
                                <div class="text-sm text-gray-400">${application.role}</div>
                                <div class="flex flex-wrap gap-2 mt-1 text-xs">
                                    <span class="text-indigo-300">
                                        <i class="fas fa-clock mr-1"></i>${formatTime(scheduled)}
                                    </span>
                                    <span class="text-gray-500">
                                        <i class="fas ${types[interview.type]?.icon || 'fa-circle'} mr-1"></i>${typeName}
                                    </span>
                                    <span class="text-gray-500">
                                        <i class="fas ${modes[interview.mode]?.icon || 'fa-circle'} mr-1"></i>${modeName}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}

/**
 * Render interview detail panel (for viewing/editing an interview)
 * @param {string} interviewId
 * @returns {string}
 */
export function renderInterviewDetail(interviewId) {
    const engine = getEngine();
    const interviewService = getInterviewService();
    const settings = getSettingsService();

    const interview = interviewService.getById(interviewId);
    if (!interview) {
        return `<div class="p-8 text-center text-gray-500">Interview not found</div>`;
    }

    const application = engine.getById(interview.applicationId);
    const types = settings.getInterviewTypes();
    const modes = settings.getInterviewModes();
    const status = INTERVIEW_STATUS[interview.status];
    const typeName = types[interview.type]?.name || interview.type;
    const modeName = modes[interview.mode]?.name || interview.mode;
    const scheduled = new Date(interview.scheduledAt);

    return `
        <div class="interview-detail">
            <div class="p-6 border-b border-gray-700">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="px-2 py-1 rounded text-sm ${status.color}">${status.name}</span>
                        </div>
                        <h2 class="text-xl font-bold text-white">${application?.companyName || 'Unknown Company'}</h2>
                        <p class="text-gray-400">${application?.role || 'Unknown Role'}</p>
                    </div>
                    <button onclick="window.app.closeInterviewDetail()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
            </div>
            
            <div class="p-6 space-y-6">
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-gray-900/50 p-4 rounded-lg">
                        <div class="text-sm text-gray-500 mb-1">Date & Time</div>
                        <div class="text-white font-medium">${scheduled.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                        <div class="text-indigo-400">${formatTime(scheduled)} (${interview.duration} min)</div>
                    </div>
                    <div class="bg-gray-900/50 p-4 rounded-lg">
                        <div class="text-sm text-gray-500 mb-1">Type & Mode</div>
                        <div class="text-white font-medium">
                            <i class="fas ${types[interview.type]?.icon || 'fa-circle'} mr-1"></i>${typeName}
                        </div>
                        <div class="text-gray-400">
                            <i class="fas ${modes[interview.mode]?.icon || 'fa-circle'} mr-1"></i>${modeName}
                        </div>
                    </div>
                </div>
                
                ${interview.meetingLink ? `
                    <div class="bg-gray-900/50 p-4 rounded-lg">
                        <div class="text-sm text-gray-500 mb-1">Meeting Link</div>
                        <a href="${interview.meetingLink}" target="_blank" class="text-indigo-400 hover:text-indigo-300 break-all">
                            <i class="fas fa-external-link-alt mr-1"></i>${interview.meetingLink}
                        </a>
                    </div>
                ` : ''}
                
                ${interview.location ? `
                    <div class="bg-gray-900/50 p-4 rounded-lg">
                        <div class="text-sm text-gray-500 mb-1">Location</div>
                        <div class="text-white"><i class="fas fa-map-marker-alt mr-2 text-red-400"></i>${interview.location}</div>
                    </div>
                ` : ''}
                
                ${interview.interviewerName ? `
                    <div class="bg-gray-900/50 p-4 rounded-lg">
                        <div class="text-sm text-gray-500 mb-1">Interviewer</div>
                        <div class="text-white"><i class="fas fa-user mr-2 text-indigo-400"></i>${interview.interviewerName}</div>
                    </div>
                ` : ''}
                
                ${interview.notes ? `
                    <div class="bg-gray-900/50 p-4 rounded-lg">
                        <div class="text-sm text-gray-500 mb-1">Notes</div>
                        <div class="text-gray-300 whitespace-pre-wrap">${interview.notes}</div>
                    </div>
                ` : ''}
                
                ${interview.outcome ? `
                    <div class="bg-gray-900/50 p-4 rounded-lg">
                        <div class="text-sm text-gray-500 mb-1">Outcome</div>
                        <div class="text-gray-300 whitespace-pre-wrap">${interview.outcome}</div>
                    </div>
                ` : ''}
                
                <div class="flex gap-3 pt-4">
                    <button onclick="window.app.editInterview('${interview.id}')" 
                        class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl font-medium transition">
                        <i class="fas fa-edit mr-2"></i>Edit
                    </button>
                    <button onclick="window.app.exportInterviewICS('${interview.id}')" 
                        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition">
                        <i class="fas fa-calendar-plus mr-2"></i>Export
                    </button>
                    <button onclick="window.app.deleteInterviewConfirm('${interview.id}')" 
                        class="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-medium transition">
                        <i class="fas fa-trash mr-2"></i>Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}
