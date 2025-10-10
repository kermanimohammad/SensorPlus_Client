// src/sensor-history-ui.ts — UI Integration for Sensor Historical Data
import { chartManager } from "./chart-manager";
import { databaseClient } from "./database-client";
import { sensors } from "./sensors";
import type { SensorType } from "./types";

export class SensorHistoryUI {
  private isInitialized: boolean = false;

  /**
   * Initialize the sensor history UI
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Add history button to scene properties panel
    this.addHistoryButton();
    
    // Add database connection status indicator
    this.addDatabaseStatusIndicator();
    
    // Initialize database connection
    this.initializeDatabase();

    this.isInitialized = true;
    console.log('[SensorHistoryUI] Initialized');
  }

  /**
   * Add history button to scene properties panel
   */
  private addHistoryButton(): void {
    const propertiesGroup = document.getElementById('propertiesGroup');
    if (!propertiesGroup) {
      console.warn('[SensorHistoryUI] Properties group not found');
      return;
    }

    // Check if button already exists
    if (document.getElementById('btnShowHistory')) return;

    // Create history button
    const historyBtn = document.createElement('button');
    historyBtn.id = 'btnShowHistory';
    historyBtn.textContent = '📊 Show History';
    historyBtn.style.cssText = `
      width: 100%;
      padding: 10px;
      margin-top: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;
    `;

    // Add hover effects
    historyBtn.addEventListener('mouseenter', () => {
      historyBtn.style.transform = 'translateY(-2px)';
      historyBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
    });

    historyBtn.addEventListener('mouseleave', () => {
      historyBtn.style.transform = 'translateY(0)';
      historyBtn.style.boxShadow = 'none';
    });

    // Add click handler
    historyBtn.addEventListener('click', () => {
      this.showSensorHistory();
    });

    // Insert after the bind button
    const bindBtn = document.getElementById('scene_btnBind');
    if (bindBtn && bindBtn.parentNode) {
      bindBtn.parentNode.insertBefore(historyBtn, bindBtn.nextSibling);
    } else {
      propertiesGroup.appendChild(historyBtn);
    }
  }

  /**
   * Add database connection status indicator
   */
  private addDatabaseStatusIndicator(): void {
    const apiPanel = document.querySelector('.api-panel');
    if (!apiPanel) {
      console.warn('[SensorHistoryUI] API panel not found');
      return;
    }

    // Check if indicator already exists
    if (document.getElementById('db-status-indicator')) return;

    // Create database status indicator
    const dbStatusDiv = document.createElement('div');
    dbStatusDiv.id = 'db-status-indicator';
    dbStatusDiv.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 5px;
      margin-top: 10px;
      font-size: 12px;
      color: #ccc;
    `;

    const statusIcon = document.createElement('div');
    statusIcon.id = 'db-status-icon';
    statusIcon.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #666;
      transition: background-color 0.3s ease;
    `;

    const statusText = document.createElement('span');
    statusText.id = 'db-status-text';
    statusText.textContent = 'Database: Checking...';

    const connectBtn = document.createElement('button');
    connectBtn.id = 'btnConnectDB';
    connectBtn.textContent = 'Connect';
    connectBtn.style.cssText = `
      padding: 4px 8px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    `;

    connectBtn.addEventListener('click', () => {
      this.connectToDatabase();
    });

    dbStatusDiv.appendChild(statusIcon);
    dbStatusDiv.appendChild(statusText);
    dbStatusDiv.appendChild(connectBtn);

    apiPanel.appendChild(dbStatusDiv);

    // Update status periodically
    this.updateDatabaseStatus();
    setInterval(() => this.updateDatabaseStatus(), 10000); // Every 10 seconds
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await databaseClient.connect();
      this.updateDatabaseStatus();
    } catch (error) {
      console.error('[SensorHistoryUI] Database initialization failed:', error);
      this.updateDatabaseStatus();
    }
  }

  /**
   * Connect to database
   */
  private async connectToDatabase(): Promise<void> {
    const statusText = document.getElementById('db-status-text');
    const statusIcon = document.getElementById('db-status-icon');
    const connectBtn = document.getElementById('btnConnectDB') as HTMLButtonElement;

    if (statusText) statusText.textContent = 'Database: Connecting...';
    if (statusIcon) statusIcon.style.background = '#ffa500';
    if (connectBtn) connectBtn.disabled = true;

    try {
      const connected = await databaseClient.connect();
      if (connected) {
        if (statusText) statusText.textContent = 'Database: Connected';
        if (statusIcon) statusIcon.style.background = '#28a745';
        if (connectBtn) connectBtn.textContent = 'Connected';
        console.log('[SensorHistoryUI] Database connection successful');
      } else {
        throw new Error('Connection failed - check server status');
      }
    } catch (error) {
      console.error('[SensorHistoryUI] Database connection failed:', error);
      if (statusText) statusText.textContent = 'Database: Failed';
      if (statusIcon) statusIcon.style.background = '#dc3545';
      if (connectBtn) {
        connectBtn.textContent = 'Retry';
        connectBtn.disabled = false;
      }
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Failed to fetch')) {
        console.error('[SensorHistoryUI] Server may not be running. Please start the server with: node server.js');
      }
    }
  }

  /**
   * Update database connection status
   */
  private updateDatabaseStatus(): void {
    const statusText = document.getElementById('db-status-text');
    const statusIcon = document.getElementById('db-status-icon');
    const connectBtn = document.getElementById('btnConnectDB') as HTMLButtonElement;

    const isConnected = databaseClient.getConnectionStatus();

    if (statusText) {
      statusText.textContent = isConnected ? 'Database: Connected' : 'Database: Disconnected';
    }
    
    if (statusIcon) {
      statusIcon.style.background = isConnected ? '#28a745' : '#dc3545';
    }
    
    if (connectBtn) {
      connectBtn.textContent = isConnected ? 'Connected' : 'Connect';
      connectBtn.disabled = isConnected;
    }
  }

  /**
   * Show historical data for the currently selected sensor
   */
  private async showSensorHistory(): Promise<void> {
    const selectedId = (window as any).selectedId as string | null;
    
    if (!selectedId) {
      alert('Please select a sensor first');
      return;
    }

    // Get sensor information
    const sensor = sensors.get(selectedId);
    if (!sensor) {
      alert('Selected sensor not found');
      return;
    }

    // Check database connection
    if (!databaseClient.getConnectionStatus()) {
      const connect = confirm('Database not connected. Would you like to connect now?\n\nIf this fails, make sure the server is running with: node server.js');
      if (connect) {
        await this.connectToDatabase();
        if (!databaseClient.getConnectionStatus()) {
          alert('Failed to connect to database. Please check:\n1. Server is running (node server.js)\n2. Database credentials are correct\n3. Network connection is working');
          return;
        }
      } else {
        return;
      }
    }

    try {
      // Check if device exists in database
      const availableDevices = await databaseClient.getAvailableDevices(sensor.type);
      
      if (!availableDevices.includes(sensor.deviceId)) {
        alert(`Device "${sensor.deviceId}" not found in database for sensor type "${sensor.type}"`);
        return;
      }

      // Show chart
      await chartManager.showSensorHistory(sensor.deviceId, sensor.type, 24);
      
    } catch (error) {
      console.error('[SensorHistoryUI] Error showing sensor history:', error);
      alert(`Error loading historical data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Show historical data for a specific device ID
   */
  async showDeviceHistory(deviceId: string, sensorType: SensorType, hours: number = 24): Promise<void> {
    // Check database connection
    if (!databaseClient.getConnectionStatus()) {
      const connect = confirm('Database not connected. Would you like to connect now?');
      if (connect) {
        await this.connectToDatabase();
        if (!databaseClient.getConnectionStatus()) {
          alert('Failed to connect to database');
          return;
        }
      } else {
        return;
      }
    }

    try {
      // Check if device exists in database
      const availableDevices = await databaseClient.getAvailableDevices(sensorType);
      
      if (!availableDevices.includes(deviceId)) {
        alert(`Device "${deviceId}" not found in database for sensor type "${sensorType}"`);
        return;
      }

      // Show chart
      await chartManager.showSensorHistory(deviceId, sensorType, hours);
      
    } catch (error) {
      console.error('[SensorHistoryUI] Error showing device history:', error);
      alert(`Error loading historical data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available devices for a sensor type
   */
  async getAvailableDevices(sensorType: SensorType): Promise<string[]> {
    if (!databaseClient.getConnectionStatus()) {
      await this.connectToDatabase();
    }
    
    try {
      return await databaseClient.getAvailableDevices(sensorType);
    } catch (error) {
      console.error('[SensorHistoryUI] Error getting available devices:', error);
      return [];
    }
  }
}

// Global sensor history UI instance
export const sensorHistoryUI = new SensorHistoryUI();

// Export for global access
(window as any).sensorHistoryUI = sensorHistoryUI;
