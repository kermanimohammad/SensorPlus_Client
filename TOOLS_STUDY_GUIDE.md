# راهنمای مطالعه ابزارهای انتخاب و ترنسفورم در Digital Twin

## مقدمه
این سند نحوه کارکرد ابزارهای انتخاب (Selection Tool) و ابزارهای ترنسفورم (Transform Tools) در پروژه Digital Twin را بررسی می‌کند. این ابزارها بر اساس Babylon.js GizmoManager پیاده‌سازی شده‌اند.

## 1. ابزار انتخاب (Selection Tool)

### 1.1 تعریف و هدف
ابزار انتخاب برای انتخاب اشیاء در صحنه 3D استفاده می‌شود. این ابزار امکان انتخاب سنسورها و محیط‌های فعال را فراهم می‌کند.

### 1.2 پیاده‌سازی در کد

```typescript
// در فایل src/main.ts خطوط 108-114
function enableSelect() {
  gizmos.attachToMesh(null);  // جدا کردن gizmo از هر mesh
  gizmos.positionGizmoEnabled = false;
  gizmos.rotationGizmoEnabled = false;
  gizmos.scaleGizmoEnabled    = false;
  setToolPressed(btnSelect);  // تنظیم وضعیت دکمه
}
```

### 1.3 مکانیزم انتخاب

#### انتخاب با کلیک (Click Selection)
```typescript
// در فایل src/main.ts خطوط 356-387
scene.onPointerObservable.add((pi) => {
  if (pi.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
  const pick = pi.pickInfo;
  if (!pick?.hit || !pick.pickedMesh) return;

  // بررسی انتخاب سنسور
  const r = resolveHandle(pick.pickedMesh);
  if (r) {
    (window as any).selectedId = r.sensorId;
    const s = sensors.get(r.sensorId)!;
    fillPropertyPanel(s);
    showPopupFor(r.deviceId || s.deviceId, r.handle);
    // فعال‌سازی ابزار ترنسفورم در صورت انتخاب
    if (btnMove?.getAttribute("aria-pressed") === "true") enableMove();
    else if (btnRotate?.getAttribute("aria-pressed") === "true") enableRotate();
    else if (btnScale?.getAttribute("aria-pressed") === "true") enableScale();
    return;
  }

  // بررسی انتخاب محیط
  const envId = resolveEnvFromMesh(pick.pickedMesh);
  (window as any).selectedId = null;
  hidePopup();

  if (envId) {
    setActiveEnvironment(envId);
    // فعال‌سازی ابزار ترنسفورم در صورت انتخاب
    if (btnMove?.getAttribute("aria-pressed") === "true") enableMove();
    else if (btnRotate?.getAttribute("aria-pressed") === "true") enableRotate();
    else if (btnScale?.getAttribute("aria-pressed") === "true") enableScale();
    else enableSelect();
  } else {
    enableSelect();
  }
});
```

#### انتخاب با دابل کلیک (Double-click Framing)
```typescript
// در فایل src/main.ts خطوط 389-403
scene.onPointerObservable.add((pi) => {
  if (pi.type !== BABYLON.PointerEventTypes.POINTERDOUBLETAP) return;
  const pick = pi.pickInfo;
  if (!pick?.hit || !pick.pickedMesh) return;

  const r = resolveHandle(pick.pickedMesh);
  if (r) { 
    frameNode(r.handle);  // فریم کردن سنسور
    return; 
  }

  const envId = resolveEnvFromMesh(pick.pickedMesh);
  if (envId) {
    setActiveEnvironment(envId);
    const envRoot = getActiveEnvRoot();
    if (envRoot) frameNode(envRoot);  // فریم کردن محیط
  }
});
```

### 1.4 مدیریت وضعیت انتخاب
```typescript
// در فایل src/main.ts خطوط 100-106
function setToolPressed(el?: HTMLButtonElement | null) {
  [btnSelect, btnMove, btnRotate, btnScale].forEach(b => {
    if (!b) return;
    if (b === el) b.setAttribute("aria-pressed", "true");
    else b.removeAttribute("aria-pressed");
  });
}
```

## 2. ابزارهای ترنسفورم (Transform Tools)

### 2.1 Gizmo Manager
تمام ابزارهای ترنسفورم بر اساس Babylon.js GizmoManager پیاده‌سازی شده‌اند:

```typescript
// در فایل src/main.ts خطوط 89-99
const gizmos = new BABYLON.GizmoManager(scene);
gizmos.usePointerToAttachGizmos = false;
gizmos.positionGizmoEnabled = false;
gizmos.rotationGizmoEnabled = false;
gizmos.scaleGizmoEnabled    = false;

// تنظیمات اضافی برای rotation gizmo
if (gizmos.gizmos.rotationGizmo) {
  gizmos.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
}
```

### 2.2 ابزار جابجایی (Move Tool)

#### فعال‌سازی
```typescript
// در فایل src/main.ts خطوط 134-140
function enableMove() {
  if (!attachToCurrentSelection()) return;
  gizmos.positionGizmoEnabled = true;
  gizmos.rotationGizmoEnabled = false;
  gizmos.scaleGizmoEnabled    = false;
  setToolPressed(btnMove);
}
```

#### اتصال به انتخاب فعلی
```typescript
// در فایل src/main.ts خطوط 117-132
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
  if (envRoot && envRoot instanceof BABYLON.AbstractMesh) {
    gizmos.attachToMesh(envRoot);
    return true;
  }
  return false;
}
```

### 2.3 ابزار چرخش (Rotate Tool)

```typescript
// در فایل src/main.ts خطوط 141-147
function enableRotate() {
  if (!attachToCurrentSelection()) return;
  gizmos.positionGizmoEnabled = false;
  gizmos.rotationGizmoEnabled = true;
  gizmos.scaleGizmoEnabled    = false;
  setToolPressed(btnRotate);
}
```

### 2.4 ابزار مقیاس‌گذاری (Scale Tool)

```typescript
// در فایل src/main.ts خطوط 148-154
function enableScale() {
  if (!attachToCurrentSelection()) return;
  gizmos.positionGizmoEnabled = false;
  gizmos.rotationGizmoEnabled = false;
  gizmos.scaleGizmoEnabled    = true;
  setToolPressed(btnScale);
}
```

## 3. ذخیره‌سازی تغییرات (Persistence)

### 3.1 ذخیره موقعیت
```typescript
// در فایل src/main.ts خطوط 159-167
function persistPositionIfSensor() {
  const id = (window as any).selectedId as string | null;
  if (!id) return;
  const h = sensorHandles.get(id);
  const s = sensors.get(id);
  if (!h || !s) return;
  s.position = { x: h.position.x, y: h.position.y, z: h.position.z };
  console.log("[Persistence] Position saved for", id, ":", s.position);
}
```

### 3.2 ذخیره مقیاس
```typescript
// در فایل src/main.ts خطوط 168-179
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
  console.log("[Persistence] Scale saved for", id, ":", s.scale);
}
```

### 3.3 ذخیره چرخش
```typescript
// در فایل src/main.ts خطوط 180-190
function persistRotationIfSensor() {
  const id = (window as any).selectedId as string | null;
  if (!id) return;
  const h = sensorHandles.get(id);
  const s = sensors.get(id);
  if (!h || !s) return;
  const r = (h.rotationQuaternion ? h.rotationQuaternion.toEulerAngles() : h.rotation);
  const toDeg = (rad: number) => rad * 180 / Math.PI;
  s.rotationEulerDeg = { x: toDeg(r.x), y: toDeg(r.y), z: toDeg(r.z) };
  console.log("[Persistence] Rotation saved for", id, ":", s.rotationEulerDeg);
}
```

### 3.4 اتصال رویدادها
```typescript
// در فایل src/main.ts خطوط 191-198
gizmos.gizmos.positionGizmo?.onDragEndObservable.add(persistPositionIfSensor);
gizmos.gizmos.scaleGizmo?.onDragEndObservable.add(persistScaleIfSensor);
gizmos.gizmos.rotationGizmo?.onDragEndObservable.add(persistRotationIfSensor);

// اضافه کردن persistence برای تغییرات مداوم
gizmos.gizmos.positionGizmo?.onDragObservable.add(persistPositionIfSensor);
gizmos.gizmos.scaleGizmo?.onDragObservable.add(persistScaleIfSensor);
gizmos.gizmos.rotationGizmo?.onDragObservable.add(persistRotationIfSensor);
```

## 4. رابط کاربری (UI)

### 4.1 دکمه‌های ابزار
```html
<!-- در فایل index.html خطوط 13-29 -->
<div id="toolsDock" class="tools-dock horizontal" aria-label="Tools">
  <button id="btnToolSelect" class="icon-btn" title="Select">
    <img src="/icons/select.svg" alt="" class="icon" />
  </button>
  <button id="btnMove" class="icon-btn" title="Move">
    <img src="/icons/move.svg" alt="" class="icon" />
  </button>
  <button id="btnToolRotate" class="icon-btn" title="Rotate">
    <img src="/icons/rotate.svg" alt="" class="icon" />
  </button>
  <button id="btnToolScale" class="icon-btn" title="Scale">
    <img src="/icons/scale.svg" alt="" class="icon" />
  </button>
  <button id="btnDelete" class="icon-btn" title="Delete">
    <img src="/icons/delete.svg" alt="" class="icon" />
  </button>
</div>
```

### 4.2 اتصال رویدادها
```typescript
// در فایل src/main.ts خطوط 252-255
btnSelect?.addEventListener("click", () => enableSelect());
btnMove  ?.addEventListener("click", () => enableMove());
btnRotate?.addEventListener("click", () => enableRotate());
btnScale ?.addEventListener("click", () => enableScale());
```

## 5. فریم کردن اشیاء (Framing)

### 5.1 تابع فریم کردن
```typescript
// در فایل src/main.ts خطوط 328-351
function frameNode(node: BABYLON.Node, pad = 0.4, maxRadius = 30) {
  const bb = (node as any).getHierarchyBoundingVectors?.();
  if (!bb) return;
  const min: BABYLON.Vector3 = bb.min, max: BABYLON.Vector3 = bb.max;
  const center = BABYLON.Vector3.Center(min, max);
  const diag   = max.subtract(min);
  const radius = Math.max(diag.length() * 0.5 * pad, 0.5);

  const toTarget = center;
  const toRadius = Math.min(radius, maxRadius);

  // ایجاد انیمیشن برای target
  const aTarget = new BABYLON.Animation("camTargetAnim","target",60,BABYLON.Animation.ANIMATIONTYPE_VECTOR3,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  aTarget.setKeys([{ frame: 0, value: camera.target.clone() }, { frame: 45, value: toTarget }]);

  // ایجاد انیمیشن برای radius
  const aRadius = new BABYLON.Animation("camRadiusAnim","radius",60,BABYLON.Animation.ANIMATIONTYPE_FLOAT,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  aRadius.setKeys([{ frame: 0, value: camera.radius }, { frame: 45, value: toRadius }]);

  // تنظیم easing
  const easing = new BABYLON.CubicEase(); 
  easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
  aTarget.setEasingFunction(easing); 
  aRadius.setEasingFunction(easing);

  // شروع انیمیشن
  camera.animations = [];
  camera.animations.push(aTarget, aRadius);
  scene.beginAnimation(camera, 0, 45, false);
}
```

## 6. نکات مهم

### 6.1 مدیریت انتخاب
- انتخاب با `(window as any).selectedId` ذخیره می‌شود
- می‌تواند سنسور (string) یا null (برای محیط) باشد
- هر ابزار ترنسفورم ابتدا بررسی می‌کند که آیا چیزی انتخاب شده است

### 6.2 Gizmo Manager
- `usePointerToAttachGizmos = false` برای کنترل دستی
- هر بار فقط یک نوع gizmo فعال است
- `attachToMesh(null)` برای جدا کردن gizmo

### 6.3 Persistence
- تغییرات هم در `onDrag` و هم در `onDragEnd` ذخیره می‌شوند
- برای سنسورها در `sensors` Map ذخیره می‌شود
- برای محیط‌ها در سیستم محیط‌ها مدیریت می‌شود

### 6.4 UI State
- دکمه‌ها با `aria-pressed` attribute مدیریت می‌شوند
- فقط یک دکمه در هر زمان فعال است
- `setToolPressed()` برای مدیریت وضعیت استفاده می‌شود

## 7. جریان کار (Workflow)

1. **انتخاب**: کاربر روی شیء کلیک می‌کند
2. **تشخیص**: سیستم تشخیص می‌دهد که آیا سنسور است یا محیط
3. **فعال‌سازی**: ابزار ترنسفورم فعال می‌شود (در صورت انتخاب)
4. **ترنسفورم**: کاربر با gizmo تغییرات اعمال می‌کند
5. **ذخیره**: تغییرات در real-time ذخیره می‌شوند
6. **به‌روزرسانی**: UI و لیست‌ها به‌روزرسانی می‌شوند

این سیستم یک رابط کاربری قدرتمند و انعطاف‌پذیر برای مدیریت اشیاء 3D در Digital Twin فراهم می‌کند.
