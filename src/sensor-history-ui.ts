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
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const statusIcon = document.createElement('div');
    statusIcon.id = 'db-status-icon';
    statusIcon.style.cssText = `
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #666;
      transition: all 0.3s ease;
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
    `;

    const statusText = document.createElement('span');
    statusText.id = 'db-status-text';
    statusText.textContent = 'Database: Checking...';
    statusText.style.cssText = `
      flex: 1;
      font-weight: 500;
    `;

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
      transition: all 0.3s ease;
      min-width: 60px;
    `;

    // Add hover effect for connect button
    connectBtn.addEventListener('mouseenter', () => {
      if (!connectBtn.disabled) {
        connectBtn.style.background = '#0056b3';
        connectBtn.style.transform = 'scale(1.05)';
      }
    });

    connectBtn.addEventListener('mouseleave', () => {
      if (!connectBtn.disabled) {
        connectBtn.style.background = '#007bff';
        connectBtn.style.transform = 'scale(1)';
      }
    });

    connectBtn.addEventListener('click', () => {
      this.connectToDatabase();
    });

    dbStatusDiv.appendChild(statusIcon);
    dbStatusDiv.appendChild(statusText);
    dbStatusDiv.appendChild(connectBtn);

    apiPanel.appendChild(dbStatusDiv);

    // Add server info button
    const serverInfoBtn = document.createElement('button');
    serverInfoBtn.id = 'btnServerInfo';
    serverInfoBtn.textContent = 'ℹ️';
    serverInfoBtn.style.cssText = `
      padding: 4px 8px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      margin-left: 5px;
      transition: all 0.3s ease;
    `;
    serverInfoBtn.title = 'Server Information';

    serverInfoBtn.addEventListener('click', () => {
      this.showServerInfo();
    });

    dbStatusDiv.appendChild(serverInfoBtn);

    // Update status immediately and then periodically
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

    // Show connecting state
    if (statusText) {
      statusText.textContent = 'Database: Connecting...';
      statusText.style.color = '#ffa500';
    }
    if (statusIcon) {
      statusIcon.style.background = '#ffa500';
      statusIcon.style.boxShadow = '0 0 8px rgba(255, 165, 0, 0.5)';
    }
    if (connectBtn) {
      connectBtn.textContent = 'Connecting...';
      connectBtn.disabled = true;
      connectBtn.style.background = '#ffa500';
    }

    try {
      const connected = await databaseClient.connect();
      if (connected) {
        if (statusText) {
          statusText.textContent = 'Database: Connected ✅';
          statusText.style.color = '#28a745';
        }
        if (statusIcon) {
          statusIcon.style.background = '#28a745';
          statusIcon.style.boxShadow = '0 0 8px rgba(40, 167, 69, 0.5)';
        }
        if (connectBtn) {
          connectBtn.textContent = 'Connected';
          connectBtn.style.background = '#28a745';
          connectBtn.disabled = true;
          connectBtn.title = 'Database is connected';
        }
        console.log('[SensorHistoryUI] Database connection successful');
        this.showNotification('Database connected successfully!', 'success');
      } else {
        throw new Error('Connection failed - check server status');
      }
    } catch (error) {
      console.error('[SensorHistoryUI] Database connection failed:', error);
      if (statusText) {
        statusText.textContent = 'Database: Failed ❌';
        statusText.style.color = '#dc3545';
      }
      if (statusIcon) {
        statusIcon.style.background = '#dc3545';
        statusIcon.style.boxShadow = '0 0 8px rgba(220, 53, 69, 0.5)';
      }
      if (connectBtn) {
        connectBtn.textContent = 'Retry';
        connectBtn.style.background = '#dc3545';
        connectBtn.disabled = false;
        connectBtn.title = 'Click to retry connection';
      }
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Failed to fetch')) {
        console.error('[SensorHistoryUI] Server may not be running. Please start the server with: node server.js');
        // Show notification to user
        this.showNotification('Server not running. Please start with: node server.js', 'error');
      } else {
        this.showNotification(`Connection failed: ${errorMessage}`, 'error');
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
      if (isConnected) {
        statusText.textContent = 'Database: Connected ✅';
        statusText.style.color = '#28a745';
      } else {
        statusText.textContent = 'Database: Disconnected ❌';
        statusText.style.color = '#dc3545';
      }
    }
    
    if (statusIcon) {
      if (isConnected) {
        statusIcon.style.background = '#28a745';
        statusIcon.style.boxShadow = '0 0 8px rgba(40, 167, 69, 0.5)';
      } else {
        statusIcon.style.background = '#dc3545';
        statusIcon.style.boxShadow = '0 0 8px rgba(220, 53, 69, 0.5)';
      }
    }
    
    if (connectBtn) {
      if (isConnected) {
        connectBtn.textContent = 'Connected';
        connectBtn.style.background = '#28a745';
        connectBtn.disabled = true;
        connectBtn.title = 'Database is connected';
      } else {
        connectBtn.textContent = 'Connect';
        connectBtn.style.background = '#007bff';
        connectBtn.disabled = false;
        connectBtn.title = 'Click to connect to database';
      }
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

  /**
   * Show server information
   */
  private showServerInfo(): void {
    const isConnected = databaseClient.getConnectionStatus();
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:'
    );
    const serverUrl = isLocal ? 'http://localhost:3001' : 'https://digitaltwin-sensorplus-1.onrender.com';
    
    const info = `
Server Information:
• Server URL: ${serverUrl}
• Status: ${isConnected ? 'Connected ✅' : 'Disconnected ❌'}
• Database: MySQL (SensorPlus)
• API Endpoints:
  - /api/health - Health check
  - /api/db/test - Database test
  - /api/history/{type}/{deviceId} - Historical data

To start the server:
node server.js

Troubleshooting:
• Make sure server is running on port 3001
• Check database credentials in server.js
• Verify network connectivity
    `.trim();

    // Create modal dialog
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: #2c3e50;
      color: white;
      padding: 20px;
      border-radius: 10px;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      white-space: pre-line;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      background: #e74c3c;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 15px;
      float: right;
    `;

    modalContent.textContent = info;
    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);

    closeBtn.addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    document.body.appendChild(modal);
  }

  /**
   * Show notification message to user
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Remove existing notification if any
    const existingNotification = document.getElementById('db-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'db-notification';
    notification.textContent = message;
    
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      info: '#007bff'
    };

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 16px;
      border-radius: 5px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      max-width: 300px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-out;
    `;

    // Add CSS animation
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);

    // Click to dismiss
    notification.addEventListener('click', () => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    });
  }
}

// Global sensor history UI instance
export const sensorHistoryUI = new SensorHistoryUI();

// Export for global access
(window as any).sensorHistoryUI = sensorHistoryUI;
