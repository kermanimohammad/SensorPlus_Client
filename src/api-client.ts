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
  private maxRetries: number = 10;
  // private retryDelay: number = 2000; // 2 seconds - unused for now
  private corsProxies: string[] = [
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://cors.bridged.cc/'
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
      
      const reading = {
        deviceId: deviceData.device_id,
        kind: "light" as const,
        roomId: deviceData.room_id,
        ts: timestamp,
        on: isOn,
        powerW: estimatedPowerW
      };
      return reading;
    }
    
    if (deviceData.kind === "solar") {
      const powerW = deviceData.value || 0;
      
      // Estimate voltage and current based on typical solar panel specs
      // Typical solar panel: ~20V, current varies with power
      const estimatedVoltage = 20.0; // Typical solar panel voltage
      const estimatedCurrent = powerW > 0 ? powerW / estimatedVoltage : 0;
      
      const reading = {
        deviceId: deviceData.device_id,
        kind: "solar" as const,
        ts: timestamp,
        powerW: powerW,
        voltage: deviceData.voltage_volts || estimatedVoltage,
        current: deviceData.current_amps || estimatedCurrent
      };
      return reading;
    }
    
    // For temperature, humidity, co2
    const reading = {
      deviceId: deviceData.device_id,
      kind: deviceData.kind as "temperature" | "humidity" | "co2",
      roomId: deviceData.room_id,
      ts: timestamp,
      value: deviceData.value || 0,
      unit: deviceData.unit || ""
    };
    return reading;
  }

  /**
   * Fetch current sensor data from API using local proxy
   */
  private async fetchSensorData(): Promise<ApiResponse | null> {
    // Detect if running locally or online
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.protocol === 'file:';
    const proxyUrl = isLocal ? 'http://localhost:3001/api/proxy/data' : '/api/proxy/data';
    
    console.log(`[API] Environment: ${isLocal ? 'local' : 'online'}, Proxy URL: ${proxyUrl}`);
    
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error('API returned success: false');
      }

      return data;
      
    } catch (error) {
      console.error('[API] Proxy connection failed:', error);
      // If local proxy fails, try direct connection immediately
      if (isLocal) {
        console.log('[API] Local proxy failed, trying direct connection...');
      }
    }
    
    // Fallback to direct connection
    const targetUrl = `${this.baseUrl}/api/data`;
    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error('API returned success: false');
      }

      return data;
      
    } catch (error) {
      console.warn('[API] Direct connection failed:', error);
      console.log('[API] Trying CORS proxies...');
    }
    
    // Use CORS proxy as fallback
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
        
        console.log(`[API] Trying proxy ${proxyIndex + 1}: ${proxyUrl}`);
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(30000) // 30 second timeout (proxy adds latency)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: ApiResponse = await response.json();
        
        if (!data.success) {
          throw new Error('API returned success: false');
        }

        console.log(`[API] Proxy ${proxyIndex + 1} successful!`);
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
      return;
    }

    this.setStatus('connecting...');
    
    try {
      // Test connection first
      const testData = await this.fetchSensorData();
      if (!testData) {
        this.setStatus('connection failed');
        throw new Error('Failed to connect to DigitalTwin API via proxy');
      }

      this.isConnected = true;
      this.retryCount = 0;
      this.setStatus('connected');
      
      // Process initial data
      this.processSensorData(testData);
      
      // Start polling
      this.startPolling();
    } catch (error) {
      this.setStatus('connection failed');
      console.error('[API] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Start polling for data updates
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    console.log(`[API] Starting polling every ${this.pollingIntervalMs}ms`);

    this.pollingInterval = window.setInterval(async () => {
      
      try {
        const data = await this.fetchSensorData();
        
        if (data) {
          this.processSensorData(data);
          this.retryCount = 0; // Reset retry count on success
        } else {
          this.retryCount++;
          console.warn(`[API] Polling failed, retry ${this.retryCount}/${this.maxRetries}`);
          
          if (this.retryCount >= this.maxRetries) {
            console.error('[API] Max retries reached, but continuing polling...');
            this.setStatus('connection issues');
            // Don't disconnect, just continue trying
            this.retryCount = 0; // Reset retry count to continue
          }
        }
      } catch (error) {
        this.retryCount++;
        console.error(`[API] Polling error, retry ${this.retryCount}/${this.maxRetries}:`, error);
        
        if (this.retryCount >= this.maxRetries) {
          console.error('[API] Max retries reached, but continuing polling...');
          this.setStatus('connection issues');
          // Don't disconnect, just continue trying
          this.retryCount = 0; // Reset retry count to continue
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
   * Update server URL (for display purposes only - we use local proxy)
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

  /**
   * Test API connection manually
   */
  public async testApiConnection(): Promise<void> {
    console.log('[API Test] Testing API connection...');
    try {
      const data = await this.fetchSensorData();
      if (data) {
        console.log('[API Test] API connection successful!');
        console.log('[API Test] Received data:', data);
        this.processSensorData(data);
      } else {
        console.log('[API Test] API connection failed - no data received');
      }
    } catch (error) {
      console.error('[API Test] API connection failed:', error);
    }
  }

  /**
   * Test direct API connection without CORS proxy
   */
  public async testDirectApi(): Promise<void> {
    const targetUrl = `${this.baseUrl}/api/data`;
    console.log(`[Direct API Test] Testing direct connection to: ${targetUrl}`);
    
    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });

      console.log(`[Direct API Test] Response status: ${response.status}`);
      console.log(`[Direct API Test] Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Direct API Test] Direct connection successful!');
      console.log('[Direct API Test] Received data:', data);
      
      if (data.success) {
        this.processSensorData(data);
      } else {
        console.error('[Direct API Test] API returned success: false');
      }
      
    } catch (error) {
      console.error('[Direct API Test] Direct connection failed:', error);
      console.log('[Direct API Test] This is expected in production due to CORS');
    }
  }

  /**
   * Test CORS proxy connection
   */
  public async testCorsProxy(): Promise<void> {
    const targetUrl = `${this.baseUrl}/api/data`;
    console.log(`[CORS Test] Testing CORS proxy connection to: ${targetUrl}`);
    
    for (let i = 0; i < this.corsProxies.length; i++) {
      const proxyUrl = this.corsProxies[i];
      console.log(`[CORS Test] Testing proxy ${i + 1}: ${proxyUrl}`);
      
      try {
        let fullUrl: string;
        
        if (proxyUrl.includes('allorigins.win')) {
          fullUrl = `${proxyUrl}${encodeURIComponent(targetUrl)}`;
        } else {
          fullUrl = `${proxyUrl}${targetUrl}`;
        }
        
        console.log(`[CORS Test] Full URL: ${fullUrl}`);
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(15000)
        });

        console.log(`[CORS Test] Proxy ${i + 1} response status: ${response.status}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[CORS Test] Proxy ${i + 1} successful!`);
        console.log(`[CORS Test] Received data:`, data);
        
        if (data.success) {
          this.processSensorData(data);
          return; // Success, exit loop
        } else {
          console.error(`[CORS Test] Proxy ${i + 1} returned success: false`);
        }
        
      } catch (error) {
        console.error(`[CORS Test] Proxy ${i + 1} failed:`, error);
      }
    }
    
    console.error('[CORS Test] All CORS proxies failed');
  }

  /**
   * Get polling status
   */
  public getPollingStatus(): { isConnected: boolean; pollingInterval: number; hasInterval: boolean; retryCount: number; maxRetries: number } {
    return {
      isConnected: this.isConnected,
      pollingInterval: this.pollingIntervalMs,
      hasInterval: this.pollingInterval !== null,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    };
  }

  /**
   * Force restart polling
   */
  public restartPolling(): void {
    console.log('[API] Restarting polling...');
    this.retryCount = 0; // Reset retry count
    if (this.isConnected) {
      this.startPolling();
    } else {
      console.warn('[API] Cannot restart polling - not connected');
    }
  }

  /**
   * Force connect and start polling
   */
  public async forceConnect(): Promise<void> {
    console.log('[API] Force connecting...');
    this.retryCount = 0;
    this.isConnected = false;
    await this.connect();
  }


}

// Global API client instance
export const apiClient = new DigitalTwinApiClient();

// Export for global access
(window as any).apiClient = apiClient;
