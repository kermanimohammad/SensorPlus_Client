# راهنمای حل مشکل انتخاب مدل‌های محیط

## مشکل
مدل‌های محیط (GLB files) قابل انتخاب با ابزارهای انتخاب و ترنسفورم نبودند.

## علل مشکل

### 1. تعریف نادرست envId
`envId` بعد از استفاده در metadata تعریف می‌شد که باعث `undefined` شدن آن می‌شد.

### 2. بررسی نادرست نوع node
کد `envRoot instanceof BABYLON.AbstractMesh` را بررسی می‌کرد اما `envRoot` یک `TransformNode` است.

### 3. عدم وجود metadata
Mesh های محیط metadata نداشتند برای تشخیص آسان‌تر.

## تغییرات اعمال شده

### 1. اصلاح ترتیب تعریف envId (src/env.ts)
```typescript
// قبل
const container = await BABYLON.SceneLoader.LoadAssetContainerAsync("", file, scene);
const root = new BABYLON.TransformNode(name || "Env", scene);

container.addAllToScene();
for (const mesh of container.meshes) {
  (mesh as any).metadata = { 
    envId: envId, // ⚠️ envId هنوز تعریف نشده!
    isEnvironment: true
  };
}

const envId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// بعد  
const container = await BABYLON.SceneLoader.LoadAssetContainerAsync("", file, scene);
const root = new BABYLON.TransformNode(name || "Env", scene);
  
// ✅ ابتدا envId را تعریف می‌کنیم
const envId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

container.addAllToScene();
for (const mesh of container.meshes) {
  (mesh as any).metadata = { 
    envId: envId, // ✅ حالا envId تعریف شده است
    isEnvironment: true
  };
}
```

### 2. اضافه کردن metadata و فعال‌سازی کامل انتخاب
```typescript
for (const mesh of container.meshes) {
  if (!mesh.parent) mesh.parent = root;
  mesh.renderingGroupId = 1;
  mesh.isPickable = true; // ✅ فعال‌سازی انتخاب
  mesh.checkCollisions = false;
  mesh.isVisible = true;
  
  // ✅ اضافه کردن metadata برای تشخیص آسان‌تر
  (mesh as any).metadata = { 
    envId: envId, 
    isEnvironment: true,
    envName: name || "Env"
  };
  
  console.log("[DEBUG] Environment mesh created:", mesh.name, "isPickable:", mesh.isPickable);
}
```

### 3. بهبود resolveEnvFromMesh (src/env.ts)
```typescript
export function resolveEnvFromMesh(node: BABYLON.Node | null | undefined): string | null {
  if (!node) return null;
  let cur = node as BABYLON.Node | null;
  
  // ✅ ابتدا بررسی metadata
  const metadata = (cur as any).metadata;
  if (metadata && metadata.isEnvironment && metadata.envId) {
    console.log("[DEBUG] Found environment via metadata:", metadata.envId);
    return metadata.envId;
  }
  
  // سپس بررسی hierarchy
  while (cur) {
    for (const [id, e] of envs) {
      if (cur === e.root) return id;
      if (e.root && cur.parent === e.root) return id;
    }
    cur = (cur.parent as BABYLON.Node | null) || null;
  }
  return null;
}
```

### 4. اصلاح highlight و gizmo attachment (src/main.ts)
```typescript
// قبل
const envRoot = getActiveEnvRoot();
if (envRoot && envRoot instanceof BABYLON.AbstractMesh) {
  gizmos.attachToMesh(envRoot); // ⚠️ envRoot یک TransformNode است، نه AbstractMesh
  return true;
}

// بعد
const envRoot = getActiveEnvRoot();
if (envRoot) {
  // ✅ برای TransformNode، gizmo را به اولین mesh فرزند attach می‌کنیم
  const firstMesh = envRoot.getChildMeshes()[0];
  if (firstMesh) {
    gizmos.attachToMesh(firstMesh);
    return true;
  }
}
```

### 5. اضافه کردن Debug Logs
```typescript
console.log("[DEBUG] Pointer pick event:", {
  hit: pick?.hit,
  pickedMesh: pick?.pickedMesh?.name,
  distance: pick?.distance
});

console.log("[DEBUG] Picked mesh:", pick.pickedMesh.name, "EnvId:", envId);
console.log("[DEBUG] Environment mesh created:", mesh.name, "isPickable:", mesh.isPickable);
console.log("[DEBUG] Found environment via metadata:", metadata.envId);
```

## نحوه تست

### 1. تست انتخاب محیط
1. یک فایل GLB آپلود کنید
2. Console را باز کنید (F12)
3. روی مدل محیط کلیک کنید
4. باید این پیام‌ها را ببینید:
   ```
   [DEBUG] Pointer pick event: { hit: true, pickedMesh: "meshName", distance: X }
   [DEBUG] Picked mesh: meshName EnvId: 1234567-abc123
   [DEBUG] Found environment via metadata: 1234567-abc123
   ```

### 2. تست ترنسفورم محیط
1. محیط را انتخاب کنید
2. ابزار Move/Rotate/Scale را انتخاب کنید
3. روی محیط کلیک کنید
4. باید gizmo نمایش داده شود
5. مدل را جابجا/چرخش/مقیاس دهید

### 3. تست highlight بصری
1. روی محیط کلیک کنید
2. باید outline زرد نمایش داده شود
3. روی سنسور کلیک کنید
4. highlight باید به سنسور منتقل شود

## نتیجه

با این تغییرات، مدل‌های محیط حالا:
- ✅ قابل انتخاب هستند
- ✅ قابل جابجایی هستند
- ✅ قابل چرخش هستند
- ✅ قابل مقیاس‌گذاری هستند
- ✅ highlight بصری دارند
- ✅ metadata مناسب دارند برای تشخیص آسان‌تر

## Debug و عیب‌یابی

اگر هنوز مشکل وجود دارد:

1. Console را باز کنید و debug logs را بررسی کنید
2. بررسی کنید `isPickable` برای mesh های محیط `true` است:
   ```javascript
   scene.meshes.forEach(m => console.log(m.name, m.isPickable))
   ```
3. بررسی کنید metadata صحیح است:
   ```javascript
   scene.meshes.forEach(m => console.log(m.name, m.metadata))
   ```
4. بررسی کنید `envId` صحیح است:
   ```javascript
   console.log(envs) // در console
   ```
