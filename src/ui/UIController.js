import { getEngine } from '../core/ApplicationEngine.js';
import { STAGES, STAGE_ORDER } from '../core/constants/stages.js';
import { RESULT_LABELS, RESULT_KEYS } from '../core/constants/results.js';
import { INTERACTION_TYPES } from '../core/constants/interactions.js';
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

/**
 * Main UI Controller - Connects the engine to the DOM
 */
export class UIController {
    constructor() {
        this.engine = getEngine();
        this.currentView = 'card';
        this.visibleColumns = ['company', 'role', 'hr', 'type', 'location', 'salary', 'stage', 'lastAction', 'updated'];

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
        this.render();
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
                break;
            case 'table':
                this.renderTableView(filtered, isEmpty);
                break;
            case 'kanban':
                this.renderKanbanView(filtered, isEmpty);
                break;
            case 'analytics':
                this.renderAnalyticsView();
                break;
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

        if (thead && tbody) {
            const { header, body } = renderTableView(applications, this.visibleColumns, this.engine.currentSort);
            thead.innerHTML = header;
            tbody.innerHTML = isEmpty ? '' : body;
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
        document.getElementById('hrName').value = app.hrName || '';
        document.getElementById('hrContact').value = app.hrContact || '';
        document.getElementById('opportunityType').value = app.opportunityType || '';
        document.getElementById('location').value = app.location || '';
        document.getElementById('city').value = app.city || '';
        document.getElementById('salary').value = app.salary || '';
        document.getElementById('noticePeriod').value = app.noticePeriod || '';
        document.getElementById('keySkills').value = app.keySkills || '';
        document.getElementById('jdNotes').value = app.jdNotes || '';
        document.getElementById('currentStage').value = app.currentStage;
        document.getElementById('finalResult').value = app.finalResult || '';

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
        const data = {
            companyName: document.getElementById('companyName').value,
            role: document.getElementById('role').value,
            hrName: document.getElementById('hrName').value,
            hrContact: document.getElementById('hrContact').value,
            opportunityType: document.getElementById('opportunityType').value,
            location: document.getElementById('location').value,
            city: document.getElementById('city').value,
            salary: document.getElementById('salary').value,
            noticePeriod: document.getElementById('noticePeriod').value,
            keySkills: document.getElementById('keySkills').value,
            jdNotes: document.getElementById('jdNotes').value,
            currentStage: parseInt(document.getElementById('currentStage').value),
            finalResult: document.getElementById('finalResult').value
        };

        let result;
        if (appId) {
            result = this.engine.update(appId, data);
        } else {
            result = this.engine.create(data);
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

        const modal = document.getElementById('detailModal');
        const panel = document.getElementById('detailPanel');

        if (panel) {
            panel.innerHTML = renderDetailPanel(app);
        }

        modal?.classList.remove('hidden');
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
        document.getElementById('interactionDate').value = new Date().toISOString().slice(0, 16);

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
    handleInteractionSubmit() {
        const appId = document.getElementById('interactionAppId').value;
        const data = {
            type: document.getElementById('interactionType').value,
            date: document.getElementById('interactionDate').value,
            notes: document.getElementById('interactionNotes').value
        };

        const newStage = document.getElementById('interactionStage').value;
        const result = this.engine.addInteraction(appId, data, newStage ? parseInt(newStage) : undefined);

        if (result.success) {
            this.closeInteractionModal();
            this.openDetail(appId);
        } else {
            alert(result.errors.join('\n'));
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
    deleteInteraction(appId, interactionId) {
        if (!confirm('Delete this interaction?')) return;

        this.engine.removeInteraction(appId, interactionId);
        this.openDetail(appId);
    }
}
