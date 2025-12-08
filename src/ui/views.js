import { STAGES, STAGE_ORDER, getStage } from '../core/constants/stages.js';
import { RESULT_LABELS, getResultLabel } from '../core/constants/results.js';
import { getInteractionIcon, INTERACTION_TYPES } from '../core/constants/interactions.js';
import { timeAgo, formatDate, formatDateTime } from '../core/utils/dateUtils.js';

/**
 * Render stage counter pills
 * @param {Object.<number, number>} counts 
 * @param {Function} onStageClick 
 * @returns {string}
 */
export function renderStageCounts(counts, onStageClick) {
  return STAGE_ORDER.map(stage => {
    const info = STAGES[stage];
    return `
      <div class="stage-pill ${info.color} bg-opacity-20 border border-opacity-30 ${info.color.replace('bg-', 'border-')} rounded-xl p-2 sm:p-3 text-center cursor-pointer hover:bg-opacity-30" 
           data-stage="${stage}" onclick="window.app.filterByStage(${stage})">
        <div class="text-xl sm:text-2xl font-bold text-white">${counts[stage] || 0}</div>
        <div class="text-xs text-gray-300 truncate">${info.name}</div>
      </div>
    `;
  }).join('');
}

/**
 * Render a single application card
 * @param {import('../core/models/Application.js').ApplicationData} app 
 * @returns {string}
 */
export function renderCard(app) {
  const stage = getStage(app.currentStage);
  const lastInteraction = app.interactions?.length > 0
    ? app.interactions[app.interactions.length - 1]
    : null;

  return `
    <div class="card-hover bg-gray-800 rounded-xl border border-gray-700 overflow-hidden transition cursor-pointer" 
         onclick="window.app.openDetail('${app.id}')">
      <div class="p-4">
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-white text-lg truncate">${escapeHtml(app.companyName)}</h3>
            <p class="text-indigo-400 text-sm truncate">${escapeHtml(app.role)}</p>
          </div>
          <span class="stage-pill ${stage.color} text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 ml-2 flex-shrink-0">
            <i class="fas ${stage.icon} text-xs"></i>
            <span class="hidden sm:inline">${stage.name}</span>
          </span>
        </div>
        
        <div class="space-y-2 text-sm text-gray-400">
          ${app.hrName ? `<div class="flex items-center gap-2 truncate"><i class="fas fa-user-tie w-4 flex-shrink-0"></i><span class="truncate">${escapeHtml(app.hrName)}</span></div>` : ''}
          ${app.opportunityType ? `<div class="flex items-center gap-2"><i class="fas fa-briefcase w-4 flex-shrink-0"></i>${escapeHtml(app.opportunityType)} ${app.location ? '• ' + escapeHtml(app.location) : ''}</div>` : ''}
          ${app.salary ? `<div class="flex items-center gap-2"><i class="fas fa-money-bill-wave w-4 flex-shrink-0"></i>${escapeHtml(app.salary)}</div>` : ''}
        </div>

        ${app.finalResult ? `
          <div class="mt-3 pt-3 border-t border-gray-700">
            <span class="text-sm ${getResultLabel(app.finalResult)?.class || 'text-gray-400'}">
              ${getResultLabel(app.finalResult)?.text || app.finalResult}
            </span>
          </div>
        ` : ''}
      </div>
      
      <div class="bg-gray-900/50 px-4 py-3 border-t border-gray-700">
        <div class="flex justify-between items-center text-xs">
          <span class="text-gray-500">
            <i class="fas fa-clock mr-1"></i> ${timeAgo(app.lastUpdated)}
          </span>
          ${app.currentStage === 4 ? `
            <button onclick="event.stopPropagation(); window.app.openScheduleInterviewModal('${app.id}')" 
              class="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs font-medium transition flex items-center gap-1">
              <i class="fas fa-calendar-plus"></i> Schedule Interview
            </button>
          ` : lastInteraction ? `
            <span class="text-gray-400 truncate max-w-[60%]">
              ${getInteractionIcon(lastInteraction.type)} ${escapeHtml(lastInteraction.notes.substring(0, 25))}...
            </span>
          ` : `
            <span class="text-gray-500">No interactions</span>
          `}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render card view grid
 * @param {import('../core/models/Application.js').ApplicationData[]} applications 
 * @returns {string}
 */
export function renderCardView(applications) {
  if (applications.length === 0) {
    return '';
  }
  return applications.map(app => renderCard(app)).join('');
}

/**
 * Render table header
 * @param {string[]} visibleColumns 
 * @param {{column: string, direction: string}} currentSort 
 * @returns {string}
 */
export function renderTableHeader(visibleColumns, currentSort) {
  const columns = {
    company: { label: 'Company', sortable: true, key: 'companyName' },
    role: { label: 'Role', sortable: true, key: 'role' },
    hr: { label: 'HR/Vendor', sortable: true, key: 'hrName' },
    type: { label: 'Type', sortable: false },
    location: { label: 'Location', sortable: false },
    salary: { label: 'Salary', sortable: false },
    stage: { label: 'Stage', sortable: true, key: 'currentStage' },
    result: { label: 'Result', sortable: false },
    lastAction: { label: 'Last Action', sortable: false },
    updated: { label: 'Updated', sortable: true, key: 'lastUpdated' }
  };

  return `<tr>
    ${visibleColumns.map(col => {
    const c = columns[col];
    if (!c) return '';
    const isSorted = currentSort.column === c.key;
    return `<th class="px-4 py-3 font-medium ${c.sortable ? 'sortable cursor-pointer' : ''}" 
          ${c.sortable ? `onclick="window.app.sortBy('${c.key}')"` : ''}>
          <div class="flex items-center gap-2">
            ${c.label}
            ${c.sortable ? `<i class="fas fa-sort${isSorted ? (currentSort.direction === 'asc' ? '-up' : '-down') : ''} sort-icon text-xs ${isSorted ? 'opacity-100 text-indigo-400' : ''}"></i>` : ''}
          </div>
        </th>`;
  }).join('')}
    <th class="px-4 py-3 font-medium w-20">Actions</th>
  </tr>`;
}

/**
 * Render table row
 * @param {import('../core/models/Application.js').ApplicationData} app 
 * @param {string[]} visibleColumns 
 * @returns {string}
 */
export function renderTableRow(app, visibleColumns) {
  const stage = getStage(app.currentStage);
  const lastInteraction = app.interactions?.length > 0 ? app.interactions[app.interactions.length - 1] : null;

  const cellData = {
    company: `<div class="font-medium text-white">${escapeHtml(app.companyName)}</div>`,
    role: `<div class="text-indigo-400">${escapeHtml(app.role)}</div>`,
    hr: `<div>${escapeHtml(app.hrName || '-')}</div><div class="text-xs text-gray-500">${escapeHtml(app.hrContact || '')}</div>`,
    type: `<span class="bg-gray-700 px-2 py-1 rounded text-xs">${escapeHtml(app.opportunityType || '-')}</span>`,
    location: `<div>${escapeHtml(app.location || '-')}</div><div class="text-xs text-gray-500">${escapeHtml(app.city || '')}</div>`,
    salary: `<div>${escapeHtml(app.salary || '-')}</div>`,
    stage: `<span class="inline-flex items-center gap-1 ${stage.color} text-white text-xs px-2 py-1 rounded-full">
      <i class="fas ${stage.icon}"></i> ${stage.name}
    </span>`,
    result: app.finalResult
      ? `<span class="${getResultLabel(app.finalResult)?.class || ''} text-xs">${getResultLabel(app.finalResult)?.text || '-'}</span>`
      : `<span class="text-gray-500 text-xs">In Progress</span>`,
    lastAction: lastInteraction
      ? `<div class="text-xs">${getInteractionIcon(lastInteraction.type)} ${escapeHtml(lastInteraction.notes.substring(0, 30))}...</div>`
      : `<span class="text-gray-500 text-xs">-</span>`,
    updated: `<div class="text-xs text-gray-400">${timeAgo(app.lastUpdated)}</div>`
  };

  return `<tr class="hover:bg-gray-700/50 cursor-pointer" onclick="window.app.openDetail('${app.id}')">
    ${visibleColumns.map(col => `<td class="px-4 py-3">${cellData[col] || ''}</td>`).join('')}
    <td class="px-4 py-3">
      <div class="flex gap-2">
        ${app.currentStage === 4 ? `
        <button onclick="event.stopPropagation(); window.app.openScheduleInterviewModal('${app.id}')" class="text-yellow-400 hover:text-yellow-300" title="Schedule Interview">
          <i class="fas fa-calendar-plus"></i>
        </button>
        ` : ''}
        <button onclick="event.stopPropagation(); window.app.openInteractionModal('${app.id}')" class="text-green-400 hover:text-green-300" title="Log Interaction">
          <i class="fas fa-plus-circle"></i>
        </button>
        <button onclick="event.stopPropagation(); window.app.openEditModal('${app.id}')" class="text-indigo-400 hover:text-indigo-300" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
      </div>
    </td>
  </tr>`;
}

/**
 * Render table view
 * @param {import('../core/models/Application.js').ApplicationData[]} applications 
 * @param {string[]} visibleColumns 
 * @param {{column: string, direction: string}} currentSort 
 * @returns {{header: string, body: string}}
 */
export function renderTableView(applications, visibleColumns, currentSort) {
  return {
    header: renderTableHeader(visibleColumns, currentSort),
    body: applications.map(app => renderTableRow(app, visibleColumns)).join('')
  };
}

/**
 * Render kanban card
 * @param {import('../core/models/Application.js').ApplicationData} app 
 * @returns {string}
 */
export function renderKanbanCard(app) {
  const lastInt = app.interactions?.length > 0 ? app.interactions[app.interactions.length - 1] : null;
  const resultLabel = getResultLabel(app.finalResult);

  return `
    <div class="kanban-card bg-gray-900 rounded-lg p-3 border border-gray-700 hover:border-indigo-500 transition"
         draggable="true"
         data-id="${app.id}"
         onclick="window.app.openDetail('${app.id}')">
      <div class="font-medium text-white text-sm mb-1">${escapeHtml(app.companyName)}</div>
      <div class="text-indigo-400 text-xs mb-2">${escapeHtml(app.role)}</div>
      ${app.opportunityType ? `<div class="text-xs text-gray-500 mb-2"><i class="fas fa-briefcase mr-1"></i>${escapeHtml(app.opportunityType)}</div>` : ''}
      ${lastInt ? `
        <div class="text-xs text-gray-400 bg-gray-800 rounded p-2 mt-2">
          ${getInteractionIcon(lastInt.type)} ${escapeHtml(lastInt.notes.substring(0, 40))}...
        </div>
      ` : ''}
      <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-700">
        <span class="text-xs text-gray-500">${timeAgo(app.lastUpdated)}</span>
        ${app.currentStage === 4 ? `
          <button onclick="event.stopPropagation(); window.app.openScheduleInterviewModal('${app.id}')" 
            class="text-xs text-yellow-400 hover:text-yellow-300">
            <i class="fas fa-calendar-plus mr-1"></i>Interview
          </button>
        ` : resultLabel ? `<span class="text-xs ${resultLabel.class}">${resultLabel.text.split(' ')[0]}</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * Render kanban column
 * @param {number} stageNum 
 * @param {import('../core/models/Application.js').ApplicationData[]} apps 
 * @returns {string}
 */
export function renderKanbanColumn(stageNum, apps) {
  const stage = STAGES[stageNum];

  return `
    <div class="kanban-column flex-shrink-0 w-72 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
         data-stage="${stageNum}">
      <div class="p-3 ${stage.color} bg-opacity-20 border-b border-gray-700">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-full ${stage.color} flex items-center justify-center">
              <i class="fas ${stage.icon} text-sm text-white"></i>
            </span>
            <div>
              <h3 class="font-semibold text-white text-sm">${stage.name}</h3>
              <p class="text-xs text-gray-400">${apps.length} items</p>
            </div>
          </div>
        </div>
      </div>
      <div class="p-2 space-y-2 min-h-[300px] max-h-[60vh] overflow-y-auto">
        ${apps.length > 0 ? apps.map(app => renderKanbanCard(app)).join('') : '<div class="text-center text-gray-500 text-sm py-8">No items</div>'}
      </div>
    </div>
  `;
}

/**
 * Render kanban board
 * @param {import('../core/models/Application.js').ApplicationData[]} applications 
 * @returns {string}
 */
export function renderKanbanView(applications) {
  return STAGE_ORDER.map(stageNum => {
    const stageApps = applications.filter(a => a.currentStage === stageNum);
    return renderKanbanColumn(stageNum, stageApps);
  }).join('');
}

/**
 * Render detail panel content
 * @param {import('../core/models/Application.js').ApplicationData} app 
 * @returns {string}
 */
export function renderDetailPanel(app) {
  const stage = getStage(app.currentStage);
  const resultLabel = getResultLabel(app.finalResult);

  return `
    <div class="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 z-10">
      <div class="flex justify-between items-start">
        <div>
          <h2 class="text-xl font-bold text-white">${escapeHtml(app.companyName)}</h2>
          <p class="text-indigo-400">${escapeHtml(app.role)}</p>
        </div>
        <button onclick="window.app.closeDetail()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
      </div>
      <div class="flex flex-wrap gap-2 mt-3">
        <span class="${stage.color} text-white text-sm px-3 py-1 rounded-full flex items-center gap-2">
          <i class="fas ${stage.icon}"></i>
          Stage ${app.currentStage}: ${stage.name}
        </span>
        ${resultLabel ? `
          <span class="bg-gray-700 text-sm px-3 py-1 rounded-full ${resultLabel.class}">
            ${resultLabel.text}
          </span>
        ` : ''}
      </div>
    </div>

    <div class="p-4 space-y-6">
      <div class="flex gap-2 flex-wrap">
        ${app.currentStage >= 1 && app.currentStage <= 5 ? `
        <button onclick="window.app.closeDetail(); window.app.openScheduleInterviewModal('${app.id}')" class="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
          <i class="fas fa-calendar-plus"></i> Schedule Interview
        </button>
        ` : ''}
        <button onclick="window.app.openInteractionModal('${app.id}')" class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
          <i class="fas fa-plus"></i> Log Interaction
        </button>
        <button onclick="window.app.closeDetail(); window.app.openEditModal('${app.id}')" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button onclick="window.app.deleteApplication('${app.id}')" class="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>

      ${app.interactions?.length > 0 ? `
        <div class="bg-indigo-900/30 border border-indigo-700 rounded-xl p-4">
          <div class="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-1">
            <span class="pulse-dot w-2 h-2 bg-indigo-400 rounded-full"></span>
            Last Action Taken
          </div>
          <p class="text-white">${getInteractionIcon(app.interactions[app.interactions.length - 1].type)} ${escapeHtml(app.interactions[app.interactions.length - 1].notes)}</p>
          <p class="text-gray-400 text-sm mt-1">${formatDateTime(app.interactions[app.interactions.length - 1].date)}</p>
        </div>
      ` : ''}

      <div class="bg-gray-900/50 rounded-xl p-4">
        <h3 class="font-semibold text-white mb-3 flex items-center gap-2">
          <i class="fas fa-info-circle text-indigo-400"></i> Opportunity Details
        </h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          ${app.hrName ? `<div><span class="text-gray-500">HR/Vendor:</span><p class="text-white">${escapeHtml(app.hrName)}</p></div>` : ''}
          ${app.hrContact ? `<div><span class="text-gray-500">Contact:</span><p class="text-white">${escapeHtml(app.hrContact)}</p></div>` : ''}
          ${app.opportunityType ? `<div><span class="text-gray-500">Type:</span><p class="text-white">${escapeHtml(app.opportunityType)}</p></div>` : ''}
          ${app.location ? `<div><span class="text-gray-500">Work Mode:</span><p class="text-white">${escapeHtml(app.location)}${app.city ? ' - ' + escapeHtml(app.city) : ''}</p></div>` : ''}
          ${app.salary ? `<div><span class="text-gray-500">Salary/Rate:</span><p class="text-white">${escapeHtml(app.salary)}</p></div>` : ''}
          ${app.noticePeriod ? `<div><span class="text-gray-500">Notice Period:</span><p class="text-white">${escapeHtml(app.noticePeriod)}</p></div>` : ''}
          <div><span class="text-gray-500">Created:</span><p class="text-white">${formatDate(app.createdAt)}</p></div>
          <div><span class="text-gray-500">Last Updated:</span><p class="text-white">${formatDateTime(app.lastUpdated)}</p></div>
        </div>
        ${app.keySkills ? `
          <div class="mt-4">
            <span class="text-gray-500 text-sm">Key Skills:</span>
            <div class="flex flex-wrap gap-2 mt-1">
              ${app.keySkills.split(',').map(skill => `<span class="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">${escapeHtml(skill.trim())}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${app.jdNotes ? `
          <div class="mt-4">
            <span class="text-gray-500 text-sm">JD/Notes:</span>
            <p class="text-gray-300 text-sm mt-1 whitespace-pre-wrap">${escapeHtml(app.jdNotes)}</p>
          </div>
        ` : ''}
      </div>

      <div class="bg-gray-900/50 rounded-xl p-4">
        <h3 class="font-semibold text-white mb-3 flex items-center gap-2">
          <i class="fas fa-tasks text-indigo-400"></i> Your Process Stages
        </h3>
        <div class="space-y-2">
          ${[1, 2, 3, 4, 5, 6, 7, 8].map(s => {
    const stageInfo = STAGES[s];
    const isCompleted = app.currentStage >= s;
    const isCurrent = app.currentStage === s;
    return `
              <div class="flex items-center gap-3 ${isCompleted ? 'text-white' : 'text-gray-500'}">
                <div class="w-8 h-8 rounded-full ${isCurrent ? stageInfo.color : isCompleted ? 'bg-green-600' : 'bg-gray-700'} flex items-center justify-center flex-shrink-0">
                  ${isCompleted && !isCurrent ? '<i class="fas fa-check text-sm"></i>' : `<span class="text-sm font-bold">${s}</span>`}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium ${isCurrent ? 'text-indigo-400' : ''}">${stageInfo.name}</p>
                  <p class="text-xs text-gray-500 truncate">${stageInfo.desc}</p>
                </div>
                ${isCurrent ? '<span class="pulse-dot w-2 h-2 bg-indigo-400 rounded-full flex-shrink-0"></span>' : ''}
              </div>
            `;
  }).join('')}
        </div>
      </div>

      <div class="bg-gray-900/50 rounded-xl p-4">
        <h3 class="font-semibold text-white mb-3 flex items-center gap-2">
          <i class="fas fa-history text-indigo-400"></i> Interaction Timeline
        </h3>
        ${app.interactions?.length > 0 ? `
          <div class="space-y-3">
            ${[...app.interactions].reverse().map(int => `
              <div class="flex gap-3 border-l-2 border-gray-700 pl-4 pb-3">
                <div class="flex-1">
                  <div class="flex items-center gap-2 text-sm">
                    <span class="text-lg">${getInteractionIcon(int.type)}</span>
                    <span class="text-gray-400">${formatDateTime(int.date)}</span>
                  </div>
                  <p class="text-white mt-1">${escapeHtml(int.notes)}</p>
                </div>
                <button onclick="event.stopPropagation(); window.app.deleteInteraction('${app.id}', '${int.id}')" class="text-gray-500 hover:text-red-400 flex-shrink-0">
                  <i class="fas fa-trash-alt text-xs"></i>
                </button>
              </div>
            `).join('')}
          </div>
        ` : `
          <p class="text-gray-500 text-sm">No interactions logged yet.</p>
        `}
      </div>
    </div>
  `;
}

/**
 * Render empty state
 * @returns {string}
 */
export function renderEmptyState() {
  return `
    <div class="text-center py-16">
      <i class="fas fa-folder-open text-6xl text-gray-600 mb-4"></i>
      <h3 class="text-xl font-semibold text-gray-400">No applications found</h3>
      <p class="text-gray-500 mt-2">Try adjusting your filters or add a new opportunity</p>
    </div>
  `;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
