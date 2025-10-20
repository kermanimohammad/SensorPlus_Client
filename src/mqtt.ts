// mqtt.ts (fixed)
import { sensors, sensorHandles, applyReadingToSensor, latestByDev } from "./sensors";
import type { Reading } from "./types";

let client: any = null;
let currentTopic = "";

const statusEl    = document.getElementById("status")!;
const wsChip      = document.getElementById("ws")!;
const topicChip   = document.getElementById("topicChip")!;
const brokerUrl   = document.getElementById("brokerUrl") as HTMLInputElement;
const brokerTopic = document.getElementById("brokerTopic") as HTMLInputElement;
const brokerUser  = document.getElementById("brokerUser") as HTMLInputElement;
const brokerPass  = document.getElementById("brokerPass") as HTMLInputElement;
const deviceList  = document.getElementById("deviceList") as HTMLDivElement;
const discovered  = new Set<string>();

function setStatus(s: string){ statusEl.textContent = s; console.log("[MQTT]", s); }

function renderDeviceList(){
  deviceList.innerHTML = "";
  if(discovered.size === 0){ deviceList.textContent = "(no devices yet)"; return; }
  [...discovered].sort().forEach(id=>{
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = id;
    chip.title = "Click to use this as Device ID for the selected sensor";
    chip.style.cursor = "pointer";
    chip.onclick = () => {
      const inp = document.getElementById("p_device") as HTMLInputElement | null;
      if(inp) inp.value = id;
    };
    deviceList.appendChild(chip);
  });
}

export function disconnectBroker(){
  try{
    if(client && currentTopic){ try { client.unsubscribe(currentTopic); } catch {} }
    if(client) client.end(true);
  }catch{}
  client = null;
  currentTopic = "";
  setStatus("disconnected");
}

export function connectBroker(){
  setStatus("connecting...");
  // @ts-ignore
  const mqttLib = (window as any).mqtt;
  if(!mqttLib?.connect){
    setStatus("mqtt library not found");
    console.error("window.mqtt not found. Did the <script src='https://unpkg.com/mqtt/dist/mqtt.min.js'> load?");
    return;
  }

  if(client) disconnectBroker();

  const url   = brokerUrl.value.trim();
  const topic = brokerTopic.value.trim() || "building/demo/#";
  const user  = brokerUser.value.trim();
  const pass  = brokerPass.value;

  (wsChip as HTMLElement).textContent    = url || "—";
  (topicChip as HTMLElement).textContent = topic;

  if(location.protocol === "https:" && url.startsWith("ws://")){
    setStatus("blocked: use wss:// on HTTPS pages");
    console.warn("Mixed content: page is HTTPS but broker URL is ws://. Use wss://");
    return;
  }

  client = mqttLib.connect(url, {
    keepalive: 30,
    ...(user ? { username: user } : {}),
    ...(pass ? { password: pass } : {}),
  });

  client.on("connect", () => {
    setStatus("connected");
    discovered.clear(); renderDeviceList();
    currentTopic = topic;
    try { client.subscribe(currentTopic); } catch (e) { console.error(e); }
  });
  client.on("reconnect", () => setStatus("reconnecting…"));
  client.on("close",     () => setStatus("closed"));
  client.on("error", (e:any) => { setStatus(`error: ${e?.message || e}`); console.error("[MQTT] error", e); });

  client.on("message", (topic: string, payload: Uint8Array) => {
    let msg: any;
    try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }

    if (msg?.deviceId && !discovered.has(msg.deviceId)) {
      discovered.add(msg.deviceId);
      renderDeviceList();
    }
    if (msg?.deviceId) latestByDev.set(msg.deviceId, msg as Reading);

    let targetId: string | undefined;
    for (const s of sensors.values()) {
      if (s.deviceId && msg?.deviceId === s.deviceId) { targetId = s.id; break; }
      if (!targetId && s.topic && s.topic === topic)   { targetId = s.id; }
    }
    if (!targetId) return;
    const h = sensorHandles.get(targetId);
    if (!h) return;
    applyReadingToSensor(h, msg as Reading);
  });
}

export function wireMqttButtons(){
  const btnConn = document.getElementById("btnReconnect") as HTMLButtonElement | null;
  const btnDisc = document.getElementById("btnDisconnect") as HTMLButtonElement | null;
  if(btnConn) btnConn.addEventListener("click", () => { console.log("[UI] Connect clicked"); connectBroker(); });
  if(btnDisc) btnDisc.addEventListener("click", () => { console.log("[UI] Disconnect clicked"); disconnectBroker(); });

  (document.getElementById("brokerTopic") as HTMLInputElement)?.addEventListener("input", ()=>{
    const topic = (document.getElementById("brokerTopic") as HTMLInputElement).value || "building/demo/#";
    (topicChip as HTMLElement).textContent = topic;
  });

  setStatus("disconnected");
  discovered.clear(); renderDeviceList();
}
