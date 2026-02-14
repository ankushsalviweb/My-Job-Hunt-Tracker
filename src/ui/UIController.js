import { getEngine } from '../core/ApplicationEngine.js';
import { getAuthService } from '../core/services/AuthService.js';
import { STAGES, STAGE_ORDER } from '../core/constants/stages.js';
import { RESULT_LABELS, RESULT_KEYS } from '../core/constants/results.js';
import { INTERACTION_TYPES } from '../core/constants/interactions.js';
import { getSkillSuggestions, COMMON_SKILLS } from '../core/constants/skills-constants.js';
import { Application } from '../core/models/Application.js';
import { getInterviewService } from '../core/services/InterviewService.js';
import { getNotificationService } from '../core/services/NotificationService.js';
import { getSettingsService } from '../core/services/SettingsService.js';
import { getFollowUpService } from '../core/services/FollowUpService.js';
import { downloadICS } from '../core/utils/icsExport.js';
import { toLocalDateTimeString } from '../core/utils/dateUtils.js';
import {
    renderStageCounts,
    renderCardView,
    renderTableView,
    renderKanbanView,
    renderDetailPanel,
    renderEmptyState
} from './views.js';
import {
    renderAnalyticsView,
    renderStageDistributionChart,
    renderResultsChart,
    renderTimelineChart
} from './analytics.js';
import {
    renderCalendarView,
    renderUpcomingInterviewsWidget,
    renderInterviewDetail
} from './calendar.js';

/**
 * Main UI Controller - Connects the engine to the DOM
 */
export class UIController {
    constructor() {
        this.engine = getEngine();
        this.currentView = 'card';
        this.visibleColumns = ['company', 'role', 'hr', 'type', 'location', 'salary', 'stage', 'lastAction', 'updated'];

        // Calendar state
        this.calendarView = 'month'; // 'month' | 'week' | 'day'
        this.calendarDate = new Date();

        // Skill tags state for form
        this.currentSkillTags = [];
        this.selectedApps = new Set(); // For table multi-select

        // Bind methods
        this.render = this.render.bind(this);

        // Subscribe to engine changes
        this.engine.subscribe(this.render);
    }

    /**
     * Initialize the UI
     */
    init() {
        this.engine.init();
        this.setupEventListeners();
        this.initializeFilterOptions();
        this.setupNotifications();
        this.updateUserDisplay();
        this.render();

        // Start periodic follow-up check (every 5 minutes)
        this.followUpCheckInterval = setInterval(() => {
            this.renderFollowUpBanner();
        }, 5 * 60 * 1000);
    }

    /**
     * Update user display in header
     */
    updateUserDisplay() {
        const user = getAuthService().getCurrentUser();
        const displayEl = document.getElementById('userDisplayName');
        if (displayEl && user?.email) {
            // Extract name part from email (before @)
            const namePart = user.email.split('@')[0];
            displayEl.textContent = namePart;
        }
    }

    /**
     * Setup browser notifications
     */
    setupNotifications() {
        const notificationService = getNotificationService();

        // Request permission on first load
        notificationService.requestPermission();

        // Start reminder scheduler
        notificationService.startReminderScheduler();

        // Listen for interview reminders
        window.addEventListener('interview-reminder', (e) => {
            const { interview } = e.detail;
            const application = this.engine.getById(interview.applicationId);
            if (application) {
                notificationService.showInterviewReminder(interview, application);
            }
        });
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Filter dropdown close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.relative')) {
                document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.add('hidden'));
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAddModal();
                this.closeDetail();
                this.closeInteractionModal();
                this.closeScheduleInterviewModal();
                this.closeInterviewDetail();
                this.closeCloseAppModal();
                this.closeRoundOutcomeModal();
                this.closeSettingsModal();
            }
        });

        // Kanban drag-drop
        document.getElementById('kanbanBoard')?.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('kanban-card')) {
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', e.target.dataset.id);
            }
        });

        document.getElementById('kanbanBoard')?.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('kanban-card')) {
                e.target.classList.remove('dragging');
                document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
            }
        });

        // Application form submit
        document.getElementById('applicationForm')?.addEventListener('submit', (e) => {
            console.log('[DEBUG] Form submit triggered');
            e.preventDefault();
            this.handleApplicationSubmit();
        });

        // Interaction form submit
        document.getElementById('interactionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleInteractionSubmit();
        });

        // Search input
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.engine.setFilters({ search: e.target.value });
        });

        // Interview schedule form submit
        document.getElementById('interviewScheduleForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleInterviewScheduleSubmit();
        });

        // Interview mode change - toggle meeting link/location fields
        document.getElementById('interviewMode')?.addEventListener('change', (e) => {
            const isOnsite = e.target.value === 'onsite';
            document.getElementById('meetingLinkField')?.classList.toggle('hidden', isOnsite);
            document.getElementById('locationField')?.classList.toggle('hidden', !isOnsite);
        });

        // Close application form submit
        document.getElementById('closeAppForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCloseAppSubmit();
        });
    }

    /**
     * Initialize filter dropdown options
     */
    initializeFilterOptions() {
        // Stage filter options
        const stageOptions = document.getElementById('stageFilterOptions');
        if (stageOptions) {
            stageOptions.innerHTML = Object.entries(STAGES).map(([stage, info]) => `
        <label class="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
          <input type="checkbox" class="stage-filter-cb rounded" value="${stage}" onchange="window.app.applyFilters()">
          <span class="w-3 h-3 rounded-full ${info.color}"></span>
          <span class="text-sm">${info.name}</span>
        </label>
      `).join('');
        }

        // Type filter options (dynamic)
        this.updateTypeFilterOptions();

        // Location filter options (dynamic)
        this.updateLocationFilterOptions();

        // Result filter options
        const resultOptions = document.getElementById('resultFilterOptions');
        if (resultOptions) {
            resultOptions.innerHTML = `
        <label class="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
          <input type="checkbox" class="result-filter-cb rounded" value="all" checked onchange="window.app.applyFilters()">
          <span class="text-sm">All Results</span>
        </label>
        <label class="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
          <input type="checkbox" class="result-filter-cb rounded" value="inprogress" onchange="window.app.applyFilters()">
          <span class="text-sm">⏳ In Progress</span>
        </label>
        ${RESULT_KEYS.map(key => `
          <label class="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
            <input type="checkbox" class="result-filter-cb rounded" value="${key}" onchange="window.app.applyFilters()">
            <span class="text-sm">${RESULT_LABELS[key].text}</span>
          </label>
        `).join('')}
      `;
        }
    }

    /**
     * Update type filter options based on current data
     */
    updateTypeFilterOptions() {
        const { types } = this.engine.getFilterOptions();
        const typeOptions = document.getElementById('typeFilterOptions');
        if (typeOptions) {
            typeOptions.innerHTML = `
        <label class="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
          <input type="checkbox" class="type-filter-cb rounded" value="all" checked onchange="window.app.applyFilters()">
          <span class="text-sm">All Types</span>
        </label>
        ${types.map(t => `
          <label class="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
            <input type="checkbox" class="type-filter-cb rounded" value="${t}" onchange="window.app.applyFilters()">
            <span class="text-sm">${t}</span>
          </label>
        `).join('')}
      `;
        }
    }

    /**
     * Update location filter options based on current data
     */
    updateLocationFilterOptions() {
        const { locations } = this.engine.getFilterOptions();
        const locationOptions = document.getElementById('locationFilterOptions');
        if (locationOptions) {
            locationOptions.innerHTML = `
        <label class="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
          <input type="checkbox" class="location-filter-cb rounded" value="all" checked onchange="window.app.applyFilters()">
          <span class="text-sm">All Locations</span>
        </label>
        ${locations.map(l => `
          <label class="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
            <input type="checkbox" class="location-filter-cb rounded" value="${l}" onchange="window.app.applyFilters()">
            <span class="text-sm">${l}</span>
          </label>
        `).join('')}
      `;
        }
    }

    /**
     * Main render function
     */
    render() {
        this.renderStageCounts();
        this.renderCurrentView();
        this.updateActiveFiltersBar();
        this.renderFollowUpBanner();
    }

    /**
     * Render stage count pills
     */
    renderStageCounts() {
        const container = document.getElementById('stageCounts');
        if (container) {
            container.innerHTML = renderStageCounts(this.engine.getStageCounts());
        }
    }

    /**
     * Render the current view
     */
    renderCurrentView() {
        const filtered = this.engine.query();
        const resultsSummary = document.getElementById('resultsSummary');

        if (resultsSummary) {
            resultsSummary.textContent = `Showing ${filtered.length} of ${this.engine.getAll().length} applications`;
        }

        // Handle empty state
        const emptyState = document.getElementById('emptyState');
        const isEmpty = filtered.length === 0 && this.currentView !== 'analytics';

        if (emptyState) {
            emptyState.classList.toggle('hidden', !isEmpty);
        }

        // Render based on current view
        switch (this.currentView) {
            case 'card':
                this.renderCardView(filtered, isEmpty);
                this.renderUpcomingInterviewsWidget();
                break;
            case 'table':
                this.renderTableView(filtered, isEmpty);
                this.renderUpcomingInterviewsWidget();
                break;
            case 'kanban':
                this.renderKanbanView(filtered, isEmpty);
                break;
            case 'analytics':
                this.renderAnalyticsView();
                break;
            case 'calendar':
                this.renderCalendar();
                break;
        }
    }

    /**
     * Render upcoming interviews widget
     */
    renderUpcomingInterviewsWidget() {
        const widget = document.getElementById('upcomingInterviewsWidget');
        if (widget && (this.currentView === 'card' || this.currentView === 'table')) {
            widget.innerHTML = renderUpcomingInterviewsWidget(5);
            widget.classList.remove('hidden');
        } else if (widget) {
            widget.classList.add('hidden');
        }
    }

    /**
     * Render calendar view
     */
    renderCalendar() {
        const container = document.getElementById('calendarView');
        if (container) {
            container.innerHTML = renderCalendarView(
                this.calendarView,
                this.calendarDate
            );
        }
    }

    /**
     * Render card view
     */
    renderCardView(applications, isEmpty) {
        const grid = document.getElementById('applicationsGrid');
        if (grid) {
            grid.innerHTML = isEmpty ? '' : renderCardView(applications);
        }
    }

    /**
     * Render table view
     */
    renderTableView(applications, isEmpty) {
        const thead = document.getElementById('tableHead');
        const tbody = document.getElementById('tableBody');
        const bulkActionsDiv = document.getElementById('tableBulkActions');

        if (thead && tbody) {
            const { header, body, bulkActions } = renderTableView(
                applications,
                this.visibleColumns,
                this.engine.currentSort,
                this.selectedApps
            );
            thead.innerHTML = header;
            tbody.innerHTML = isEmpty ? '' : body;

            if (bulkActionsDiv) {
                bulkActionsDiv.innerHTML = bulkActions || '';
                if (bulkActions) {
                    bulkActionsDiv.classList.remove('hidden');
                } else {
                    bulkActionsDiv.classList.add('hidden');
                }
            }
        }
    }

    /**
     * Render kanban view
     */
    renderKanbanView(applications, isEmpty) {
        const board = document.getElementById('kanbanBoard');
        if (board) {
            board.innerHTML = renderKanbanView(applications);
            this.setupKanbanDragDrop();
        }
    }

    /**
     * Render analytics view
     */
    renderAnalyticsView() {
        const container = document.getElementById('analyticsView');
        if (container) {
            const analytics = this.engine.getAnalytics();
            container.innerHTML = renderAnalyticsView(analytics);

            // Render charts after DOM update
            setTimeout(() => {
                renderStageDistributionChart('stageDistributionChart', analytics.byStage);
                renderResultsChart('resultsChart', analytics.byResult);
                renderTimelineChart('timelineChart', analytics.timeline);
            }, 0);
        }
    }

    /**
     * Setup kanban drag-drop handlers
     */
    setupKanbanDragDrop() {
        const columns = document.querySelectorAll('.kanban-column');
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');

                const appId = e.dataTransfer.getData('text/plain');
                const newStage = parseInt(column.dataset.stage);

                this.engine.moveToStage(appId, newStage);
            });
        });
    }

    /**
     * Switch view
     */
    switchView(view) {
        this.currentView = view;

        // Update view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.classList.add('text-gray-400');
        });
        document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
        document.querySelector(`[data-view="${view}"]`)?.classList.remove('text-gray-400');

        // Show/hide view containers
        document.querySelectorAll('.view-container').forEach(c => c.classList.add('hidden'));
        document.getElementById(`${view}View`)?.classList.remove('hidden');

        // Show/hide column selector for table view
        document.getElementById('columnSelector')?.classList.toggle('hidden', view !== 'table');

        // Hide empty state and results for analytics
        if (view === 'analytics') {
            document.getElementById('emptyState')?.classList.add('hidden');
            document.getElementById('resultsSummary')?.classList.add('hidden');
        } else {
            document.getElementById('resultsSummary')?.classList.remove('hidden');
        }

        this.renderCurrentView();
    }

    /**
     * Apply filters from checkboxes
     */
    applyFilters() {
        const stageAll = document.querySelector('.stage-filter-cb[value="all"]');
        const stageChecked = [...document.querySelectorAll('.stage-filter-cb:not([value="all"]):checked')].map(cb => parseInt(cb.value));

        const typeAll = document.querySelector('.type-filter-cb[value="all"]');
        const typeChecked = [...document.querySelectorAll('.type-filter-cb:not([value="all"]):checked')].map(cb => cb.value);

        const locAll = document.querySelector('.location-filter-cb[value="all"]');
        const locChecked = [...document.querySelectorAll('.location-filter-cb:not([value="all"]):checked')].map(cb => cb.value);

        const resAll = document.querySelector('.result-filter-cb[value="all"]');
        const resChecked = [...document.querySelectorAll('.result-filter-cb:not([value="all"]):checked')].map(cb => cb.value);

        this.engine.setFilters({
            stages: stageAll?.checked || stageChecked.length === 0 ? [] : stageChecked,
            types: typeAll?.checked || typeChecked.length === 0 ? [] : typeChecked,
            locations: locAll?.checked || locChecked.length === 0 ? [] : locChecked,
            results: resAll?.checked || resChecked.length === 0 ? [] : resChecked
        });
    }

    /**
     * Quick filter by stage (from stage pills)
     */
    filterByStage(stage) {
        document.querySelectorAll('.stage-filter-cb').forEach(cb => {
            cb.checked = cb.value === String(stage);
        });
        this.applyFilters();
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.querySelectorAll('.stage-filter-cb, .type-filter-cb, .location-filter-cb, .result-filter-cb').forEach(cb => {
            cb.checked = cb.value === 'all';
        });
        this.engine.clearFilters();
    }

    /**
     * Update active filters display bar
     */
    updateActiveFiltersBar() {
        const bar = document.getElementById('activeFiltersBar');
        const tags = document.getElementById('activeFilterTags');
        const filters = this.engine.currentFilters;

        const hasFilters = filters.search ||
            filters.stages.length > 0 ||
            filters.types.length > 0 ||
            filters.locations.length > 0 ||
            filters.results.length > 0;

        if (!hasFilters || !bar || !tags) {
            bar?.classList.add('hidden');
            return;
        }

        bar.classList.remove('hidden');
        let tagsHtml = '';

        if (filters.search) {
            tagsHtml += `<span class="bg-indigo-600/30 text-indigo-300 px-2 py-1 rounded text-xs flex items-center gap-1">
        <i class="fas fa-search"></i> "${filters.search}"
        <button onclick="window.app.clearSearchFilter()" class="ml-1 hover:text-white">&times;</button>
      </span>`;
        }

        filters.stages.forEach(s => {
            const stage = STAGES[s];
            if (stage) {
                tagsHtml += `<span class="${stage.color} bg-opacity-30 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
          ${stage.name}
          <button onclick="window.app.removeStageFilter(${s})" class="ml-1 hover:text-white">&times;</button>
        </span>`;
            }
        });

        filters.types.forEach(t => {
            tagsHtml += `<span class="bg-green-600/30 text-green-300 px-2 py-1 rounded text-xs flex items-center gap-1">
        ${t}
        <button onclick="window.app.removeTypeFilter('${t}')" class="ml-1 hover:text-white">&times;</button>
      </span>`;
        });

        filters.locations.forEach(l => {
            tagsHtml += `<span class="bg-red-600/30 text-red-300 px-2 py-1 rounded text-xs flex items-center gap-1">
        ${l}
        <button onclick="window.app.removeLocationFilter('${l}')" class="ml-1 hover:text-white">&times;</button>
      </span>`;
        });

        filters.results.forEach(r => {
            const label = r === 'inprogress' ? '⏳ In Progress' : (RESULT_LABELS[r]?.text || r);
            tagsHtml += `<span class="bg-yellow-600/30 text-yellow-300 px-2 py-1 rounded text-xs flex items-center gap-1">
        ${label}
        <button onclick="window.app.removeResultFilter('${r}')" class="ml-1 hover:text-white">&times;</button>
      </span>`;
        });

        tags.innerHTML = tagsHtml;
    }

    /**
     * Remove search filter
     */
    clearSearchFilter() {
        document.getElementById('searchInput').value = '';
        this.engine.setFilters({ search: '' });
    }

    /**
     * Remove stage filter
     */
    removeStageFilter(stage) {
        document.querySelector(`.stage-filter-cb[value="${stage}"]`).checked = false;
        this.applyFilters();
    }

    /**
     * Remove type filter
     */
    removeTypeFilter(type) {
        document.querySelector(`.type-filter-cb[value="${type}"]`).checked = false;
        this.applyFilters();
    }

    /**
     * Remove location filter
     */
    removeLocationFilter(location) {
        document.querySelector(`.location-filter-cb[value="${location}"]`).checked = false;
        this.applyFilters();
    }

    /**
     * Remove result filter
     */
    removeResultFilter(result) {
        document.querySelector(`.result-filter-cb[value="${result}"]`).checked = false;
        this.applyFilters();
    }

    /**
     * Sort table by column
     */
    sortBy(column) {
        this.engine.toggleSort(column);
    }

    /**
     * Update table column visibility
     */
    updateTableColumns() {
        this.visibleColumns = [...document.querySelectorAll('.col-toggle:checked')].map(cb => cb.dataset.col);
        this.renderCurrentView();
    }

    /**
     * Toggle filter dropdown
     */
    toggleFilterDropdown(id) {
        const dropdown = document.getElementById(id);
        document.querySelectorAll('.filter-dropdown').forEach(d => {
            if (d.id !== id) d.classList.add('hidden');
        });
        dropdown?.classList.toggle('hidden');
    }

    // ═══════════════════════════════════════════════════════════════
    // MODAL HANDLERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Open add/edit modal
     */
    openAddModal() {
        const modal = document.getElementById('addModal');
        const form = document.getElementById('applicationForm');
        const title = document.getElementById('modalTitle');

        form?.reset();
        document.getElementById('appId').value = '';
        title.textContent = 'Add New Opportunity';

        // Reset skill tags
        this.currentSkillTags = [];
        this.renderSkillTags();

        // Reset vendor toggle to Direct HR
        this.toggleContactSource(false);

        // Setup skill input handlers
        this.setupSkillTagInput();

        modal?.classList.remove('hidden');
        modal?.classList.add('flex');
    }

    /**
     * Open edit modal
     */
    openEditModal(appId) {
        const app = this.engine.getById(appId);
        if (!app) return;

        const modal = document.getElementById('addModal');
        const title = document.getElementById('modalTitle');

        title.textContent = 'Edit Application';
        document.getElementById('appId').value = app.id;
        document.getElementById('companyName').value = app.companyName || '';
        document.getElementById('role').value = app.role || '';

        // Contact source fields
        const isVendor = app.isVendor || false;
        this.toggleContactSource(isVendor);
        document.getElementById('vendorCompanyName').value = app.vendorCompanyName || '';
        document.getElementById('contactPersonName').value = app.contactPersonName || '';
        document.getElementById('contactPhone').value = app.contactPhone || '';
        document.getElementById('contactEmail').value = app.contactEmail || '';

        document.getElementById('opportunityType').value = app.opportunityType || '';
        document.getElementById('location').value = app.location || '';
        document.getElementById('city').value = app.city || '';

        document.getElementById('expectedSalary').value = app.expectedSalary || '';
        document.getElementById('noticePeriod').value = app.noticePeriod || '';

        // Skill tags
        this.currentSkillTags = Array.isArray(app.skillTags) ? [...app.skillTags] : [];
        this.renderSkillTags();
        this.setupSkillTagInput();

        // Job description
        document.getElementById('jobDescription').value = app.jobDescription || '';

        document.getElementById('currentStage').value = app.currentStage;

        modal?.classList.remove('hidden');
        modal?.classList.add('flex');
    }

    /**
     * Close add/edit modal
     */
    closeAddModal() {
        const modal = document.getElementById('addModal');
        modal?.classList.add('hidden');
        modal?.classList.remove('flex');
    }

    /**
     * Handle application form submit
     */
    handleApplicationSubmit() {
        const appId = document.getElementById('appId').value;

        // NEW: Collect data from redesigned form
        const isVendor = document.getElementById('isVendor').value === 'true';
        const expectedSalaryStr = document.getElementById('expectedSalary').value;
        const expectedSalary = expectedSalaryStr ? parseInt(expectedSalaryStr, 10) : null;

        const data = {
            companyName: document.getElementById('companyName').value,
            role: document.getElementById('role').value,

            // Contact source fields
            isVendor: isVendor,
            vendorCompanyName: isVendor ? document.getElementById('vendorCompanyName').value : '',
            contactPersonName: document.getElementById('contactPersonName').value,
            contactPhone: document.getElementById('contactPhone').value,
            contactEmail: document.getElementById('contactEmail').value,

            // Opportunity details
            opportunityType: document.getElementById('opportunityType').value,
            location: document.getElementById('location').value,
            city: document.getElementById('city').value,
            expectedSalary: expectedSalary,
            noticePeriod: document.getElementById('noticePeriod').value,

            // Skills & Description
            skillTags: [...this.currentSkillTags],
            jobDescription: document.getElementById('jobDescription').value
        };

        const newStage = parseInt(document.getElementById('currentStage').value);

        let result;
        if (appId) {
            // For updates, handle stage separately to trigger actions
            const app = this.engine.getById(appId);
            const oldStage = app ? app.currentStage : null;

            // Update basic fields
            result = this.engine.update(appId, data);

            // If stage changed, trigger move
            if (result.success && oldStage !== newStage) {
                this.moveToStage(appId, newStage);
            }
        } else {
            // For create, include stage
            data.currentStage = newStage;
            result = this.engine.create(data);

            // If created in a stage that requires action (e.g. Interviewing), trigger it?
            // Maybe optional for now to keep it simple.
            if (result.success && newStage === 5) {
                this.handleStageAction(result.data.id, 'schedule_interview');
            }
        }

        if (result.success) {
            this.closeAddModal();
            this.updateTypeFilterOptions();
            this.updateLocationFilterOptions();

            if (appId) {
                this.openDetail(appId);
            }
        } else {
            alert(result.errors.join('\n'));
        }
    }

    /**
     * Open detail panel
     */
    openDetail(appId) {
        const app = this.engine.getById(appId);
        if (!app) return;

        const interviews = this.engine.getInterviewsForApplication(appId);

        const modal = document.getElementById('detailModal');
        const panel = document.getElementById('detailPanel');

        if (panel) {
            panel.innerHTML = renderDetailPanel(app, interviews);
        }

        modal?.classList.remove('hidden');
        modal?.classList.add('flex');
    }

    /**
     * Close detail panel
     */
    closeDetail() {
        document.getElementById('detailModal')?.classList.add('hidden');
    }

    /**
     * Open interaction modal
     */
    openInteractionModal(appId) {
        const modal = document.getElementById('interactionModal');
        document.getElementById('interactionForm')?.reset();
        document.getElementById('interactionAppId').value = appId;
        document.getElementById('interactionDate').value = toLocalDateTimeString(new Date());

        modal?.classList.remove('hidden');
        modal?.classList.add('flex');
    }

    /**
     * Close interaction modal
     */
    closeInteractionModal() {
        const modal = document.getElementById('interactionModal');
        modal?.classList.add('hidden');
        modal?.classList.remove('flex');
    }

    /**
     * Handle interaction form submit
     */
    async handleInteractionSubmit() {
        const appId = document.getElementById('interactionAppId').value;
        const data = {
            type: document.getElementById('interactionType').value,
            date: document.getElementById('interactionDate').value,
            notes: document.getElementById('interactionNotes').value
        };

        const newStage = document.getElementById('interactionStage').value;
        const result = await this.engine.addInteraction(appId, data, newStage ? parseInt(newStage) : undefined);

        if (result.success) {
            this.closeInteractionModal();
            this.openDetail(appId);
        } else {
            alert(result.errors.join('\n'));
        }
    }

    /**
     * Move application to stage
     */
    async moveToStage(appId, stage) {
        const result = await this.engine.moveToStage(appId, stage);
        if (result.success) {
            this.render();
            if (result.action) {
                this.handleStageAction(appId, result.action);
            }
        }
    }

    /**
     * Handle actions triggered by stage transitions
     */
    handleStageAction(appId, action) {
        switch (action) {
            case 'prompt_details':
                // Already in edit modal or just open it?
                // Usually we open edit modal for details
                this.openEditModal(appId);
                break;
            case 'schedule_interview':
                this.openScheduleInterviewModal(appId);
                break;
            case 'prompt_result':
                this.openResultModal(appId);
                break;
            case 'prompt_close_reason':
                this.openCloseAppModal(appId);
                break;
        }
    }

    /**
     * Delete application
     */
    deleteApplication(appId) {
        if (!confirm('Delete this application? This cannot be undone.')) return;

        this.engine.delete(appId);
        this.closeDetail();
        this.updateTypeFilterOptions();
        this.updateLocationFilterOptions();
    }

    /**
     * Delete interaction
     */
    async deleteInteraction(appId, interactionId) {
        if (!confirm('Delete this interaction?')) return;

        await this.engine.removeInteraction(appId, interactionId);
        this.openDetail(appId);
    }

    // ═══════════════════════════════════════════════════════════════
    // CALENDAR HANDLERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Navigate calendar (prev/next/today)
     */
    calendarNavigate(direction) {
        if (direction === 'today') {
            this.calendarDate = new Date();
        } else if (direction === 'prev') {
            if (this.calendarView === 'month') {
                this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
            } else if (this.calendarView === 'week') {
                this.calendarDate.setDate(this.calendarDate.getDate() - 7);
            } else {
                this.calendarDate.setDate(this.calendarDate.getDate() - 1);
            }
        } else if (direction === 'next') {
            if (this.calendarView === 'month') {
                this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
            } else if (this.calendarView === 'week') {
                this.calendarDate.setDate(this.calendarDate.getDate() + 7);
            } else {
                this.calendarDate.setDate(this.calendarDate.getDate() + 1);
            }
        }
        this.renderCalendar();
    }

    /**
     * Change calendar view type
     */
    setCalendarView(view) {
        this.calendarView = view;
        this.renderCalendar();
    }

    /**
     * Handle click on calendar day
     */
    calendarDayClick(dateIso) {
        this.calendarDate = new Date(dateIso);
        this.calendarView = 'day';
        this.renderCalendar();
    }

    // ═══════════════════════════════════════════════════════════════
    // INTERVIEW HANDLERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Open interview schedule modal
     */
    openScheduleInterviewModal(appId = null, dateTime = null) {
        const modal = document.getElementById('interviewScheduleModal');
        const form = document.getElementById('interviewScheduleForm');
        const title = document.getElementById('interviewModalTitle');

        form?.reset();
        document.getElementById('interviewId').value = '';
        title.textContent = 'Schedule Interview';

        // Populate application dropdown
        this.populateApplicationDropdown(appId);

        // Populate type/mode dropdowns
        this.populateInterviewTypeDropdown();
        this.populateInterviewModeDropdown();

        // Pre-fill date if provided
        if (dateTime) {
            const dt = new Date(dateTime);
            document.getElementById('interviewDateTime').value = toLocalDateTimeString(dt);
        }

        // Pre-select application if provided
        if (appId) {
            document.getElementById('interviewAppSelect').value = appId;
        }

        modal?.classList.remove('hidden');
        modal?.classList.add('flex');
    }

    /**
     * Populate application dropdown
     */
    populateApplicationDropdown(preselectedId = null) {
        const select = document.getElementById('interviewAppSelect');
        if (!select) return;

        const apps = this.engine.getAll().filter(a => a.currentStage > 0 && a.currentStage <= 6);
        select.innerHTML = `<option value="">Select application...</option>` +
            apps.map(a => `<option value="${a.id}" ${a.id === preselectedId ? 'selected' : ''}>${a.companyName} - ${a.role}</option>`).join('');
    }

    /**
     * Populate interview type dropdown
     */
    populateInterviewTypeDropdown() {
        const select = document.getElementById('interviewType');
        if (!select) return;

        const types = this.engine.getInterviewTypes();
        select.innerHTML = Object.entries(types).map(([key, info]) =>
            `<option value="${key}"><i class="fas ${info.icon}"></i> ${info.name}</option>`
        ).join('');
    }

    /**
     * Populate interview mode dropdown
     */
    populateInterviewModeDropdown() {
        const select = document.getElementById('interviewMode');
        if (!select) return;

        const modes = this.engine.getInterviewModes();
        select.innerHTML = Object.entries(modes).map(([key, info]) =>
            `<option value="${key}">${info.name}</option>`
        ).join('');
    }

    /**
     * Close interview schedule modal
     */
    closeScheduleInterviewModal() {
        const modal = document.getElementById('interviewScheduleModal');
        modal?.classList.add('hidden');
        modal?.classList.remove('flex');
    }

    /**
     * Handle interview schedule form submit
     */
    async handleInterviewScheduleSubmit() {
        const interviewId = document.getElementById('interviewId').value;
        const appId = document.getElementById('interviewAppSelect').value;

        const data = {
            type: document.getElementById('interviewType').value,
            mode: document.getElementById('interviewMode').value,
            scheduledAt: new Date(document.getElementById('interviewDateTime').value).toISOString(),
            duration: parseInt(document.getElementById('interviewDuration').value),
            meetingLink: document.getElementById('interviewMeetingLink')?.value || '',
            location: document.getElementById('interviewLocation')?.value || '',
            interviewerName: document.getElementById('interviewerName').value,
            reminderMinutes: parseInt(document.getElementById('interviewReminder').value),
            notes: document.getElementById('interviewNotes').value
        };

        let result;
        if (interviewId) {
            result = await this.engine.updateInterview(interviewId, data);
        } else {
            result = await this.engine.scheduleInterview(appId, data);
        }

        if (result.success) {
            this.closeScheduleInterviewModal();
            this.render();
        } else {
            alert(result.errors.join('\n'));
        }
    }

    /**
     * View interview detail
     */
    viewInterview(interviewId) {
        const modal = document.getElementById('interviewDetailModal');
        const panel = document.getElementById('interviewDetailPanel');

        if (panel) {
            panel.innerHTML = renderInterviewDetail(interviewId);
        }

        modal?.classList.remove('hidden');
    }

    /**
     * Close interview detail panel
     */
    closeInterviewDetail() {
        document.getElementById('interviewDetailModal')?.classList.add('hidden');
    }

    /**
     * Edit interview (opens schedule modal with pre-filled data)
     */
    editInterview(interviewId) {
        const interviewService = getInterviewService();
        const interview = interviewService.getById(interviewId);
        if (!interview) return;

        this.closeInterviewDetail();
        this.openScheduleInterviewModal(interview.applicationId);

        // Pre-fill form
        document.getElementById('interviewId').value = interview.id;
        document.getElementById('interviewModalTitle').textContent = 'Edit Interview';
        document.getElementById('interviewType').value = interview.type;
        document.getElementById('interviewMode').value = interview.mode;
        document.getElementById('interviewDateTime').value = toLocalDateTimeString(new Date(interview.scheduledAt));
        document.getElementById('interviewDuration').value = interview.duration;
        document.getElementById('interviewMeetingLink').value = interview.meetingLink || '';
        document.getElementById('interviewLocation').value = interview.location || '';
        document.getElementById('interviewerName').value = interview.interviewerName || '';
        document.getElementById('interviewReminder').value = interview.reminderMinutes;
        document.getElementById('interviewNotes').value = interview.notes || '';

        // Toggle fields based on mode
        const isOnsite = interview.mode === 'onsite';
        document.getElementById('meetingLinkField')?.classList.toggle('hidden', isOnsite);
        document.getElementById('locationField')?.classList.toggle('hidden', !isOnsite);
    }

    /**
     * Delete interview with confirmation
     */
    async deleteInterviewConfirm(interviewId) {
        if (!confirm('Delete this interview?')) return;

        await this.engine.deleteInterview(interviewId);
        this.closeInterviewDetail();
        this.render();
    }

    /**
     * Export interview to ICS file
     */
    exportInterviewICS(interviewId) {
        const interviewService = getInterviewService();
        const interview = interviewService.getById(interviewId);
        if (!interview) return;

        const application = this.engine.getById(interview.applicationId);
        if (!application) return;

        const types = this.engine.getInterviewTypes();
        const modes = this.engine.getInterviewModes();

        downloadICS(interview, application, types, modes);
    }

    // ═══════════════════════════════════════════════════════════════
    // SKILL TAG HANDLERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Setup skill tag input event handlers
     */
    setupSkillTagInput() {
        const input = document.getElementById('skillInput');
        const suggestionsDiv = document.getElementById('skillSuggestions');

        if (!input) return;

        // Remove old listeners by cloning
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        // Add skill on Enter or comma
        newInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const value = newInput.value.trim().replace(/,/g, '');
                if (value && !this.currentSkillTags.includes(value)) {
                    this.addSkillTag(value);
                }
                newInput.value = '';
                suggestionsDiv?.classList.add('hidden');
            }
        });

        // Show autocomplete suggestions
        newInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value.length < 1) {
                suggestionsDiv?.classList.add('hidden');
                return;
            }

            const suggestions = getSkillSuggestions(value, this.currentSkillTags, []);
            if (suggestions.length > 0) {
                suggestionsDiv.innerHTML = suggestions.map(s =>
                    `<div class="skill-suggestion text-gray-300" onclick="window.app.addSkillTagFromSuggestion('${s}')">${s}</div>`
                ).join('');
                suggestionsDiv?.classList.remove('hidden');
            } else {
                suggestionsDiv?.classList.add('hidden');
            }
        });

        // Hide suggestions on blur (with delay for click)
        newInput.addEventListener('blur', () => {
            setTimeout(() => suggestionsDiv?.classList.add('hidden'), 200);
        });
    }

    /**
     * Render skill tags in the container
     */
    renderSkillTags() {
        const container = document.getElementById('skillTagsContainer');
        const input = document.getElementById('skillInput');
        const dataField = document.getElementById('skillTagsData');

        if (!container) return;

        // Clear existing tags (keep input)
        const tags = container.querySelectorAll('.skill-tag');
        tags.forEach(t => t.remove());

        // Add new tags before input
        this.currentSkillTags.forEach(skill => {
            const tag = document.createElement('span');
            tag.className = 'skill-tag';
            tag.innerHTML = `${skill} <span class="remove-tag" onclick="window.app.removeSkillTag('${skill}')">&times;</span>`;
            container.insertBefore(tag, input);
        });

        // Update hidden field
        if (dataField) {
            dataField.value = JSON.stringify(this.currentSkillTags);
        }
    }

    /**
     * Add a skill tag
     */
    addSkillTag(skill) {
        if (!this.currentSkillTags.includes(skill)) {
            this.currentSkillTags.push(skill);
            this.renderSkillTags();
        }
    }

    /**
     * Add skill tag from suggestion click
     */
    addSkillTagFromSuggestion(skill) {
        this.addSkillTag(skill);
        const input = document.getElementById('skillInput');
        if (input) {
            input.value = '';
            input.focus();
        }
    }

    /**
     * Remove a skill tag
     */
    removeSkillTag(skill) {
        this.currentSkillTags = this.currentSkillTags.filter(s => s !== skill);
        this.renderSkillTags();
    }

    // ═══════════════════════════════════════════════════════════════
    // VENDOR TOGGLE HANDLER
    // ═══════════════════════════════════════════════════════════════

    /**
     * Toggle contact source between Direct HR and Via Vendor
     */
    toggleContactSource(isVendor) {
        const btnDirect = document.getElementById('btnDirectHR');
        const btnVendor = document.getElementById('btnViaVendor');
        const vendorField = document.getElementById('vendorField');
        const hiddenField = document.getElementById('isVendor');
        const label = document.getElementById('contactPersonLabel');

        // Update button states
        if (isVendor) {
            btnDirect?.classList.remove('active');
            btnDirect?.classList.add('text-gray-400');
            btnVendor?.classList.add('active');
            btnVendor?.classList.remove('text-gray-400');
            vendorField?.classList.remove('hidden');
            if (label) label.textContent = 'Contact Person Name';
        } else {
            btnDirect?.classList.add('active');
            btnDirect?.classList.remove('text-gray-400');
            btnVendor?.classList.remove('active');
            btnVendor?.classList.add('text-gray-400');
            vendorField?.classList.add('hidden');
            if (label) label.textContent = 'HR Name';
        }

        // Update hidden field
        if (hiddenField) {
            hiddenField.value = isVendor ? 'true' : 'false';
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FOLLOW-UP BANNER & GHOSTING HANDLERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Render follow-up nudge banner in dashboard
     */
    renderFollowUpBanner() {
        const banner = document.getElementById('followUpBanner');
        const content = document.getElementById('followUpBannerContent');
        if (!banner || !content) return;

        const followUpService = getFollowUpService();
        const applications = this.engine.getAll();
        const reminders = followUpService.checkReminders(applications);

        if (reminders.length === 0) {
            banner.classList.add('hidden');
            return;
        }

        // Split into regular nudges and ghost candidates
        const ghostCandidates = reminders.filter(r => r.isGhostCandidate);
        const regularNudges = reminders.filter(r => !r.isGhostCandidate);

        let html = `<div class="flex items-center gap-2 mb-3">
            <i class="fas fa-bell text-amber-400"></i>
            <h3 class="font-semibold text-amber-300">Follow-up Reminders (${reminders.length})</h3>
        </div>`;

        // Ghost candidates first (in red)
        if (ghostCandidates.length > 0) {
            html += `<div class="space-y-2 mb-3">`;
            ghostCandidates.forEach(r => {
                html += `
                <div class="flex items-center justify-between bg-red-900/40 border border-red-600/40 rounded-lg p-3">
                    <div class="flex-1">
                        <span class="text-red-300 font-medium">${r.companyName}</span>
                        <span class="text-red-400 text-sm ml-2">${r.role || ''}</span>
                        <p class="text-red-400 text-xs mt-1">
                            <i class="fas fa-ghost mr-1"></i> ${r.attempts} follow-ups sent, no response — possible ghosting
                        </p>
                    </div>
                    <div class="flex gap-2 ml-3 flex-shrink-0">
                        <button onclick="window.app.markAsGhosted('${r.appId}')"
                            class="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-medium transition">
                            Close as Ghosted
                        </button>
                        <button onclick="window.app.dismissFollowUpNudge('${r.appId}')"
                            class="text-gray-400 hover:text-white text-xs transition">
                            Dismiss
                        </button>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }

        // Regular nudges
        if (regularNudges.length > 0) {
            html += `<div class="space-y-2">`;
            regularNudges.forEach(r => {
                const daysText = r.daysSinceReminder === 0 ? 'Today' :
                    r.daysSinceReminder === 1 ? '1 day overdue' :
                        `${r.daysSinceReminder} days overdue`;
                html += `
                <div class="flex items-center justify-between bg-amber-900/30 rounded-lg p-3">
                    <div class="flex-1">
                        <span class="text-amber-300 font-medium">${r.companyName}</span>
                        <span class="text-amber-400 text-sm ml-2">${r.role || ''}</span>
                        <p class="text-amber-400/70 text-xs mt-1">
                            Waiting for: ${r.context || 'response'} • ${daysText}
                            ${r.attempts > 0 ? ` • ${r.attempts} follow-up(s) sent` : ''}
                        </p>
                    </div>
                    <div class="flex gap-2 ml-3 flex-shrink-0">
                        <button onclick="window.app.openInteractionModal('${r.appId}')"
                            class="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded text-xs font-medium transition">
                            Follow Up Now
                        </button>
                        <button onclick="window.app.dismissFollowUpNudge('${r.appId}')"
                            class="text-gray-400 hover:text-white text-xs transition">
                            Dismiss
                        </button>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }

        content.innerHTML = html;
        banner.classList.remove('hidden');
    }

    /**
     * Dismiss a follow-up nudge for an application
     */
    dismissFollowUpNudge(appId) {
        const app = this.engine.getById(appId);
        if (!app) return;

        const followUpService = getFollowUpService();
        followUpService.dismissNudge(app);
        this.engine.update(appId, { followUpTracker: app.followUpTracker });
        this.renderFollowUpBanner();
    }

    /**
     * Mark application as ghosted and close it
     */
    async markAsGhosted(appId) {
        if (!confirm('Close this application as ghosted?')) return;

        const result = await this.engine.closeApplication(appId, 'ghosted', 'No response after multiple follow-ups');
        if (result) {
            this.render();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS HANDLERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Open settings modal
     */
    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;

        const settingsService = getSettingsService();
        const followUp = settingsService.settings.followUp || {};

        document.getElementById('settingInitialWaitDays').value = followUp.initialWaitDays || 3;
        document.getElementById('settingSubsequentWaitDays').value = followUp.subsequentWaitDays || 5;
        document.getElementById('settingMaxAttempts').value = followUp.maxAttempts || 3;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    /**
     * Close settings modal
     */
    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal?.classList.add('hidden');
        modal?.classList.remove('flex');
    }

    /**
     * Save settings from modal form
     */
    saveSettings() {
        const settingsService = getSettingsService();
        settingsService.settings.followUp = {
            initialWaitDays: parseInt(document.getElementById('settingInitialWaitDays').value) || 3,
            subsequentWaitDays: parseInt(document.getElementById('settingSubsequentWaitDays').value) || 5,
            maxAttempts: parseInt(document.getElementById('settingMaxAttempts').value) || 3
        };
        settingsService.save();

        this.closeSettingsModal();
    }

    // ═══════════════════════════════════════════════════════════════
    // CLOSE APPLICATION HANDLERS
    // -------------------------------------------------------------------------
    // Result Modal (Offer Stage)
    // -------------------------------------------------------------------------

    openResultModal(appId) {
        document.getElementById('resultAppId').value = appId;
        document.getElementById('resultNotes').value = '';

        const modal = document.getElementById('resultModal');
        modal?.classList.remove('hidden');
        modal?.classList.add('flex');
    }

    closeResultModal() {
        const modal = document.getElementById('resultModal');
        modal?.classList.add('hidden');
        modal?.classList.remove('flex');
    }

    async submitResult(outcome) {
        const appId = document.getElementById('resultAppId').value;
        const notes = document.getElementById('resultNotes').value;

        if (outcome === 'accepted') {
            await this.engine.update(appId, {
                finalResult: 'accepted',
                currentStage: 6 // Ensure we are in Offer stage
            });
            // Log interaction
            this.engine.addInteraction(appId, {
                type: 'note',
                notes: `Offer Accepted! 🎉 ${notes}`
            });
        } else {
            await this.engine.update(appId, {
                finalResult: 'declined',
                currentStage: 0 // Close it
            });
            // Log interaction
            this.engine.addInteraction(appId, {
                type: 'note',
                notes: `Offer Declined. ${notes}`
            });
            // Stop tracking
            this.engine.getEngine ? this.engine.getEngine().closeApplication(appId, 'declined') : null; // Close logic duplication?
            // Actually engine.closeApplication handles logic better.
        }

        // For declined, we should use closeApplication logic to be safe
        if (outcome === 'declined') {
            this.engine.closeApplication(appId, 'declined', notes);
        } else {
            // For accepted, we just update result.
            // Maybe add a confetti effect?
        }

        this.closeResultModal();
        this.render();
    }

    // -------------------------------------------------------------------------
    // Close Application Modal
    // -------------------------------------------------------------------------

    /**
     * Open close application modal
     */
    openCloseAppModal(appId) {
        const app = this.engine.getById(appId);
        if (!app) return;

        const modal = document.getElementById('closeAppModal');
        document.getElementById('closeAppId').value = appId;
        document.getElementById('closeAppInfo').textContent = `Closing: ${app.companyName} — ${app.role}`;
        document.getElementById('closeAppReason').value = 'rejected';
        document.getElementById('closeAppNotes').value = '';

        modal?.classList.remove('hidden');
        modal?.classList.add('flex');
    }

    /**
     * Close the close-application modal
     */
    closeCloseAppModal() {
        const modal = document.getElementById('closeAppModal');
        modal?.classList.add('hidden');
        modal?.classList.remove('flex');
    }

    /**
     * Handle close application form submit
     */
    async handleCloseAppSubmit() {
        const appId = document.getElementById('closeAppId').value;
        const reason = document.getElementById('closeAppReason').value;
        const notes = document.getElementById('closeAppNotes').value;

        const result = await this.engine.closeApplication(appId, reason, notes);
        if (result) {
            this.closeCloseAppModal();
            this.closeDetail();
            this.render();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ROUND OUTCOME HANDLERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Open round outcome modal
     */
    openRoundOutcomeModal(interviewId) {
        const interviewService = getInterviewService();
        const interview = interviewService.getById(interviewId);
        if (!interview) return;

        const app = this.engine.getById(interview.applicationId);
        const modal = document.getElementById('roundOutcomeModal');

        document.getElementById('roundOutcomeInterviewId').value = interviewId;
        document.getElementById('roundOutcomeInfo').textContent =
            `Round ${interview.roundNumber || '?'} at ${app?.companyName || 'Unknown'}`;
        document.getElementById('roundOutcomeNotes').value = '';

        modal?.classList.remove('hidden');
        modal?.classList.add('flex');
    }

    /**
     * Close round outcome modal
     */
    closeRoundOutcomeModal() {
        const modal = document.getElementById('roundOutcomeModal');
        modal?.classList.add('hidden');
        modal?.classList.remove('flex');
    }

    /**
     * Submit round outcome (called from modal buttons)
     */
    async submitRoundOutcome(outcome) {
        const interviewId = document.getElementById('roundOutcomeInterviewId').value;
        const notes = document.getElementById('roundOutcomeNotes').value;
        const interviewService = getInterviewService();
        const interview = interviewService.getById(interviewId);
        if (!interview) return;

        const result = await this.engine.setRoundOutcome(interviewId, outcome, notes);

        // Add outcome notes as an interaction
        if (notes) {
            this.engine.addInteraction(interview.applicationId, {
                type: 'note',
                date: new Date().toISOString(),
                notes: `Round ${interview.roundNumber} outcome: ${outcome}. ${notes}`
            });
        }

        this.closeRoundOutcomeModal();

        if (result?.suggestedAction === 'schedule_next_or_offer') {
            // Auto-open schedule modal for next round
            this.openScheduleInterviewModal(interview.applicationId);
        } else if (result?.suggestedAction === 'close_rejected') {
            this.openCloseAppModal(interview.applicationId);
        }

        this.render();
    }

    // ═══════════════════════════════════════════════════════════════
    // SELECTION & DELETE HANDLERS (Table View)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Toggle selection of a single application
     */
    toggleAppSelection(appId) {
        if (this.selectedApps.has(appId)) {
            this.selectedApps.delete(appId);
        } else {
            this.selectedApps.add(appId);
        }
        this.render();
    }

    /**
     * Toggle select all (based on current filtered view)
     */
    toggleSelectAll() {
        const apps = this.engine.getFiltered(
            this.currentFilter,
            this.currentSearch,
            this.currentSort
        );

        const allSelected = apps.length > 0 && apps.every(app => this.selectedApps.has(app.id));

        if (allSelected) {
            this.selectedApps.clear();
        } else {
            apps.forEach(app => this.selectedApps.add(app.id));
        }
        this.render();
    }

    /**
     * Delete a single application
     */
    async deleteApplication(appId) {
        if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
            return;
        }

        const success = await this.engine.delete(appId);
        if (success) {
            this.selectedApps.delete(appId);
            this.render();
        } else {
            alert('Failed to delete application');
        }
    }

    /**
     * Delete all selected applications
     */
    async deleteSelectedApplications() {
        if (this.selectedApps.size === 0) return;

        if (!confirm(`Are you sure you want to delete ${this.selectedApps.size} applications? This action cannot be undone.`)) {
            return;
        }

        const ids = Array.from(this.selectedApps);

        for (const id of ids) {
            await this.engine.delete(id);
        }

        this.selectedApps.clear();
        // Force refresh
        window.location.reload();
    }
}
