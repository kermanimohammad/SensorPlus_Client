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
  
  // Set default values
  serverUrlInput.value = "https://digitaltwin-sensorplus-1.onrender.com";
  serverUrlInput.placeholder = "https://digitaltwin-sensorplus-1.onrender.com";
  
  pollingIntervalInput.value = "5000";
  pollingIntervalInput.placeholder = "5000";
  
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
    deviceList.textContent = "(no devices yet)";
    return;
  }
  
  [...discovered].sort().forEach(id => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = id;
    chip.title = "Click to use this as Device ID for the selected sensor";
    chip.style.cursor = "pointer";
    chip.onclick = () => {
      const inp = document.getElementById("p_device") as HTMLInputElement | null;
      if (inp) inp.value = id;
    };
    deviceList.appendChild(chip);
  });
}

function updateDiscoveredDevices(): void {
  const devices = apiClient.getDiscoveredDevices();
  discovered.clear();
  devices.forEach(device => discovered.add(device));
  renderDeviceList();
}

export function connectToApi(): void {
  const url = serverUrlInput.value.trim();
  const interval = parseInt(pollingIntervalInput.value.trim()) || 5000;
  
  if (!url) {
    setStatus("error: server URL required");
    return;
  }
  
  // Update client configuration
  apiClient.updateServerUrl(url);
  apiClient.updatePollingInterval(interval);
  
  // Connect directly
  apiClient.connect()
    .then(() => {
      setStatus("connected");
      updateDiscoveredDevices();
      
      // Update discovered devices periodically
      setInterval(updateDiscoveredDevices, 10000); // Every 10 seconds
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
