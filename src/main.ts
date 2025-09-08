// src/main.ts — save to folder (FS Access) + existing features
import * as BABYLON from "babylonjs";
import "babylonjs-loaders";

// scene
import { scene, camera } from "./core/scene";

// types
import type { SensorNode, SensorType } from "./types";
import { GLB_WORLD_SCALE, genId, palette } from "./types";

// sensors
import {
  prefabsReady,
  sensors,
  sensorHandles,
  createSensorHandle,
  resolveHandle,
  tintHierarchy,
  showPopupFor,
  hidePopup,
} from "./sensors";

// env (multi-environment API)
import {
  addEnvironmentFromGLBArrayBuffer,
  getActiveEnvRoot,
  setActiveEnvironment,
  resolveEnvFromMesh,
  removeActiveEnvironment,
} from "./env";

// mqtt
import { wireMqttButtons } from "./mqtt";

// project
import {
  saveSceneSensors,
  loadSceneSensorsFromFile,
  // saveProject,                // ← دیگر لازم نیست روی دکمه‌ی UI
  loadProjectFromFile,
  saveProjectToFolder,          // ← استفاده از فولدر
} from "./project";

/* ---------------------------------------------
   Property panel fill
---------------------------------------------- */
function fillPropertyPanel(s: SensorNode) {
  (document.getElementById("p_label") as HTMLInputElement).value = s.label;
  (document.getElementById("p_device") as HTMLInputElement).value = s.deviceId;
  (document.getElementById("p_topic") as HTMLInputElement).value = s.topic ?? "";
  (document.getElementById("p_color") as HTMLInputElement).value = s.color ?? palette[s.type];
  (document.getElementById("p_scale") as HTMLInputElement).value = String(s.scale ?? 5.0);
}

/* ---------------------------------------------
   Scene panel elements
---------------------------------------------- */
const btnAdd   = document.getElementById("btnAdd")! as HTMLButtonElement;
const btnBind  = document.getElementById("btnBind")! as HTMLButtonElement;
const btnSave  = document.getElementById("btnSave")! as HTMLButtonElement;
const fileLoad = document.getElementById("fileLoad") as HTMLInputElement;
const catalog  = document.getElementById("catalog") as HTMLSelectElement;

// tools dock
const btnSelect = document.getElementById("btnToolSelect") as HTMLButtonElement | null;
const btnMove   = document.getElementById("btnMove") as HTMLButtonElement | null;
const btnRotate = document.getElementById("btnToolRotate") as HTMLButtonElement | null;
const btnScale  = document.getElementById("btnToolScale") as HTMLButtonElement | null;
const btnDel    = document.getElementById("btnDelete") as HTMLButtonElement | null;

// environment upload
const envFileInput     = document.getElementById("envFile") as HTMLInputElement;

// project panel
const btnSaveProject   = document.getElementById("btnSaveProject") as HTMLButtonElement;
const fileLoadProject  = document.getElementById("fileLoadProject") as HTMLInputElement;

/* ---------------------------------------------
   Selected id
---------------------------------------------- */
(window as any).selectedId = (window as any).selectedId ?? null;

/* ---------------------------------------------
   Gizmo manager + tools
---------------------------------------------- */
const gizmos = new BABYLON.GizmoManager(scene);
gizmos.usePointerToAttachGizmos = false;
gizmos.positionGizmoEnabled = false;
gizmos.rotationGizmoEnabled = false;
gizmos.scaleGizmoEnabled    = false;
if (gizmos.gizmos.rotationGizmo) {
  gizmos.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
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
}

/** attach gizmo to selected sensor or active environment */
function attachToCurrentSelection(): boolean {
  const id = (window as any).selectedId as string | null;
  if (id) {
    const h = sensorHandles.get(id);
    if (h) {
      gizmos.attachToMesh(h);
      return true;
    }
  }
  const envRoot = getActiveEnvRoot();
  if (envRoot) {
    gizmos.attachToMesh(envRoot);
    return true;
  }
  return false;
}

function enableMove() {
  if (!attachToCurrentSelection()) return;
  gizmos.positionGizmoEnabled = true;
  gizmos.rotationGizmoEnabled = false;
  gizmos.scaleGizmoEnabled    = false;
  setToolPressed(btnMove);
}
function enableRotate() {
  if (!attachToCurrentSelection()) return;
  gizmos.positionGizmoEnabled = false;
  gizmos.rotationGizmoEnabled = true;
  gizmos.scaleGizmoEnabled    = false;
  setToolPressed(btnRotate);
}
function enableScale() {
  if (!attachToCurrentSelection()) return;
  gizmos.positionGizmoEnabled = false;
  gizmos.rotationGizmoEnabled = false;
  gizmos.scaleGizmoEnabled    = true;
  setToolPressed(btnScale);
}

/* ---------------------------------------------
   Persist sensor transform on drag end
---------------------------------------------- */
function persistPositionIfSensor() {
  const id = (window as any).selectedId as string | null;
  if (!id) return;
  const h = sensorHandles.get(id);
  const s = sensors.get(id);
  if (!h || !s) return;
  s.position = { x: h.position.x, y: h.position.y, z: h.position.z };
}
function persistScaleIfSensor() {
  const id = (window as any).selectedId as string | null;
  if (!id) return;
  const h = sensorHandles.get(id);
  const s = sensors.get(id);
  if (!h || !s) return;
  const world = h.scaling.x;
  const newBase = world / GLB_WORLD_SCALE;
  s.scale = newBase > 0.0001 ? newBase : 0.0001;
  h.scaling.setAll(s.scale * GLB_WORLD_SCALE);
}
gizmos.gizmos.positionGizmo?.onDragEndObservable.add(persistPositionIfSensor);
gizmos.gizmos.scaleGizmo?.onDragEndObservable.add(persistScaleIfSensor);

/* ---------------------------------------------
   Scene: add/bind/save/load sensors
---------------------------------------------- */
btnAdd.addEventListener("click", async () => {
  await prefabsReady;
  const id   = genId();
  const type = (catalog.value as SensorType) || "temperature";
  const s: SensorNode = {
    id, type,
    label: `${type}-${id.slice(2)}`,
    deviceId: `${type.slice(0,3)}-${Math.floor(100 + Math.random() * 900)}`,
    position: { x: 0, y: 0.7, z: 0 },
    color: palette[type],
    scale: 5.0,
  };
  sensors.set(id, s);
  createSensorHandle(s);
  (window as any).selectedId = id;
  fillPropertyPanel(s);

  if (btnMove?.getAttribute("aria-pressed") === "true") enableMove();
  else if (btnRotate?.getAttribute("aria-pressed") === "true") enableRotate();
  else if (btnScale?.getAttribute("aria-pressed") === "true") enableScale();
});

btnBind.addEventListener("click", () => {
  const id = (window as any).selectedId as string | null;
  if (!id) return;
  const s = sensors.get(id)!;
  s.label    = (document.getElementById("p_label")  as HTMLInputElement).value || s.label;
  s.deviceId = (document.getElementById("p_device") as HTMLInputElement).value || s.deviceId;
  s.topic    = (document.getElementById("p_topic")  as HTMLInputElement).value || undefined;
  s.color    = (document.getElementById("p_color")  as HTMLInputElement).value || s.color;
  s.scale    = Number((document.getElementById("p_scale") as HTMLInputElement).value || s.scale || 5.0);

  const h = sensorHandles.get(id)!;
  h.scaling.setAll((s.scale ?? 5.0) * GLB_WORLD_SCALE);
  tintHierarchy(h, s.color ?? palette[s.type]);
  (h as any).metadata.deviceId = s.deviceId;
});

btnSave.addEventListener("click", saveSceneSensors);
fileLoad.addEventListener("change", async () => {
  const f = fileLoad.files?.[0]; if (!f) return;
  await loadSceneSensorsFromFile(f);
  if (btnMove?.getAttribute("aria-pressed") === "true") enableMove();
  else if (btnRotate?.getAttribute("aria-pressed") === "true") enableRotate();
  else if (btnScale?.getAttribute("aria-pressed") === "true") enableScale();
});

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
    // delete sensor
    const h = sensorHandles.get(id)!;
    try { h.getChildMeshes().forEach(c => c.dispose()); } catch {}
    try { h.dispose(); } catch {}
    sensorHandles.delete(id);
    sensors.delete(id);
    (window as any).selectedId = null;
    hidePopup();
    enableSelect();
  } else {
    // delete active environment
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
  const f = fileLoadProject.files?.[0]; if (!f) return;
  await loadProjectFromFile(f);
  if (btnMove?.getAttribute("aria-pressed") === "true") enableMove();
  else if (btnRotate?.getAttribute("aria-pressed") === "true") enableRotate();
  else if (btnScale?.getAttribute("aria-pressed") === "true") enableScale();
});

/* ---------------------------------------------
   Camera framing (double-click)
---------------------------------------------- */
function frameNode(node: BABYLON.Node, pad = 1.6, maxRadius = 120) {
  const bb = (node as any).getHierarchyBoundingVectors?.();
  if (!bb) return;
  const min: BABYLON.Vector3 = bb.min, max: BABYLON.Vector3 = bb.max;
  const center = BABYLON.Vector3.Center(min, max);
  const diag   = max.subtract(min);
  const radius = Math.max(diag.length() * 0.5 * pad, 3);

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
scene.onPointerObservable.add((pi) => {
  if (pi.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
  const pick = pi.pickInfo;
  if (!pick?.hit || !pick.pickedMesh) return;

  const r = resolveHandle(pick.pickedMesh);
  if (r) {
    (window as any).selectedId = r.sensorId;
    const s = sensors.get(r.sensorId)!;
    fillPropertyPanel(s);
    showPopupFor(r.deviceId || s.deviceId, r.handle);

    if (btnMove?.getAttribute("aria-pressed") === "true") enableMove();
    else if (btnRotate?.getAttribute("aria-pressed") === "true") enableRotate();
    else if (btnScale?.getAttribute("aria-pressed") === "true") enableScale();
    return;
  }

  const envId = resolveEnvFromMesh(pick.pickedMesh);
  (window as any).selectedId = null;
  hidePopup();

  if (envId) {
    setActiveEnvironment(envId);
    if (btnMove?.getAttribute("aria-pressed") === "true") enableMove();
    else if (btnRotate?.getAttribute("aria-pressed") === "true") enableRotate();
    else if (btnScale?.getAttribute("aria-pressed") === "true") enableScale();
    else enableSelect();
  } else {
    enableSelect();
  }
});

scene.onPointerObservable.add((pi) => {
  if (pi.type !== BABYLON.PointerEventTypes.POINTERDOUBLETAP) return;
  const pick = pi.pickInfo;
  if (!pick?.hit || !pick.pickedMesh) return;

  const r = resolveHandle(pick.pickedMesh);
  if (r) { frameNode(r.handle); return; }

  const envId = resolveEnvFromMesh(pick.pickedMesh);
  if (envId) {
    setActiveEnvironment(envId);
    const envRoot = getActiveEnvRoot();
    if (envRoot) frameNode(envRoot);
  }
});

/* ---------------------------------------------
   MQTT buttons
---------------------------------------------- */
wireMqttButtons();
