import { sensors, sensorHandles, createSensorHandle } from "./sensors";
import { envDataB64, envName, base64ToArrayBuffer, setEnvironmentFromGLBArrayBuffer, applyEnvTransform, getEnvRoot } from "./env";
import type { ProjectFile, SensorNode } from "./types";

export function saveSceneSensors(){
  const arr = Array.from(sensors.values()); localStorage.setItem("scene.sensors", JSON.stringify(arr));
  const blob = new Blob([JSON.stringify(arr, null, 2)], { type:"application/json" }); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="scene-sensors.json"; a.click();
}

export async function loadSceneSensorsFromFile(f: File){
  const txt = await f.text(); const arr = JSON.parse(txt) as SensorNode[];
  for(const h of sensorHandles.values()) h.dispose(); sensorHandles.clear(); sensors.clear();
  for(const s of arr){ sensors.set(s.id, s); createSensorHandle(s); }
}

export function saveProject(){
  const brokerUrl   = (document.getElementById("brokerUrl") as HTMLInputElement).value || "";
  const brokerTopic = (document.getElementById("brokerTopic") as HTMLInputElement).value || "";
  const brokerUser  = (document.getElementById("brokerUser") as HTMLInputElement).value || "";
  const brokerPass  = (document.getElementById("brokerPass") as HTMLInputElement).value || "";
  const includePass = (document.getElementById("includePass") as HTMLInputElement)?.checked;
  const envRoot = getEnvRoot();
  const env = (envDataB64 && envRoot) ? {
    name: envName || "environment.glb",
    dataB64: envDataB64!,
    transform: { position:{ x: envRoot.position.x, y: envRoot.position.y, z: envRoot.position.z }, rotationYDeg: BABYLON.Angle.FromRadians(envRoot.rotation.y).degrees(), scale: envRoot.scaling.x }
  } : undefined as any;
  const pf: ProjectFile = { kind:"digital-twin-project", version:1, connection:{ url:brokerUrl, topic:brokerTopic, user: brokerUser || undefined, pass: includePass ? (brokerPass || undefined) : undefined }, sensors: Array.from(sensors.values()), environment: env };
  const blob = new Blob([JSON.stringify(pf,null,2)], { type:"application/json" }); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="project.dtproj"; a.click();
}

export async function loadProjectFromFile(f: File){
  const txt = await f.text(); const pf = JSON.parse(txt) as ProjectFile;
  // connection
  (document.getElementById("brokerUrl") as HTMLInputElement).value   = pf.connection?.url   || "";
  (document.getElementById("brokerTopic") as HTMLInputElement).value = pf.connection?.topic || "";
  (document.getElementById("brokerUser") as HTMLInputElement).value  = pf.connection?.user  || "";
  (document.getElementById("brokerPass") as HTMLInputElement).value  = pf.connection?.pass  || "";
  (document.getElementById("ws") as HTMLElement).textContent         = pf.connection?.url   || "—";
  (document.getElementById("topicChip") as HTMLElement).textContent   = pf.connection?.topic || "building/demo/#";
  // environment
  if(pf.environment?.dataB64){ const buf = base64ToArrayBuffer(pf.environment.dataB64); await setEnvironmentFromGLBArrayBuffer(buf, pf.environment.name||"environment.glb"); if(pf.environment.transform) applyEnvTransform(pf.environment.transform); }
  // sensors
  for(const h of sensorHandles.values()) h.dispose(); sensorHandles.clear(); sensors.clear();
  for(const s of (pf.sensors||[])){ sensors.set(s.id, s); createSensorHandle(s); }
}