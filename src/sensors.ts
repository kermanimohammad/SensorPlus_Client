import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import { scene, camera, startRenderLoop } from "./core/scene";
import { GLB_WORLD_SCALE, ENABLE_PULSE } from "./types";
import type { SensorNode, SensorType, Reading } from "./types";

export const sensors = new Map<string, SensorNode>();
export const sensorHandles = new Map<string, BABYLON.AbstractMesh>();
export let selectedId: string | null = null;
export const latestByDev = new Map<string, Reading>();

const modelUrlByType: Partial<Record<SensorType, string>> = {
  temperature: "/models/temperature.glb",
  humidity:    "/models/humidity.glb",
  co2:         "/models/co2.glb",
  solar:       "/models/solar.glb",
  light:       "/models/light.glb",
};
const prefabContainers = new Map<SensorType, BABYLON.AssetContainer>();
export const prefabsReady = (async()=>{
  await Promise.all(Object.entries(modelUrlByType).map(async ([t,url])=>{
    try{ const c = await BABYLON.SceneLoader.LoadAssetContainerAsync(url!, undefined, scene); prefabContainers.set(t as SensorType, c);} catch(e){console.warn("[GLB]", t, url, e);} }));
})();

// Removed color3 and tintHierarchy functions to preserve original GLB materials
// const color3 = (hex:string)=> BABYLON.Color3.FromHexString(hex);
// export function tintHierarchy(root: BABYLON.Node, hex:string){
//   const col = color3(hex);
//   (root as any).getChildMeshes?.().forEach((m: BABYLON.AbstractMesh)=>{
//     const mat = m.material as any; if(!mat) return;
//     if(mat.albedoColor!==undefined){ mat.albedoColor=col.scale(0.8); mat.emissiveColor=col.scale(0.25);} else
//     if(mat.diffuseColor!==undefined){ mat.diffuseColor=col.scale(0.8); mat.emissiveColor=col.scale(0.25);} });
// }

export function resolveHandle(mesh: BABYLON.Node | null){
  let cur: BABYLON.Node | null = mesh; while(cur){ const md=(cur as any).metadata; if(md?.sensorId){ return {handle: cur as BABYLON.AbstractMesh, sensorId: md.sensorId as string, deviceId: md.deviceId as string}; } cur = cur.parent; } return null;
}

export function createSensorHandle(s: SensorNode){
  const container = prefabContainers.get(s.type);

  // --- Fallback: sphere
  if(!container){
    const m = BABYLON.MeshBuilder.CreateSphere(s.id,{diameter:0.7},scene);
    m.position.set(s.position.x,s.position.y,s.position.z);
    m.isPickable=true;

    // Remove default color application to preserve original materials
    // const mat = new BABYLON.StandardMaterial(s.id+"-mat", scene);
    // const col = color3(s.color ?? palette[s.type]);
    // mat.emissiveColor = col.scale(0.6);
    // m.material = mat;

    // ⬅️ اولویت رندر سنسور همانند محیط
    m.renderingGroupId = 1;

    (m as any).metadata = { sensorId: s.id, deviceId: s.deviceId, type: s.type };
    m.scaling.setAll((s.scale ?? 1)*GLB_WORLD_SCALE);

    sensorHandles.set(s.id,m);
    return m;
  }

  // --- Prefab GLB
  const inst = container.instantiateModelsToScene(name=>`${s.id}-${name}`, false);

  const modelRoot = new BABYLON.TransformNode(`${s.id}-modelRoot`, scene);
  for(const r of inst.rootNodes as BABYLON.Node[]) (r as BABYLON.TransformNode).setParent(modelRoot);

  const bb = modelRoot.getHierarchyBoundingVectors();
  const centerX=(bb.min.x+bb.max.x)/2, centerZ=(bb.min.z+bb.max.z)/2, bottomY=bb.min.y;
  modelRoot.position.set(-centerX,-bottomY,-centerZ);
  modelRoot.rotationQuaternion=null;
  modelRoot.rotation.set(0,0,0);
  modelRoot.scaling.setAll(1);

  const handle = BABYLON.MeshBuilder.CreateBox(`${s.id}-handle`,{size:0.001},scene);
  handle.visibility=0;
  handle.isPickable=true;
  (handle as any).metadata={sensorId:s.id, deviceId:s.deviceId, type:s.type};

  modelRoot.setParent(handle);
  handle.position.set(s.position.x,s.position.y,s.position.z);
  handle.scaling.setAll((s.scale ?? 1)*GLB_WORLD_SCALE);

  // همهٔ مش‌های فرزند قابل پیک شوند
  modelRoot.getChildMeshes().forEach(m => {
    m.isPickable = true;
    // ⬅️ اولویت رندر سنسور همانند محیط
    m.renderingGroupId = 1;
  });

  // خود handle هم در همان گروه باشد (برای اطمینان)
  handle.renderingGroupId = 1;

  // tintHierarchy(handle, s.color ?? palette[s.type]); // Removed to preserve original GLB materials

  sensorHandles.set(s.id, handle);
  return handle;
}

export function applyReadingToSensor(handle: BABYLON.AbstractMesh, reading: Reading){
  const info = (handle as any).metadata as { sensorId: string; deviceId: string; type: SensorType };
  const base = (sensors.get(info.sensorId)?.scale ?? 1) * GLB_WORLD_SCALE;
  const setPulse=(t:number,a=0.15)=>{ if(!ENABLE_PULSE){ handle.scaling.setAll(base); return;} handle.scaling.setAll(base*(1+a*t)); };
  const children = handle.getChildMeshes(); const targetMeshes = children.length?children:[handle];
  const setEmissive=(c: BABYLON.Color3)=> targetMeshes.forEach(m=>{ const mat=m.material as any; if(mat?.emissiveColor!==undefined) mat.emissiveColor=c; });
  const clamp=(v:number,lo:number,hi:number)=> Math.max(lo, Math.min(hi,v)); const norm=(v:number,lo:number,hi:number)=> (clamp(v,lo,hi)-lo)/(hi-lo);
  const color3 = (hex:string)=> BABYLON.Color3.FromHexString(hex); // Local helper for reading effects
  if(reading.kind==="solar"){ const t=norm(reading.powerW,0,1000); setPulse(t,0.25); setEmissive(BABYLON.Color3.Lerp(color3("#996f00"), color3("#ffd166"), t)); }
  else if(reading.kind==="light"){ const vis = reading.on?1:0.25; targetMeshes.forEach(m=>m.visibility=vis); handle.scaling.setAll(base); }
  else { let t=0, baseCol=color3("#aaa"); if(reading.kind==="temperature"){t=norm(reading.value,15,35); baseCol=color3("#ff5a5f");} if(reading.kind==="humidity"){t=norm(reading.value,0,100); baseCol=color3("#00b894");} if(reading.kind==="co2"){t=norm(reading.value,400,2000); baseCol=color3("#3a86ff");}
    setPulse(t,0.15); setEmissive(BABYLON.Color3.Lerp(baseCol.scale(0.4), baseCol, t)); }
}

// Simple popup overlay (kept minimal)
const popup = document.createElement("div"); popup.style.cssText = `position:fixed;z-index:30;min-width:240px;max-width:380px;background:#000c;color:#fff;padding:10px 12px;border-radius:10px;font:13px system-ui;display:none;pointer-events:auto;box-shadow:0 10px 24px rgba(0,0,0,.35)`;
const pTitle=document.createElement("div"); pTitle.style.fontWeight="700"; const pL1=document.createElement("div"); const pL2=document.createElement("div"); pL2.style.color="#cbd5e1"; const pTs=document.createElement("div"); pTs.style.cssText="color:#94a3b8;font-size:12px;margin-top:4px"; const pClose=document.createElement("button"); pClose.textContent="✕"; pClose.style.cssText="position:absolute;top:4px;right:6px;background:transparent;color:#fff;border:0;font-size:16px;cursor:pointer"; pClose.onclick=()=>{ popup.style.display="none"; popupTarget=null; popupDevId=null; }; popup.append(pTitle,pL1,pL2,pTs,pClose); document.body.appendChild(popup);
let popupTarget: BABYLON.AbstractMesh | null = null; let popupDevId: string | null = null;
export function renderPopupContent(d?: Reading){ if(!popupDevId) return; const data = d ?? latestByDev.get(popupDevId); pTitle.textContent = `Device: ${popupDevId}`; if(data){ if((data as any).kind==="light"){ pL1.textContent=`light: ${(data as any).on?"ON":"OFF"} | ${(data as any).powerW.toFixed(1)} W`; pL2.textContent=(data as any).roomId?`room: ${(data as any).roomId}`:""; }
 else if((data as any).kind==="solar"){ pL1.textContent=`solar: ${(data as any).powerW.toFixed(1)} W`; pL2.textContent=`V=${(data as any).voltage.toFixed(2)} • I=${(data as any).current.toFixed(2)}`; }
 else { pL1.textContent=`${(data as any).kind}: ${(data as any).value.toFixed(2)} ${(data as any).unit}`; pL2.textContent=(data as any).roomId?`room: ${(data as any).roomId}`:""; } pTs.textContent=`updated: ${new Date((data as any).ts).toLocaleTimeString()}`; } else { pL1.textContent="no data yet"; pL2.textContent=""; pTs.textContent=""; } }
export function showPopupFor(deviceId:string, handle:BABYLON.AbstractMesh){ popupDevId=deviceId; popupTarget=handle; renderPopupContent(); popup.style.display="block"; updatePopupPosition(); }
export function updatePopupPosition(){ if(!popupTarget) return; const pos = popupTarget.getAbsolutePosition(); const p = BABYLON.Vector3.Project(pos, BABYLON.Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight())); popup.style.left=Math.round(p.x+16)+"px"; popup.style.top=Math.round(p.y-16)+"px"; }
export function hidePopup(){
  popup.style.display = "none";
  popupTarget = null;
  popupDevId = null;
}
/** پاک‌سازی همه‌ی سنسورها از صحنه و state داخلیِ ماژول */
export async function clearAllSensors(): Promise<void> {
  // اگر رجیستری و هندل سنسورها دارید، همان را تمیز کنید:
  // مثالِ محافظه‌کارانه:
  try {
    const anySelf = (globalThis as any);
    const handles: any[] = anySelf.__sensorHandles ?? [];
    for (const h of handles) {
      try { h.getChildMeshes?.().forEach((m: any) => m.dispose()); } catch {}
      try { h.dispose?.(); } catch {}
    }
    anySelf.__sensorHandles = [];
    anySelf.__sensorMap = new Map();
  } catch (e) {
    console.warn("[Sensors] clearAllSensors:", e);
  }
}

/** ایجاد سنسور از داده‌ی ذخیره‌شده در project.json */
export async function createSensorFromSerialized(s: any): Promise<void> {
  // این تابع باید با مسیر موجودِ ایجاد سنسور در پروژه‌ی شما همگام باشد.
  // حداقل‌ها: type/model/color/transform را اعمال کنید.
  // نمونه‌ی محافظه‌کارانه (اسکلت):
  const anySelf = (globalThis as any);
  if (!anySelf.__sensorHandles) anySelf.__sensorHandles = [];

  // اگر سازنده/تابع رسمیِ addSensor دارید، همین‌جا صدا بزنید:
  // const handle = await addSensor({...s});
  // در غیر این صورت یک فالبک ساده (اسفر) نشان می‌دهیم:
  const { MeshBuilder, TransformNode } = await import("@babylonjs/core");
  const { scene } = await import("./core/scene");

  const root = new TransformNode(s?.name || s?.id || "Sensor", scene);
  const sphere = MeshBuilder.CreateSphere("sensorSphere", { diameter: s?.scale?.x ?? 0.3 }, scene);
  sphere.parent = root;

  // Remove default color application to preserve original materials
  // try {
  //   const c = s?.color || "#ff6a00";
  //   const mat = sphere.material ?? new (await import("@babylonjs/core")).StandardMaterial("m", scene);
  //   (mat as any).diffuseColor = Color3.FromHexString?.(c) ?? Color3.FromHexString("#ff6a00");
  //   sphere.material = mat;
  // } catch {}

  // ترنسفورم
  if (s?.position) root.position.set(s.position.x || 0, s.position.y || 0, s.position.z || 0);
  root.rotationQuaternion = null;
  if (s?.rotation) root.rotation.set(
    (s.rotation.x || 0) * Math.PI / 180,
    (s.rotation.y || 0) * Math.PI / 180,
    (s.rotation.z || 0) * Math.PI / 180
  );
  if (s?.scale) root.scaling.set(s.scale.x || 1, s.scale.y || 1, s.scale.z || 1);

  anySelf.__sensorHandles.push(root);
}

startRenderLoop(updatePopupPosition);

// Update the sensor list UI
export function updateSensorList(): void {
  const sensorList = document.getElementById('sensorList');
  if (!sensorList) return;

  const sensorArray = Array.from(sensors.values());
  
  if (sensorArray.length === 0) {
    sensorList.innerHTML = '<div class="list-empty">No sensors loaded</div>';
    return;
  }

  sensorList.innerHTML = sensorArray.map(sensor => `
    <div class="sensor-item" data-sensor-id="${sensor.id}">
      <div class="sensor-info">
        <div class="sensor-name">${sensor.label}</div>
        <div class="sensor-details">${sensor.type} • ${sensor.deviceId}</div>
      </div>
      <button class="sensor-delete" onclick="removeSensorById('${sensor.id}')">Delete</button>
    </div>
  `).join('');
}

// Global function for delete buttons
(window as any).removeSensorById = (id: string) => {
  const h = sensorHandles.get(id);
  const s = sensors.get(id);
  
  if (h && s) {
    // اگر گیزمو به این سنسور متصل است، آن را جدا کن
    const gizmoManager = (window as any).gizmoManager;
    if (gizmoManager && gizmoManager.attachedMesh === h) {
      gizmoManager.attachToMesh(null);
    }
    
    // حذف سنسور از صحنه
    try { 
      h.getChildMeshes().forEach(c => c.dispose()); 
    } catch {}
    try { 
      h.dispose(); 
    } catch {}
    
    // حذف از maps
    sensorHandles.delete(id);
    sensors.delete(id);
    
    // اگر سنسور انتخاب‌شده بود، انتخاب را پاک کن
    if ((window as any).selectedId === id) {
      (window as any).selectedId = null;
      hidePopup();
    }
    
    // به‌روزرسانی لیست
    updateSensorList();
  }
};