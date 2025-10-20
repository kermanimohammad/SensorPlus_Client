// src/database-client.ts — Database Client for Historical Data (HTTP API)
import type { SensorType } from "./types";

// API configuration - Updated for online compatibility
const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' ||
  window.location.protocol === 'file:'
);

// Force online mode for production - CACHE BUSTING v2
const API_BASE_URL = 'https://digitaltwin-sensorplus-1.onrender.com/api';
console.log('[DB] CACHE BUSTING v2 - FORCING ONLINE MODE:', API_BASE_URL);
console.log('[DB] CACHE BUSTING v2 - NO LOCALHOST ALLOWED');

// Force cache busting for online version
console.log('[DB] Environment check:', { 
  isLocal, 
  hostname: window.location.hostname, 
  protocol: window.location.protocol,
  finalUrl: API_BASE_URL 
});

// Historical data types
export interface HistoricalDataPoint {
  timestamp: Date;
  value: number;
  device_id: string;
  room_id?: string;
}

export interface LightDataPoint {
  timestamp: Date;
  is_on: boolean;
  power_watts: number;
  device_id: string;
  room_id?: string;
}

export interface SolarDataPoint {
  timestamp: Date;
  power_watts: number;
  voltage_volts: number;
  current_amps: number;
  device_id: string;
}

export type SensorHistoricalData = HistoricalDataPoint[] | LightDataPoint[] | SolarDataPoint[];

// Database client class (HTTP API)
export class DatabaseClient {
  private isConnected: boolean = false;
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = API_BASE_URL) {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Get the appropriate API URL based on environment
   */
  private getApiUrl(endpoint: string): string {
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.protocol === 'file:';
    
    if (isLocal) {
      return `http://localhost:3001${endpoint}`;
    } else {
      return `https://digitaltwin-sensorplus-1.onrender.com${endpoint}`;
    }
  }

  /**
   * Connect to the database API
   */
  async connect(): Promise<boolean> {
    try {
      console.log('[DB] CACHE BUSTING v2 - Attempting to connect to database API...', this.apiBaseUrl);
      console.log('[DB] CACHE BUSTING v2 - Environment detection:', {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        isLocal: typeof window !== 'undefined' && (
          window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1' ||
          window.location.protocol === 'file:'
        )
      });
      
      // Use environment detection like api-client
      const isLocal = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.protocol === 'file:';
      const targetUrl = isLocal ? 'http://localhost:3001/api/data' : 'https://digitaltwin-sensorplus-1.onrender.com/api/proxy/data';
      console.log('[DB] Environment:', isLocal ? 'local' : 'online', 'Target URL:', targetUrl);
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Check if server is responding - for proxy/data endpoint, check success field
      this.isConnected = result.success === true;
      
      if (this.isConnected) {
        console.log('[DB] Connected to database API successfully');
      } else {
        console.error('[DB] Database API connection failed:', result);
      }
      
      return this.isConnected;
    } catch (error) {
      console.error('[DB] API connection failed:', error);
      this.isConnected = false;
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('[DB] Network error - check server URL and connectivity');
      } else if (error instanceof Error && error.name === 'AbortError') {
        console.error('[DB] Connection timeout - server may be slow to respond');
      }
      
      return false;
    }
  }

  /**
   * Disconnect from database API
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('[DB] Disconnected from database API');
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get historical data for temperature sensor
   */
  async getTemperatureHistory(
    deviceId: string, 
    hours: number = 24
  ): Promise<HistoricalDataPoint[]> {
    if (!this.isConnected) {
      throw new Error('Database API not connected');
    }

    try {
      const response = await fetch(
        this.getApiUrl(`/api/history/temperature/${deviceId}?hours=${hours}`)
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('API returned success: false');
      }

      return result.data.map((row: any) => ({
        timestamp: new Date(row.timestamp),
        value: row.value,
        device_id: row.device_id,
        room_id: row.room_id
      }));
    } catch (error) {
      console.error('[DB] Error fetching temperature history:', error);
      throw error;
    }
  }

  /**
   * Get historical data for humidity sensor
   */
  async getHumidityHistory(
    deviceId: string, 
    hours: number = 24
  ): Promise<HistoricalDataPoint[]> {
    if (!this.isConnected) {
      throw new Error('Database API not connected');
    }

    try {
      const response = await fetch(
        this.getApiUrl(`/api/history/humidity/${deviceId}?hours=${hours}`)
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('API returned success: false');
      }

      return result.data.map((row: any) => ({
        timestamp: new Date(row.timestamp),
        value: row.value,
        device_id: row.device_id,
        room_id: row.room_id
      }));
    } catch (error) {
      console.error('[DB] Error fetching humidity history:', error);
      throw error;
    }
  }

  /**
   * Get historical data for CO2 sensor
   */
  async getCO2History(
    deviceId: string, 
    hours: number = 24
  ): Promise<HistoricalDataPoint[]> {
    if (!this.isConnected) {
      throw new Error('Database API not connected');
    }

    try {
      const response = await fetch(
        this.getApiUrl(`/api/history/co2/${deviceId}?hours=${hours}`)
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('API returned success: false');
      }

      return result.data.map((row: any) => ({
        timestamp: new Date(row.timestamp),
        value: row.value,
        device_id: row.device_id,
        room_id: row.room_id
      }));
    } catch (error) {
      console.error('[DB] Error fetching CO2 history:', error);
      throw error;
    }
  }

  /**
   * Get historical data for light sensor
   */
  async getLightHistory(
    deviceId: string, 
    hours: number = 24
  ): Promise<LightDataPoint[]> {
    if (!this.isConnected) {
      throw new Error('Database API not connected');
    }

    try {
      const response = await fetch(
        this.getApiUrl(`/api/history/light/${deviceId}?hours=${hours}`)
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('API returned success: false');
      }

      return result.data.map((row: any) => ({
        timestamp: new Date(row.timestamp),
        is_on: Boolean(row.is_on),
        power_watts: row.power_watts,
        device_id: row.device_id,
        room_id: row.room_id
      }));
    } catch (error) {
      console.error('[DB] Error fetching light history:', error);
      throw error;
    }
  }

  /**
   * Get historical data for solar sensor
   */
  async getSolarHistory(
    deviceId: string, 
    hours: number = 24
  ): Promise<SolarDataPoint[]> {
    if (!this.isConnected) {
      throw new Error('Database API not connected');
    }

    try {
      const response = await fetch(
        this.getApiUrl(`/api/history/solar/${deviceId}?hours=${hours}`)
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('API returned success: false');
      }

      return result.data.map((row: any) => ({
        timestamp: new Date(row.timestamp),
        power_watts: row.power_watts,
        voltage_volts: row.voltage_volts,
        current_amps: row.current_amps,
        device_id: row.device_id
      }));
    } catch (error) {
      console.error('[DB] Error fetching solar history:', error);
      throw error;
    }
  }

  /**
   * Get historical data for any sensor type
   */
  async getSensorHistory(
    deviceId: string,
    sensorType: SensorType,
    hours: number = 24
  ): Promise<SensorHistoricalData> {
    // Ensure we're connected before making requests
    if (!this.isConnected) {
      console.log('[DB] Not connected, attempting to reconnect...');
      const connected = await this.connect();
      if (!connected) {
        throw new Error('Database not connected and reconnection failed');
      }
    }

    switch (sensorType) {
      case 'temperature':
        return await this.getTemperatureHistory(deviceId, hours);
      case 'humidity':
        return await this.getHumidityHistory(deviceId, hours);
      case 'co2':
        return await this.getCO2History(deviceId, hours);
      case 'light':
        return await this.getLightHistory(deviceId, hours);
      case 'solar':
        return await this.getSolarHistory(deviceId, hours);
      default:
        throw new Error(`Unsupported sensor type: ${sensorType}`);
    }
  }

  /**
   * Get available device IDs for a sensor type
   */
  async getAvailableDevices(sensorType: SensorType): Promise<string[]> {
    // Ensure we're connected before making requests
    if (!this.isConnected) {
      console.log('[DB] Not connected, attempting to reconnect...');
      const connected = await this.connect();
      if (!connected) {
        throw new Error('Database not connected and reconnection failed');
      }
    }

    try {
      const response = await fetch(this.getApiUrl(`/api/devices/${sensorType}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.devices;
    } catch (error) {
      console.error('[DB] Error fetching available devices:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const isLocal = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.protocol === 'file:';
      const targetUrl = isLocal ? 'http://localhost:3001/api/data' : 'https://digitaltwin-sensorplus-1.onrender.com/api/proxy/data';
      
      const response = await fetch(targetUrl);
      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error('[DB] Connection test failed:', error);
      return false;
    }
  }
}

// Global database client instance
export const databaseClient = new DatabaseClient();

// Export for global access
(window as any).databaseClient = databaseClient;