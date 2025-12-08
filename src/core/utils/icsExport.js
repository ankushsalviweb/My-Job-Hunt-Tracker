/**
 * ICS (iCalendar) Export Utility
 * Generates .ics files for interview events that can be imported into calendar apps
 */

/**
 * Generate ICS file content for an interview
 * @param {import('../models/Interview.js').InterviewData} interview
 * @param {import('../models/Application.js').ApplicationData} application
 * @param {Object} interviewTypes - From SettingsService
 * @param {Object} interviewModes - From SettingsService
 * @returns {string} ICS file content
 */
export function generateICS(interview, application, interviewTypes, interviewModes) {
    const scheduled = new Date(interview.scheduledAt);
    const endDate = new Date(scheduled.getTime() + interview.duration * 60 * 1000);

    const typeName = interviewTypes[interview.type]?.name || interview.type;
    const modeName = interviewModes[interview.mode]?.name || interview.mode;

    const title = `${typeName} - ${application.companyName}`;
    const description = [
        `Role: ${application.role}`,
        `Mode: ${modeName}`,
        interview.interviewerName ? `Interviewer: ${interview.interviewerName}` : '',
        interview.meetingLink ? `Meeting Link: ${interview.meetingLink}` : '',
        interview.notes ? `Notes: ${interview.notes}` : ''
    ].filter(Boolean).join('\\n');

    const location = interview.mode === 'video'
        ? interview.meetingLink
        : interview.location || '';

    // Format dates to ICS format (YYYYMMDDTHHMMSSZ)
    const formatDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const uid = `${interview.id}@jobtracker`;
    const dtstamp = formatDate(new Date());
    const dtstart = formatDate(scheduled);
    const dtend = formatDate(endDate);

    // Create reminder/alarm
    const reminderMinutes = interview.reminderMinutes || 30;

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Job Tracker//Interview//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${escapeICS(title)}`,
        `DESCRIPTION:${escapeICS(description)}`,
        location ? `LOCATION:${escapeICS(location)}` : '',
        'STATUS:CONFIRMED',
        // Add alarm/reminder
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:Interview reminder: ${title}`,
        `TRIGGER:-PT${reminderMinutes}M`,
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');

    return icsContent;
}

/**
 * Escape special characters for ICS format
 * @param {string} text
 * @returns {string}
 */
function escapeICS(text) {
    if (!text) return '';
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

/**
 * Download ICS file for an interview
 * @param {import('../models/Interview.js').InterviewData} interview
 * @param {import('../models/Application.js').ApplicationData} application
 * @param {Object} interviewTypes - From SettingsService
 * @param {Object} interviewModes - From SettingsService
 */
export function downloadICS(interview, application, interviewTypes, interviewModes) {
    const icsContent = generateICS(interview, application, interviewTypes, interviewModes);

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `interview-${application.companyName.replace(/\s+/g, '-')}-${interview.type}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
