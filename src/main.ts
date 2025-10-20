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
  testTooltip,
  testAllData,
  testPopup,
  updateAllPermanentPopups,
  removePermanentPopup,
  createPermanentPopup,
  toggleAllPopups,
  clearAllSensors,
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
import { apiClient } from "./api-client";

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
   Transform Panel Management
---------------------------------------------- */
function showTransformPanel(mode: 'Position' | 'Rotation' | 'Scale'): void {
  const panel = document.getElementById('transformPanel');
  const modeElement = document.getElementById('transformMode');
  const selectedId = (window as any).selectedId as string | null;
  
  if (panel && modeElement) {
    // Only show panel if a model is selected
    if (selectedId) {
      panel.style.display = 'block';
      modeElement.textContent = mode;
      updateTransformValues();
    } else {
      panel.style.display = 'none';
    }
  }
}

function hideTransformPanel(): void {
  const panel = document.getElementById('transformPanel');
  if (panel) {
    panel.style.display = 'none';
  }
}

// Store last known values to avoid unnecessary updates
let lastTransformValues = { x: 0, y: 0, z: 0, mode: '' };

function updateTransformValues(): void {
  const selectedId = (window as any).selectedId as string | null;
  
  if (!selectedId) {
    clearTransformInputs();
    hideTransformPanel();
    return;
  }
  
  let targetNode: any = null;
  
  if (selectedId.startsWith('env_')) {
    // Environment
    const envId = selectedId.replace('env_', '');
    const env = envs.get(envId);
    if (env) {
      targetNode = env.root; // TransformNode
    }
  } else {
    // Sensor
    targetNode = sensorHandles.get(selectedId) || null; // AbstractMesh
  }
  
  if (!targetNode) {
    clearTransformInputs();
    return;
  }
  
  const isMoveActive = btnMove?.getAttribute("aria-pressed") === "true";
  const isRotateActive = btnRotate?.getAttribute("aria-pressed") === "true";
  const isScaleActive = btnScale?.getAttribute("aria-pressed") === "true";
  
  
  const xInput = document.getElementById('transformX') as HTMLInputElement;
  const yInput = document.getElementById('transformY') as HTMLInputElement;
  const zInput = document.getElementById('transformZ') as HTMLInputElement;
  
  if (!xInput || !yInput || !zInput) return;
  
  let newValues = { x: 0, y: 0, z: 0, mode: '' };
  
  if (isMoveActive) {
    // Position values
    newValues = {
      x: parseFloat(targetNode.position.x.toFixed(2)),
      y: parseFloat(targetNode.position.y.toFixed(2)),
      z: parseFloat(targetNode.position.z.toFixed(2)),
      mode: 'position'
    };
    
    xInput.value = newValues.x === 0 ? '' : newValues.x.toString();
    yInput.value = newValues.y === 0 ? '' : newValues.y.toString();
    zInput.value = newValues.z === 0 ? '' : newValues.z.toString();
  } else if (isRotateActive) {
    // Rotation values (in degrees)
    const rotation = targetNode.rotationQuaternion ? 
      targetNode.rotationQuaternion.toEulerAngles() : 
      targetNode.rotation;
    
    newValues = {
      x: parseFloat((rotation.x * 180 / Math.PI).toFixed(1)),
      y: parseFloat((rotation.y * 180 / Math.PI).toFixed(1)),
      z: parseFloat((rotation.z * 180 / Math.PI).toFixed(1)),
      mode: 'rotation'
    };
    
    xInput.value = newValues.x.toString();
    yInput.value = newValues.y.toString();
    zInput.value = newValues.z.toString();
  } else if (isScaleActive) {
    // Scale values
    newValues = {
      x: parseFloat(targetNode.scaling.x.toFixed(2)),
      y: parseFloat(targetNode.scaling.y.toFixed(2)),
      z: parseFloat(targetNode.scaling.z.toFixed(2)),
      mode: 'scale'
    };
    
    xInput.value = newValues.x === 0 ? '' : newValues.x.toString();
    yInput.value = newValues.y === 0 ? '' : newValues.y.toString();
    zInput.value = newValues.z === 0 ? '' : newValues.z.toString();
  }
  
  // Update last known values
  lastTransformValues = newValues;
}

function clearTransformInputs(): void {
  const xInput = document.getElementById('transformX') as HTMLInputElement;
  const yInput = document.getElementById('transformY') as HTMLInputElement;
  const zInput = document.getElementById('transformZ') as HTMLInputElement;
  
  if (xInput && yInput && zInput) {
    xInput.value = '';
    yInput.value = '';
    zInput.value = '';
  }
}

/* ---------------------------------------------
   Reset Scene Function
---------------------------------------------- */
async function resetScene(): Promise<void> {
  // تأیید از کاربر
  const confirmed = confirm('Are you sure you want to reset the scene? This will remove all sensors and environments.');
  if (!confirmed) return;
  
  try {
    // حذف همه سنسورها
    await clearAllSensors();
    
    // حذف همه محیط‌ها
    envs.forEach((env) => {
      try {
        env.root.dispose();
      } catch (e) {
        console.warn('[Reset] Failed to dispose environment:', e);
      }
    });
    envs.clear();
    
    // پاک کردن انتخاب
    clearSelection();
    
    // به‌روزرسانی لیست‌ها
    updateSensorList();
    updateEnvironmentList();
    
    // مخفی کردن پنل properties
    hideSceneProperties();
    
    console.log('[Reset] Scene reset successfully');
  } catch (error) {
    console.error('[Reset] Failed to reset scene:', error);
    alert('Failed to reset scene. Please try again.');
  }
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
  camera.detachControl();
  isGizmoInteraction = true; // شروع تعامل با گیزمو
});

gizmos.gizmos.positionGizmo?.onDragEndObservable.add(() => {
  camera.attachControl(canvas, true);
  // تاخیر بیشتر برای جلوگیری از تداخل با POINTERPICK
  setTimeout(() => { 
    isGizmoInteraction = false; 
    wasInitialClickOnGizmo = false;
  }, 300);
});

gizmos.gizmos.rotationGizmo?.onDragStartObservable.add(() => {
  camera.detachControl();
  isGizmoInteraction = true; // شروع تعامل با گیزمو
});

gizmos.gizmos.rotationGizmo?.onDragEndObservable.add(() => {
  camera.attachControl(canvas, true);
  // تاخیر بیشتر برای جلوگیری از تداخل با POINTERPICK
  setTimeout(() => { 
    isGizmoInteraction = false; 
    wasInitialClickOnGizmo = false;
  }, 300);
});

gizmos.gizmos.scaleGizmo?.onDragStartObservable.add(() => {
  camera.detachControl();
  isGizmoInteraction = true; // شروع تعامل با گیزمو
});

gizmos.gizmos.scaleGizmo?.onDragEndObservable.add(() => {
  camera.attachControl(canvas, true);
  // تاخیر بیشتر برای جلوگیری از تداخل با POINTERPICK
  setTimeout(() => { 
    isGizmoInteraction = false; 
    wasInitialClickOnGizmo = false;
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
  // لغو انتخاب فعلی
  (window as any).selectedId = null;
  hidePopup();
  removeSelectionHighlight();
  
  // مخفی کردن پنل scene properties
  hideSceneProperties();
  
  // مخفی کردن پنل ترنسفورم
  hideTransformPanel();
  
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
  // مخفی کردن پنل ترنسفورم
  hideTransformPanel();
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
        // به‌روزرسانی مقادیر ترنسفورم
        updateTransformValues();
        return true;
      }
    } else {
      // انتخاب محیط
      const envId = id.replace('env_', '');
      const env = envs.get(envId);
      if (env && env.root) {
        // برای TransformNode، gizmo را به root attach می‌کنیم تا ترنسفورم‌ها روی root اعمال شوند
        gizmos.attachToMesh(env.root as any);
        // به‌روزرسانی مقادیر ترنسفورم
        updateTransformValues();
        return true;
      } else {
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
  
  // نمایش پنل ترنسفورم
  showTransformPanel('Position');
  
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
  
  // نمایش پنل ترنسفورم
  showTransformPanel('Rotation');
  
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
  
  // نمایش پنل ترنسفورم
  showTransformPanel('Scale');
  
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
  let s: SensorNode;
  let handle: any;
  let id: string;
  
  try {
    console.log('[Add Sensor] Starting...');
    await prefabsReady;
    console.log('[Add Sensor] Prefabs ready');
    
    id   = genId();
    const type = (catalog.value as SensorType) || "temperature";
    console.log('[Add Sensor] Creating sensor:', { id, type });
    
    // تنظیم deviceId پیش‌فرض بر اساس نوع سنسور
    const defaultDeviceIds: Record<SensorType, string> = {
      temperature: "temp-1",
      humidity: "hum-1", 
      co2: "co2-1",
      light: "light-1",
      solar: "solar-plant"
    };
    
    s = {
      id, type,
      label: `${type}-${id.slice(2)}`,
      deviceId: defaultDeviceIds[type] || `${type.slice(0,3)}-${Math.floor(100 + Math.random() * 900)}`,
      position: { x: 0, y: 0.7, z: 0 },
      // color: palette[type], // Removed to preserve original GLB materials
      scale: 1.0,
    };
    
    sensors.set(id, s);
    
    handle = createSensorHandle(s);
    
    // Create permanent popup for this sensor
    createPermanentPopup(s.deviceId, handle);
    
    // انتخاب سنسور جدید
    (window as any).selectedId = id;
    
    // پر کردن پنل scene properties
    fillScenePropertyPanel(s);
    showSceneProperties();
    
  } catch (error) {
    console.error('[Add Sensor] Error:', error);
    alert(`Error adding sensor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return;
  }
  
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
  
});


// Scene Properties Apply Changes
sceneBtnBind.addEventListener("click", () => {
  const id = (window as any).selectedId as string | null;
  if (!id || id.startsWith('env_')) return; // Only for sensors
  
  const s = sensors.get(id);
  if (!s) return;
  
  // Store old deviceId to check if it changed
  const oldDeviceId = s.deviceId;
  
  s.label    = (document.getElementById("scene_p_label")  as HTMLInputElement).value || s.label;
  s.deviceId = (document.getElementById("scene_p_device") as HTMLInputElement).value || s.deviceId;
  s.topic    = (document.getElementById("scene_p_topic")  as HTMLInputElement).value || undefined;
  s.color    = (document.getElementById("scene_p_color")  as HTMLInputElement).value || s.color;
  s.scale    = Number((document.getElementById("scene_p_scale") as HTMLInputElement).value || s.scale || 1.0);

  const h = sensorHandles.get(id)!;
  h.scaling.setAll((s.scale ?? 1.0) * GLB_WORLD_SCALE);
  (h as any).metadata.deviceId = s.deviceId;
  
  // If deviceId changed, remove old popup and create new one
  if (oldDeviceId !== s.deviceId) {
    console.log(`[Scene Properties] Device ID changed from ${oldDeviceId} to ${s.deviceId}`);
    
    // Remove old popup
    removePermanentPopup(oldDeviceId);
    
    // Create new popup with new deviceId
    createPermanentPopup(s.deviceId, h);
    
    console.log(`[Scene Properties] Popup updated for new device ID: ${s.deviceId}`);
  }
  
  // ذخیره‌سازی دستی ترنسفورم‌ها
  persistPositionIfSensor();
  persistScaleIfSensor();
  persistRotationIfSensor();
  
  // به‌روزرسانی لیست سنسورها
  updateSensorList();
  
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
      const sensor = sensors.get(id);
      try { h.getChildMeshes().forEach(c => c.dispose()); } catch {}
      try { h.dispose(); } catch {}
      // Remove permanent popup
      if (sensor) {
        removePermanentPopup(sensor.deviceId);
      }
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
  
  
  // اگر در حال تعامل با گیزمو هستیم، انتخاب را لغو نکن
  if (isGizmoInteraction) {
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
      clearSelection();
    } else {
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


  // بررسی سنسور
  const r = resolveHandle(pick.pickedMesh);
  if (r) { 
    frameNode(r.handle); 
    return; 
  }

  // بررسی محیط
  const envId = resolveEnvFromMesh(pick.pickedMesh);
  if (envId) {
    setActiveEnvironment(envId);
    const envRoot = getActiveEnvRoot();
    if (envRoot) frameNode(envRoot);
  }
});

// Event listener برای تشخیص کلیک روی فضای خالی
scene.onPointerObservable.add((pi) => {
  if (pi.type !== BABYLON.PointerEventTypes.POINTERDOWN) return;
  const pick = pi.pickInfo;
  
  
  // اگر در حال تعامل با گیزمو هستیم، کاری نکن
  if (isGizmoInteraction) {
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
      clearSelection();
    } else {
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
  
  // کلید Delete برای حذف مدل انتخاب شده (Backspace غیرفعال)
  if (event.key === "Delete") {
    const id = (window as any).selectedId as string | null;
    
    if (id) {
      if (id.startsWith('env_')) {
        // حذف محیط انتخاب شده
        removeActiveEnvironment();
        clearSelection();
      } else {
        // حذف سنسور
        const h = sensorHandles.get(id);
        if (h) {
          const sensor = sensors.get(id);
          try { h.getChildMeshes().forEach(c => c.dispose()); } catch {}
          try { h.dispose(); } catch {}
          // Remove permanent popup
          if (sensor) {
            removePermanentPopup(sensor.deviceId);
          }
          sensorHandles.delete(id);
          sensors.delete(id);
          clearSelection();
          updateSensorList();
        }
      }
    } else {
      // حذف محیط فعال (در صورت عدم انتخاب)
      removeActiveEnvironment();
      enableSelect();
    }
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

// Popup Toggle
const popupToggle = document.getElementById('popupToggle') as HTMLInputElement;
popupToggle?.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  toggleAllPopups(target.checked);
});

// Reset Scene Button
const btnResetScene = document.getElementById('btnResetScene') as HTMLButtonElement;
btnResetScene?.addEventListener("click", async () => {
  await resetScene();
});

// Transform Panel Input Listeners
const transformX = document.getElementById('transformX') as HTMLInputElement;
const transformY = document.getElementById('transformY') as HTMLInputElement;
const transformZ = document.getElementById('transformZ') as HTMLInputElement;

[transformX, transformY, transformZ].forEach((input) => {
  if (input) {
    input.addEventListener('input', () => {
      applyTransformFromInputs();
    });
    
    input.addEventListener('blur', () => {
      applyTransformFromInputs();
    });
  }
});

function applyTransformFromInputs(): void {
  const selectedId = (window as any).selectedId as string | null;
  
  if (!selectedId) {
    hideTransformPanel();
    return;
  }
  
  let targetNode: any = null;
  
  if (selectedId.startsWith('env_')) {
    const envId = selectedId.replace('env_', '');
    const env = envs.get(envId);
    if (env) {
      targetNode = env.root; // TransformNode
    }
  } else {
    targetNode = sensorHandles.get(selectedId) || null; // AbstractMesh
  }
  
  if (!targetNode) {
    return;
  }
  
  // Parse values, use 0 if empty
  const xValue = transformX?.value === '' ? 0 : parseFloat(transformX?.value || '0');
  const yValue = transformY?.value === '' ? 0 : parseFloat(transformY?.value || '0');
  const zValue = transformZ?.value === '' ? 0 : parseFloat(transformZ?.value || '0');
  
  
  const isMoveActive = btnMove?.getAttribute("aria-pressed") === "true";
  const isRotateActive = btnRotate?.getAttribute("aria-pressed") === "true";
  const isScaleActive = btnScale?.getAttribute("aria-pressed") === "true";
  
  
  if (isMoveActive) {
    // Apply position - handle both AbstractMesh and TransformNode
    if (targetNode.position) {
      targetNode.position.set(xValue, yValue, zValue);
    } else {
      targetNode.setAbsolutePosition(new BABYLON.Vector3(xValue, yValue, zValue));
    }
  } else if (isRotateActive) {
    // Apply rotation (convert degrees to radians)
    const xRad = xValue * Math.PI / 180;
    const yRad = yValue * Math.PI / 180;
    const zRad = zValue * Math.PI / 180;
    
    targetNode.rotationQuaternion = null; // Clear quaternion to use euler
    targetNode.rotation.set(xRad, yRad, zRad);
  } else if (isScaleActive) {
    // Apply scale (prevent zero scale)
    const scaleX = xValue === 0 ? 0.001 : xValue;
    const scaleY = yValue === 0 ? 0.001 : yValue;
    const scaleZ = zValue === 0 ? 0.001 : zValue;
    
    targetNode.scaling.set(scaleX, scaleY, scaleZ);
  }
}

/* ---------------------------------------------
   API Connection buttons
---------------------------------------------- */
wireApiButtons();

// Auto-connect to API on startup
setTimeout(async () => {
  try {
    await apiClient.connect();
  } catch (error) {
    console.warn('[Main] Auto-connect failed:', error);
  }
}, 2000);

// Test sensor prefabs loading
setTimeout(async () => {
  try {
    await prefabsReady;
  } catch (error) {
    console.error('[Main] Sensor prefabs failed to load:', error);
  }
}, 1000);

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

// Debug function to check environments
(window as any).debugEnvironments = () => {
  envs.forEach((_env, _id) => {
  });
};

// Start permanent popup position update loop
scene.onBeforeRenderObservable.add(() => {
  updateAllPermanentPopups();
});

// Update transform values when gizmo changes
scene.onBeforeRenderObservable.add(() => {
  const selectedId = (window as any).selectedId as string | null;
  const isTransformMode = (window as any).isTransformMode;
  
  if (selectedId && isTransformMode) {
    const panel = document.getElementById('transformPanel');
    if (panel && panel.style.display !== 'none') {
      // Check if values have actually changed to avoid unnecessary updates
      const currentValues = getCurrentTransformValues();
      if (currentValues) {
        const hasChanged = (
          Math.abs(currentValues.x - lastTransformValues.x) > 0.001 ||
          Math.abs(currentValues.y - lastTransformValues.y) > 0.001 ||
          Math.abs(currentValues.z - lastTransformValues.z) > 0.001 ||
          currentValues.mode !== lastTransformValues.mode
        );
        
        if (hasChanged) {
          updateTransformValues();
        }
      } else {
      }
    }
  }
});

function getCurrentTransformValues(): { x: number, y: number, z: number, mode: string } | null {
  const selectedId = (window as any).selectedId as string | null;
  
  if (!selectedId) {
    hideTransformPanel();
    return null;
  }
  
  let targetNode: any = null;
  
  if (selectedId.startsWith('env_')) {
    const envId = selectedId.replace('env_', '');
     const env = envs.get(envId);
    if (env) {
      targetNode = env.root; // TransformNode
    } else {
    }
  } else {
    targetNode = sensorHandles.get(selectedId) || null; // AbstractMesh
  }
  
  if (!targetNode) {
    return null;
  }
  
  const isMoveActive = btnMove?.getAttribute("aria-pressed") === "true";
  const isRotateActive = btnRotate?.getAttribute("aria-pressed") === "true";
  const isScaleActive = btnScale?.getAttribute("aria-pressed") === "true";
  
  if (isMoveActive) {
    // Handle both AbstractMesh and TransformNode
    const position = targetNode.position || targetNode.getAbsolutePosition();
    const values = {
      x: parseFloat(position.x.toFixed(2)),
      y: parseFloat(position.y.toFixed(2)),
      z: parseFloat(position.z.toFixed(2)),
      mode: 'position'
    };
    return values;
  } else if (isRotateActive) {
    const rotation = targetNode.rotationQuaternion ? 
      targetNode.rotationQuaternion.toEulerAngles() : 
      targetNode.rotation;
    
    const xDeg = parseFloat((rotation.x * 180 / Math.PI).toFixed(1));
    const yDeg = parseFloat((rotation.y * 180 / Math.PI).toFixed(1));
    const zDeg = parseFloat((rotation.z * 180 / Math.PI).toFixed(1));
    
    return {
      x: xDeg === 0 ? 0 : xDeg,
      y: yDeg === 0 ? 0 : yDeg,
      z: zDeg === 0 ? 0 : zDeg,
      mode: 'rotation'
    };
  } else if (isScaleActive) {
    return {
      x: parseFloat(targetNode.scaling.x.toFixed(2)),
      y: parseFloat(targetNode.scaling.y.toFixed(2)),
      z: parseFloat(targetNode.scaling.z.toFixed(2)),
      mode: 'scale'
    };
  }
  
  return null;
}

// اضافه کردن توابع تست به window برای استفاده از console
(window as any).testTooltip = testTooltip;
(window as any).testAllData = testAllData;
(window as any).testPopup = testPopup;
(window as any).getPollingStatus = () => apiClient.getPollingStatus();
(window as any).restartPolling = () => apiClient.restartPolling();
(window as any).forceConnect = () => apiClient.forceConnect();
(window as any).testApi = () => apiClient.testApiConnection();
(window as any).testDirectApi = () => apiClient.testDirectApi();
(window as any).testCorsProxy = () => apiClient.testCorsProxy();

// تابع debug کامل برای نسخه آنلاین
(window as any).debugOnline = () => {
  console.log('=== DEBUG ONLINE VERSION ===');
  console.log('1. Checking environment...');
  console.log('User Agent:', navigator.userAgent);
  console.log('Location:', window.location.href);
  console.log('Protocol:', window.location.protocol);
  
  console.log('2. Checking API connection...');
  const status = apiClient.getPollingStatus();
  console.log('Polling status:', status);
  
  console.log('3. Testing direct API...');
  apiClient.testDirectApi();
  
  console.log('4. Testing CORS proxy...');
  apiClient.testCorsProxy();
  
  console.log('5. Checking latestByDev...');
  testAllData();
  
  console.log('=== END DEBUG ONLINE ===');
};

