// src/project.ts — Folder save (FS Access) + full transforms + .dtsp export
// - Environments: write GLBs + metadata with full transform (pos/rot/scale XYZ)
// - Sensors: write metadata (pos/rot/scale XYZ + type/connection)
// - Finally: zip all written files into a single .dtsp beside them

import JSZip from "jszip";
import type { SensorNode } from "./types";
import { palette, GLB_WORLD_SCALE } from "./types";
import {
  sensors,
  sensorHandles,
  createSensorHandle,
  prefabsReady,
} from "./sensors";

import {
  getAllEnvEntries,
  base64ToArrayBuffer,
  clearAllEnvironments,
  addEnvironmentFromProjectB64,
} from "./env";

/* -----------------------------------------------------------------------------
   Legacy helpers kept (Scene Sensors save/load) — unchanged
----------------------------------------------------------------------------- */
export function saveSceneSensors() {
  const arr = Array.from(sensors.values());
  try { localStorage.setItem("scene.sensors", JSON.stringify(arr)); } catch {}
  const blob = new Blob([JSON.stringify(arr, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "scene-sensors.json";
  a.click();
}

export async function loadSceneSensorsFromFile(f: File) {
  const txt = await f.text();
  const arr = JSON.parse(txt) as SensorNode[];

  for (const h of sensorHandles.values()) {
    try { h.getChildMeshes().forEach(c => c.dispose()); } catch {}
    try { h.dispose(); } catch {}
  }
  sensorHandles.clear(); sensors.clear();

  await prefabsReady;
  for (const s of arr) {
    sensors.set(s.id, s);
    createSensorHandle(s);
  }
}

/* -----------------------------------------------------------------------------
   File System Access API helpers
----------------------------------------------------------------------------- */
type DirHandle = FileSystemDirectoryHandle;

let projectDirHandle: DirHandle | null = null;

async function ensureProjectDirectory(): Promise<DirHandle> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error("File System Access API not supported. Use Chrome/Edge on HTTPS or localhost.");
  }
  if (!projectDirHandle) {
    projectDirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
  }
  const perm = await (projectDirHandle as any).requestPermission?.({ mode: "readwrite" });
  if (perm && perm !== "granted") throw new Error("Write permission denied for the selected folder.");
  return projectDirHandle!;
}

function stripExt(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}
function sanitizeFilename(name: string) {
  return name.replace(/[\/\\?%*:|"<>]/g, "_");
}

/* -----------------------------------------------------------------------------
   Math utils
----------------------------------------------------------------------------- */
const rad2deg = (r: number) => (r * 180) / Math.PI;

function eulerRadToDegVec3(rot: BABYLON.Vector3 | undefined) {
  const v = rot ?? new BABYLON.Vector3(0,0,0);
  return { x: rad2deg(v.x), y: rad2deg(v.y), z: rad2deg(v.z) };
}
function vec3(v: BABYLON.Vector3 | undefined) {
  const p = v ?? new BABYLON.Vector3(0,0,0);
  return { x: p.x, y: p.y, z: p.z };
}

/* -----------------------------------------------------------------------------
   SAVE PROJECT TO FOLDER (Envs + Sensors meta) + ZIP → .dtsp
----------------------------------------------------------------------------- */
export async function saveProjectToFolder() {
  const dir = await ensureProjectDirectory();

  // ---------- ENVIRONMENTS ----------
  const envEntries = getAllEnvEntries();
  const metaEnvs: Array<{
    id: string;
    originalName: string;
    file: string; // saved filename in the folder
    transform: {
      position: {x:number;y:number;z:number};
      rotationEulerDeg: {x:number;y:number;z:number};
      scale: {x:number;y:number;z:number};
    };
  }> = [];

  // Keep GLB buffers to also place into ZIP later (avoid reading from FS)
  const glbWritePlan: Array<{ filename: string; blob: Blob }> = [];

  for (const e of envEntries) {
    const base = sanitizeFilename(stripExt(e.name || "environment"));
    const filename = `${base}-${e.id}.glb`;

    const buf = base64ToArrayBuffer(e.dataB64);
    const glbBlob = new Blob([buf], { type: "model/gltf-binary" });

    // write GLB file to folder
    await writeFile(dir, filename, glbBlob);
    glbWritePlan.push({ filename, blob: glbBlob });

    // full transform (XYZ)
    metaEnvs.push({
      id: e.id,
      originalName: e.name,
      file: filename,
      transform: {
        position: vec3(e.root.position),
        rotationEulerDeg: eulerRadToDegVec3(e.root.rotation),
        scale: vec3(e.root.scaling),
      }
    });
  }

  // ---------- SENSORS (metadata only) ----------
  // If a handle exists, read latest pos/rot/scale from mesh; else use stored node
  const metaSensors = Array.from(sensors.values()).map((s) => {
    const h = sensorHandles.get(s.id) as BABYLON.AbstractMesh | undefined;

    const pos = h ? vec3(h.position) : s.position;
    // rotation: اگر rotationQuaternion داشت به rotation (Euler) تبدیل شده است؛ Babylon معمولاً یکی را ست نگه می‌دارد.
    const rot = h ? (h.rotation ?? new BABYLON.Vector3(0,0,0)) : new BABYLON.Vector3(0,0,0);

    // scale: در کد ما معمولاً uniform است، اما برای آینده کامل XYZ را ذخیره می‌کنیم.
    // توجه: s.scale «base» است و در رندر با GLB_WORLD_SCALE ضرب می‌شود؛ اینجا خودِ scale مش را می‌خوانیم که world/base با هم یکسان بماند.
    const scl = h
      ? vec3(h.scaling)
      : { x: (s.scale ?? 5.0) * GLB_WORLD_SCALE, y: (s.scale ?? 5.0) * GLB_WORLD_SCALE, z: (s.scale ?? 5.0) * GLB_WORLD_SCALE };

    return {
      id: s.id,
      type: s.type,
      label: s.label,
      deviceId: s.deviceId,
      topic: s.topic ?? null,
      color: s.color ?? (s.type ? palette[s.type] : undefined),
      transform: {
        position: pos,
        rotationEulerDeg: eulerRadToDegVec3(rot),
        scale: scl,
      },
      // مدل 3D مربوطه از public/models خوانده می‌شود.
    };
  });

  // ---------- Write project.json ----------
  const projectJson = {
    kind: "digital-twin-project-meta",
    version: 3,                  // ← نسخه جدید با full transforms
    savedAt: new Date().toISOString(),
    environments: metaEnvs,
    sensors: metaSensors,
  };

  await writeJSON(dir, "project.json", projectJson);

  // ---------- Build ZIP → .dtsp ----------
  // zip content mirrors the written files (GLBs + project.json)
  const zip = new JSZip();
  // add GLBs
  for (const item of glbWritePlan) {
    zip.file(item.filename, item.blob);
  }
  // add project.json
  zip.file("project.json", new Blob([JSON.stringify(projectJson, null, 2)], { type: "application/json" }));

  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

  // Save as project.dtsp in the same directory
  await writeFile(dir, "project.dtsp", zipBlob);

  console.info("[Save] Project saved to folder and zipped to project.dtsp");
}

/* -----------------------------------------------------------------------------
   Helpers: write file / JSON into directory
----------------------------------------------------------------------------- */
async function writeFile(dir: DirHandle, filename: string, blob: Blob) {
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function writeJSON(dir: DirHandle, filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  await writeFile(dir, filename, blob);
}

/* -----------------------------------------------------------------------------
   JSON-based project load (legacy; unchanged for now)
----------------------------------------------------------------------------- */
export async function loadProjectFromFile(f: File) {
  const txt  = await f.text();
  const data = JSON.parse(txt) as {
    version?: number;
    sensors?: SensorNode[];
    environments?: Array<{
      id: string;
      name: string;
      dataB64: string;
      transform: {
        position:{x:number;y:number;z:number};
        rotationYDeg?: number; // v1/v2
        rotationEulerDeg?: {x:number;y:number;z:number}; // v3
        scale: number | {x:number;y:number;z:number};
      };
    }>;
    environment?: { // v1
      name: string;
      dataB64: string;
      transform: { position:{x:number;y:number;z:number}; rotationYDeg:number; scale:number };
    };
  };

  // clear & recreate sensors
  for (const h of sensorHandles.values()) {
    try { h.getChildMeshes().forEach(c => c.dispose()); } catch {}
    try { h.dispose(); } catch {}
  }
  sensorHandles.clear(); sensors.clear();

  await prefabsReady;
  const arr = (data.sensors || []) as SensorNode[];
  for (const s of arr) {
    if (!s.color && s.type && palette[s.type]) s.color = palette[s.type];
    // اگر از فایل v3 scale XYZ آمده و می‌خواهی base را نیز بسازی، می‌توانی میانگین/اکثر را تبدیل کنی.
    if (!s.scale) s.scale = 5.0;
    sensors.set(s.id, s);
    createSensorHandle(s);
  }

  // environments (JSON-based legacy load remains; loading XYZ rot/scale can be added later)
  clearAllEnvironments();
  if ((data as any).version === 2 && Array.isArray((data as any).environments)) {
    const envs = (data as any).environments!;
    for (let i = 0; i < envs.length; i++) {
      const env = envs[i];
      const makeActive = i === 0;
      await addEnvironmentFromProjectB64(env.dataB64, env.name, {
        position: env.transform.position,
        rotationYDeg: (env.transform as any).rotationYDeg ?? 0,
        scale: typeof env.transform.scale === "number" ? env.transform.scale : (env.transform.scale as any).x ?? 1,
      }, makeActive);
    }
  } else if ((data as any).environment) {
    // v1 single env
    const env = (data as any).environment!;
    await addEnvironmentFromProjectB64(env.dataB64, env.name, env.transform, true);
  }

  (window as any).selectedId = null;
}
