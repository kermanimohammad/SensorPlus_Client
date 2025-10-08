// src/chart-manager.ts — Chart Management for Historical Data Visualization
import { databaseClient, type HistoricalDataPoint, type LightDataPoint, type SolarDataPoint } from "./database-client";
import type { SensorType } from "./types";

// Chart configuration
interface ChartConfig {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  colors: {
    temperature: string;
    humidity: string;
    co2: string;
    light: string;
    solar: string;
  };
}

// Default chart configuration
const DEFAULT_CONFIG: ChartConfig = {
  width: 800,
  height: 400,
  margin: { top: 20, right: 30, bottom: 40, left: 40 },
  colors: {
    temperature: '#ff5a5f',
    humidity: '#00b894',
    co2: '#3a86ff',
    light: '#ffd6a5',
    solar: '#ffd166'
  }
};

export class ChartManager {
  private chartContainer: HTMLElement | null = null;
  private config: ChartConfig;

  constructor(config: Partial<ChartConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create chart container in the UI
   */
  createChartContainer(): HTMLElement {
    // Remove existing chart container if it exists
    this.destroyChart();

    // Create new chart container
    const container = document.createElement('div');
    container.id = 'historical-chart-container';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${this.config.width + 100}px;
      height: ${this.config.height + 100}px;
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid #333;
      border-radius: 10px;
      padding: 20px;
      z-index: 1000;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    const title = document.createElement('h3');
    title.id = 'chart-title';
    title.textContent = 'Historical Data';
    title.style.margin = '0';
    title.style.fontSize = '18px';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: #ff4444;
      color: white;
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeBtn.onclick = () => this.destroyChart();

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create controls
    const controls = document.createElement('div');
    controls.style.cssText = `
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      align-items: center;
    `;

    const timeRangeSelect = document.createElement('select');
    timeRangeSelect.id = 'time-range-select';
    timeRangeSelect.style.cssText = `
      padding: 5px 10px;
      border-radius: 5px;
      border: 1px solid #555;
      background: #333;
      color: white;
    `;
    timeRangeSelect.innerHTML = `
      <option value="1">Last 1 hour</option>
      <option value="6">Last 6 hours</option>
      <option value="24" selected>Last 24 hours</option>
      <option value="72">Last 3 days</option>
      <option value="168">Last week</option>
    `;

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh';
    refreshBtn.style.cssText = `
      padding: 5px 15px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    `;

    controls.appendChild(document.createTextNode('Time Range:'));
    controls.appendChild(timeRangeSelect);
    controls.appendChild(refreshBtn);

    // Create chart area
    const chartArea = document.createElement('div');
    chartArea.id = 'chart-area';
    chartArea.style.cssText = `
      flex: 1;
      background: #1a1a1a;
      border-radius: 5px;
      position: relative;
      overflow: hidden;
    `;

    // Create loading indicator
    const loading = document.createElement('div');
    loading.id = 'chart-loading';
    loading.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 16px;
      display: none;
    `;
    loading.textContent = 'Loading data...';

    chartArea.appendChild(loading);

    // Assemble container
    container.appendChild(header);
    container.appendChild(controls);
    container.appendChild(chartArea);

    // Add to document
    document.body.appendChild(container);
    this.chartContainer = container;

    // Add event listeners
    refreshBtn.onclick = () => this.refreshChart();
    timeRangeSelect.onchange = () => this.refreshChart();

    return container;
  }

  /**
   * Show historical data chart for a sensor
   */
  async showSensorHistory(
    deviceId: string,
    sensorType: SensorType,
    hours: number = 24
  ): Promise<void> {
    try {
      // Create chart container if it doesn't exist
      if (!this.chartContainer) {
        this.createChartContainer();
      }

      // Update title
      const title = document.getElementById('chart-title');
      if (title) {
        title.textContent = `${sensorType.toUpperCase()} - ${deviceId}`;
      }

      // Show loading
      this.showLoading(true);

      // Fetch data from database
      const data = await databaseClient.getSensorHistory(deviceId, sensorType, hours);

      // Hide loading
      this.showLoading(false);

      // Render chart based on sensor type
      if (sensorType === 'light') {
        await this.renderLightChart(data as LightDataPoint[], deviceId);
      } else if (sensorType === 'solar') {
        await this.renderSolarChart(data as SolarDataPoint[], deviceId);
      } else {
        await this.renderValueChart(data as HistoricalDataPoint[], deviceId, sensorType);
      }

    } catch (error) {
      console.error('[Chart] Error showing sensor history:', error);
      this.showError(error instanceof Error ? error.message : 'Failed to load data');
    }
  }

  /**
   * Render chart for value-based sensors (temperature, humidity, CO2)
   */
  private async renderValueChart(
    data: HistoricalDataPoint[],
    _deviceId: string,
    sensorType: SensorType
  ): Promise<void> {
    // Simple SVG-based chart implementation
    const chartArea = document.getElementById('chart-area');
    if (!chartArea) return;

    // Clear existing chart
    chartArea.innerHTML = '';

    if (data.length === 0) {
      chartArea.innerHTML = '<div style="color: white; text-align: center; margin-top: 50px;">No data available</div>';
      return;
    }

    // Calculate dimensions
    const width = this.config.width;
    const height = this.config.height;
    const margin = this.config.margin;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.style.background = '#1a1a1a';

    // Create scales
    const xScale = (d: Date) => {
      const timeRange = data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime();
      const x = (d.getTime() - data[0].timestamp.getTime()) / timeRange;
      return margin.left + x * innerWidth;
    };

    const yScale = (value: number) => {
      // Use fixed range for different sensor types
      let min, max;
      if (sensorType === 'temperature') {
        min = -10;
        max = 60;
      } else if (sensorType === 'humidity') {
        min = 0;
        max = 100;
      } else if (sensorType === 'co2') {
        min = 100;
        max = 800;
      } else if (sensorType === 'solar') {
        min = 50;
        max = 250;
      } else {
        min = Math.min(...data.map(d => d.value));
        max = Math.max(...data.map(d => d.value));
        // Add some padding
        const padding = (max - min) * 0.1;
        min -= padding;
        max += padding;
      }
      const range = max - min || 1;
      const y = (value - min) / range;
      return margin.top + (1 - y) * innerHeight;
    };

    // Create line path connecting all points
    let pathData = '';
    if (data.length > 0) {
      const firstPoint = data[0];
      pathData = `M ${xScale(firstPoint.timestamp)} ${yScale(firstPoint.value)}`;
      
      for (let i = 1; i < data.length; i++) {
        const currentPoint = data[i];
        const x = xScale(currentPoint.timestamp);
        const y = yScale(currentPoint.value);
        pathData += ` L ${x} ${y}`;
      }
    }

    // Add gradient fill under the line (first)
    this.addGradientFill(svg, pathData, margin, innerWidth, innerHeight, sensorType);

    // Draw the main line (second)
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', this.config.colors[sensorType]);
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);

    // Add axes (third)
    this.addAxes(svg, data, xScale, yScale, margin, innerWidth, innerHeight, sensorType);

    // Create tooltip element
    const tooltip = this.createTooltip();

    // Draw data points with better styling (on top)
    data.forEach((point) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const x = xScale(point.timestamp);
      const y = yScale(point.value);
      
      circle.setAttribute('cx', x.toString());
      circle.setAttribute('cy', y.toString());
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', this.config.colors[sensorType]);
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '2');
      
      // Add hover effect
      circle.style.cursor = 'pointer';
      
      // Add hover event listeners with custom tooltip
      circle.addEventListener('mouseenter', () => {
        circle.setAttribute('r', '6');
        circle.setAttribute('stroke-width', '3');
        
        // Show custom tooltip
        const value = point.value.toFixed(1);
        const unit = this.getUnitForSensorType(sensorType);
        const time = point.timestamp.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        tooltip.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 4px;">${sensorType.toUpperCase()}</div>
          <div>Value: <span style="color: ${this.config.colors[sensorType]}">${value} ${unit}</span></div>
          <div>Time: ${time}</div>
          <div>Device: ${point.device_id}</div>
        `;
        
        tooltip.style.display = 'block';
        
        // Position tooltip
        const rect = svg.getBoundingClientRect();
        const tooltipX = rect.left + x + 10;
        const tooltipY = rect.top + y - 10;
        
        tooltip.style.left = tooltipX + 'px';
        tooltip.style.top = tooltipY + 'px';
      });
      
      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('r', '4');
        circle.setAttribute('stroke-width', '2');
        tooltip.style.display = 'none';
      });
      
      svg.appendChild(circle);
    });

    chartArea.appendChild(svg);
  }

  /**
   * Render chart for light sensor
   */
  private async renderLightChart(data: LightDataPoint[], _deviceId: string): Promise<void> {
    const chartArea = document.getElementById('chart-area');
    if (!chartArea) return;

    // Clear existing chart
    chartArea.innerHTML = '';

    if (data.length === 0) {
      chartArea.innerHTML = '<div style="color: white; text-align: center; margin-top: 50px;">No data available</div>';
      return;
    }

    // Calculate dimensions
    const width = this.config.width;
    const height = this.config.height;
    const margin = this.config.margin;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.style.background = '#1a1a1a';

    // Create scales
    const xScale = (d: Date) => {
      const timeRange = data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime();
      const x = (d.getTime() - data[0].timestamp.getTime()) / timeRange;
      return margin.left + x * innerWidth;
    };

    const yScale = (value: number) => {
      const min = 0;
      const max = 120; // Max power for light sensors
      const range = max - min;
      const y = (value - min) / range;
      return margin.top + (1 - y) * innerHeight;
    };

    // Draw power consumption line
    const powerData = data.filter(d => d.is_on);
    if (powerData.length > 0) {
      let pathData = '';
      const firstPoint = powerData[0];
      pathData = `M ${xScale(firstPoint.timestamp)} ${yScale(firstPoint.power_watts)}`;
      
      for (let i = 1; i < powerData.length; i++) {
        const currentPoint = powerData[i];
        const x = xScale(currentPoint.timestamp);
        const y = yScale(currentPoint.power_watts);
        pathData += ` L ${x} ${y}`;
      }

      // Draw power line
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('stroke', this.config.colors.light);
      path.setAttribute('stroke-width', '3');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(path);
    }

    // Draw on/off status as bars
    data.forEach((point) => {
      const x = xScale(point.timestamp);
      const barHeight = point.is_on ? 20 : 5;
      const barY = margin.top + innerHeight - barHeight;
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (x - 2).toString());
      rect.setAttribute('y', barY.toString());
      rect.setAttribute('width', '4');
      rect.setAttribute('height', barHeight.toString());
      rect.setAttribute('fill', point.is_on ? '#4CAF50' : '#f44336');
      rect.setAttribute('opacity', '0.7');
      svg.appendChild(rect);
    });

    // Add axes and labels
    this.addAxes(svg, data.map(d => ({ timestamp: d.timestamp, value: d.power_watts, device_id: d.device_id, room_id: d.room_id })), xScale, yScale, margin, innerWidth, innerHeight, 'light');

    chartArea.appendChild(svg);
  }

  /**
   * Render chart for solar sensor
   */
  private async renderSolarChart(data: SolarDataPoint[], _deviceId: string): Promise<void> {
    const chartArea = document.getElementById('chart-area');
    if (!chartArea) return;

    // Clear existing chart
    chartArea.innerHTML = '';

    if (data.length === 0) {
      chartArea.innerHTML = '<div style="color: white; text-align: center; margin-top: 50px;">No data available</div>';
      return;
    }

    // Calculate dimensions
    const width = this.config.width;
    const height = this.config.height;
    const margin = this.config.margin;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.style.background = '#1a1a1a';

    // Create scales
    const xScale = (d: Date) => {
      const timeRange = data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime();
      const x = (d.getTime() - data[0].timestamp.getTime()) / timeRange;
      return margin.left + x * innerWidth;
    };

    const yScale = (value: number) => {
      const min = 50;
      const max = 250; // Max power generation for solar panels
      const range = max - min;
      const y = (value - min) / range;
      return margin.top + (1 - y) * innerHeight;
    };

    // Create line path connecting all points
    let pathData = '';
    if (data.length > 0) {
      const firstPoint = data[0];
      pathData = `M ${xScale(firstPoint.timestamp)} ${yScale(firstPoint.power_watts)}`;
      
      for (let i = 1; i < data.length; i++) {
        const currentPoint = data[i];
        const x = xScale(currentPoint.timestamp);
        const y = yScale(currentPoint.power_watts);
        pathData += ` L ${x} ${y}`;
      }
    }

    // Add gradient fill under the line (first)
    this.addGradientFill(svg, pathData, margin, innerWidth, innerHeight, 'solar');

    // Draw the main line
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', this.config.colors.solar);
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);

    // Add axes and labels
    this.addAxes(svg, data.map(d => ({ timestamp: d.timestamp, value: d.power_watts, device_id: d.device_id })), xScale, yScale, margin, innerWidth, innerHeight, 'solar');

    // Draw data points with better styling (on top)
    data.forEach((point) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const x = xScale(point.timestamp);
      const y = yScale(point.power_watts);
      
      circle.setAttribute('cx', x.toString());
      circle.setAttribute('cy', y.toString());
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', this.config.colors.solar);
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '2');
      
      // Add hover effect
      circle.style.cursor = 'pointer';
      
      // Add hover event listeners with custom tooltip
      circle.addEventListener('mouseenter', () => {
        circle.setAttribute('r', '6');
        circle.setAttribute('stroke-width', '3');
        
        // Show custom tooltip
        const value = point.power_watts.toFixed(1);
        const time = point.timestamp.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const tooltip = document.getElementById('chart-tooltip') || this.createTooltip();
        tooltip.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 4px;">SOLAR</div>
          <div>Power: <span style="color: ${this.config.colors.solar}">${value} W</span></div>
          <div>Time: ${time}</div>
          <div>Device: ${point.device_id}</div>
        `;
        
        tooltip.style.display = 'block';
        
        // Position tooltip
        const rect = svg.getBoundingClientRect();
        const tooltipX = rect.left + x + 10;
        const tooltipY = rect.top + y - 10;
        
        tooltip.style.left = tooltipX + 'px';
        tooltip.style.top = tooltipY + 'px';
      });
      
      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('r', '4');
        circle.setAttribute('stroke-width', '2');
        const tooltip = document.getElementById('chart-tooltip');
        if (tooltip) tooltip.style.display = 'none';
      });
      
      svg.appendChild(circle);
    });

    chartArea.appendChild(svg);
  }

  /**
   * Create tooltip element
   */
  private createTooltip(): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.id = 'chart-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-family: Arial, sans-serif;
      pointer-events: none;
      z-index: 1000;
      display: none;
      border: 1px solid #555;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    document.body.appendChild(tooltip);
    return tooltip;
  }

  /**
   * Add axes to the chart
   */
  private addAxes(
    svg: SVGElement,
    data: HistoricalDataPoint[],
    xScale: (d: Date) => number,
    yScale: (value: number) => number,
    margin: any,
    innerWidth: number,
    innerHeight: number,
    sensorType: SensorType
  ): void {
    // X-axis (time) - horizontal line at bottom
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', margin.left.toString());
    xAxis.setAttribute('y1', (margin.top + innerHeight).toString());
    xAxis.setAttribute('x2', (margin.left + innerWidth).toString());
    xAxis.setAttribute('y2', (margin.top + innerHeight).toString());
    xAxis.setAttribute('stroke', 'white');
    xAxis.setAttribute('stroke-width', '2');
    svg.appendChild(xAxis);

    // Y-axis (value) - vertical line at left
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', margin.left.toString());
    yAxis.setAttribute('y1', margin.top.toString());
    yAxis.setAttribute('x2', margin.left.toString());
    yAxis.setAttribute('y2', (margin.top + innerHeight).toString());
    yAxis.setAttribute('stroke', 'white');
    yAxis.setAttribute('stroke-width', '2');
    svg.appendChild(yAxis);

    // Add grid lines for better readability
    this.addGridLines(svg, data, xScale, yScale, margin, innerWidth, innerHeight, sensorType);

    // Add axis labels
    const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xLabel.setAttribute('x', (margin.left + innerWidth / 2).toString());
    xLabel.setAttribute('y', (margin.top + innerHeight + 25).toString());
    xLabel.setAttribute('text-anchor', 'middle');
    xLabel.setAttribute('fill', 'white');
    xLabel.setAttribute('font-size', '12');
    xLabel.setAttribute('font-family', 'Arial, sans-serif');
    xLabel.textContent = 'Time';
    svg.appendChild(xLabel);

    const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yLabel.setAttribute('x', '15');
    yLabel.setAttribute('y', (margin.top + innerHeight / 2).toString());
    yLabel.setAttribute('text-anchor', 'middle');
    yLabel.setAttribute('fill', 'white');
    yLabel.setAttribute('font-size', '12');
    yLabel.setAttribute('font-family', 'Arial, sans-serif');
    yLabel.setAttribute('transform', `rotate(-90, 15, ${margin.top + innerHeight / 2})`);
    yLabel.textContent = this.getUnitForSensorType(sensorType);
    svg.appendChild(yLabel);

    // Add value labels on Y-axis
    this.addYAxisLabels(svg, data, yScale, margin, innerHeight, sensorType);

    // Add time labels on X-axis
    this.addXAxisLabels(svg, data, xScale, margin, innerHeight, sensorType);
  }

  /**
   * Add grid lines to the chart
   */
  private addGridLines(
    svg: SVGElement,
    data: HistoricalDataPoint[],
    xScale: (d: Date) => number,
    yScale: (value: number) => number,
    margin: any,
    innerWidth: number,
    innerHeight: number,
    sensorType: SensorType
  ): void {
    if (data.length === 0) return;

    // Use fixed range for different sensor types
    let min, max;
    if (sensorType === 'temperature') {
      min = -10;
      max = 60;
    } else if (sensorType === 'humidity') {
      min = 0;
      max = 100;
    } else if (sensorType === 'co2') {
      min = 100;
      max = 800;
      } else if (sensorType === 'solar') {
        min = 50;
        max = 250;
    } else {
      min = Math.min(...data.map(d => d.value));
      max = Math.max(...data.map(d => d.value));
      // Add some padding
      const padding = (max - min) * 0.1;
      min -= padding;
      max += padding;
    }
    const range = max - min || 1;

    // Horizontal grid lines (for Y values)
    const numGridLines = 7; // More grid lines for better readability
    for (let i = 0; i <= numGridLines; i++) {
      const value = min + (range * i / numGridLines);
      const y = yScale(value);
      
      const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      gridLine.setAttribute('x1', margin.left.toString());
      gridLine.setAttribute('y1', y.toString());
      gridLine.setAttribute('x2', (margin.left + innerWidth).toString());
      gridLine.setAttribute('y2', y.toString());
      gridLine.setAttribute('stroke', '#444');
      gridLine.setAttribute('stroke-width', '1');
      gridLine.setAttribute('stroke-dasharray', '2,2');
      svg.appendChild(gridLine);
    }

    // Vertical grid lines (for X values) - show every 6th point
    const step = Math.max(1, Math.floor(data.length / 10));
    for (let i = 0; i < data.length; i += step) {
      const x = xScale(data[i].timestamp);
      
      const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      gridLine.setAttribute('x1', x.toString());
      gridLine.setAttribute('y1', margin.top.toString());
      gridLine.setAttribute('x2', x.toString());
      gridLine.setAttribute('y2', (margin.top + innerHeight).toString());
      gridLine.setAttribute('stroke', '#444');
      gridLine.setAttribute('stroke-width', '1');
      gridLine.setAttribute('stroke-dasharray', '2,2');
      svg.appendChild(gridLine);
    }
  }

  /**
   * Add Y-axis value labels
   */
  private addYAxisLabels(
    svg: SVGElement,
    data: HistoricalDataPoint[],
    yScale: (value: number) => number,
    margin: any,
    _innerHeight: number,
    sensorType: SensorType
  ): void {
    if (data.length === 0) return;

    // Use fixed range for different sensor types
    let min, max;
    if (sensorType === 'temperature') {
      min = -10;
      max = 60;
    } else if (sensorType === 'humidity') {
      min = 0;
      max = 100;
    } else if (sensorType === 'co2') {
      min = 100;
      max = 800;
      } else if (sensorType === 'solar') {
        min = 50;
        max = 250;
    } else {
      min = Math.min(...data.map(d => d.value));
      max = Math.max(...data.map(d => d.value));
      // Add some padding
      const padding = (max - min) * 0.1;
      min -= padding;
      max += padding;
    }
    const range = max - min || 1;

    const numLabels = 7; // More labels for better readability
    for (let i = 0; i <= numLabels; i++) {
      const value = min + (range * i / numLabels);
      const y = yScale(value);
      
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', (margin.left - 10).toString());
      label.setAttribute('y', (y + 4).toString());
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('fill', '#ccc');
      label.setAttribute('font-size', '10');
      label.setAttribute('font-family', 'Arial, sans-serif');
      label.textContent = value.toFixed(0); // No decimal places for cleaner look
      svg.appendChild(label);
    }
  }

  /**
   * Add X-axis time labels
   */
  private addXAxisLabels(
    svg: SVGElement,
    data: HistoricalDataPoint[],
    xScale: (d: Date) => number,
    margin: any,
    innerHeight: number,
    _sensorType: SensorType
  ): void {
    if (data.length === 0) return;

    // Show time labels at regular intervals
    const numLabels = 6;
    const step = Math.max(1, Math.floor(data.length / numLabels));
    
    for (let i = 0; i < data.length; i += step) {
      const point = data[i];
      const x = xScale(point.timestamp);
      
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x.toString());
      label.setAttribute('y', (margin.top + innerHeight + 15).toString());
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#ccc');
      label.setAttribute('font-size', '10');
      label.setAttribute('font-family', 'Arial, sans-serif');
      
      // Format time based on data range
      const timeStr = this.formatTimeLabel(point.timestamp, data);
      label.textContent = timeStr;
      svg.appendChild(label);
    }
  }

  /**
   * Format time label based on data range
   */
  private formatTimeLabel(timestamp: Date, data: HistoricalDataPoint[]): string {
    if (data.length === 0) return '';
    
    const timeRange = data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime();
    const hours = timeRange / (1000 * 60 * 60);
    
    if (hours <= 24) {
      // Show hours and minutes for short ranges
      return timestamp.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (hours <= 168) { // 7 days
      // Show month and day for medium ranges
      return timestamp.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } else {
      // Show full date for long ranges
      return timestamp.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit'
      });
    }
  }

  /**
   * Add gradient fill under the line
   */
  private addGradientFill(
    svg: SVGElement,
    pathData: string,
    margin: any,
    innerWidth: number,
    innerHeight: number,
    sensorType: SensorType
  ): void {
    // Create gradient definition
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', `gradient-${sensorType}`);
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', this.config.colors[sensorType]);
    stop1.setAttribute('stop-opacity', '0.3');

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', this.config.colors[sensorType]);
    stop2.setAttribute('stop-opacity', '0.05');

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Create filled area path - close the path to create a filled area
    const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const rightEdge = margin.left + innerWidth;
    const bottomEdge = margin.top + innerHeight;
    const fillPathData = pathData + ` L ${rightEdge} ${bottomEdge} L ${margin.left} ${bottomEdge} Z`;
    fillPath.setAttribute('d', fillPathData);
    fillPath.setAttribute('fill', `url(#gradient-${sensorType})`);
    fillPath.setAttribute('stroke', 'none');

    // Add fill path to SVG
    svg.appendChild(fillPath);
  }

  /**
   * Get unit for sensor type
   */
  private getUnitForSensorType(sensorType: SensorType): string {
    switch (sensorType) {
      case 'temperature': return '°C';
      case 'humidity': return '%';
      case 'co2': return 'ppm';
      case 'light': return 'W';
      case 'solar': return 'W';
      default: return '';
    }
  }

  /**
   * Show loading indicator
   */
  private showLoading(show: boolean): void {
    const loading = document.getElementById('chart-loading');
    if (loading) {
      loading.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const chartArea = document.getElementById('chart-area');
    if (chartArea) {
      chartArea.innerHTML = `<div style="color: #ff4444; text-align: center; margin-top: 50px;">Error: ${message}</div>`;
    }
  }

  /**
   * Refresh current chart
   */
  private async refreshChart(): Promise<void> {
    const timeRangeSelect = document.getElementById('time-range-select') as HTMLSelectElement;
    const hours = parseInt(timeRangeSelect?.value || '24');
    
    // Get current sensor info from title
    const title = document.getElementById('chart-title');
    if (title && title.textContent) {
      const parts = title.textContent.split(' - ');
      if (parts.length === 2) {
        const sensorType = parts[0].toLowerCase() as SensorType;
        const deviceId = parts[1];
        await this.showSensorHistory(deviceId, sensorType, hours);
      }
    }
  }

  /**
   * Destroy chart and remove container
   */
  destroyChart(): void {
    // Remove tooltip if it exists
    const tooltip = document.getElementById('chart-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
    
    if (this.chartContainer) {
      this.chartContainer.remove();
      this.chartContainer = null;
    }
  }
}

// Global chart manager instance
export const chartManager = new ChartManager();

// Export for global access
(window as any).chartManager = chartManager;
