import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import { scene, camera, canvas, startRenderLoop } from "./core/scene";
import { GLB_WORLD_SCALE, ENABLE_PULSE } from "./types";
import type { SensorNode, SensorType, Reading } from "./types";
import { updateEnvironmentList } from "./env";

export const sensors = new Map<string, SensorNode>();
export const sensorHandles = new Map<string, BABYLON.AbstractMesh>();
export let selectedId: string | null = null;
// Import latestByDev from api-client
import { latestByDev } from "./api-client";

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
    try{
      const c = await BABYLON.SceneLoader.LoadAssetContainerAsync(url!, undefined, scene);
      prefabContainers.set(t as SensorType, c);
    } catch(e){
      console.error("[PrefabsReady] Failed to load", t, url, e);
    }
  }));
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
  // Apply user rotation if available
  if (s.rotationEulerDeg) {
    const toRad = (deg: number) => deg * Math.PI / 180;
    modelRoot.rotation.set(toRad(s.rotationEulerDeg.x), toRad(s.rotationEulerDeg.y), toRad(s.rotationEulerDeg.z));
  } else {
    modelRoot.rotation.set(0,0,0);
  }
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
  
  // Store current scale to preserve user modifications
  const currentScale = handle.scaling.x;
  const isUserModified = Math.abs(currentScale - base) > 0.001;
  
  // Store current rotation to preserve user modifications
  const currentRotation = handle.rotation.clone();
  
  const setPulse=(t:number,a=0.15)=>{ 
    if(!ENABLE_PULSE){ 
      // Only reset to base if user hasn't modified the scale
      if (!isUserModified) {
        handle.scaling.setAll(base); 
      }
      return;
    } 
    // Use current scale as base for pulse if user modified it
    const pulseBase = isUserModified ? currentScale : base;
    handle.scaling.setAll(pulseBase*(1+a*t)); 
  };
  
  const children = handle.getChildMeshes(); const targetMeshes = children.length?children:[handle];
  // const setEmissive=(c: BABYLON.Color3)=> targetMeshes.forEach(m=>{ const mat=m.material as any; if(mat?.emissiveColor!==undefined) mat.emissiveColor=c; }); // غیرفعال شده - رنگ تغییر نمی‌کند
  const clamp=(v:number,lo:number,hi:number)=> Math.max(lo, Math.min(hi,v)); const norm=(v:number,lo:number,hi:number)=> (clamp(v,lo,hi)-lo)/(hi-lo);
  // const color3 = (hex:string)=> BABYLON.Color3.FromHexString(hex); // غیرفعال شده - رنگ تغییر نمی‌کند
  
  if(reading.kind==="solar"){ 
    const t=norm(reading.powerW,0,1000); 
    setPulse(t,0.25); 
    // setEmissive(BABYLON.Color3.Lerp(color3("#996f00"), color3("#ffd166"), t)); // غیرفعال شده
  }
  else if(reading.kind==="light"){ 
    const vis = reading.on?1:0.25; 
    targetMeshes.forEach(m=>m.visibility=vis); 
    // Only reset scale if user hasn't modified it
    if (!isUserModified) {
      handle.scaling.setAll(base); 
    }
  }
  else { 
    let t=0; 
    // let baseCol=color3("#aaa"); // غیرفعال شده
    if(reading.kind==="temperature"){t=norm(reading.value,15,35);} 
    if(reading.kind==="humidity"){t=norm(reading.value,0,100);} 
    if(reading.kind==="co2"){t=norm(reading.value,400,2000);}
    setPulse(t,0.15); 
    // setEmissive(BABYLON.Color3.Lerp(baseCol.scale(0.4), baseCol, t)); // غیرفعال شده
  }
  
  // Restore rotation to preserve user modifications
  handle.rotation.copyFrom(currentRotation);
  
  // Update permanent popup for this sensor
  updatePermanentPopup(info.deviceId);
}

// Permanent popup system for all sensors
const permanentPopups = new Map<string, HTMLElement>();

// Global popup visibility state
let popupsEnabled = true;

// Map to store individual popup visibility states
const individualPopupStates = new Map<string, boolean>();

// Legacy function - disabled
export function renderPopupContent(_d?: Reading){ 
  console.log(`[Legacy Popup] renderPopupContent called - using permanent popups instead`);
}

// Create permanent popup for a sensor
export function createPermanentPopup(deviceId: string, _handle: BABYLON.AbstractMesh): void {
  // Remove existing popup if any
  removePermanentPopup(deviceId);
  
  const popup = document.createElement("div");
  popup.id = `popup-${deviceId}`;
  popup.style.cssText = `
    position: fixed;
    z-index: 30;
    min-width: 80px;
    max-width: 180px;
    width: auto;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    padding: 6px 8px;
    border-radius: 6px;
    font: 11px system-ui;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.2);
    left: 100px;
    top: 100px;
    white-space: nowrap;
  `;
  
  const pTitle = document.createElement("div");
  pTitle.style.fontWeight = "700";
  pTitle.style.fontSize = "10px";
  pTitle.style.marginBottom = "2px";
  
  const pL1 = document.createElement("div");
  pL1.style.fontSize = "10px";
  
  const pL2 = document.createElement("div");
  pL2.style.color = "#cbd5e1";
  pL2.style.fontSize = "9px";
  
  const pTs = document.createElement("div");
  pTs.style.cssText = "color:#94a3b8;font-size:8px;margin-top:1px";
  
  popup.append(pTitle, pL1, pL2, pTs);
  document.body.appendChild(popup);
  
  // Set initial visibility based on global and individual states
  const individualEnabled = individualPopupStates.get(deviceId) ?? true;
  popup.style.display = (popupsEnabled && individualEnabled) ? 'block' : 'none';
  
  permanentPopups.set(deviceId, popup);
  
  // Update popup content
  updatePermanentPopup(deviceId);
  
  // Adjust popup width based on content
  adjustPopupWidth(popup);
}

// Adjust popup width based on content
function adjustPopupWidth(popup: HTMLElement): void {
  // Temporarily make it visible to measure content
  const originalDisplay = popup.style.display;
  
  // Reset width constraints for accurate measurement
  popup.style.width = 'auto';
  popup.style.minWidth = 'auto';
  popup.style.maxWidth = 'none';
  popup.style.display = 'block';
  popup.style.visibility = 'hidden';
  
  // Force a reflow to get accurate measurements
  popup.offsetHeight;
  
  // Measure the actual content width
  const contentWidth = popup.scrollWidth;
  
  // Calculate target width based on the longest line
  const children = popup.children;
  let maxLineWidth = 0;
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement;
    if (child.textContent) {
      // Create a temporary span to measure text width
      const tempSpan = document.createElement('span');
      tempSpan.style.cssText = `
        position: absolute;
        visibility: hidden;
        font: 11px system-ui;
        white-space: nowrap;
      `;
      tempSpan.textContent = child.textContent;
      document.body.appendChild(tempSpan);
      
      const textWidth = tempSpan.offsetWidth;
      maxLineWidth = Math.max(maxLineWidth, textWidth);
      
      document.body.removeChild(tempSpan);
    }
  }
  
  // Use the longer of content width or longest line width
  const actualWidth = Math.max(contentWidth, maxLineWidth);
  const padding = 12; // Reduced padding
  const targetWidth = Math.max(80, actualWidth + padding);
  
  // Set the calculated width
  popup.style.width = `${targetWidth}px`;
  popup.style.minWidth = '80px';
  popup.style.maxWidth = '180px';
  
  // Restore visibility
  popup.style.visibility = 'visible';
  popup.style.display = originalDisplay || 'block';
}

// Update permanent popup content
export function updatePermanentPopup(deviceId: string): void {
  const popup = permanentPopups.get(deviceId);
  if (!popup) {
    return;
  }
  
  const data = latestByDev.get(deviceId);
  const elements = popup.children;
  
  if (elements.length >= 4) {
    const pTitle = elements[0] as HTMLElement;
    const pL1 = elements[1] as HTMLElement;
    const pL2 = elements[2] as HTMLElement;
    const pTs = elements[3] as HTMLElement;
    
    pTitle.textContent = deviceId;
    
    if (data) {
      if (data.kind === "light") {
        pL1.textContent = `${data.on ? "ON" : "OFF"} | ${data.powerW.toFixed(1)}W`;
        pL2.textContent = data.roomId ? `Room: ${data.roomId}` : "";
      } else if (data.kind === "solar") {
        pL1.textContent = `${data.powerW.toFixed(1)}W | ${data.voltage.toFixed(1)}V`;
        pL2.textContent = "";
      } else {
        pL1.textContent = `${data.value.toFixed(1)} ${data.unit || ""}`;
        pL2.textContent = data.roomId ? `Room: ${data.roomId}` : "";
      }
      pTs.textContent = new Date(data.ts).toLocaleTimeString();
  } else { 
      pL1.textContent = "No data";
      pL2.textContent = "";
      pTs.textContent = "";
    }
    
    // Adjust width after content update
    adjustPopupWidth(popup);
  }
}

// Remove permanent popup
export function removePermanentPopup(deviceId: string): void {
  const popup = permanentPopups.get(deviceId);
  if (popup) {
    popup.remove();
    permanentPopups.delete(deviceId);
  }
}

// Update all permanent popups positions
export function updateAllPermanentPopups(): void {
  permanentPopups.forEach((popup, deviceId) => {
    // Find handle by deviceId through sensors map
    let handle: BABYLON.AbstractMesh | null = null;
    for (const [sensorId, sensor] of sensors.entries()) {
      if (sensor.deviceId === deviceId) {
        handle = sensorHandles.get(sensorId) || null;
        break;
      }
    }
    
    if (handle) {
      const pos = handle.getAbsolutePosition();
      const engine = scene.getEngine();
      
      // Get actual canvas dimensions (accounts for browser zoom and CSS scaling)
      // getBoundingClientRect gives us the actual rendered size on screen
      const canvasRect = canvas.getBoundingClientRect();
      const canvasWidth = canvasRect.width || canvas.clientWidth || engine.getRenderWidth();
      const canvasHeight = canvasRect.height || canvas.clientHeight || engine.getRenderHeight();
      
      // Get canvas position on screen (needed for absolute positioning)
      const canvasLeft = canvasRect.left || 0;
      const canvasTop = canvasRect.top || 0;
      
      // Use render dimensions for projection (internal rendering)
      const renderWidth = engine.getRenderWidth();
      const renderHeight = engine.getRenderHeight();
      
      const p = BABYLON.Vector3.Project(
        pos, 
        BABYLON.Matrix.Identity(), 
        scene.getTransformMatrix(), 
        camera.viewport.toGlobal(renderWidth, renderHeight)
      );
      if (p) {
        // Scale the projected coordinates to match actual canvas size (accounts for browser zoom)
        // This is necessary because projection uses render size, but we need screen coordinates
        const scaleX = canvasWidth / renderWidth;
        const scaleY = canvasHeight / renderHeight;
        
        // Calculate offset relative to actual canvas size for consistent positioning
        // This ensures popups appear at the same visual distance regardless of browser zoom
        const baseOffset = 16; // Base offset in pixels (at 100% zoom)
        // Scale offset based on actual canvas size to maintain visual consistency
        const viewportScale = Math.min(
          Math.max(canvasWidth / 1920, canvasHeight / 1080),
          1.5
        );
        const offsetX = baseOffset * viewportScale;
        const offsetY = baseOffset * viewportScale;
        
        // Apply scaling to projected coordinates, add canvas position, and add offset
        // Since popup uses position: fixed, coordinates are relative to viewport
        // canvasLeft and canvasTop are already relative to viewport, so we add them
        popup.style.left = Math.round(canvasLeft + p.x * scaleX + offsetX) + "px";
        popup.style.top = Math.round(canvasTop + p.y * scaleY - offsetY) + "px";
      }
    }
  });
}

export function showPopupFor(_deviceId:string, _handle:BABYLON.AbstractMesh){ 
  // Disabled - using permanent popups instead
}

// Legacy function - disabled
export function updatePopupPosition(){ 
  // Disabled - using permanent popups instead
}

export function hidePopup(){
  // Disabled - using permanent popups instead
}

// تابع تست برای tooltip
export function testTooltip(deviceId: string) {
  const data = latestByDev.get(deviceId);
  if (data) {
    console.log(`[Tooltip Test] Data for ${deviceId}:`, {
      kind: data.kind,
      value: 'value' in data ? data.value : 'N/A',
      unit: 'unit' in data ? data.unit : 'N/A',
      ts: new Date(data.ts).toLocaleTimeString(),
      roomId: 'roomId' in data ? data.roomId : 'N/A'
    });
  }
}

// تابع تست برای بررسی همه داده‌ها
export function testAllData() {
  console.log(`[Data Test] Total devices: ${latestByDev.size}`);
  
  for (const [deviceId, data] of latestByDev.entries()) {
    console.log(`[Data Test] ${deviceId}:`, {
      kind: data.kind,
      timestamp: new Date(data.ts).toLocaleTimeString()
    });
  }
}

// تابع تست برای بررسی popup
export function testPopup() {
  console.log(`[Popup Test] Permanent popups count: ${permanentPopups.size}`);
}

// Toggle all popups visibility
export function toggleAllPopups(show: boolean): void {
  popupsEnabled = show;
  permanentPopups.forEach((popup, deviceId) => {
    const individualEnabled = individualPopupStates.get(deviceId) ?? true;
    popup.style.display = (show && individualEnabled) ? 'block' : 'none';
  });
}

// Get popup visibility state
export function arePopupsEnabled(): boolean {
  return popupsEnabled;
}

// Toggle individual popup visibility
export function toggleIndividualPopup(deviceId: string, show: boolean): void {
  individualPopupStates.set(deviceId, show);
  const popup = permanentPopups.get(deviceId);
  if (popup) {
    // Show only if both global and individual states are enabled
    popup.style.display = (popupsEnabled && show) ? 'block' : 'none';
  }
}

// Get individual popup visibility state
export function isIndividualPopupEnabled(deviceId: string): boolean {
  return individualPopupStates.get(deviceId) ?? true; // Default to true
}

// Toggle sensor popup (for global access)
(window as any).toggleSensorPopup = function(deviceId: string) {
  const currentState = isIndividualPopupEnabled(deviceId);
  toggleIndividualPopup(deviceId, !currentState);
  updateSensorList(); // Refresh the UI to update eye button state
};

// Legacy functions removed - using permanent popups instead
/** پاک‌سازی همه‌ی سنسورها از صحنه و state داخلیِ ماژول */
export async function clearAllSensors(): Promise<void> {
  // حذف همه پاپ‌آپ‌های دائمی
  permanentPopups.forEach((popup) => {
    popup.remove();
  });
  permanentPopups.clear();
  
  // حذف همه وضعیت‌های فردی پاپ‌آپ‌ها
  individualPopupStates.clear();
  
  // حذف همه سنسورها از maps
  sensorHandles.forEach((handle) => {
    try { 
      handle.getChildMeshes().forEach(c => c.dispose()); 
    } catch {}
    try { 
      handle.dispose(); 
    } catch {}
  });
  sensorHandles.clear();
  sensors.clear();
  
  // به‌روزرسانی لیست
  updateSensorList();
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

  const selectedId = (window as any).selectedId;
  
  sensorList.innerHTML = sensorArray.map(sensor => {
    const isSelected = selectedId === sensor.id;
    const isPopupEnabled = isIndividualPopupEnabled(sensor.deviceId);
    return `
      <div class="sensor-item ${isSelected ? 'selected' : ''}" data-sensor-id="${sensor.id}">
        <div class="sensor-info">
          <div class="sensor-name">${sensor.label}</div>
          <div class="sensor-details">${sensor.type} • ${sensor.deviceId}</div>
        </div>
        <div class="sensor-actions">
          <button class="sensor-eye ${isPopupEnabled ? 'enabled' : 'disabled'}" 
                  onclick="toggleSensorPopup('${sensor.deviceId}')" 
                  title="${isPopupEnabled ? 'Hide popup' : 'Show popup'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          </button>
          <button class="sensor-delete" onclick="removeSensorById('${sensor.id}')" title="Delete sensor">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners for click and double-click
  sensorList.querySelectorAll('.sensor-item').forEach(item => {
    const sensorId = item.getAttribute('data-sensor-id');
    if (!sensorId) return;

    // Single click - select sensor
    item.addEventListener('click', (e) => {
      // Prevent event bubbling if delete button or eye button was clicked
      if ((e.target as HTMLElement).classList.contains('sensor-delete') || 
          (e.target as HTMLElement).classList.contains('sensor-eye') ||
          (e.target as HTMLElement).closest('.sensor-eye')) {
        return;
      }
      
      selectSensorById(sensorId);
    });

    // Double click - frame sensor
    item.addEventListener('dblclick', (e) => {
      // Prevent event bubbling if delete button was clicked
      if ((e.target as HTMLElement).classList.contains('sensor-delete')) {
        return;
      }
      
      frameSensorById(sensorId);
    });
  });
}

// Function to select sensor by ID
export function selectSensorById(sensorId: string): void {
  const h = sensorHandles.get(sensorId);
  const s = sensors.get(sensorId);
  
  if (h && s) {
    // انتخاب سنسور
    (window as any).selectedId = sensorId;
    
    
    // پر کردن پنل scene properties
    const fillScenePropertyPanel = (window as any).fillScenePropertyPanel;
    if (fillScenePropertyPanel) {
      fillScenePropertyPanel(s);
    }
    
    // نمایش پنل scene properties
    const showSceneProperties = (window as any).showSceneProperties;
    if (showSceneProperties) {
      showSceneProperties();
    }
    
    // نمایش popup
    showPopupFor(s.deviceId, h);
    
    // اضافه کردن highlight بصری
    const addSelectionHighlight = (window as any).addSelectionHighlight;
    if (addSelectionHighlight) {
      addSelectionHighlight(h);
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
    
    console.log("[DEBUG] Sensor selected from list:", sensorId);
  }
}

// Function to frame sensor by ID
export function frameSensorById(sensorId: string): void {
  const h = sensorHandles.get(sensorId);
  
  if (h) {
    // ابتدا سنسور را انتخاب کن
    selectSensorById(sensorId);
    
    // سپس روی آن زوم کن
    const frameNode = (window as any).frameNode;
    if (frameNode) {
      frameNode(h);
    }
    
    console.log("[DEBUG] Sensor framed from list:", sensorId);
  }
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
    
    // حذف پاپ‌آپ دائمی
    removePermanentPopup(s.deviceId);
    
    // حذف وضعیت فردی پاپ‌آپ
    individualPopupStates.delete(s.deviceId);
    
    // حذف از maps
    sensorHandles.delete(id);
    sensors.delete(id);
    
    // اگر سنسور انتخاب‌شده بود، انتخاب را پاک کن
    if ((window as any).selectedId === id) {
      (window as any).selectedId = null;
      hidePopup(); // این خودش auto-update را متوقف می‌کند
      
      // مخفی کردن پنل scene properties
      const hideSceneProperties = (window as any).hideSceneProperties;
      if (hideSceneProperties) {
        hideSceneProperties();
      }
    }
    
    // به‌روزرسانی لیست
    updateSensorList();
  }
};