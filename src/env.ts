// src/env.ts — Multi-Environment Manager (registry-based, single export set)
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import { scene } from "./core/scene";
import { updateSensorList } from "./sensors";

// ===== Types =====
export type EnvEntry = {
  id: string;
  name: string;
  container: BABYLON.AssetContainer;
  root: BABYLON.TransformNode;
  dataB64?: string;
};

// ===== State =====
export const envs = new Map<string, EnvEntry>();
let activeEnvId: string | null = null;

// ===== Environment Catalog =====
export type EnvironmentCatalogItem = {
  id: string;
  name: string;
  description: string;
  url: string;
  thumbnail?: string;
  category: string;
};

export const environmentCatalog: EnvironmentCatalogItem[] = [
  {
    id: "room1",
    name: "Room 1",
    description: "First room environment for sensor monitoring",
    url: "/models/room1.glb",
    category: "Rooms"
  },
  {
    id: "room2",
    name: "Room 2",
    description: "Second room environment for sensor monitoring",
    url: "/models/room2.glb",
    category: "Rooms"
  },
  {
    id: "room3",
    name: "Room 3",
    description: "Third room environment for sensor monitoring",
    url: "/models/room3.glb",
    category: "Rooms"
  },
  {
    id: "room4",
    name: "Room 4",
    description: "Fourth room environment for sensor monitoring",
    url: "/models/room4.glb",
    category: "Rooms"
  },
  {
    id: "room5",
    name: "Room 5",
    description: "Fifth room environment for sensor monitoring",
    url: "/models/room5.glb",
    category: "Rooms"
  }
];

export function getEnvironmentCatalog(): EnvironmentCatalogItem[] {
  return environmentCatalog;
}

export function getEnvironmentCatalogByCategory(category: string): EnvironmentCatalogItem[] {
  return environmentCatalog.filter(env => env.category === category);
}

export async function addEnvironmentFromCatalog(catalogId: string): Promise<string> {
  const catalogItem = environmentCatalog.find(env => env.id === catalogId);
  if (!catalogItem) {
    throw new Error(`Environment catalog item not found: ${catalogId}`);
  }

  try {
    // بارگذاری فایل GLB از URL
    const response = await fetch(catalogItem.url);
    if (!response.ok) {
      throw new Error(`Failed to load environment: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return await addEnvironmentFromGLBArrayBuffer(arrayBuffer, catalogItem.name);
  } catch (error) {
    console.error(`[Environment Catalog] Failed to load ${catalogItem.name}:`, error);
    throw error;
  }
}

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
  
  // ابتدا بررسی metadata
  const metadata = (cur as any).metadata;
  if (metadata && metadata.isEnvironment && metadata.envId) {
    return metadata.envId;
  }
  
  // سپس بررسی hierarchy
  while (cur) {
    for (const [id, e] of envs) {
      // بررسی root node
      if (cur === e.root) return id;
      // بررسی mesh های فرزند root
      if (e.root && cur.parent === e.root) return id;
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
  
  // ایجاد envId قبل از استفاده
  const envId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // اضافه کردن metadata به root
  (root as any).metadata = { 
    envId: envId, 
    isEnvironment: true,
    envName: name || "Env"
  };

  container.addAllToScene();
  for (const mesh of container.meshes) {
    if (!mesh.parent) mesh.parent = root;
    // اولویت رندر محیط بالاتر از grid
    mesh.renderingGroupId = 1;
    // فعال‌سازی انتخاب برای مدل‌های محیط
    mesh.isPickable = true;
    // اطمینان از اینکه mesh قابل انتخاب است
    mesh.checkCollisions = false;
    mesh.isVisible = true;
    
    // اضافه کردن metadata برای تشخیص آسان‌تر
    (mesh as any).metadata = { 
      envId: envId, 
      isEnvironment: true,
      envName: name || "Env"
    };
    
  }

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
  
  // انتخاب محیط جدید و لغو انتخاب قبلی
  (window as any).selectedId = `env_${envId}`;
  updateEnvironmentList();
  updateSensorList();
  return envId;
}

export async function addEnvironmentFromGLBFile(file: File, name?: string): Promise<string> {
  // اینجا مستقیم خودِ File را به SceneLoader می‌دهیم (تشخیص glTF درست انجام می‌شود)
  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync("", file, scene);
  const root = new BABYLON.TransformNode(name || file.name || "Env", scene);
  
  // ایجاد envId قبل از استفاده
  const envId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // اضافه کردن metadata به root
  (root as any).metadata = { 
    envId: envId, 
    isEnvironment: true,
    envName: name || file.name || "Env"
  };

  container.addAllToScene();
  for (const mesh of container.meshes) {
    if (!mesh.parent) mesh.parent = root;
    // اولویت رندر محیط بالاتر از grid
    mesh.renderingGroupId = 1;
    // فعال‌سازی انتخاب برای مدل‌های محیط
    mesh.isPickable = true;
    // اطمینان از اینکه mesh قابل انتخاب است
    mesh.checkCollisions = false;
    mesh.isVisible = true;
    
    // اضافه کردن metadata برای تشخیص آسان‌تر
    (mesh as any).metadata = { 
      envId: envId, 
      isEnvironment: true,
      envName: name || file.name || "Env"
    };
    
  }

  const buf = await file.arrayBuffer(); // برای ذخیره در پروژه
  envs.set(envId, {
    id: envId,
    name: name || file.name || "Env",
    container,
    root,
    dataB64: arrayBufferToBase64(buf),
  });

  setActiveEnvironment(envId);
  
  // انتخاب محیط جدید و لغو انتخاب قبلی
  (window as any).selectedId = `env_${envId}`;
  updateEnvironmentList();
  updateSensorList();
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

  if (makeActive) {
    activeEnvId = id;
    // انتخاب محیط جدید و لغو انتخاب قبلی
    (window as any).selectedId = `env_${id}`;
    updateEnvironmentList();
    updateSensorList();
  } else {
    updateEnvironmentList();
  }
  e.dataB64 = dataB64;
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

  const selectedId = (window as any).selectedId;
  
  envList.innerHTML = entries.map(env => {
    const isSelected = selectedId === `env_${env.id}`;
    return `
      <div class="env-item ${isSelected ? 'selected' : ''}" data-env-id="${env.id}">
        <span class="env-name">${env.name}</span>
        <button class="env-delete" onclick="removeEnvironmentById('${env.id}')">Delete</button>
      </div>
    `;
  }).join('');

  // Add event listeners for click and double-click
  envList.querySelectorAll('.env-item').forEach(item => {
    const envId = item.getAttribute('data-env-id');
    if (!envId) return;

    // Single click - select environment
    item.addEventListener('click', (e) => {
      // Prevent event bubbling if delete button was clicked
      if ((e.target as HTMLElement).classList.contains('env-delete')) {
        return;
      }
      
      selectEnvironmentById(envId);
    });

    // Double click - frame environment
    item.addEventListener('dblclick', (e) => {
      // Prevent event bubbling if delete button was clicked
      if ((e.target as HTMLElement).classList.contains('env-delete')) {
        return;
      }
      
      frameEnvironmentById(envId);
    });
  });
}

// Function to select environment by ID
export function selectEnvironmentById(envId: string): void {
  const env = envs.get(envId);
  
  if (env) {
    // انتخاب محیط
    (window as any).selectedId = `env_${envId}`;
    setActiveEnvironment(envId);
    
    // مخفی کردن popup سنسور
    const hidePopup = (window as any).hidePopup;
    if (hidePopup) {
      hidePopup();
    }
    
    // مخفی کردن پنل scene properties
    const hideSceneProperties = (window as any).hideSceneProperties;
    if (hideSceneProperties) {
      hideSceneProperties();
    }
    
    // اضافه کردن highlight بصری به محیط
    const addSelectionHighlight = (window as any).addSelectionHighlight;
    if (addSelectionHighlight && env.root) {
      // برای TransformNode، highlight را به اولین mesh فرزند اعمال می‌کنیم
      const firstMesh = env.root.getChildMeshes()[0];
      if (firstMesh) {
        addSelectionHighlight(firstMesh);
      }
    }
    
    // فعال‌سازی ابزار ترنسفورم در صورت انتخاب
    const btnMove = document.getElementById("btnMove") as HTMLButtonElement;
    const btnRotate = document.getElementById("btnToolRotate") as HTMLButtonElement;
    const btnScale = document.getElementById("btnToolScale") as HTMLButtonElement;
    
    if (btnMove?.getAttribute("aria-pressed") === "true") {
      const enableMove = (window as any).enableMove;
      if (enableMove) enableMove();
    } else if (btnRotate?.getAttribute("aria-pressed") === "true") {
      const enableRotate = (window as any).enableRotate;
      if (enableRotate) enableRotate();
    } else if (btnScale?.getAttribute("aria-pressed") === "true") {
      const enableScale = (window as any).enableScale;
      if (enableScale) enableScale();
    } else {
      const enableSelect = (window as any).enableSelect;
      if (enableSelect) enableSelect();
    }
    
    // به‌روزرسانی لیست‌ها برای نمایش انتخاب
    updateSensorList();
    updateEnvironmentList();
    
    console.log("[DEBUG] Environment selected from list:", envId);
  }
}

// Function to frame environment by ID
export function frameEnvironmentById(envId: string): void {
  const env = envs.get(envId);
  
  if (env && env.root) {
    // ابتدا محیط را انتخاب کن
    selectEnvironmentById(envId);
    
    // سپس روی آن زوم کن
    const frameNode = (window as any).frameNode;
    if (frameNode) {
      frameNode(env.root);
    }
    
    console.log("[DEBUG] Environment framed from list:", envId);
  }
}

// Global function for delete buttons
(window as any).removeEnvironmentById = (id: string) => {
  // اگر محیط انتخاب‌شده بود، انتخاب را پاک کن
  if ((window as any).selectedId === `env_${id}`) {
    (window as any).selectedId = null;
    
    // مخفی کردن پنل scene properties
    const hideSceneProperties = (window as any).hideSceneProperties;
    if (hideSceneProperties) {
      hideSceneProperties();
    }
  }
  
  removeEnvironment(id);
  updateEnvironmentList();
};
