// ==== main.ts (fixed) ====
import * as BABYLON from "babylonjs";
import "babylonjs-loaders";

// 1) scene را زود و در بالا ایمپورت کن
import { scene } from "./core/scene";

import type { SensorNode, SensorType } from "./types";
import { genId, palette } from "./types";

import {
  prefabsReady, sensors, sensorHandles,
  createSensorHandle, resolveHandle, tintHierarchy,
  showPopupFor
} from "./sensors";

import { setEnvironmentFromGLBArrayBuffer, applyEnvTransform, disposeEnvironment } from "./env";
import { wireMqttButtons } from "./mqtt";
import { saveSceneSensors, loadSceneSensorsFromFile, saveProject, loadProjectFromFile } from "./project";

// ===== property panel helpers
function fillPropertyPanel(s: SensorNode){
  (document.getElementById("p_label")  as HTMLInputElement).value = s.label;
  (document.getElementById("p_device") as HTMLInputElement).value = s.deviceId;
  (document.getElementById("p_topic")  as HTMLInputElement).value = s.topic ?? "";
  (document.getElementById("p_color")  as HTMLInputElement).value = s.color ?? palette[s.type];
  (document.getElementById("p_scale")  as HTMLInputElement).value = String(s.scale ?? 5.0);
}

// ===== editor buttons
const btnAdd   = document.getElementById("btnAdd")!;
const btnMove  = document.getElementById("btnMove")!;
const btnDone  = document.getElementById("btnDone")!;
const btnDel   = document.getElementById("btnDelete")!;
const btnBind  = document.getElementById("btnBind")!;
const btnSave  = document.getElementById("btnSave")!;
const fileLoad = document.getElementById("fileLoad") as HTMLInputElement;
const catalog  = document.getElementById("catalog") as HTMLSelectElement;

// 2) GizmoManager را به scene واقعی وصل کن (نه LastCreatedScene)
const gizmos = new BABYLON.GizmoManager(scene);
gizmos.usePointerToAttachGizmos = false;
gizmos.positionGizmoEnabled = false;

function enableMoveFor(id:string){
  const h = sensorHandles.get(id); if(!h) return;
  gizmos.attachToMesh(h);
  gizmos.positionGizmoEnabled = true;
}
function disableMove(){
  const sel = (window as any).selectedId as string | null;
  if (sel){
    const h = sensorHandles.get(sel);
    const s = sensors.get(sel);
    if (h && s) s.position = { x:h.position.x, y:h.position.y, z:h.position.z };
  }
  gizmos.attachToMesh(null);
  gizmos.positionGizmoEnabled = false;
}

btnAdd.addEventListener("click", async()=>{
  await prefabsReady;
  const id   = genId();
  const type = (catalog.value as SensorType) || "temperature";
  const s: SensorNode = {
    id, type,
    label: `${type}-${id.slice(2)}`,
    deviceId: `${type.slice(0,3)}-${Math.floor(100 + Math.random()*900)}`,
    position: { x:0, y:0.7, z:0 },
    color: palette[type],
    scale: 5.0
  };
  sensors.set(id, s);
  createSensorHandle(s);
  (window as any).selectedId = id;
  fillPropertyPanel(s);
  enableMoveFor(id);
});
btnMove.addEventListener("click", ()=>{ const id=(window as any).selectedId; if(id) enableMoveFor(id); });
btnDone.addEventListener("click", ()=> disableMove());
btnDel.addEventListener("click", ()=>{
  const id=(window as any).selectedId; if(!id) return;
  const h=sensorHandles.get(id)!;
  h.getChildMeshes().forEach(c=>c.dispose());
  h.dispose();
  sensorHandles.delete(id);
  sensors.delete(id);
  (window as any).selectedId=null;
  disableMove();
});
btnBind.addEventListener("click", ()=>{
  const id=(window as any).selectedId; if(!id) return;
  const s=sensors.get(id)!;
  s.label    = (document.getElementById("p_label")  as HTMLInputElement).value || s.label;
  s.deviceId = (document.getElementById("p_device") as HTMLInputElement).value || s.deviceId;
  s.topic    = (document.getElementById("p_topic")  as HTMLInputElement).value || undefined;
  s.color    = (document.getElementById("p_color")  as HTMLInputElement).value || s.color;
  s.scale    = Number((document.getElementById("p_scale") as HTMLInputElement).value || s.scale || 5.0);
  const h=sensorHandles.get(id)!;
  h.scaling.setAll((s.scale ?? 5.0));
  tintHierarchy(h, s.color || palette[s.type]);
  (h as any).metadata.deviceId = s.deviceId;
});
btnSave.addEventListener("click", saveSceneSensors);
fileLoad.addEventListener("change", async()=>{
  const f=fileLoad.files?.[0]; if(!f) return;
  await loadSceneSensorsFromFile(f);
});

// ===== environment + project
const envFileInput     = document.getElementById("envFile") as HTMLInputElement;
const envScaleInput    = document.getElementById("envScale") as HTMLInputElement;
const envRotYInput     = document.getElementById("envRotY") as HTMLInputElement;
const envPosXInput     = document.getElementById("envPosX") as HTMLInputElement;
const envPosYInput     = document.getElementById("envPosY") as HTMLInputElement;
const envPosZInput     = document.getElementById("envPosZ") as HTMLInputElement;
const btnEnvApply      = document.getElementById("btnEnvApply") as HTMLButtonElement;
const btnEnvClear      = document.getElementById("btnEnvClear") as HTMLButtonElement;
const btnSaveProject   = document.getElementById("btnSaveProject") as HTMLButtonElement;
const fileLoadProject  = document.getElementById("fileLoadProject") as HTMLInputElement;

envFileInput?.addEventListener("change", async()=>{
  const f=envFileInput.files?.[0]; if(!f) return;
  const buf=await f.arrayBuffer();
  await setEnvironmentFromGLBArrayBuffer(buf, f.name);
});
btnEnvApply?.addEventListener("click", ()=>{
  const t = {
    position: { x:Number(envPosXInput.value||0), y:Number(envPosYInput.value||0), z:Number(envPosZInput.value||0) },
    rotationYDeg: Number(envRotYInput.value||0),
    scale: Number(envScaleInput.value||1)
  };
  applyEnvTransform(t);
});
btnEnvClear?.addEventListener("click", ()=> disposeEnvironment());
btnSaveProject?.addEventListener("click", saveProject);
fileLoadProject?.addEventListener("change", async()=>{
  const f=fileLoadProject.files?.[0]; if(!f) return;
  await loadProjectFromFile(f);
});

// ===== pointer picking -> popup + select
scene.onPointerObservable.add((pi: BABYLON.PointerInfo) => {
  if (pi.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
  const pick = pi.pickInfo;
  if (!pick?.hit || !pick.pickedMesh) return;

  const r = resolveHandle(pick.pickedMesh);
  if (!r) return;

  (window as any).selectedId = r.sensorId;
  const s = sensors.get(r.sensorId)!;
  fillPropertyPanel(s);
  showPopupFor(r.deviceId || s.deviceId, r.handle);
});

// ===== MQTT buttons
wireMqttButtons();
