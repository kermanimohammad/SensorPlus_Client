// src/api-ui.ts — API Connection UI Controls
import { apiClient } from "./api-client";

// UI Elements
const statusEl = document.getElementById("status")!;
const serverUrlInput = document.getElementById("brokerUrl") as HTMLInputElement;
const pollingIntervalInput = document.getElementById("brokerTopic") as HTMLInputElement;
const deviceList = document.getElementById("deviceList") as HTMLDivElement;
const discovered = new Set<string>();

// Update UI elements to reflect API instead of MQTT
function initializeApiUI(): void {
  // Update labels and placeholders
  const urlLabel = document.querySelector('label[for="brokerUrl"]');
  if (urlLabel) {
    urlLabel.textContent = "Server URL:";
  }
  
  const topicLabel = document.querySelector('label[for="brokerTopic"]');
  if (topicLabel) {
    topicLabel.textContent = "Polling Interval (ms):";
  }
  
  // Set default values for online server
  serverUrlInput.value = "https://digitaltwin-sensorplus-1.onrender.com";
  serverUrlInput.placeholder = "https://digitaltwin-sensorplus-1.onrender.com";
  
  pollingIntervalInput.value = "5000";
  pollingIntervalInput.placeholder = "5000";
  
  console.log("[API-UI] Initialized with online server URL");
  
  // Update button labels
  const connectBtn = document.getElementById("btnReconnect");
  if (connectBtn) {
    connectBtn.textContent = "Connect";
  }
  
  const disconnectBtn = document.getElementById("btnDisconnect");
  if (disconnectBtn) {
    disconnectBtn.textContent = "Disconnect";
  }
}

function setStatus(status: string): void {
  statusEl.textContent = status;
  console.log("[API-UI]", status);
}

function renderDeviceList(): void {
  deviceList.innerHTML = "";
  if (discovered.size === 0) {
    deviceList.innerHTML = '<div class="list-empty">No devices discovered yet</div>';
    return;
  }
  
  console.log(`[API-UI] Rendering ${discovered.size} discovered devices`);
  
  // Group devices by type
  const devicesByType: Record<string, string[]> = {};
  [...discovered].sort().forEach(id => {
    const type = id.split('-')[0]; // Extract type from device_id (e.g., "temp" from "temp-1")
    if (!devicesByType[type]) {
      devicesByType[type] = [];
    }
    devicesByType[type].push(id);
  });
  
  // Render devices grouped by type
  Object.entries(devicesByType).forEach(([type, devices]) => {
    const typeHeader = document.createElement("div");
    typeHeader.className = "device-type-header";
    typeHeader.textContent = `${type.toUpperCase()} (${devices.length})`;
    typeHeader.style.cssText = `
      font-weight: 600;
      color: #6366f1;
      margin: 8px 0 4px 0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    deviceList.appendChild(typeHeader);
    
    devices.forEach(id => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = id;
      chip.title = `Click to use ${id} as Device ID for the selected sensor`;
      chip.style.cursor = "pointer";
      chip.style.margin = "2px";
      chip.onclick = () => {
        const inp = document.getElementById("scene_p_device") as HTMLInputElement | null;
        if (inp) {
          inp.value = id;
          console.log(`[API-UI] Selected device: ${id}`);
        }
      };
      deviceList.appendChild(chip);
    });
  });
}

function updateDiscoveredDevices(): void {
  const devices = apiClient.getDiscoveredDevices();
  const previousCount = discovered.size;
  
  discovered.clear();
  devices.forEach(device => discovered.add(device));
  
  if (discovered.size !== previousCount) {
    console.log(`[API-UI] Discovered devices updated: ${discovered.size} devices`);
    renderDeviceList();
  }
}

export function connectToApi(): void {
  const url = serverUrlInput.value.trim();
  const interval = parseInt(pollingIntervalInput.value.trim()) || 5000;
  
  if (!url) {
    setStatus("error: server URL required");
    return;
  }
  
  console.log(`[API-UI] Connecting to: ${url}`);
  setStatus("connecting...");
  
  // Update client configuration
  apiClient.updateServerUrl(url);
  apiClient.updatePollingInterval(interval);
  
  // Connect directly
  apiClient.connect()
    .then(() => {
      setStatus("connected");
      console.log("[API-UI] Successfully connected to online server");
      
      // Update discovered devices immediately
      updateDiscoveredDevices();
      
      // Update discovered devices periodically
      setInterval(updateDiscoveredDevices, 5000); // Every 5 seconds to match API polling
    })
    .catch((error) => {
      setStatus(`error: ${error.message}`);
      console.error("[API-UI] Connection failed:", error);
    });
}

export function disconnectFromApi(): void {
  apiClient.disconnect();
  setStatus("disconnected");
  discovered.clear();
  renderDeviceList();
}

/**
 * Update UI with connection information from project
 */
export function updateConnectionUI(connectionInfo: { url: string; pollingInterval: number; isConnected: boolean }): void {
  if (serverUrlInput) {
    serverUrlInput.value = connectionInfo.url;
  }
  if (pollingIntervalInput) {
    pollingIntervalInput.value = connectionInfo.pollingInterval.toString();
  }
  if (connectionInfo.isConnected) {
    setStatus("connected");
  } else {
    setStatus("disconnected");
  }
  console.info("[API-UI] Connection UI updated with project settings");
}


export function wireApiButtons(): void {
  // Initialize UI
  initializeApiUI();
  
  // Wire up buttons
  const btnConn = document.getElementById("btnReconnect") as HTMLButtonElement | null;
  const btnDisc = document.getElementById("btnDisconnect") as HTMLButtonElement | null;
  
  if (btnConn) {
    btnConn.addEventListener("click", () => {
      console.log("[UI] Connect clicked");
      connectToApi();
    });
  }
  
  if (btnDisc) {
    btnDisc.addEventListener("click", () => {
      console.log("[UI] Disconnect clicked");
      disconnectFromApi();
    });
  }
  
  // Update polling interval display
  pollingIntervalInput?.addEventListener("input", () => {
    const interval = pollingIntervalInput.value || "5000";
    const intervalMs = parseInt(interval);
    if (!isNaN(intervalMs) && intervalMs > 0) {
      console.log(`[UI] Polling interval updated to ${intervalMs}ms`);
    }
  });
  
  // Initial status
  setStatus("disconnected");
  discovered.clear();
  renderDeviceList();
}

// Export for global access
(window as any).connectToApi = connectToApi;
(window as any).disconnectFromApi = disconnectFromApi;
