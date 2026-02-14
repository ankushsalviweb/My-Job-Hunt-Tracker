import './styles/custom.css';
import { UIController } from './ui/UIController.js';
import { getAuthService } from './core/services/AuthService.js';
import { StorageAdapter } from './core/services/StorageAdapter.js';
import { resetEngine } from './core/ApplicationEngine.js';
import { renderLoginScreen, setupAuthHandlers } from './ui/auth.js';

// Global references
let app = null;
const authService = getAuthService();

/**
 * Show the login screen
 */
function showAuthScreen() {
    const authScreen = document.getElementById('authScreen');
    const appContainer = document.getElementById('appContainer');

    authScreen.innerHTML = renderLoginScreen();
    authScreen.classList.remove('hidden');
    appContainer.classList.add('hidden');

    // Setup auth form handlers
    setupAuthHandlers({
        onLogin: async (email, password) => {
            const result = await authService.signIn(email, password);
            if (result.success) {
                await initializeApp();
            }
            return result;
        },
        onRegister: async (email, password) => {
            const result = await authService.signUp(email, password);
            if (result.success) {
                await initializeApp();
            }
            return result;
        }
    });
}

/**
 * Show the main app
 */
function showApp() {
    const authScreen = document.getElementById('authScreen');
    const appContainer = document.getElementById('appContainer');

    authScreen.classList.add('hidden');
    authScreen.innerHTML = '';
    appContainer.classList.remove('hidden');
}

/**
 * Initialize the main application
 */
async function initializeApp() {
    showApp();

    // Reset engine to ensure it gets the correct storage service (Firebase) after auth
    resetEngine();

    // Initialize storage adapter (sets up real-time listeners and waits for data)
    console.log('[Init] Initializing storage adapter...');
    await StorageAdapter.initialize();
    console.log('[Init] Storage adapter initialized');

    // Always create fresh UIController after auth
    app = new UIController();
    app.init();
    console.log('[Init] UI initialized, applications:', app.engine.getAll().length);


    // Expose app methods to window for inline event handlers
    window.app = {
        engine: app.engine,
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
        exportInterviewICS: (id) => app.exportInterviewICS(id),

        // Skill tag handlers
        addSkillTag: (skill) => app.addSkillTag(skill),
        addSkillTagFromSuggestion: (skill) => app.addSkillTagFromSuggestion(skill),
        removeSkillTag: (skill) => app.removeSkillTag(skill),

        // Vendor toggle
        toggleContactSource: (isVendor) => app.toggleContactSource(isVendor),

        // Close Application
        openCloseAppModal: (appId) => app.openCloseAppModal(appId),
        closeCloseAppModal: () => app.closeCloseAppModal(),
        handleCloseAppSubmit: () => app.handleCloseAppSubmit(),

        // Round Outcome
        openRoundOutcomeModal: (interviewId) => app.openRoundOutcomeModal(interviewId),
        closeRoundOutcomeModal: () => app.closeRoundOutcomeModal(),
        submitRoundOutcome: (outcome) => app.submitRoundOutcome(outcome),

        // Result Modal
        openResultModal: (appId) => app.openResultModal(appId),
        closeResultModal: () => app.closeResultModal(),
        submitResult: (outcome) => app.submitResult(outcome),

        // Table View Actions
        toggleAppSelection: (id) => app.toggleAppSelection(id),
        toggleSelectAll: () => app.toggleSelectAll(),
        deleteSelectedApplications: () => app.deleteSelectedApplications(),

        // Follow-up & Ghosting
        dismissFollowUpNudge: (appId) => app.dismissFollowUpNudge(appId),
        markAsGhosted: (appId) => app.markAsGhosted(appId),

        // Settings
        openSettingsModal: () => app.openSettingsModal(),
        closeSettingsModal: () => app.closeSettingsModal(),
        saveSettings: () => app.saveSettings(),

        // Auth
        logout: async () => {
            await authService.signOut();
            StorageAdapter.cleanup();
            app = null;
            showAuthScreen();
        }
    };
}

/**
 * Handle auth state changes
 */
function handleAuthStateChange(user) {
    if (user) {
        // User is signed in - initialize app if not already done
        if (!app) {
            initializeApp();
        }
    } else {
        // User is signed out - show login screen
        showAuthScreen();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for initial auth state
    const user = await authService.waitForAuth();

    if (user) {
        // User is already logged in
        await initializeApp();
    } else {
        // Show login screen
        showAuthScreen();
    }
});
