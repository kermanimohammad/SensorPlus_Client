// src/database-client.ts — Database Client for Historical Data (HTTP API)
import type { SensorType } from "./types";

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
  constructor() {
    // No parameters needed for online-only mode
  }

  /**
   * Get historical data for temperature sensor
   */
  async getTemperatureHistory(
    deviceId: string, 
    hours: number = 24
  ): Promise<HistoricalDataPoint[]> {
    try {
      const response = await fetch(
        `https://digitaltwin-sensorplus-1.onrender.com/api/history/temperature/${deviceId}?hours=${hours}`
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
    try {
      const response = await fetch(
        `https://digitaltwin-sensorplus-1.onrender.com/api/history/humidity/${deviceId}?hours=${hours}`
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
    try {
      const response = await fetch(
        `https://digitaltwin-sensorplus-1.onrender.com/api/history/co2/${deviceId}?hours=${hours}`
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
    try {
      const response = await fetch(
        `https://digitaltwin-sensorplus-1.onrender.com/api/history/light/${deviceId}?hours=${hours}`
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
    try {
      const response = await fetch(
        `https://digitaltwin-sensorplus-1.onrender.com/api/history/solar/${deviceId}?hours=${hours}`
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
    try {
      const response = await fetch(`https://digitaltwin-sensorplus-1.onrender.com/api/devices/${sensorType}`, {
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
      throw error;
    }
  }

}

// Global database client instance
export const databaseClient = new DatabaseClient();

// Export for global access
(window as any).databaseClient = databaseClient;