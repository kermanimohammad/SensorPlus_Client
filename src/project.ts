// src/project.ts — Project save/load (multi-environment + backward compatible)
import { GLB_WORLD_SCALE, palette } from "./types";
import type { SensorNode, ProjectFile, ProjectEnvironment } from "./types";

import {
  sensors,
  sensorHandles,
  createSensorHandle,
  prefabsReady,
} from "./sensors";

import {
  getAllEnvEntries,
  clearAllEnvironments,
  addEnvironmentFromProjectB64,
} from "./env";

/* -----------------------------------------------------------------------------
   Utilities
----------------------------------------------------------------------------- */
const rad2deg = (r: number) => (r * 180) / Math.PI;

/* -----------------------------------------------------------------------------
   Save/Load: Sensors only (legacy helpers kept as-is)
----------------------------------------------------------------------------- */
export function saveSceneSensors() {
  const arr = Array.from(sensors.values());
  // localStorage snapshot (optional)
  try {
    localStorage.setItem("scene.sensors", JSON.stringify(arr));
  } catch {}
  // Download JSON
  const blob = new Blob([JSON.stringify(arr, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "scene-sensors.json";
  a.click();
}

export async function loadSceneSensorsFromFile(f: File) {
  const txt = await f.text();
  const arr = JSON.parse(txt) as SensorNode[];

  // Clear current sensors
  for (const h of sensorHandles.values()) {
    try { h.getChildMeshes().forEach(c => c.dispose()); } catch {}
    try { h.dispose(); } catch {}
  }
  sensorHandles.clear();
  sensors.clear();

  await prefabsReady;
  for (const s of arr) {
    sensors.set(s.id, s);
    createSensorHandle(s);
  }
}

/* -----------------------------------------------------------------------------
   Save Project (multi-env)
   - version: 2
   - environments[]: array of GLB (base64) + transform
   - sensors[]: current sensors map
   - connection: current connection form values
----------------------------------------------------------------------------- */
export function saveProject() {
  const envs = getAllEnvEntries().map(e => ({
    id: e.id,
    name: e.name,
    dataB64: e.dataB64,
    transform: {
      position: { x: e.root.position.x, y: e.root.position.y, z: e.root.position.z },
      rotationYDeg: rad2deg(e.root.rotation.y || 0),
      scale: e.root.scaling?.x ?? 1, // assuming uniform scaling
    },
  }));

  const file: ProjectFile = {
    kind: "digital-twin-project",
    version: 2,
    connection: {
      url:  (document.getElementById("brokerUrl")   as HTMLInputElement)?.value?.trim()  || "",
      topic:(document.getElementById("brokerTopic") as HTMLInputElement)?.value?.trim()  || "",
      user: (document.getElementById("brokerUser")  as HTMLInputElement)?.value?.trim()  || undefined,
      pass: (document.getElementById("brokerPass")  as HTMLInputElement)?.value          || undefined,
    },
    sensors: Array.from(sensors.values()),
    environments: envs,
  };

  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "project.dtproj";
  a.click();
}

/* -----------------------------------------------------------------------------
   Load Project (supports v2 multi-env and v1 single-env)
   Steps:
   1) Clear current sensors & environments
   2) Recreate sensors
   3) Recreate environments (v2: array; v1: single environment)
   4) Patch connection form (optional)
----------------------------------------------------------------------------- */
export async function loadProjectFromFile(f: File) {
  const txt  = await f.text();
  const data = JSON.parse(txt) as ProjectFile;

  // --- 1) clear sensors
  for (const h of sensorHandles.values()) {
    try { h.getChildMeshes().forEach(c => c.dispose()); } catch {}
    try { h.dispose(); } catch {}
  }
  sensorHandles.clear();
  sensors.clear();

  // --- 2) sensors
  await prefabsReady;
  const arr = (data.sensors || []) as SensorNode[];
  for (const s of arr) {
    // fill palette color default if missing (for old files)
    if (!s.color && s.type && palette[s.type]) s.color = palette[s.type];
    if (!s.scale) s.scale = 5.0;
    sensors.set(s.id, s);
    createSensorHandle(s);
  }

  // --- 3) environments
  clearAllEnvironments();

  if ((data as any).version === 2 && Array.isArray((data as any).environments)) {
    const envs = (data as any).environments as ProjectEnvironment[];
    for (let i = 0; i < envs.length; i++) {
      const env = envs[i];
      const makeActive = i === 0;
      await addEnvironmentFromProjectB64(env.dataB64, env.name, env.transform, makeActive);
    }
  } else if ((data as any).environment) {
    // backward compatibility (v1)
    const env = (data as any).environment as ProjectFile["environment"];
    await addEnvironmentFromProjectB64(
      env!.dataB64,
      env!.name,
      env!.transform,
      true
    );
  }

  // --- 4) connection (form fields only; اتصال واقعی MQTT از طریق دکمه Connect)
  try {
    const conn = data.connection || { url: "", topic: "" };
    (document.getElementById("brokerUrl")   as HTMLInputElement).value = conn.url || "";
    (document.getElementById("brokerTopic") as HTMLInputElement).value = conn.topic || "";
    (document.getElementById("brokerUser")  as HTMLInputElement).value = conn.user || "";
    (document.getElementById("brokerPass")  as HTMLInputElement).value = conn.pass || "";
    const topicChip = document.getElementById("topicChip");
    if (topicChip) topicChip.textContent = conn.topic || "building/demo/#";
  } catch {}

  // انتخاب جاری را پاک کن تا ابزارها روی محیط فعال کار کنند
  (window as any).selectedId = null;
}

/* -----------------------------------------------------------------------------
   (Optional) Auto-restore of last sensor layout from localStorage
   (comment out if not desired)
----------------------------------------------------------------------------- */
// try {
//   const raw = localStorage.getItem("scene.sensors");
//   if (raw) {
//     const arr = JSON.parse(raw) as SensorNode[];
//     (async () => {
//       for (const h of sensorHandles.values()) {
//         try { h.getChildMeshes().forEach(c => c.dispose()); } catch {}
//         try { h.dispose(); } catch {}
//       }
//       sensorHandles.clear();
//       sensors.clear();
//       await prefabsReady;
//       for (const s of arr) { sensors.set(s.id, s); createSensorHandle(s); }
//     })();
//   }
// } catch {}
