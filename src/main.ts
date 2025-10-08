// src/main.ts — save to folder (FS Access) + existing features
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import { loadProjectFromDtsp } from "./project";

// scene
import { scene, camera, canvas } from "./core/scene";

// types
import type { SensorNode, SensorType } from "./types";
import { GLB_WORLD_SCALE, genId } from "./types";

// sensors
import {
  prefabsReady,
  sensors,
  sensorHandles,
  createSensorHandle,
  resolveHandle,
  // tintHierarchy, // Removed to preserve original GLB materials
  showPopupFor,
  hidePopup,
  updateSensorList,
  selectSensorById,
  frameSensorById,
  popupDevId,
} from "./sensors";

// env (multi-environment API)
import {
  envs,
  addEnvironmentFromGLBArrayBuffer,
  getActiveEnvRoot,
  setActiveEnvironment,
  resolveEnvFromMesh,
  removeActiveEnvironment,
  updateEnvironmentList,
  selectEnvironmentById,
  frameEnvironmentById,
  getEnvironmentCatalog,
  addEnvironmentFromCatalog,
} from "./env";

// api client
import { wireApiButtons } from "./api-ui";

// sensor history
import { sensorHistoryUI } from "./sensor-history-ui";

// project
import {
  // saveSceneSensors,
  // loadSceneSensorsFromFile,
  // saveProject,                // ← دیگر لازم نیست روی دکمه‌ی UI
  loadProjectFromFile,
  saveProjectToFolder,          // ← استفاده از فولدر
} from "./project";


/* ---------------------------------------------
   Environment Catalog Management
---------------------------------------------- */
function populateEnvironmentCatalog(): void {
  if (!envCatalogSelect) return;
  
  // پاک کردن گزینه‌های موجود (به جز اولین گزینه)
  envCatalogSelect.innerHTML = '<option value="">Select from catalog...</option>';
  
  // اضافه کردن محیط‌های کاتالوگ
  const catalog = getEnvironmentCatalog();
  catalog.forEach(env => {
    const option = document.createElement('option');
    option.value = env.id;
    option.textContent = `${env.name} (${env.category})`;
    option.title = env.description;
    envCatalogSelect.appendChild(option);
  });
}

/* ---------------------------------------------
   Scene Properties panel fill
---------------------------------------------- */
function fillScenePropertyPanel(s: SensorNode) {
  (document.getElementById("scene_p_label") as HTMLInputElement).value = s.label;
  (document.getElementById("scene_p_device") as HTMLInputElement).value = s.deviceId;
  (document.getElementById("scene_p_topic") as HTMLInputElement).value = s.topic ?? "";
  (document.getElementById("scene_p_color") as HTMLInputElement).value = s.color ?? "#3a86ff";
  (document.getElementById("scene_p_scale") as HTMLInputElement).value = String(s.scale ?? 1.0);
}

function showSceneProperties() {
  const propertiesGroup = document.getElementById("propertiesGroup");
  if (propertiesGroup) {
    propertiesGroup.style.display = "block";
  }
}

function hideSceneProperties() {
  const propertiesGroup = document.getElementById("propertiesGroup");
  if (propertiesGroup) {
    propertiesGroup.style.display = "none";
  }
}

/* ---------------------------------------------
   Scene panel elements
---------------------------------------------- */
const btnAdd   = document.getElementById("btnAdd")! as HTMLButtonElement;
// removed scene JSON save/load controls
const catalog  = document.getElementById("catalog") as HTMLSelectElement;

// tools dock
const btnSelect = document.getElementById("btnToolSelect") as HTMLButtonElement | null;
const btnMove   = document.getElementById("btnMove") as HTMLButtonElement | null;
const btnRotate = document.getElementById("btnToolRotate") as HTMLButtonElement | null;
const btnScale  = document.getElementById("btnToolScale") as HTMLButtonElement | null;
const btnDel    = document.getElementById("btnDelete") as HTMLButtonElement | null;

// environment upload
const envFileInput     = document.getElementById("envFile") as HTMLInputElement;
const envCatalogSelect = document.getElementById("envCatalog") as HTMLSelectElement;
const btnAddFromCatalog = document.getElementById("btnAddFromCatalog") as HTMLButtonElement;

// project panel
const btnSaveProject   = document.getElementById("btnSaveProject") as HTMLButtonElement;
const fileLoadProject = document.getElementById("fileLoadProject") as HTMLInputElement | null;

// scene properties panel
const sceneBtnBind = document.getElementById("scene_btnBind") as HTMLButtonElement;

/* ---------------------------------------------
   Selected id and tool state
---------------------------------------------- */
(window as any).selectedId = (window as any).selectedId ?? null;
(window as any).isTransformMode = false; // برای تشخیص حالت ترنسفورم

/* ---------------------------------------------
   Gizmo manager + tools
---------------------------------------------- */
const gizmos = new BABYLON.GizmoManager(scene);
gizmos.usePointerToAttachGizmos = false;
gizmos.positionGizmoEnabled = false;
gizmos.rotationGizmoEnabled = false;
gizmos.scaleGizmoEnabled    = false;

// تنظیمات اضافی برای جلوگیری از تداخل با کنترل‌های دوربین
gizmos.gizmos.positionGizmo?.onDragStartObservable.add(() => {
  console.log("[DEBUG] Position gizmo drag started");
  camera.detachControl();
  isGizmoInteraction = true; // شروع تعامل با گیزمو
});

gizmos.gizmos.positionGizmo?.onDragEndObservable.add(() => {
  console.log("[DEBUG] Position gizmo drag ended");
  camera.attachControl(canvas, true);
  // تاخیر بیشتر برای جلوگیری از تداخل با POINTERPICK
  setTimeout(() => { 
    isGizmoInteraction = false; 
    wasInitialClickOnGizmo = false;
    console.log("[DEBUG] Position gizmo interaction flag reset");
  }, 300);
});

gizmos.gizmos.rotationGizmo?.onDragStartObservable.add(() => {
  console.log("[DEBUG] Rotation gizmo drag started");
  camera.detachControl();
  isGizmoInteraction = true; // شروع تعامل با گیزمو
});

gizmos.gizmos.rotationGizmo?.onDragEndObservable.add(() => {
  console.log("[DEBUG] Rotation gizmo drag ended");
  camera.attachControl(canvas, true);
  // تاخیر بیشتر برای جلوگیری از تداخل با POINTERPICK
  setTimeout(() => { 
    isGizmoInteraction = false; 
    wasInitialClickOnGizmo = false;
    console.log("[DEBUG] Rotation gizmo interaction flag reset");
  }, 300);
});

gizmos.gizmos.scaleGizmo?.onDragStartObservable.add(() => {
  console.log("[DEBUG] Scale gizmo drag started");
  camera.detachControl();
  isGizmoInteraction = true; // شروع تعامل با گیزمو
});

gizmos.gizmos.scaleGizmo?.onDragEndObservable.add(() => {
  console.log("[DEBUG] Scale gizmo drag ended");
  camera.attachControl(canvas, true);
  // تاخیر بیشتر برای جلوگیری از تداخل با POINTERPICK
  setTimeout(() => { 
    isGizmoInteraction = false; 
    wasInitialClickOnGizmo = false;
    console.log("[DEBUG] Scale gizmo interaction flag reset");
  }, 300);
});

// اضافه کردن event listener برای کلیک روی gizmo
// Note: onPointerDownObservable ممکن است در نسخه جدید Babylon.js موجود نباشد
// از onDragStartObservable استفاده می‌کنیم که قبلاً تعریف شده

// Make gizmo manager accessible globally for environment cleanup
(window as any).gizmoManager = gizmos;

// متغیر برای ردیابی تعامل با گیزمو
let isGizmoInteraction = false;
// متغیر برای ردیابی اینکه آیا کلیک اولیه روی گیزمو بوده یا نه
let wasInitialClickOnGizmo = false;

// Make functions accessible globally for list interactions
(window as any).selectSensorById = selectSensorById;
(window as any).frameSensorById = frameSensorById;
(window as any).selectEnvironmentById = selectEnvironmentById;
(window as any).frameEnvironmentById = frameEnvironmentById;
(window as any).addSelectionHighlight = addSelectionHighlight;
(window as any).removeSelectionHighlight = removeSelectionHighlight;
(window as any).enableSelect = enableSelect;
(window as any).enableMove = enableMove;
(window as any).enableRotate = enableRotate;
(window as any).enableScale = enableScale;
(window as any).frameNode = frameNode;
(window as any).hidePopup = hidePopup;
(window as any).fillScenePropertyPanel = fillScenePropertyPanel;
(window as any).showSceneProperties = showSceneProperties;
(window as any).hideSceneProperties = hideSceneProperties;
if (gizmos.gizmos.rotationGizmo) {
  gizmos.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
}

// تابع برای اضافه کردن بازخورد بصری به مدل‌های انتخاب شده
function addSelectionHighlight(mesh: BABYLON.AbstractMesh) {
  // حذف highlight قبلی
  removeSelectionHighlight();
  
  // اعمال outline به mesh (روش صحیح Babylon.js)
  mesh.outlineColor = new BABYLON.Color3(1, 1, 0); // رنگ زرد
  mesh.outlineWidth = 0.02;
  mesh.renderOutline = true;
  
  // ذخیره reference برای حذف بعدی
  (window as any).selectedMeshOutline = mesh;
}

function removeSelectionHighlight() {
  const mesh = (window as any).selectedMeshOutline;
  if (mesh) {
    mesh.renderOutline = false;
    (window as any).selectedMeshOutline = null;
  }
}


// تابع کمکی برای لغو کامل انتخاب
function clearSelection() {
  console.log("[DEBUG] clearSelection called");
  // لغو انتخاب فعلی
  (window as any).selectedId = null;
  hidePopup();
  removeSelectionHighlight();
  
  // مخفی کردن پنل scene properties
  hideSceneProperties();
  
  // به‌روزرسانی لیست‌ها برای حذف highlight
  updateSensorList();
  updateEnvironmentList();
  
  // reset کردن flags
  isGizmoInteraction = false;
  wasInitialClickOnGizmo = false;
  
  gizmos.attachToMesh(null);
  
  // بررسی اینکه آیا ابزار ترنسفورم فعال است یا نه
  const isMoveActive = btnMove?.getAttribute("aria-pressed") === "true";
  const isRotateActive = btnRotate?.getAttribute("aria-pressed") === "true";
  const isScaleActive = btnScale?.getAttribute("aria-pressed") === "true";
  
  // اگر هیچ ابزار ترنسفورمی فعال نیست، ابزار انتخاب را فعال کن
  if (!isMoveActive && !isRotateActive && !isScaleActive) {
    enableSelect();
  } else {
    // ابزار ترنسفورم فعال را حفظ کن
    if (isMoveActive) {
      enableMove();
    } else if (isRotateActive) {
      enableRotate();
    } else if (isScaleActive) {
      enableScale();
    }
  }
}
function setToolPressed(el?: HTMLButtonElement | null) {
  [btnSelect, btnMove, btnRotate, btnScale].forEach(b => {
    if (!b) return;
    if (b === el) b.setAttribute("aria-pressed", "true");
    else b.removeAttribute("aria-pressed");
  });
}

function enableSelect() {
  gizmos.attachToMesh(null);
  gizmos.positionGizmoEnabled = false;
  gizmos.rotationGizmoEnabled = false;
  gizmos.scaleGizmoEnabled    = false;
  setToolPressed(btnSelect);
  // حذف highlight در حالت انتخاب
  removeSelectionHighlight();
  // خروج از حالت ترنسفورم
  (window as any).isTransformMode = false;
}

/** attach gizmo to selected sensor or active environment */
function attachToCurrentSelection(): boolean {
  const id = (window as any).selectedId as string | null;
  if (id) {
    // بررسی انتخاب سنسور
    if (!id.startsWith('env_')) {
      const h = sensorHandles.get(id);
      if (h) {
        gizmos.attachToMesh(h);
        return true;
      }
    } else {
      // انتخاب محیط
      const envRoot = getActiveEnvRoot();
      if (envRoot) {
        // برای TransformNode، gizmo را به root attach می‌کنیم تا ترنسفورم‌ها روی root اعمال شوند
        gizmos.attachToMesh(envRoot as any);
        return true;
      }
    }
  } else {
    // اگر هیچ مدلی انتخاب نشده، گیزمو را از mesh جدا کن
    gizmos.attachToMesh(null);
  }
  return false;
}

function enableMove() {
  // فعال‌سازی ابزار حرکت
  gizmos.positionGizmoEnabled = true;
  gizmos.rotationGizmoEnabled = false;
  gizmos.scaleGizmoEnabled    = false;
  setToolPressed(btnMove);
  // ورود به حالت ترنسفورم
  (window as any).isTransformMode = true;
  
  // اگر مدلی انتخاب شده، گیزمو را attach کن
  attachToCurrentSelection();
}
function enableRotate() {
  // فعال‌سازی ابزار چرخش
  gizmos.positionGizmoEnabled = false;
  gizmos.rotationGizmoEnabled = true;
  gizmos.scaleGizmoEnabled    = false;
  setToolPressed(btnRotate);
  // ورود به حالت ترنسفورم
  (window as any).isTransformMode = true;
  
  // اگر مدلی انتخاب شده، گیزمو را attach کن
  attachToCurrentSelection();
}
function enableScale() {
  // فعال‌سازی ابزار مقیاس
  gizmos.positionGizmoEnabled = false;
  gizmos.rotationGizmoEnabled = false;
  gizmos.scaleGizmoEnabled    = true;
  setToolPressed(btnScale);
  // ورود به حالت ترنسفورم
  (window as any).isTransformMode = true;
  
  // اگر مدلی انتخاب شده، گیزمو را attach کن
  attachToCurrentSelection();
}

/* ---------------------------------------------
   Persist sensor transform on drag end
---------------------------------------------- */
function persistPositionIfSensor() {
  const id = (window as any).selectedId as string | null;
  if (!id) return;
  
  if (id.startsWith('env_')) {
    // ذخیره موقعیت محیط
    const envId = id.replace('env_', '');
    const env = envs.get(envId);
    if (env && env.root) {
      console.log("[Persistence] Environment position:", env.root.position);
      console.log("[Persistence] Environment rotation:", env.root.rotation);
      console.log("[Persistence] Environment scaling:", env.root.scaling);
      // موقعیت محیط در env.root.position ذخیره می‌شود و هنگام save پروژه خوانده می‌شود
    }
    return;
  }
  
  // ذخیره موقعیت سنسور
  const h = sensorHandles.get(id);
  const s = sensors.get(id);
  if (!h || !s) return;
  s.position = { x: h.position.x, y: h.position.y, z: h.position.z };
  console.log("[Persistence] Position saved for", id, ":", s.position);
}
function persistScaleIfSensor() {
  const id = (window as any).selectedId as string | null;
  if (!id) return;
  
  if (id.startsWith('env_')) {
    // ذخیره مقیاس محیط
    const envId = id.replace('env_', '');
    const env = envs.get(envId);
    if (env && env.root) {
      console.log("[Persistence] Environment scale:", env.root.scaling);
      // مقیاس محیط در env.root.scaling ذخیره می‌شود و هنگام save پروژه خوانده می‌شود
    }
    return;
  }
  
  // ذخیره مقیاس سنسور
  const h = sensorHandles.get(id);
  const s = sensors.get(id);
  if (!h || !s) return;
  const world = h.scaling.x;
  const newBase = world / GLB_WORLD_SCALE;
  s.scale = newBase > 0.0001 ? newBase : 0.0001;
  h.scaling.setAll(s.scale * GLB_WORLD_SCALE);
  console.log("[Persistence] Scale saved for", id, ":", s.scale);
}
function persistRotationIfSensor() {
  const id = (window as any).selectedId as string | null;
  if (!id) return;
  
  if (id.startsWith('env_')) {
    // ذخیره چرخش محیط
    const envId = id.replace('env_', '');
    const env = envs.get(envId);
    if (env && env.root) {
      const r = (env.root.rotationQuaternion ? env.root.rotationQuaternion.toEulerAngles() : env.root.rotation);
      const toDeg = (rad: number) => rad * 180 / Math.PI;
      console.log("[Persistence] Environment rotation:", { x: toDeg(r.x), y: toDeg(r.y), z: toDeg(r.z) });
      // چرخش محیط در env.root.rotation ذخیره می‌شود و هنگام save پروژه خوانده می‌شود
    }
    return;
  }
  
  // ذخیره چرخش سنسور
  const h = sensorHandles.get(id);
  const s = sensors.get(id);
  if (!h || !s) return;
  const r = (h.rotationQuaternion ? h.rotationQuaternion.toEulerAngles() : h.rotation);
  const toDeg = (rad: number) => rad * 180 / Math.PI;
  s.rotationEulerDeg = { x: toDeg(r.x), y: toDeg(r.y), z: toDeg(r.z) };
  console.log("[Persistence] Rotation saved for", id, ":", s.rotationEulerDeg);
}
gizmos.gizmos.positionGizmo?.onDragEndObservable.add(persistPositionIfSensor);
gizmos.gizmos.scaleGizmo?.onDragEndObservable.add(persistScaleIfSensor);
gizmos.gizmos.rotationGizmo?.onDragEndObservable.add(persistRotationIfSensor);

// اضافه کردن persistence برای تغییرات مداوم
gizmos.gizmos.positionGizmo?.onDragObservable.add(persistPositionIfSensor);
gizmos.gizmos.scaleGizmo?.onDragObservable.add(persistScaleIfSensor);
gizmos.gizmos.rotationGizmo?.onDragObservable.add(persistRotationIfSensor);

/* ---------------------------------------------
   Scene: add/bind/save/load sensors
---------------------------------------------- */
btnAdd.addEventListener("click", async () => {
  await prefabsReady;
  const id   = genId();
  const type = (catalog.value as SensorType) || "temperature";
  // تنظیم deviceId پیش‌فرض بر اساس نوع سنسور
  const defaultDeviceIds: Record<SensorType, string> = {
    temperature: "temp-1",
    humidity: "hum-1", 
    co2: "co2-1",
    light: "light-1",
    solar: "solar-plant"
  };
  
  const s: SensorNode = {
    id, type,
    label: `${type}-${id.slice(2)}`,
    deviceId: defaultDeviceIds[type] || `${type.slice(0,3)}-${Math.floor(100 + Math.random() * 900)}`,
    position: { x: 0, y: 0.7, z: 0 },
    // color: palette[type], // Removed to preserve original GLB materials
    scale: 1.0,
  };
  sensors.set(id, s);
  const handle = createSensorHandle(s);
  
  // انتخاب سنسور جدید
  (window as any).selectedId = id;
  
  
  // پر کردن پنل scene properties
  fillScenePropertyPanel(s);
  showSceneProperties();
  
  // نمایش popup
  showPopupFor(s.deviceId, handle);
  
  // اضافه کردن highlight بصری
  addSelectionHighlight(handle);
  
  // به‌روزرسانی لیست سنسورها و لغو انتخاب محیط‌ها
  updateSensorList();
  updateEnvironmentList();

  // فعال‌سازی ابزار ترنسفورم در صورت انتخاب
  if (btnMove?.getAttribute("aria-pressed") === "true") enableMove();
  else if (btnRotate?.getAttribute("aria-pressed") === "true") enableRotate();
  else if (btnScale?.getAttribute("aria-pressed") === "true") enableScale();
  else {
    // اگر هیچ ابزار ترنسفورمی انتخاب نشده، به حالت انتخاب برگرد
    enableSelect();
  }
  
  console.log("[DEBUG] New sensor created and selected:", id);
});


// Scene Properties Apply Changes
sceneBtnBind.addEventListener("click", () => {
  const id = (window as any).selectedId as string | null;
  if (!id || id.startsWith('env_')) return; // Only for sensors
  
  const s = sensors.get(id);
  if (!s) return;
  
  s.label    = (document.getElementById("scene_p_label")  as HTMLInputElement).value || s.label;
  s.deviceId = (document.getElementById("scene_p_device") as HTMLInputElement).value || s.deviceId;
  s.topic    = (document.getElementById("scene_p_topic")  as HTMLInputElement).value || undefined;
  s.color    = (document.getElementById("scene_p_color")  as HTMLInputElement).value || s.color;
  s.scale    = Number((document.getElementById("scene_p_scale") as HTMLInputElement).value || s.scale || 1.0);

  const h = sensorHandles.get(id)!;
  h.scaling.setAll((s.scale ?? 1.0) * GLB_WORLD_SCALE);
  (h as any).metadata.deviceId = s.deviceId;
  
  // اگر tooltip باز است و deviceId تغییر کرده، آن را به‌روزرسانی کن
  if (popupDevId && popupDevId !== s.deviceId) {
    // اگر سنسور فعلی انتخاب شده و tooltip باز است، tooltip را به‌روزرسانی کن
    if ((window as any).selectedId === id) {
      showPopupFor(s.deviceId, h);
    }
  }
  
  // ذخیره‌سازی دستی ترنسفورم‌ها
  persistPositionIfSensor();
  persistScaleIfSensor();
  persistRotationIfSensor();
  
  // به‌روزرسانی لیست سنسورها
  updateSensorList();
  
  console.log("[DEBUG] Scene properties applied for sensor:", id);
});

// scene JSON save/load removed per requirement

/* ---------------------------------------------
   Tools dock actions
---------------------------------------------- */
btnSelect?.addEventListener("click", () => enableSelect());
btnMove  ?.addEventListener("click", () => enableMove());
btnRotate?.addEventListener("click", () => enableRotate());
btnScale ?.addEventListener("click", () => enableScale());
btnDel   ?.addEventListener("click", () => {
  const id = (window as any).selectedId as string | null;

  if (id) {
    if (id.startsWith('env_')) {
      // حذف محیط انتخاب شده
      removeActiveEnvironment();
      clearSelection();
    } else {
      // حذف سنسور
      const h = sensorHandles.get(id)!;
      try { h.getChildMeshes().forEach(c => c.dispose()); } catch {}
      try { h.dispose(); } catch {}
      sensorHandles.delete(id);
      sensors.delete(id);
      clearSelection();
      updateSensorList();
    }
  } else {
    // حذف محیط فعال (در صورت عدم انتخاب)
    removeActiveEnvironment();
    enableSelect();
  }
});

/* ---------------------------------------------
   Environment upload (multi-env)
---------------------------------------------- */
envFileInput?.addEventListener("change", async () => {
  const f = envFileInput.files?.[0]; if (!f) return;
  if (!/\.glb$/i.test(f.name)) { console.warn("Only .glb files are supported."); return; }
  const buf = await f.arrayBuffer();
  await addEnvironmentFromGLBArrayBuffer(buf, f.name);

  if (!(window as any).selectedId) {
    if (btnMove?.getAttribute("aria-pressed") === "true") enableMove();
    else if (btnRotate?.getAttribute("aria-pressed") === "true") enableRotate();
    else if (btnScale?.getAttribute("aria-pressed") === "true") enableScale();
  }
});

// Environment Catalog Add Button
btnAddFromCatalog?.addEventListener("click", async () => {
  const selectedEnvId = envCatalogSelect?.value;
  if (!selectedEnvId) {
    alert("Please select an environment from the catalog.");
    return;
  }

  try {
    console.log(`[Environment Catalog] Adding environment: ${selectedEnvId}`);
    await addEnvironmentFromCatalog(selectedEnvId);
    
    // Reset selection
    envCatalogSelect.value = "";
    
    // Activate transform tools if needed
    if (!(window as any).selectedId) {
      if (btnMove?.getAttribute("aria-pressed") === "true") enableMove();
      else if (btnRotate?.getAttribute("aria-pressed") === "true") enableRotate();
      else if (btnScale?.getAttribute("aria-pressed") === "true") enableScale();
    }
    
    console.log(`[Environment Catalog] Successfully added environment: ${selectedEnvId}`);
  } catch (error: any) {
    console.error("[Environment Catalog] Failed to add environment:", error);
    alert(`Failed to add environment: ${error.message}`);
  }
});

/* ---------------------------------------------
   Project save/load
---------------------------------------------- */
btnSaveProject?.addEventListener("click", async () => {
  try {
    await saveProjectToFolder(); // ← انتخاب فولدر + ذخیره‌ی GLBها + project.json
  } catch (err: any) {
    console.error("[Save] Failed:", err?.message || err);
    alert("Save failed: " + (err?.message || err));
  }
});

fileLoadProject?.addEventListener("change", async () => {
  const f = fileLoadProject.files?.[0];
  if (!f) return;
  
const name = f.name.toLowerCase();
try {
  if (name.endsWith(".dtsp")) {
    await loadProjectFromDtsp(f);
  } else {
    await loadProjectFromFile(f as any);
  }
} catch (err:any) {
  console.error("[LoadProject] failed:", err);
  alert("Load failed: " + (err?.message || err));
} finally {
  (fileLoadProject as any).value = "";
}
}
);

/* ---------------------------------------------
   Camera framing (double-click)
---------------------------------------------- */
function frameNode(node: BABYLON.Node, pad = 0.4, maxRadius = 30) {
  const bb = (node as any).getHierarchyBoundingVectors?.();
  if (!bb) return;
  const min: BABYLON.Vector3 = bb.min, max: BABYLON.Vector3 = bb.max;
  const center = BABYLON.Vector3.Center(min, max);
  const diag   = max.subtract(min);
  const radius = Math.max(diag.length() * 0.5 * pad, 0.5);

  const toTarget = center;
  const toRadius = Math.min(radius, maxRadius);

  const aTarget = new BABYLON.Animation("camTargetAnim","target",60,BABYLON.Animation.ANIMATIONTYPE_VECTOR3,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  aTarget.setKeys([{ frame: 0, value: camera.target.clone() }, { frame: 45, value: toTarget }]);

  const aRadius = new BABYLON.Animation("camRadiusAnim","radius",60,BABYLON.Animation.ANIMATIONTYPE_FLOAT,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  aRadius.setKeys([{ frame: 0, value: camera.radius }, { frame: 45, value: toRadius }]);

  const easing = new BABYLON.CubicEase(); easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
  aTarget.setEasingFunction(easing); aRadius.setEasingFunction(easing);

  camera.animations = [];
  camera.animations.push(aTarget, aRadius);
  scene.beginAnimation(camera, 0, 45, false);
}

/* ---------------------------------------------
   Picking: click select + double-click frame
---------------------------------------------- */


// Event listener اصلی برای POINTERPICK
scene.onPointerObservable.add((pi) => {
  if (pi.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
  const pick = pi.pickInfo;
  
  console.log("[DEBUG] POINTERPICK event - isGizmoInteraction:", isGizmoInteraction, "wasInitialClickOnGizmo:", wasInitialClickOnGizmo);
  console.log("[DEBUG] POINTERPICK - pick.hit:", pick?.hit, "pickedMesh:", pick?.pickedMesh?.name);
  
  // اگر در حال تعامل با گیزمو هستیم، انتخاب را لغو نکن
  if (isGizmoInteraction) {
    console.log("[DEBUG] POINTERPICK ignored due to gizmo interaction");
    return;
  }
  
  // اگر کلیک روی gizmo نبوده، flag را reset کن
  if (pick?.pickedMesh && !pick.pickedMesh.name.includes("gizmo") && !pick.pickedMesh.name.includes("Gizmo")) {
    wasInitialClickOnGizmo = false;
  }
  
  // اگر روی فضای خالی کلیک شده
  if (!pick?.hit || !pick.pickedMesh) {
    // اگر کلیک اولیه روی گیزمو نبوده، انتخاب را لغو کن
    if (!wasInitialClickOnGizmo) {
      console.log("[DEBUG] POINTERPICK on empty space - clearing selection (not on gizmo)");
      clearSelection();
    } else {
      console.log("[DEBUG] POINTERPICK on empty space - keeping selection (was on gizmo)");
    }
    return;
  }
  
  // اگر روی ground یا grid کلیک شده، انتخاب را لغو کن
  if (pick.pickedMesh && (pick.pickedMesh.name === "ground" || pick.pickedMesh.name === "grid")) {
    clearSelection();
    return;
  }
  
  // اگر روی gizmo کلیک شده، انتخاب را لغو نکن
  if (pick.pickedMesh && (pick.pickedMesh.name.includes("gizmo") || pick.pickedMesh.name.includes("Gizmo"))) {
    return;
  }

  // ابتدا بررسی سنسور
  const r = resolveHandle(pick.pickedMesh);
  if (r) {
    // انتخاب سنسور
    (window as any).selectedId = r.sensorId;
    const s = sensors.get(r.sensorId)!;
    
    
    // پر کردن پنل scene properties
    fillScenePropertyPanel(s);
    showSceneProperties();
    
    // نمایش popup
    showPopupFor(r.deviceId || s.deviceId, r.handle);
    
    // اضافه کردن highlight بصری
    addSelectionHighlight(r.handle);

    // به‌روزرسانی لیست‌ها برای highlight کردن آیتم انتخاب شده
    updateSensorList();
    updateEnvironmentList();

    // فعال‌سازی ابزار ترنسفورم در صورت انتخاب
    if (btnMove?.getAttribute("aria-pressed") === "true") enableMove();
    else if (btnRotate?.getAttribute("aria-pressed") === "true") enableRotate();
    else if (btnScale?.getAttribute("aria-pressed") === "true") enableScale();
    else {
      // اگر هیچ ابزار ترنسفورمی انتخاب نشده، به حالت انتخاب برگرد
      enableSelect();
    }
    
    console.log("[DEBUG] Sensor selected in 3D scene:", r.sensorId);
    return;
  }

  // سپس بررسی محیط
  const envId = resolveEnvFromMesh(pick.pickedMesh);
  if (envId) {
    // انتخاب محیط
    (window as any).selectedId = `env_${envId}`; // شناسه منحصر به فرد برای محیط
    setActiveEnvironment(envId);
    hidePopup(); // مخفی کردن popup سنسور
    
    // مخفی کردن پنل scene properties
    hideSceneProperties();
    
    // اضافه کردن highlight بصری به محیط
    const envRoot = getActiveEnvRoot();
    if (envRoot) {
      // برای TransformNode، highlight را به اولین mesh فرزند اعمال می‌کنیم
      const firstMesh = envRoot.getChildMeshes()[0];
      if (firstMesh) {
        addSelectionHighlight(firstMesh);
      }
    }

    // به‌روزرسانی لیست‌ها برای highlight کردن آیتم انتخاب شده
    updateSensorList();
    updateEnvironmentList();

    // فعال‌سازی ابزار ترنسفورم در صورت انتخاب
    if (btnMove?.getAttribute("aria-pressed") === "true") enableMove();
    else if (btnRotate?.getAttribute("aria-pressed") === "true") enableRotate();
    else if (btnScale?.getAttribute("aria-pressed") === "true") enableScale();
    else {
      // اگر هیچ ابزار ترنسفورمی انتخاب نشده، به حالت انتخاب برگرد
      enableSelect();
    }
    
  } else {
    // هیچ چیز انتخاب نشده - بازگشت به حالت انتخاب
    clearSelection();
  }
});

scene.onPointerObservable.add((pi) => {
  if (pi.type !== BABYLON.PointerEventTypes.POINTERDOUBLETAP) return;
  const pick = pi.pickInfo;
  if (!pick?.hit || !pick.pickedMesh) return;

  console.log("[DEBUG] POINTERDOUBLETAP - pick.hit:", pick?.hit, "pickedMesh:", pick?.pickedMesh?.name);

  // بررسی سنسور
  const r = resolveHandle(pick.pickedMesh);
  if (r) { 
    console.log("[DEBUG] Double-click on sensor - framing:", r.sensorId);
    frameNode(r.handle); 
    return; 
  }

  // بررسی محیط
  const envId = resolveEnvFromMesh(pick.pickedMesh);
  if (envId) {
    console.log("[DEBUG] Double-click on environment - framing:", envId);
    setActiveEnvironment(envId);
    const envRoot = getActiveEnvRoot();
    if (envRoot) frameNode(envRoot);
  }
});

// Event listener برای تشخیص کلیک روی فضای خالی
scene.onPointerObservable.add((pi) => {
  if (pi.type !== BABYLON.PointerEventTypes.POINTERDOWN) return;
  const pick = pi.pickInfo;
  
  console.log("[DEBUG] POINTERDOWN event - isGizmoInteraction:", isGizmoInteraction, "wasInitialClickOnGizmo:", wasInitialClickOnGizmo);
  console.log("[DEBUG] POINTERDOWN - pick.hit:", pick?.hit, "pickedMesh:", pick?.pickedMesh?.name);
  
  // اگر در حال تعامل با گیزمو هستیم، کاری نکن
  if (isGizmoInteraction) {
    console.log("[DEBUG] POINTERDOWN ignored due to gizmo interaction");
    return;
  }
  
  // اگر کلیک روی gizmo نبوده، flag را reset کن
  if (pick?.pickedMesh && !pick.pickedMesh.name.includes("gizmo") && !pick.pickedMesh.name.includes("Gizmo")) {
    wasInitialClickOnGizmo = false;
  }
  
  // اگر روی فضای خالی کلیک شده
  if (!pick?.hit || !pick.pickedMesh) {
    // اگر کلیک اولیه روی گیزمو نبوده، انتخاب را لغو کن
    if (!wasInitialClickOnGizmo) {
      console.log("[DEBUG] POINTERDOWN on empty space - clearing selection (not on gizmo)");
      clearSelection();
    } else {
      console.log("[DEBUG] POINTERDOWN on empty space - keeping selection (was on gizmo)");
    }
    return;
  }
});

/* ---------------------------------------------
   Keyboard shortcuts
---------------------------------------------- */
document.addEventListener("keydown", (event) => {
  // کلید Escape برای لغو انتخاب
  if (event.key === "Escape") {
    clearSelection();
  }
});

// Event listener اضافی برای canvas (پشتیبان) - حذف شده چون با gizmo interaction تداخل می‌کند
// const canvas = scene.getEngine().getRenderingCanvas();
// if (canvas) {
//   canvas.addEventListener("click", (event) => {
//     // اگر در حال تعامل با گیزمو هستیم، انتخاب را لغو نکن
//     if (isGizmoInteraction) {
//       console.log("[DEBUG] Canvas click ignored due to gizmo interaction");
//       return;
//     }
//     
//     const pick = scene.pick(event.clientX, event.clientY);
//     
//     if (!pick?.hit || !pick.pickedMesh) {
//       console.log("[DEBUG] Canvas click on empty space - clearing selection");
//       clearSelection();
//     }
//   });
// }


/* ---------------------------------------------
   API Connection buttons
---------------------------------------------- */
wireApiButtons();

/* ---------------------------------------------
   Initialize UI
---------------------------------------------- */
// Initialize environment catalog
populateEnvironmentCatalog();

// Initialize environment and sensor lists
updateEnvironmentList();
updateSensorList();

// Initialize sensor history UI
sensorHistoryUI.initialize();
