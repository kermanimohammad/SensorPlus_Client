// src/api-client.ts — DigitalTwin SensorPlus API Client
import { sensors, sensorHandles, applyReadingToSensor, latestByDev } from "./sensors";
import type { Reading } from "./types";

// API Response Types based on AI Integration Guide
export interface DeviceData {
  device_id: string;
  kind: "temperature" | "humidity" | "co2" | "light" | "solar";
  value?: number;
  unit?: string;
  room_id?: string;
  timestamp: string;
  // For light sensors
  is_on?: boolean;
  power_watts?: number;
  // For solar sensors
  voltage_volts?: number;
  current_amps?: number;
  // For temperature sensors
  major_change?: boolean;
}

export interface ApiResponse {
  success: boolean;
  devices: Record<string, DeviceData>;
  total_devices?: number;
  db_saves?: number;
  db_fails?: number;
  simulator_running?: boolean;
  timestamp?: string;
  uptime?: number;
}

class DigitalTwinApiClient {
  private baseUrl: string;
  private isConnected: boolean = false;
  private pollingInterval: number | null = null;
  private pollingIntervalMs: number = 5000; // 5 seconds as per guide
  private retryCount: number = 0;
  private maxRetries: number = 3;
  // private retryDelay: number = 2000; // 2 seconds - unused for now
  private corsProxies: string[] = [
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/'
  ];
  private currentProxyIndex: number = 0;

  constructor(baseUrl: string = "https://digitaltwin-sensorplus-1.onrender.com") {
    this.baseUrl = baseUrl;
  }

  /**
   * Convert API device data to internal Reading format
   */
  private convertToReading(deviceData: DeviceData): Reading {
    const timestamp = new Date(deviceData.timestamp).getTime();
    
    if (deviceData.kind === "light") {
      // For light sensors, value is in lux, not watts
      // Determine on/off status based on lux value (if > 0, light is on)
      const luxValue = deviceData.value || 0;
      const isOn = luxValue > 0;
      
      // Estimate power consumption based on lux (rough approximation)
      // Typical LED light: ~100 lux per watt
      const estimatedPowerW = isOn ? Math.max(1, luxValue / 100) : 0;
      
      return {
        deviceId: deviceData.device_id,
        kind: "light",
        roomId: deviceData.room_id,
        ts: timestamp,
        on: isOn,
        powerW: estimatedPowerW
      };
    }
    
    if (deviceData.kind === "solar") {
      const powerW = deviceData.value || 0;
      
      // Estimate voltage and current based on typical solar panel specs
      // Typical solar panel: ~20V, current varies with power
      const estimatedVoltage = 20.0; // Typical solar panel voltage
      const estimatedCurrent = powerW > 0 ? powerW / estimatedVoltage : 0;
      
      return {
        deviceId: deviceData.device_id,
        kind: "solar",
        ts: timestamp,
        powerW: powerW,
        voltage: deviceData.voltage_volts || estimatedVoltage,
        current: deviceData.current_amps || estimatedCurrent
      };
    }
    
    // For temperature, humidity, co2
    return {
      deviceId: deviceData.device_id,
      kind: deviceData.kind as "temperature" | "humidity" | "co2",
      roomId: deviceData.room_id,
      ts: timestamp,
      value: deviceData.value || 0,
      unit: deviceData.unit || ""
    };
  }

  /**
   * Fetch current sensor data from API using CORS proxy
   */
  private async fetchSensorData(): Promise<ApiResponse | null> {
    const targetUrl = `${this.baseUrl}/api/data`;
    
    // Use CORS proxy directly (skip direct connection to avoid CORS errors)
    for (let i = 0; i < this.corsProxies.length; i++) {
      const proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
      const proxyUrl = this.corsProxies[proxyIndex];
      
      try {
        let fullUrl: string;
        
        if (proxyUrl.includes('allorigins.win')) {
          fullUrl = `${proxyUrl}${encodeURIComponent(targetUrl)}`;
        } else {
          fullUrl = `${proxyUrl}${targetUrl}`;
        }
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(15000) // 15 second timeout (proxy adds latency)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: ApiResponse = await response.json();
        
        if (!data.success) {
          throw new Error('API returned success: false');
        }

        // Update current proxy index on success
        this.currentProxyIndex = proxyIndex;
        return data;
        
      } catch (error) {
        console.warn(`[API] Proxy ${proxyIndex + 1} failed:`, error);
        if (i === this.corsProxies.length - 1) {
          console.error('[API] All CORS proxies failed');
          return null;
        }
      }
    }
    
    return null;
  }

  /**
   * Process sensor data and update visualizations
   */
  private processSensorData(data: ApiResponse): void {
    const deviceCount = Object.keys(data.devices).length;
    console.log(`[API] Processing data for ${deviceCount} devices`);
    
    // Update latest readings
    for (const [deviceId, deviceData] of Object.entries(data.devices)) {
      const reading = this.convertToReading(deviceData);
      latestByDev.set(deviceId, reading);
      
      // Find matching sensor in scene
      let targetSensorId: string | undefined;
      for (const sensor of sensors.values()) {
        if (sensor.deviceId === deviceId) {
          targetSensorId = sensor.id;
          break;
        }
      }
      
      // Apply reading to sensor visualization
      if (targetSensorId) {
        const handle = sensorHandles.get(targetSensorId);
        if (handle) {
          applyReadingToSensor(handle, reading);
        }
      }
    }
  }

  /**
   * Start polling for sensor data
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('[API] Already connected');
      return;
    }

    console.log('[API] Connecting to DigitalTwin SensorPlus API...');
    this.setStatus('connecting...');
    
    // Test connection first
    const testData = await this.fetchSensorData();
    if (!testData) {
      this.setStatus('connection failed');
      throw new Error('Failed to connect to DigitalTwin API');
    }

    this.isConnected = true;
    this.retryCount = 0;
    this.setStatus('connected');
    
    // Process initial data
    this.processSensorData(testData);
    
    // Start polling
    this.startPolling();
    
    console.log('[API] Connected successfully');
  }

  /**
   * Start polling for data updates
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = window.setInterval(async () => {
      const data = await this.fetchSensorData();
      
      if (data) {
        this.processSensorData(data);
        this.retryCount = 0; // Reset retry count on success
      } else {
        this.retryCount++;
        console.warn(`[API] Polling failed, retry ${this.retryCount}/${this.maxRetries}`);
        
        if (this.retryCount >= this.maxRetries) {
          this.setStatus('connection lost');
          this.disconnect();
        }
      }
    }, this.pollingIntervalMs);
  }

  /**
   * Stop polling and disconnect
   */
  public disconnect(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.isConnected = false;
    this.setStatus('disconnected');
    console.log('[API] Disconnected');
  }

  /**
   * Update connection status in UI
   */
  private setStatus(status: string): void {
    const statusEl = document.getElementById("status");
    if (statusEl) {
      statusEl.textContent = status;
    }
    console.log('[API] Status:', status);
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Update server URL
   */
  public updateServerUrl(newUrl: string): void {
    if (this.isConnected) {
      this.disconnect();
    }
    this.baseUrl = newUrl;
  }

  /**
   * Update polling interval
   */
  public updatePollingInterval(intervalMs: number): void {
    this.pollingIntervalMs = Math.max(1000, intervalMs); // Minimum 1 second
    
    if (this.isConnected) {
      this.startPolling(); // Restart with new interval
    }
  }

  /**
   * Get current connection information
   */
  public getConnectionInfo(): { url: string; pollingInterval: number; isConnected: boolean } {
    return {
      url: this.baseUrl,
      pollingInterval: this.pollingIntervalMs,
      isConnected: this.isConnected
    };
  }

  /**
   * Get discovered devices from latest readings
   */
  public getDiscoveredDevices(): string[] {
    return Array.from(latestByDev.keys()).sort();
  }

  /**
   * Get latest reading for a specific device
   */
  public getLatestReading(deviceId: string): Reading | undefined {
    return latestByDev.get(deviceId);
  }

}

// Global API client instance
export const apiClient = new DigitalTwinApiClient();

// Export for global access
(window as any).apiClient = apiClient;
