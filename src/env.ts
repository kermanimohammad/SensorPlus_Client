// src/env.ts — Multi-Environment Manager (registry-based, single export set)
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import { scene } from "./core/scene";

// ===== Types =====
export type EnvEntry = {
  id: string;
  name: string;
  container: BABYLON.AssetContainer;
  root: BABYLON.TransformNode;
  dataB64?: string;
};

// ===== State =====
const envs = new Map<string, EnvEntry>();
let activeEnvId: string | null = null;

// ===== Utils (base64 <-> ArrayBuffer) =====
export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ===== Registry helpers =====
// createEnvId function removed as it was unused

export function getAllEnvEntries(): EnvEntry[] {
  return Array.from(envs.values());
}

export function getActiveEnvRoot(): BABYLON.TransformNode | null {
  if (!activeEnvId) return null;
  const e = envs.get(activeEnvId);
  return e?.root || null;
}

export function setActiveEnvironment(id: string | null): void {
  activeEnvId = id;
}

export function getActiveEnvironmentId(): string | null {
  return activeEnvId;
}

export function resolveEnvFromMesh(node: BABYLON.Node | null | undefined): string | null {
  if (!node) return null;
  let cur = node as BABYLON.Node | null;
  while (cur) {
    for (const [id, e] of envs) {
      if (cur === e.root) return id;
    }
    cur = (cur.parent as BABYLON.Node | null) || null;
  }
  return null;
}

// ===== Core: add/remove/clear =====
export async function addEnvironmentFromGLBArrayBuffer(
  buf: ArrayBuffer,
  name?: string
): Promise<string> {
  // ساخت File با پسوند .glb تا لودر درست انتخاب شود
  const safeName =
    (name && name.toLowerCase().endsWith(".glb")) ? name : ((name || "Env") + ".glb");
  const file = new File([buf], safeName, { type: "model/gltf-binary" });

  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync("", file, scene);
  const root = new BABYLON.TransformNode(name || "Env", scene);

  container.addAllToScene();
  for (const mesh of container.meshes) {
    if (!mesh.parent) mesh.parent = root;
    // اولویت رندر محیط بالاتر از grid
    mesh.renderingGroupId = 1;
  }

  const envId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  envs.set(envId, {
    id: envId,
    name: name || "Env",
    container,
    root,
  });

  // برای ذخیره پروژه (اختیاری)
  const e = envs.get(envId)!;
  e.dataB64 = arrayBufferToBase64(buf);

  setActiveEnvironment(envId);
  updateEnvironmentList();
  return envId;
}

export async function addEnvironmentFromGLBFile(file: File, name?: string): Promise<string> {
  // اینجا مستقیم خودِ File را به SceneLoader می‌دهیم (تشخیص glTF درست انجام می‌شود)
  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync("", file, scene);
  const root = new BABYLON.TransformNode(name || file.name || "Env", scene);

  container.addAllToScene();
  for (const mesh of container.meshes) {
    if (!mesh.parent) mesh.parent = root;
    // اولویت رندر محیط بالاتر از grid
    mesh.renderingGroupId = 1;
  }

  const buf = await file.arrayBuffer(); // برای ذخیره در پروژه
  const envId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  envs.set(envId, {
    id: envId,
    name: name || file.name || "Env",
    container,
    root,
    dataB64: arrayBufferToBase64(buf),
  });

  setActiveEnvironment(envId);
  updateEnvironmentList();
  return envId;
}

export async function addEnvironmentFromProjectB64(
  name: string,
  dataB64: string,
  transform?: {
    position?: { x: number; y: number; z: number };
    rotationEulerDeg?: { x: number; y: number; z: number };
    rotationYDeg?: number;
    scale?: { x: number; y: number; z: number } | number;
  },
  makeActive: boolean = true
): Promise<string> {
  const buf = base64ToArrayBuffer(dataB64);
  const id = await addEnvironmentFromGLBArrayBuffer(buf, name);
  const e = envs.get(id)!;

  const pos = transform?.position || { x: 0, y: 0, z: 0 };
  e.root.position.set(pos.x, pos.y, pos.z);

  e.root.rotationQuaternion = null;
  if (transform?.rotationEulerDeg) {
    const r = transform.rotationEulerDeg;
    e.root.rotation.set(
      BABYLON.Angle.FromDegrees(r.x).radians(),
      BABYLON.Angle.FromDegrees(r.y).radians(),
      BABYLON.Angle.FromDegrees(r.z).radians()
    );
  } else if (typeof transform?.rotationYDeg === "number") {
    e.root.rotation.set(0, BABYLON.Angle.FromDegrees(transform.rotationYDeg).radians(), 0);
  }

  if (transform?.scale != null) {
    if (typeof transform.scale === "number") {
      e.root.scaling.setAll(transform.scale);
    } else {
      e.root.scaling.set(transform.scale.x, transform.scale.y, transform.scale.z);
    }
  }

  if (makeActive) activeEnvId = id;
  e.dataB64 = dataB64;
  updateEnvironmentList();
  return id;
}

export function removeEnvironment(id: string): boolean {
  const e = envs.get(id);
  if (!e) return false;

  try {
    // اگر گیزمو به این محیط متصل است، آن را جدا کن
    const gizmoManager = (window as any).gizmoManager;
    if (gizmoManager && gizmoManager.attachedMesh === e.root) {
      gizmoManager.attachToMesh(null);
    }
    
    e.container.removeAllFromScene();
    e.root.getChildMeshes().forEach((m) => m.dispose());
    e.root.dispose();
    e.container.dispose();
  } catch {
    // no-op
  }
  envs.delete(id);
  if (activeEnvId === id) activeEnvId = null;
  updateEnvironmentList();
  return true;
}

export function removeActiveEnvironment(): boolean {
  if (!activeEnvId) return false;
  return removeEnvironment(activeEnvId);
}

export function clearAllEnvironments(): void {
  const ids = Array.from(envs.keys());
  for (const id of ids) removeEnvironment(id);
  activeEnvId = null;
  updateEnvironmentList();
}

// Update the environment list UI
export function updateEnvironmentList(): void {
  const envList = document.getElementById('envList');
  if (!envList) return;

  const entries = getAllEnvEntries();
  
  if (entries.length === 0) {
    envList.innerHTML = '<div class="list-empty">No environments loaded</div>';
    return;
  }

  envList.innerHTML = entries.map(env => `
    <div class="env-item" data-env-id="${env.id}">
      <span class="env-name">${env.name}</span>
      <button class="env-delete" onclick="removeEnvironmentById('${env.id}')">Delete</button>
    </div>
  `).join('');
}

// Global function for delete buttons
(window as any).removeEnvironmentById = (id: string) => {
  removeEnvironment(id);
  updateEnvironmentList();
};
