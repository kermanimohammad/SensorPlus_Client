# راهنمای مطالعه پنل Scene - Digital Twin

## نمای کلی (Overview)

پنل Scene یکی از چهار پنل اصلی در رابط کاربری Digital Twin است که شامل دو بخش اصلی می‌باشد:
1. **Environment Management** - مدیریت محیط‌های 3D
2. **Sensor Management** - مدیریت سنسورها

## ساختار HTML پنل Scene

```html
<section id="panel-scene" class="panel active">
  <!-- 1) Environment Section -->
  <div class="group">
    <div class="group-head">
      <div class="head-icon">
        <img src="/icons/env.svg" alt="Environment Icon" />
      </div>
      <div class="head-title">
        <div class="t1">Environment</div>
        <div class="t2">GLB File</div>
      </div>
    </div>
    
    <!-- Environment Upload -->
    <div class="row">
      <label>Environment (GLB)</label>
      <label class="file-uploader">
        <input id="envFile" type="file" accept=".glb" />
        <span class="file-chip" data-default="Choose File">Choose File</span>
        <span class="file-name">No file chosen</span>
      </label>
    </div>
    
    <!-- Environment List -->
    <div class="row">
      <label>Loaded Environments</label>
      <div id="envList" class="list">
        <div class="list-empty">No environments loaded</div>
      </div>
    </div>
  </div>

  <!-- 2) Sensor Section -->
  <div class="group">
    <div class="group-head">
      <div class="head-icon">
        <img src="/icons/add.svg" alt="" />
      </div>
      <div class="head-title">
        <div class="t1">Sensors</div>
        <div class="t2">Catalog</div>
      </div>
    </div>
    
    <!-- Sensor Catalog -->
    <div class="row">
      <label>Sensor Catalog</label>
      <div class="select-line">
        <select id="catalog">
          <option value="temperature">Temperature</option>
          <option value="humidity">Humidity</option>
          <option value="co2">CO₂</option>
          <option value="light">Light</option>
          <option value="solar">Solar</option>
        </select>
        <button id="btnAdd" class="btn solid">
          <img src="/icons/add.svg" alt="" class="icon" /> Add Sensor
        </button>
      </div>
    </div>
    
    <!-- Sensor List -->
    <div class="row">
      <label>Loaded Sensors</label>
      <div id="sensorList" class="list">
        <div class="list-empty">No sensors loaded</div>
      </div>
    </div>
  </div>
</section>
```

## بخش 1: مدیریت محیط (Environment Management)

### عملکرد اصلی
- آپلود فایل‌های GLB برای ایجاد محیط‌های 3D
- نمایش لیست محیط‌های بارگذاری شده
- حذف محیط‌های موجود

### کدهای مرتبط

#### 1. آپلود محیط (Environment Upload)
```typescript
// در main.ts
envFileInput?.addEventListener("change", async () => {
  const f = envFileInput.files?.[0]; 
  if (!f) return;
  if (!/\.glb$/i.test(f.name)) { 
    console.warn("Only .glb files are supported."); 
    return; 
  }
  const buf = await f.arrayBuffer();
  await addEnvironmentFromGLBArrayBuffer(buf, f.name);
});
```

#### 2. ایجاد محیط از GLB (در env.ts)
```typescript
export async function addEnvironmentFromGLBArrayBuffer(
  buf: ArrayBuffer,
  name?: string
): Promise<string> {
  const safeName = (name && name.toLowerCase().endsWith(".glb")) 
    ? name : ((name || "Env") + ".glb");
  const file = new File([buf], safeName, { type: "model/gltf-binary" });

  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync("", file, scene);
  const root = new BABYLON.TransformNode(name || "Env", scene);
  
  const envId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  container.addAllToScene();
  for (const mesh of container.meshes) {
    if (!mesh.parent) mesh.parent = root;
    mesh.renderingGroupId = 1; // اولویت رندر بالاتر از grid
    mesh.isPickable = true;    // قابل انتخاب
    mesh.checkCollisions = false;
    mesh.isVisible = true;
    
    // metadata برای تشخیص آسان‌تر
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

  setActiveEnvironment(envId);
  updateEnvironmentList();
  return envId;
}
```

#### 3. به‌روزرسانی لیست محیط‌ها
```typescript
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
```

## بخش 2: مدیریت سنسور (Sensor Management)

### عملکرد اصلی
- انتخاب نوع سنسور از کاتالوگ
- اضافه کردن سنسور به صحنه
- نمایش لیست سنسورهای موجود
- حذف سنسورها

### کدهای مرتبط

#### 1. اضافه کردن سنسور
```typescript
// در main.ts
btnAdd.addEventListener("click", async () => {
  await prefabsReady;
  const id   = genId();
  const type = (catalog.value as SensorType) || "temperature";
  const s: SensorNode = {
    id, type,
    label: `${type}-${id.slice(2)}`,
    deviceId: `${type.slice(0,3)}-${Math.floor(100 + Math.random() * 900)}`,
    position: { x: 0, y: 0.7, z: 0 },
    scale: 1.0,
  };
  sensors.set(id, s);
  createSensorHandle(s);
  (window as any).selectedId = id;
  fillPropertyPanel(s);
  updateSensorList();
});
```

#### 2. ایجاد هندل سنسور (در sensors.ts)
```typescript
export function createSensorHandle(s: SensorNode){
  const container = prefabContainers.get(s.type);

  // Fallback: sphere اگر GLB موجود نباشد
  if(!container){
    const m = BABYLON.MeshBuilder.CreateSphere(s.id,{diameter:0.7},scene);
    m.position.set(s.position.x,s.position.y,s.position.z);
    m.isPickable=true;
    m.renderingGroupId = 1;
    (m as any).metadata = { sensorId: s.id, deviceId: s.deviceId, type: s.type };
    m.scaling.setAll((s.scale ?? 1)*GLB_WORLD_SCALE);
    sensorHandles.set(s.id,m);
    return m;
  }

  // استفاده از GLB prefab
  const inst = container.instantiateModelsToScene(name=>`${s.id}-${name}`, false);
  const modelRoot = new BABYLON.TransformNode(`${s.id}-modelRoot`, scene);
  for(const r of inst.rootNodes as BABYLON.Node[]) 
    (r as BABYLON.TransformNode).setParent(modelRoot);

  // تنظیم موقعیت و مقیاس
  const bb = modelRoot.getHierarchyBoundingVectors();
  const centerX=(bb.min.x+bb.max.x)/2, centerZ=(bb.min.z+bb.max.z)/2, bottomY=bb.min.y;
  modelRoot.position.set(-centerX,-bottomY,-centerZ);
  modelRoot.rotationQuaternion=null;
  modelRoot.rotation.set(0,0,0);
  modelRoot.scaling.setAll(1);

  // ایجاد handle نامرئی برای انتخاب
  const handle = BABYLON.MeshBuilder.CreateBox(`${s.id}-handle`,{size:0.001},scene);
  handle.visibility=0;
  handle.isPickable=true;
  (handle as any).metadata={sensorId:s.id, deviceId:s.deviceId, type:s.type};

  modelRoot.setParent(handle);
  handle.position.set(s.position.x,s.position.y,s.position.z);
  handle.scaling.setAll((s.scale ?? 1)*GLB_WORLD_SCALE);

  // همه مش‌های فرزند قابل پیک شوند
  modelRoot.getChildMeshes().forEach(m => {
    m.isPickable = true;
    m.renderingGroupId = 1;
  });

  sensorHandles.set(s.id, handle);
  return handle;
}
```

#### 3. به‌روزرسانی لیست سنسورها
```typescript
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
```

## انواع سنسورهای پشتیبانی شده

### 1. Temperature (دما)
- **فایل مدل**: `/models/temperature.glb`
- **رنگ پیش‌فرض**: `#ff5a5f`
- **محدوده نمایش**: 15-35 درجه سانتی‌گراد

### 2. Humidity (رطوبت)
- **فایل مدل**: `/models/humidity.glb`
- **رنگ پیش‌فرض**: `#00b894`
- **محدوده نمایش**: 0-100 درصد

### 3. CO₂ (دی‌اکسید کربن)
- **فایل مدل**: `/models/co2.glb`
- **رنگ پیش‌فرض**: `#3a86ff`
- **محدوده نمایش**: 400-2000 ppm

### 4. Light (نور)
- **فایل مدل**: `/models/light.glb`
- **رنگ پیش‌فرض**: `#ffd6a5`
- **نمایش**: ON/OFF + قدرت (وات)

### 5. Solar (خورشیدی)
- **فایل مدل**: `/models/solar.glb`
- **رنگ پیش‌فرض**: `#ffd166`
- **نمایش**: قدرت (وات) + ولتاژ + جریان

## ویژگی‌های پیشرفته

### 1. انتخاب و Highlight
```typescript
function addSelectionHighlight(mesh: BABYLON.AbstractMesh) {
  removeSelectionHighlight();
  mesh.outlineColor = new BABYLON.Color3(1, 1, 0); // رنگ زرد
  mesh.outlineWidth = 0.02;
  mesh.renderOutline = true;
  (window as any).selectedMeshOutline = mesh;
}
```

### 2. Gizmo Management
```typescript
const gizmos = new BABYLON.GizmoManager(scene);
gizmos.usePointerToAttachGizmos = false;
gizmos.positionGizmoEnabled = false;
gizmos.rotationGizmoEnabled = false;
gizmos.scaleGizmoEnabled = false;
```

### 3. Popup نمایش داده‌های سنسور
```typescript
export function showPopupFor(deviceId:string, handle:BABYLON.AbstractMesh){ 
  popupDevId=deviceId; 
  popupTarget=handle; 
  renderPopupContent(); 
  popup.style.display="block"; 
  updatePopupPosition(); 
  startPopupAutoUpdate();
}
```

## نکات مهم برای توسعه

### 1. Rendering Groups
- **Grid**: `renderingGroupId = 0`
- **Environment & Sensors**: `renderingGroupId = 1`

### 2. Metadata Structure
```typescript
// برای سنسورها
(mesh as any).metadata = { 
  sensorId: s.id, 
  deviceId: s.deviceId, 
  type: s.type 
};

// برای محیط‌ها
(mesh as any).metadata = { 
  envId: envId, 
  isEnvironment: true,
  envName: name || "Env"
};
```

### 3. Scale Management
```typescript
export const GLB_WORLD_SCALE = 5; // ضریب بزرگنمایی برای مدل‌های کوچک
```

### 4. Event Handling
- **Pointer Pick**: انتخاب اشیاء
- **Double Click**: فریم کردن اشیاء
- **Escape Key**: لغو انتخاب

## فایل‌های مرتبط

1. **`src/main.ts`** - منطق اصلی پنل Scene
2. **`src/sensors.ts`** - مدیریت سنسورها
3. **`src/env.ts`** - مدیریت محیط‌ها
4. **`src/types.ts`** - تعریف انواع داده
5. **`src/core/scene.ts`** - تنظیمات صحنه Babylon.js
6. **`index.html`** - ساختار HTML پنل

## خلاصه عملکرد

پنل Scene به عنوان مرکز کنترل اصلی برای:
- **ایجاد محیط‌های 3D** از فایل‌های GLB
- **اضافه کردن سنسورها** از کاتالوگ موجود
- **مدیریت اشیاء** در صحنه 3D
- **انتخاب و ویرایش** اشیاء با ابزارهای Transform

این پنل رابط کاربری اصلی برای ساخت و مدیریت Digital Twin است.
