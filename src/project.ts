// src/project.ts — Project save/load (.dtsp zip) + legacy loaders
import JSZip from "jszip";
import {
  base64ToArrayBuffer,
  getAllEnvEntries,
  addEnvironmentFromGLBArrayBuffer,
  addEnvironmentFromProjectB64,
  clearAllEnvironments,
} from "./env";
import { sensors, sensorHandles, createSensorHandle, prefabsReady, updateSensorList } from "./sensors";
import { GLB_WORLD_SCALE } from "./types";

// ---------- Types (relaxed for browser FS API) ----------
type DirHandle = any;
type FileHandle = any;

// ---------- FS Access helpers ----------
let projectDirHandle: DirHandle | null = null;

async function ensureProjectDirectory(): Promise<DirHandle> {
  if (!("showDirectoryPicker" in window)) {
    throw new Error("File System Access API is not available in this browser.");
  }
  if (!projectDirHandle) {
    projectDirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
  }
  const perm = await (projectDirHandle as any).requestPermission?.({ mode: "readwrite" });
  if (perm && perm !== "granted") {
    throw new Error("Write permission denied for selected directory.");
  }
  return projectDirHandle!;
}

async function writeFile(dir: DirHandle, name: string, data: Blob | string) {
  const handle: FileHandle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  if (typeof data === "string") {
    await writable.write(new Blob([data], { type: "text/plain" }));
  } else {
    await writable.write(data);
  }
  await writable.close();
}

async function writeJSON(dir: DirHandle, name: string, obj: any) {
  await writeFile(dir, name, JSON.stringify(obj, null, 2));
}

async function safeRemove(dir: DirHandle, name: string) {
  try {
    await dir.removeEntry?.(name, { recursive: false });
  } catch (err) {
    console.warn("[Save] cleanup skip:", name, err);
  }
}

// ---------- Math helpers ----------
const toDeg = (rad: number) => rad * 180 / Math.PI;
const toRad = (deg: number) => deg * Math.PI / 180;

// ---------- Sensors serialization helpers ----------
function serializeSensors(): any[] {
  // قبل از serialize، ترنسفورم‌های فعلی همه سنسورها را ذخیره کن
  for (const [id, s] of sensors) {
    const h = sensorHandles.get(id);
    if (h && s) {
      // position
      s.position = { x: h.position.x, y: h.position.y, z: h.position.z };
      // scale
      const world = h.scaling.x;
      const newBase = world / GLB_WORLD_SCALE;
      s.scale = newBase > 0.0001 ? newBase : 0.0001;
      // rotation
      const r = (h.rotationQuaternion ? h.rotationQuaternion.toEulerAngles() : h.rotation);
      const toDeg = (rad: number) => rad * 180 / Math.PI;
      s.rotationEulerDeg = { x: toDeg(r.x), y: toDeg(r.y), z: toDeg(r.z) };
    }
  }
  
  return Array.from(sensors.values()).map((s: any) => ({
    id: s.id,
    type: s.type,
    label: s.label,
    deviceId: s.deviceId,
    topic: s.topic ?? undefined,
    color: s.color,
    transform: {
      position: s.position,
      rotationEulerDeg: s.rotationEulerDeg ?? { x: 0, y: 0, z: 0 },
      scale: { x: s.scale, y: s.scale, z: s.scale },
    },
  }));
}

function clearAllSensorsSoft(): void {
  try {
    for (const h of (sensorHandles as any)?.values?.() || []) {
      try { (h as any).getChildMeshes?.().forEach((c: any) => c.dispose()); } catch {}
      try { (h as any).dispose?.(); } catch {}
    }
    (sensorHandles as any)?.clear?.();
    (sensors as any)?.clear?.();
    updateSensorList();
  } catch (e) {
    console.warn("[Sensors] clearAllSensorsSoft:", e);
  }
}

function recreateSensorFromSerialized(s: any): void {
  const scl = s.transform?.scale || { x: 1, y: 1, z: 1 };
  const roughlyUniform = Math.abs(scl.x - scl.y) < 1e-6 && Math.abs(scl.x - scl.z) < 1e-6;
  const scaleValue = roughlyUniform ? scl.x : (scl.x + scl.y + scl.z) / 3;

  const node = {
    id: s.id,
    label: s.label,
    type: s.type,
    deviceId: s.deviceId,
    topic: s.topic ?? undefined,
    position: s.transform?.position ?? { x: 0, y: 0, z: 0 },
    color: s.color,
    scale: scaleValue,
    rotationEulerDeg: s.transform?.rotationEulerDeg || s.transform?.rotation || { x: 0, y: 0, z: 0 },
  } as any;

  sensors.set(node.id, node);
  const h = createSensorHandle(node);
  try {
    // سنسورها در ایجاد دستی parent ندارند؛ همان رفتار را در لود رعایت می‌کنیم
    (h as any).parent = null;
    // اعمال ترنسفورم ذخیره‌شده (local = world چون parent ندارد)
    (h as any).rotationQuaternion = null;
    const r = node.rotationEulerDeg || { x: 0, y: 0, z: 0 };
    const toRad = (deg: number) => deg * Math.PI / 180;
    (h as any).rotation?.set(toRad(r.x), toRad(r.y), toRad(r.z));
    (h as any).position?.set(node.position.x, node.position.y, node.position.z);
    // اطمینان از اعمال صحیح scale
    (h as any).scaling?.setAll((node.scale ?? 1) * GLB_WORLD_SCALE);
  } catch {}
  updateSensorList();
}

// ---------- Public: Save Project to .dtsp (and cleanup temp files) ----------
export async function saveProjectToFolder() {
  // Fallback: بدون FS Access → دانلود مستقیم .dtsp
  if (!("showDirectoryPicker" in window)) {
    const zip = new JSZip();

    // Environments (embed GLBs from dataB64)
    const metaEnvs: Array<{
      name: string;
      file: string;
      transform: {
        position: { x: number; y: number; z: number };
        rotationEulerDeg: { x: number; y: number; z: number };
        scale: { x: number; y: number; z: number };
      };
    }> = [];

    for (const e of getAllEnvEntries()) {
      const r = e.root as any;
      const safeBase = (e.name || "Env").replace(/[^\w\-]+/g, "_");
      const file = `${safeBase}_${e.id}.glb`;

      const dataB64 = (e as any).dataB64 as string | undefined;
      if (dataB64) {
        const arr = base64ToArrayBuffer(dataB64);
        zip.file(file, new Blob([arr], { type: "model/gltf-binary" }));
      } else {
        console.warn("[Save] Missing dataB64 for env:", e.name, e.id);
      }

      metaEnvs.push({
        name: e.name || "Env",
        file,
        transform: {
          position: { x: r.position.x, y: r.position.y, z: r.position.z },
          rotationEulerDeg: {
            x: toDeg(r.rotation?.x || 0),
            y: toDeg(r.rotation?.y || 0),
            z: toDeg(r.rotation?.z || 0),
          },
          scale: { x: r.scaling.x, y: r.scaling.y, z: r.scaling.z },
        },
      });
    }

    const projectJson = {
      kind: "digital-twin-project-meta",
      version: 3,
      savedAt: new Date().toISOString(),
      environments: metaEnvs,
      sensors: serializeSensors(),
    };

    zip.file("project.json", new Blob([JSON.stringify(projectJson, null, 2)], { type: "application/json" }));
    const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = "project.dtsp";
    a.click();
    URL.revokeObjectURL(a.href);

    console.info("[Save] Downloaded project.dtsp (fallback, no temp files).");
    return;
  }

  // مسیر معمول: با FS Access
  const dir = await ensureProjectDirectory();
  const zip = new JSZip();
  const tempFiles: string[] = [];

  // Environments: نوشتن GLBهای موقت + افزودن به zip
  const metaEnvs: Array<{
    name: string;
    file: string;
    transform: {
      position: { x: number; y: number; z: number };
      rotationEulerDeg: { x: number; y: number; z: number };
      scale: { x: number; y: number; z: number };
    };
  }> = [];

  for (const e of getAllEnvEntries()) {
    const r = e.root as any;
    const safeBase = (e.name || "Env").replace(/[^\w\-]+/g, "_");
    const file = `${safeBase}_${e.id}.glb`;

    const dataB64 = (e as any).dataB64 as string | undefined;
    if (dataB64) {
      const arr = base64ToArrayBuffer(dataB64);
      const glbBlob = new Blob([arr], { type: "model/gltf-binary" });

      // temp write
      await writeFile(dir, file, glbBlob);
      tempFiles.push(file);

      // zip
      zip.file(file, glbBlob);
    } else {
      console.warn("[Save] Missing dataB64 for env:", e.name, e.id);
    }

    metaEnvs.push({
      name: e.name || "Env",
      file,
      transform: {
        position: { x: r.position.x, y: r.position.y, z: r.position.z },
        rotationEulerDeg: {
          x: toDeg(r.rotation?.x || 0),
          y: toDeg(r.rotation?.y || 0),
          z: toDeg(r.rotation?.z || 0),
        },
        scale: { x: r.scaling.x, y: r.scaling.y, z: r.scaling.z },
      },
    });
  }

  // project.json (temp + zip)
  const projectJson = {
    kind: "digital-twin-project-meta",
    version: 3,
    savedAt: new Date().toISOString(),
    environments: metaEnvs,
    sensors: serializeSensors(),
  };
  const projectJsonStr = JSON.stringify(projectJson, null, 2);

  await writeJSON(dir, "project.json", projectJson);
  tempFiles.push("project.json");
  zip.file("project.json", new Blob([projectJsonStr], { type: "application/json" }));

  // Build dtsp
  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  await writeFile(dir, "project.dtsp", zipBlob);
  console.info("[Save] Wrote project.dtsp");

  // Cleanup temp files
  for (const name of tempFiles) {
    await safeRemove(dir, name);
  }
  console.info("[Save] Cleaned temp files:", tempFiles);

  console.info("[Save] Done (dtsp only remains).");
}

// ---------- Public: Load legacy JSON/DTProj (best-effort) ----------
export async function loadProjectFromFile(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text);

  clearAllEnvironments();
  clearAllSensorsSoft();

  // v3-style meta with environments[]
  if (Array.isArray(data?.environments)) {
    for (const env of data.environments) {
      // اولویت: dataB64 → file → glbPath
      if (env.dataB64) {
        await addEnvironmentFromProjectB64(env.name || "Env", env.dataB64, {
          position: env.transform?.position,
          rotationEulerDeg: env.transform?.rotationEulerDeg || env.transform?.rotation,
          scale: env.transform?.scale,
        }, true);
      } else if (env.file) {
        try {
          const res = await fetch(env.file);
          const buf = await res.arrayBuffer();
          const id = await addEnvironmentFromGLBArrayBuffer(buf, env.name || env.file);
          const r = (getAllEnvEntries().find(e => e.id === id) as any)?.root;
          if (r) {
            const rot = env.transform?.rotationEulerDeg || env.transform?.rotation || { x: 0, y: 0, z: 0 };
            r.position.set(env.transform?.position?.x || 0, env.transform?.position?.y || 0, env.transform?.position?.z || 0);
            r.rotationQuaternion = null;
            r.rotation.set(toRad(rot.x), toRad(rot.y), toRad(rot.z));
            const sc = env.transform?.scale || { x: 1, y: 1, z: 1 };
            r.scaling.set(sc.x, sc.y, sc.z);
          }
        } catch (e) {
          console.warn("[Load JSON] failed fetching env.file", env.file, e);
        }
      } else if (env.glbPath) {
        try {
          const res = await fetch(env.glbPath);
          const buf = await res.arrayBuffer();
          const id = await addEnvironmentFromGLBArrayBuffer(buf, env.name || env.glbPath);
          const r = (getAllEnvEntries().find(e => e.id === id) as any)?.root;
          if (r) {
            const rot = env.transform?.rotationEulerDeg || env.transform?.rotation || { x: 0, y: 0, z: 0 };
            r.position.set(env.transform?.position?.x || 0, env.transform?.position?.y || 0, env.transform?.position?.z || 0);
            r.rotationQuaternion = null;
            r.rotation.set(toRad(rot.x), toRad(rot.y), toRad(rot.z));
            const sc = env.transform?.scale || { x: 1, y: 1, z: 1 };
            r.scaling.set(sc.x, sc.y, sc.z);
          }
        } catch (e) {
          console.warn("[Load JSON] failed fetching env.glbPath", env.glbPath, e);
        }
      }
    }
    if (Array.isArray(data?.sensors)) {
      try { await prefabsReady; } catch {}
      for (const s of data.sensors) recreateSensorFromSerialized(s);
    }
  }
  // v2/v1 محتوای قدیمی
  else if ((data as any).environment) {
    const env = (data as any).environment!;
    await addEnvironmentFromProjectB64(env.name || "Env", env.dataB64, env.transform, true);
    if (Array.isArray((data as any).sensors)) {
      try { await prefabsReady; } catch {}
      for (const s of (data as any).sensors) recreateSensorFromSerialized(s);
    }
  } else {
    console.warn("[Load JSON] Unrecognized project schema.");
  }

  (window as any).selectedId = null;
  console.info("[Load JSON] Done.");
}

// ---------- Public: Load from .dtsp ----------
export async function loadProjectFromDtsp(file: File | Blob): Promise<void> {
  const zip = await JSZip.loadAsync(file);
  const metaEntry = zip.file("project.json");
  if (!metaEntry) throw new Error("project.json not found inside .dtsp");

  const metaText = await metaEntry.async("string");
  const meta = JSON.parse(metaText) as {
    version?: number;
    environments?: Array<{
      name?: string;
      file?: string;        // path in zip
      glbPath?: string;     // legacy (ignored inside zip)
      transform: {
        position: { x: number; y: number; z: number };
        rotationEulerDeg?: { x: number; y: number; z: number };
        rotation?: { x: number; y: number; z: number };
        scale: { x: number; y: number; z: number };
      };
    }>;
    sensors?: Array<any>;
  };

  clearAllEnvironments();
  clearAllSensorsSoft();

  // Envs
  for (const e of (meta.environments || [])) {
    const filePath = e.file || e.glbPath;
    if (!filePath) continue;

    const glb = zip.file(filePath);
    if (!glb) { console.warn("[DTSP] Missing GLB:", filePath); continue; }

    const buf = await glb.async("arraybuffer");
    const envId = await addEnvironmentFromGLBArrayBuffer(buf, e.name || filePath);

    const root = (getAllEnvEntries().find(en => en.id === envId) as any)?.root;
    if (root) {
      const rot = e.transform.rotationEulerDeg || e.transform.rotation || { x: 0, y: 0, z: 0 };
      root.position.set(e.transform.position.x, e.transform.position.y, e.transform.position.z);
      root.rotationQuaternion = null;
      root.rotation.set(toRad(rot.x), toRad(rot.y), toRad(rot.z));
      root.scaling.set(e.transform.scale.x, e.transform.scale.y, e.transform.scale.z);
    }
  }

  // Sensors
  if (meta.sensors && meta.sensors.length) {
    try { await prefabsReady; } catch {}
    for (const s of (meta.sensors || [])) {
      recreateSensorFromSerialized(s);
    }
  }

  (window as any).selectedId = null;
  console.info("[DTSP] Project loaded.");
}

// ---------- Optional: small sensor utils to match possible imports ----------
export async function saveSceneSensors(): Promise<Blob> {
  const json = JSON.stringify(serializeSensors(), null, 2);
  return new Blob([json], { type: "application/json" });
}

export async function loadSceneSensorsFromFile(file: File): Promise<void> {
  const txt = await file.text();
  const arr = JSON.parse(txt);
  clearAllSensorsSoft();
  if (Array.isArray(arr)) {
    for (const s of arr) recreateSensorFromSerialized(s);
  }
  console.info("[Sensors] Loaded from file.");
}
