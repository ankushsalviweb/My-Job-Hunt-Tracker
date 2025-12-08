import './styles/custom.css';
import { UIController } from './ui/UIController.js';

// Initialize the application
const app = new UIController();

// Expose app methods to window for inline event handlers
window.app = {
    // View switching
    switchView: (view) => app.switchView(view),

    // Filtering
    filterByStage: (stage) => app.filterByStage(stage),
    applyFilters: () => app.applyFilters(),
    clearFilters: () => app.clearFilters(),
    toggleFilterDropdown: (id) => app.toggleFilterDropdown(id),
    clearSearchFilter: () => app.clearSearchFilter(),
    removeStageFilter: (s) => app.removeStageFilter(s),
    removeTypeFilter: (t) => app.removeTypeFilter(t),
    removeLocationFilter: (l) => app.removeLocationFilter(l),
    removeResultFilter: (r) => app.removeResultFilter(r),

    // Sorting
    sortBy: (column) => app.sortBy(column),
    updateTableColumns: () => app.updateTableColumns(),

    // Application Modals
    openAddModal: () => app.openAddModal(),
    openEditModal: (id) => app.openEditModal(id),
    closeAddModal: () => app.closeAddModal(),
    openDetail: (id) => app.openDetail(id),
    closeDetail: () => app.closeDetail(),
    openInteractionModal: (id) => app.openInteractionModal(id),
    closeInteractionModal: () => app.closeInteractionModal(),

    // Application CRUD
    deleteApplication: (id) => app.deleteApplication(id),
    deleteInteraction: (appId, intId) => app.deleteInteraction(appId, intId),

    // Calendar
    calendarNavigate: (direction) => app.calendarNavigate(direction),
    setCalendarView: (view) => app.setCalendarView(view),
    calendarDayClick: (dateIso) => app.calendarDayClick(dateIso),

    // Interview Management
    openScheduleInterviewModal: (appId, dateTime) => app.openScheduleInterviewModal(appId, dateTime),
    closeScheduleInterviewModal: () => app.closeScheduleInterviewModal(),
    viewInterview: (id) => app.viewInterview(id),
    closeInterviewDetail: () => app.closeInterviewDetail(),
    editInterview: (id) => app.editInterview(id),
    deleteInterviewConfirm: (id) => app.deleteInterviewConfirm(id),
    exportInterviewICS: (id) => app.exportInterviewICS(id)
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
