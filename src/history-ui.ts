// src/history-ui.ts — History Data Display Manager
import { apiClient, type HistoryResponse } from "./api-client";
import { sensors } from "./sensors";

// UI Elements
let historyModal: HTMLElement | null = null;
let historyChart: HTMLElement | null = null;
let historyCloseBtn: HTMLElement | null = null;
let historyLoading: HTMLElement | null = null;

// Data storage
let currentHistoryData: HistoryResponse | null = null;
let timeFilterSelect: HTMLSelectElement | null = null;

/**
 * Initialize history UI elements
 */
export function initializeHistoryUI(): void {
  // Create history modal
  historyModal = document.createElement('div');
  historyModal.id = 'historyModal';
  historyModal.className = 'history-modal';
  historyModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    z-index: 1000;
    display: none;
    align-items: center;
    justify-content: center;
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'history-modal-content';
  modalContent.style.cssText = `
    background: linear-gradient(180deg, rgba(15, 15, 35, 0.95) 0%, rgba(10, 10, 25, 0.98) 100%);
    border-radius: 20px;
    padding: 30px;
    max-width: 95vw;
    max-height: 95vh;
    width: 1600px;
    height: 1200px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    position: relative;
    overflow: hidden;
  `;

  // Create header
  const header = document.createElement('div');
  header.className = 'history-header';
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  `;

  const title = document.createElement('h2');
  title.textContent = 'Sensor History';
  title.style.cssText = `
    color: white;
    font-size: 24px;
    font-weight: 600;
    margin: 0;
  `;

  // Create time filter dropdown
  const timeFilterContainer = document.createElement('div');
  timeFilterContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  const timeFilterLabel = document.createElement('label');
  timeFilterLabel.textContent = 'Time Filter:';
  timeFilterLabel.style.cssText = `
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    font-weight: 500;
  `;

  timeFilterSelect = document.createElement('select');
  timeFilterSelect.id = 'timeFilterSelect';
  timeFilterSelect.style.cssText = `
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: white;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 500;
    min-width: 120px;
    cursor: pointer;
  `;

  // Add time filter options
  const timeOptions = [
    { value: '1h', text: '1 Hour' },
    { value: '6h', text: '6 Hours' },
    { value: '24h', text: '24 Hours' },
    { value: '3d', text: '3 Days' },
    { value: '1w', text: '1 Week' },
    { value: '2w', text: '2 Weeks' },
    { value: '1m', text: '1 Month' },
    { value: '3m', text: '3 Months' },
    { value: '6m', text: '6 Months' },
    { value: '12m', text: '12 Months' },
    { value: '24m', text: '24 Months' }
  ];

  timeOptions.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.text;
    if (timeFilterSelect) {
      timeFilterSelect.appendChild(optionElement);
    }
  });

  // Set default to 24 hours
  if (timeFilterSelect) {
    timeFilterSelect.value = '24h';
  }

  timeFilterContainer.appendChild(timeFilterLabel);
  timeFilterContainer.appendChild(timeFilterSelect);

  historyCloseBtn = document.createElement('button');
  historyCloseBtn.innerHTML = '✕';
  historyCloseBtn.className = 'history-close-btn';
  historyCloseBtn.style.cssText = `
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  `;

  header.appendChild(title);
  header.appendChild(timeFilterContainer);
  header.appendChild(historyCloseBtn);
  modalContent.appendChild(header);

  // Create loading indicator
  historyLoading = document.createElement('div');
  historyLoading.className = 'history-loading';
  historyLoading.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    color: white;
    font-size: 16px;
  `;
  historyLoading.innerHTML = `
    <div style="width: 40px; height: 40px; border: 3px solid rgba(255, 255, 255, 0.3); border-top: 3px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
    <div>Loading sensor history...</div>
  `;

  // Create chart container
  historyChart = document.createElement('div');
  historyChart.className = 'history-chart';
  historyChart.style.cssText = `
    width: 100%;
    height: 400px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    padding: 20px;
    display: none;
  `;

  modalContent.appendChild(historyLoading);
  modalContent.appendChild(historyChart);
  historyModal.appendChild(modalContent);
  document.body.appendChild(historyModal);

  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .history-close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
    }
    #timeFilterSelect {
      background: rgba(0, 0, 0, 0.4) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      color: white !important;
    }
    #timeFilterSelect option {
      background: #1a1a2e !important;
      color: white !important;
    }
    #timeFilterSelect:hover {
      border-color: rgba(99, 102, 241, 0.5) !important;
    }
    #timeFilterSelect:focus {
      outline: none;
      border-color: #6366f1 !important;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3) !important;
    }
  `;
  document.head.appendChild(style);

  // Event listeners
  historyCloseBtn.addEventListener('click', closeHistoryModal);
  historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) {
      closeHistoryModal();
    }
  });
  
  // Time filter change event
  timeFilterSelect.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    console.log('[History UI] Time filter changed to:', target.value);
    applyTimeFilter(target.value);
  });
}

/**
 * Calculate time range based on filter value
 */
function getTimeRange(filterValue: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;

  switch (filterValue) {
    case '1h':
      start = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '6h':
      start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      break;
    case '24h':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '3d':
      start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      break;
    case '1w':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '2w':
      start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      break;
    case '1m':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3m':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6m':
      start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case '12m':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case '24m':
      start = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
  }

  return { start, end };
}

/**
 * Filter data based on time range
 */
function filterDataByTimeRange(data: HistoryResponse, timeRange: { start: Date; end: Date }): HistoryResponse {
  const filteredData = data.data.filter(point => {
    const pointTime = new Date(point.timestamp);
    return pointTime >= timeRange.start && pointTime <= timeRange.end;
  });

  return {
    ...data,
    data: filteredData,
    total_points: filteredData.length
  };
}

/**
 * Apply time filter to current data
 */
function applyTimeFilter(filterValue: string): void {
  if (!currentHistoryData) {
    console.warn('[History UI] No current data to filter');
    return;
  }

  console.log('[History UI] Applying time filter:', filterValue);
  
  const timeRange = getTimeRange(filterValue);
  const filteredData = filterDataByTimeRange(currentHistoryData, timeRange);
  
  console.log('[History UI] Filtered data points:', filteredData.data.length, 'of', currentHistoryData.data.length);
  
  // Update chart with filtered data
  displayHistoryChart(filteredData);
}

/**
 * Show history modal and fetch data
 */
export async function showSensorHistory(): Promise<void> {
  console.log('[History UI] Show History button clicked');
  
  // Step 1: Check if connected to server
  if (!apiClient.getConnectionStatus()) {
    alert('❌ Please connect to the server first!\n\nGo to Connection tab and click Connect.');
    console.log('[History UI] Server not connected');
    return;
  }
  console.log('[History UI] ✅ Server connection verified');

  // Step 2: Check if a sensor is selected
  const selectedId = (window as any).selectedId as string | null;
  if (!selectedId) {
    alert('❌ Please select a sensor first!\n\nClick on a sensor in the 3D scene to select it.');
    console.log('[History UI] No sensor selected');
    return;
  }
  console.log('[History UI] ✅ Sensor selected:', selectedId);

  const sensor = sensors.get(selectedId);
  if (!sensor) {
    alert('❌ Selected sensor not found!\n\nPlease select a valid sensor.');
    console.log('[History UI] Selected sensor not found');
    return;
  }
  console.log('[History UI] ✅ Sensor found:', sensor.type, sensor.deviceId);

  // Show modal with loading
  if (historyModal) {
    historyModal.style.display = 'flex';
    historyLoading!.style.display = 'flex';
    historyChart!.style.display = 'none';
    
    // Update loading message
    const loadingText = historyLoading!.querySelector('div:last-child');
    if (loadingText) {
      loadingText.textContent = `Loading ${sensor.type} history for ${sensor.deviceId}...`;
    }
  }

  try {
    console.log('[History UI] Step 3: Sending request to API endpoint');
    
    // Step 3: Send request to API endpoint
    const historyData = await apiClient.fetchHistoryData(sensor.type, sensor.deviceId);
    
    if (!historyData || !historyData.success) {
      throw new Error('API returned success: false');
    }

    console.log('[History UI] ✅ API request successful, received', historyData.data?.length || 0, 'data points');
    
    // Store current data for filtering
    currentHistoryData = historyData;
    
    // Step 4: Display result in chart (with current filter)
    const currentFilter = timeFilterSelect?.value || '24h';
    const timeRange = getTimeRange(currentFilter);
    const filteredData = filterDataByTimeRange(historyData, timeRange);
    displayHistoryChart(filteredData);
    
  } catch (error) {
    console.error('[History UI] Error fetching history:', error);
    showHistoryError(error instanceof Error ? error.message : 'Failed to load history data');
  }
}

/**
 * Display history chart
 */
function displayHistoryChart(historyData: HistoryResponse): void {
  if (!historyChart) return;

  historyLoading!.style.display = 'none';
  historyChart!.style.display = 'block';

  // Create chart content
  const chartContent = document.createElement('div');
  chartContent.style.cssText = `
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  `;

  // Chart info
  const info = document.createElement('div');
  info.style.cssText = `
    color: white;
    margin-bottom: 20px;
    padding: 15px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
  `;
  // Calculate range info for display
  let rangeInfo = '';
  if (historyData.data.length > 0) {
    const values = historyData.data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    rangeInfo = ` • Range: ${minValue.toFixed(1)} - ${maxValue.toFixed(1)} • Avg: ${avgValue.toFixed(1)}`;
  }

  info.innerHTML = `
    <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">
      ${historyData.sensor_type.toUpperCase()} - ${historyData.device_id}
    </div>
    <div style="font-size: 14px; color: rgba(255, 255, 255, 0.7);">
      ${historyData.data.length} data points${rangeInfo}
      ${historyData.time_range ? ` • ${new Date(historyData.time_range.start).toLocaleString()} - ${new Date(historyData.time_range.end).toLocaleString()}` : ''}
    </div>
  `;

  // Simple chart visualization
  const chart = document.createElement('div');
  chart.style.cssText = `
    flex: 1;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    min-height: 800px;
    height: 1000px;
  `;

  if (historyData.data.length > 0) {
    // Calculate chart dimensions (much larger)
    const padding = 100;
    const width = 1800;
    const height = 900;

    // Create SVG chart
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.cssText = `
      background: rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      cursor: crosshair;
    `;
    
    // Find min/max values with smart range calculation
    const values = historyData.data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    // Calculate smart range with padding
    const valueRange = maxValue - minValue;
    const paddingPercent = valueRange > 0 ? 0.1 : 0.2; // 10% padding if range > 0, 20% if range = 0
    const rangePadding = Math.max(valueRange * paddingPercent, Math.abs(minValue) * 0.1, 1);
    
    const smartMinValue = minValue - rangePadding;
    const smartMaxValue = maxValue + rangePadding;
    const smartValueRange = smartMaxValue - smartMinValue;
    
    // Create line path using smart range
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const points = historyData.data.map((point, index) => {
      const x = padding + (index / (historyData.data.length - 1)) * (width - 2 * padding);
      const y = padding + (1 - (point.value - smartMinValue) / smartValueRange) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' L');
    
    path.setAttribute('d', `M ${points}`);
    path.setAttribute('stroke', '#6366f1');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    
    svg.appendChild(path);
    
    // Create tooltip
    const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    tooltip.setAttribute('id', 'tooltip');
    tooltip.style.cssText = `
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    `;
    
    // Tooltip background
    const tooltipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    tooltipRect.setAttribute('rx', '6');
    tooltipRect.setAttribute('ry', '6');
    tooltipRect.setAttribute('fill', 'rgba(0, 0, 0, 0.8)');
    tooltipRect.setAttribute('stroke', 'rgba(255, 255, 255, 0.3)');
    tooltipRect.setAttribute('stroke-width', '1');
    tooltip.appendChild(tooltipRect);
    
    // Tooltip text
    const tooltipText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tooltipText.setAttribute('fill', 'white');
    tooltipText.setAttribute('font-size', '16');
    tooltipText.setAttribute('font-family', 'monospace');
    tooltipText.setAttribute('text-anchor', 'middle');
    tooltip.appendChild(tooltipText);
    
    svg.appendChild(tooltip);
    
    // Add interactive points
    historyData.data.forEach((point, index) => {
      const x = padding + (index / (historyData.data.length - 1)) * (width - 2 * padding);
      const y = padding + (1 - (point.value - smartMinValue) / smartValueRange) * (height - 2 * padding);
      
      // Invisible circle for hover detection (much larger)
      const hoverCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      hoverCircle.setAttribute('cx', x.toString());
      hoverCircle.setAttribute('cy', y.toString());
      hoverCircle.setAttribute('r', '20');
      hoverCircle.setAttribute('fill', 'transparent');
      hoverCircle.setAttribute('stroke', 'none');
      hoverCircle.style.cssText = `
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      
      // Visible point (larger)
      const pointCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pointCircle.setAttribute('cx', x.toString());
      pointCircle.setAttribute('cy', y.toString());
      pointCircle.setAttribute('r', '5');
      pointCircle.setAttribute('fill', '#6366f1');
      pointCircle.setAttribute('stroke', 'white');
      pointCircle.setAttribute('stroke-width', '2');
      pointCircle.style.cssText = `
        opacity: 0;
        transition: all 0.2s ease;
      `;
      
      // Hover events
      hoverCircle.addEventListener('mouseenter', () => {
        pointCircle.style.opacity = '1';
        pointCircle.setAttribute('r', '8');
        pointCircle.setAttribute('fill', '#8b5cf6');
        pointCircle.setAttribute('stroke', '#ffffff');
        pointCircle.setAttribute('stroke-width', '3');
        
        // Show tooltip
        const timestamp = new Date(point.timestamp).toLocaleString();
        tooltipText.textContent = `${point.value.toFixed(2)}${point.unit || ''} • ${timestamp}`;
        
        // Position tooltip
        const textBBox = tooltipText.getBBox();
        const tooltipX = x;
        const tooltipY = y - 30;
        
        tooltipRect.setAttribute('x', (tooltipX - textBBox.width/2 - 12).toString());
        tooltipRect.setAttribute('y', (tooltipY - textBBox.height - 12).toString());
        tooltipRect.setAttribute('width', (textBBox.width + 24).toString());
        tooltipRect.setAttribute('height', (textBBox.height + 16).toString());
        
        tooltipText.setAttribute('x', tooltipX.toString());
        tooltipText.setAttribute('y', tooltipY.toString());
        
        tooltip.style.opacity = '1';
      });
      
      hoverCircle.addEventListener('mouseleave', () => {
        pointCircle.style.opacity = '0';
        pointCircle.setAttribute('r', '5');
        pointCircle.setAttribute('fill', '#6366f1');
        pointCircle.setAttribute('stroke', 'white');
        pointCircle.setAttribute('stroke-width', '2');
        tooltip.style.opacity = '0';
      });
      
      svg.appendChild(hoverCircle);
      svg.appendChild(pointCircle);
    });
    
    // Add grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * (height - 2 * padding);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', padding.toString());
      line.setAttribute('x2', (width - padding).toString());
      line.setAttribute('y1', y.toString());
      line.setAttribute('y2', y.toString());
      line.setAttribute('stroke', 'rgba(255, 255, 255, 0.1)');
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }
    
    // Add value labels using smart range
    for (let i = 0; i <= 5; i++) {
      const value = smartMinValue + (i / 5) * smartValueRange;
      const y = padding + (i / 5) * (height - 2 * padding);
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '10');
      text.setAttribute('y', y.toString());
      text.setAttribute('fill', 'rgba(255, 255, 255, 0.6)');
      text.setAttribute('font-size', '20');
      text.setAttribute('font-family', 'monospace');
      text.textContent = value.toFixed(1);
      svg.appendChild(text);
    }
    
    chart.appendChild(svg);
  } else {
    // No data message
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.cssText = `
      background: rgba(0, 0, 0, 0.1);
      border-radius: 8px;
    `;
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '50%');
    text.setAttribute('y', '50%');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'rgba(255, 255, 255, 0.5)');
    text.setAttribute('font-size', '16');
    text.textContent = 'No historical data available';
    svg.appendChild(text);
    
    chart.appendChild(svg);
  }
  chartContent.appendChild(info);
  chartContent.appendChild(chart);
  
  historyChart!.innerHTML = '';
  historyChart!.appendChild(chartContent);
}

/**
 * Show error message
 */
function showHistoryError(message: string): void {
  if (!historyChart) return;

  historyLoading!.style.display = 'none';
  historyChart!.style.display = 'block';

  historyChart!.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: white;">
      <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">Error Loading History</div>
      <div style="font-size: 14px; color: rgba(255, 255, 255, 0.7); text-align: center;">${message}</div>
    </div>
  `;
}

/**
 * Close history modal
 */
function closeHistoryModal(): void {
  if (historyModal) {
    historyModal.style.display = 'none';
  }
}

// Export for global access
(window as any).showSensorHistory = showSensorHistory;
