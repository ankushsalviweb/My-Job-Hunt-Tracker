import { Chart, registerables } from 'chart.js';

// Register all Chart.js components
Chart.register(...registerables);

// Store chart instances for cleanup
const chartInstances = {};

/**
 * Destroy existing chart if present
 * @param {string} chartId 
 */
function destroyChart(chartId) {
    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
        delete chartInstances[chartId];
    }
}

/**
 * Render stage distribution doughnut chart
 * @param {string} canvasId 
 * @param {import('../core/services/AnalyticsService.js').StageStats[]} data 
 */
export function renderStageDistributionChart(canvasId, data) {
    destroyChart(canvasId);

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const colorMap = {
        'bg-blue-500': '#3b82f6',
        'bg-purple-500': '#a855f7',
        'bg-yellow-500': '#eab308',
        'bg-teal-500': '#14b8a6',
        'bg-indigo-500': '#6366f1',
        'bg-orange-500': '#f97316',
        'bg-pink-500': '#ec4899',
        'bg-green-500': '#22c55e',
        'bg-gray-500': '#6b7280'
    };

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: data.map(d => colorMap[d.color] || '#6b7280'),
                borderColor: '#1f2937',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#9ca3af',
                        padding: 15,
                        usePointStyle: true,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: '#374151',
                    titleColor: '#fff',
                    bodyColor: '#d1d5db',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            cutout: '60%'
        }
    });
}

/**
 * Render results pie chart
 * @param {string} canvasId 
 * @param {import('../core/services/AnalyticsService.js').ResultStats[]} data 
 */
export function renderResultsChart(canvasId, data) {
    destroyChart(canvasId);

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const colorMap = {
        'inprogress': '#6366f1',
        'offered': '#22c55e',
        'accepted': '#10b981',
        'rejected': '#ef4444',
        'declined': '#eab308',
        'ghosted': '#6b7280'
    };

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: data.map(d => colorMap[d.result] || '#6b7280'),
                borderColor: '#1f2937',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#9ca3af',
                        padding: 15,
                        usePointStyle: true,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: '#374151',
                    titleColor: '#fff',
                    bodyColor: '#d1d5db',
                    padding: 12,
                    cornerRadius: 8
                }
            }
        }
    });
}

/**
 * Render timeline line chart
 * @param {string} canvasId 
 * @param {import('../core/services/AnalyticsService.js').TimelineData[]} data 
 */
export function renderTimelineChart(canvasId, data) {
    destroyChart(canvasId);

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.week.replace(/^\d{4}-/, '')),
            datasets: [{
                label: 'Applications Added',
                data: data.map(d => d.count),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#374151',
                    titleColor: '#fff',
                    bodyColor: '#d1d5db',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(75, 85, 99, 0.3)'
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: { size: 10 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(75, 85, 99, 0.3)'
                    },
                    ticks: {
                        color: '#9ca3af',
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Render the analytics view HTML
 * @param {import('../core/services/AnalyticsService.js').AnalyticsData} analytics 
 * @returns {string}
 */
export function renderAnalyticsView(analytics) {
    return `
    <div class="fade-in space-y-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="stats-card bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-indigo-600/20 flex items-center justify-center">
              <i class="fas fa-briefcase text-indigo-400 text-xl"></i>
            </div>
            <div>
              <p class="text-gray-400 text-sm">Total Applications</p>
              <p class="text-2xl font-bold text-white">${analytics.total}</p>
            </div>
          </div>
        </div>
        
        <div class="stats-card bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
              <i class="fas fa-play-circle text-green-400 text-xl"></i>
            </div>
            <div>
              <p class="text-gray-400 text-sm">Active</p>
              <p class="text-2xl font-bold text-white">${analytics.active}</p>
            </div>
          </div>
        </div>
        
        <div class="stats-card bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-yellow-600/20 flex items-center justify-center">
              <i class="fas fa-trophy text-yellow-400 text-xl"></i>
            </div>
            <div>
              <p class="text-gray-400 text-sm">Success Rate</p>
              <p class="text-2xl font-bold text-white">${analytics.successRate}%</p>
            </div>
          </div>
        </div>
        
        <div class="stats-card bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center">
              <i class="fas fa-reply text-purple-400 text-xl"></i>
            </div>
            <div>
              <p class="text-gray-400 text-sm">Response Rate</p>
              <p class="text-2xl font-bold text-white">${analytics.responseRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid md:grid-cols-2 gap-6">
        <!-- Stage Distribution -->
        <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
            <i class="fas fa-chart-pie text-indigo-400"></i> Stage Distribution
          </h3>
          <div class="chart-container">
            <canvas id="stageDistributionChart"></canvas>
          </div>
        </div>

        <!-- Results Breakdown -->
        <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
            <i class="fas fa-chart-pie text-green-400"></i> Results Breakdown
          </h3>
          <div class="chart-container">
            <canvas id="resultsChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Timeline Chart -->
      <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
          <i class="fas fa-chart-line text-blue-400"></i> Applications Over Time (Last 12 Weeks)
        </h3>
        <div class="chart-container">
          <canvas id="timelineChart"></canvas>
        </div>
      </div>

      <!-- Stage Details Table -->
      <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
          <i class="fas fa-list text-orange-400"></i> Stage Breakdown
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-gray-400 text-left border-b border-gray-700">
              <tr>
                <th class="pb-3">Stage</th>
                <th class="pb-3 text-right">Count</th>
                <th class="pb-3 text-right">Percentage</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              ${analytics.byStage.map(s => `
                <tr>
                  <td class="py-3">
                    <div class="flex items-center gap-2">
                      <span class="w-3 h-3 rounded-full ${s.color}"></span>
                      ${s.name}
                    </div>
                  </td>
                  <td class="py-3 text-right text-white font-medium">${s.count}</td>
                  <td class="py-3 text-right text-gray-400">${analytics.total > 0 ? Math.round((s.count / analytics.total) * 100) : 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
