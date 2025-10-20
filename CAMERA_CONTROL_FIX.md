# راهنمای حل مشکل چرخش دوربین بدون نگه داشتن کلیک موس

## مشکل
هنگام استفاده از ابزارهای ترنسفورم روی مدل‌های محیط، دوربین بدون نگه داشتن کلیک موس می‌چرخد. این مشکل یکی در میان رخ می‌دهد.

## علت مشکل
مشکل در تداخل بین کنترل‌های دوربین و gizmo manager است. وقتی `usePointerToAttachGizmos = false` است، gizmo ها به صورت دستی attach می‌شوند، اما کنترل‌های دوربین همچنان فعال هستند و با gizmo ها تداخل می‌کنند.

## راه‌حل اعمال شده

### 1. مدیریت کنترل‌های دوربین با gizmo events
```typescript
// تنظیمات اضافی برای جلوگیری از تداخل با کنترل‌های دوربین
gizmos.gizmos.positionGizmo?.onDragStartObservable.add(() => {
  console.log("[DEBUG] Position gizmo drag start - detaching camera");
  camera.detachControls();
});

gizmos.gizmos.positionGizmo?.onDragEndObservable.add(() => {
  console.log("[DEBUG] Position gizmo drag end - attaching camera");
  camera.attachControls(canvas, true);
});

gizmos.gizmos.rotationGizmo?.onDragStartObservable.add(() => {
  console.log("[DEBUG] Rotation gizmo drag start - detaching camera");
  camera.detachControls();
});

gizmos.gizmos.rotationGizmo?.onDragEndObservable.add(() => {
  console.log("[DEBUG] Rotation gizmo drag end - attaching camera");
  camera.attachControls(canvas, true);
});

gizmos.gizmos.scaleGizmo?.onDragStartObservable.add(() => {
  console.log("[DEBUG] Scale gizmo drag start - detaching camera");
  camera.detachControls();
});

gizmos.gizmos.scaleGizmo?.onDragEndObservable.add(() => {
  console.log("[DEBUG] Scale gizmo drag end - attaching camera");
  camera.attachControls(canvas, true);
});
```

### 2. اضافه کردن state management
```typescript
// برای تشخیص حالت ترنسفورم
(window as any).isTransformMode = false;

function enableMove() {
  if (!attachToCurrentSelection()) return;
  gizmos.positionGizmoEnabled = true;
  gizmos.rotationGizmoEnabled = false;
  gizmos.scaleGizmoEnabled    = false;
  setToolPressed(btnMove);
  // ورود به حالت ترنسفورم
  (window as any).isTransformMode = true;
}

function enableSelect() {
  gizmos.attachToMesh(null);
  gizmos.positionGizmoEnabled = false;
  gizmos.rotationGizmoEnabled = false;
  gizmos.scaleGizmoEnabled    = false;
  setToolPressed(btnSelect);
  // خروج از حالت ترنسفورم
  (window as any).isTransformMode = false;
}
```

### 3. اضافه کردن debug logs
```typescript
console.log("[DEBUG] Pointer pick event:", {
  hit: pick?.hit,
  pickedMesh: pick?.pickedMesh?.name,
  distance: pick?.distance,
  isTransformMode: (window as any).isTransformMode
});
```

### 4. بهبود مدیریت کلیک‌ها
```typescript
// فعال‌سازی ابزار ترنسفورم در صورت انتخاب
if (btnMove?.getAttribute("aria-pressed") === "true") enableMove();
else if (btnRotate?.getAttribute("aria-pressed") === "true") enableRotate();
else if (btnScale?.getAttribute("aria-pressed") === "true") enableScale();
else {
  // اگر هیچ ابزار ترنسفورمی انتخاب نشده، به حالت انتخاب برگرد
  enableSelect();
}
```

## نحوه تست

### 1. تست مشکل اصلی
1. یک فایل GLB آپلود کنید
2. ابزار Move/Rotate/Scale را انتخاب کنید
3. روی مدل محیط کلیک کنید
4. Console را باز کنید (F12)
5. باید این پیام‌ها را ببینید:
   ```
   [DEBUG] Position gizmo drag start - detaching camera
   [DEBUG] Position gizmo drag end - attaching camera
   ```

### 2. تست چرخش دوربین
1. مدل را انتخاب کنید
2. ابزار ترنسفورم را انتخاب کنید
3. روی مدل کلیک کنید
4. موس را حرکت دهید (بدون نگه داشتن کلیک)
5. دوربین نباید بچرخد

### 3. تست عملکرد عادی دوربین
1. ابزار Select را انتخاب کنید
2. روی فضای خالی کلیک کنید
3. موس را حرکت دهید (بدون نگه داشتن کلیک)
4. دوربین باید بچرخد

## عیب‌یابی

اگر هنوز مشکل وجود دارد:

### 1. بررسی Console Logs
```javascript
// در console بررسی کنید:
console.log("Camera controls attached:", camera.inputs.attached);
console.log("Transform mode:", window.isTransformMode);
```

### 2. بررسی Gizmo State
```javascript
// در console بررسی کنید:
console.log("Gizmo manager:", window.gizmoManager);
console.log("Position gizmo enabled:", window.gizmoManager.positionGizmoEnabled);
console.log("Rotation gizmo enabled:", window.gizmoManager.rotationGizmoEnabled);
console.log("Scale gizmo enabled:", window.gizmoManager.scaleGizmoEnabled);
```

### 3. بررسی Event Listeners
```javascript
// در console بررسی کنید:
console.log("Position gizmo drag start listeners:", window.gizmoManager.gizmos.positionGizmo?.onDragStartObservable.observers.length);
console.log("Position gizmo drag end listeners:", window.gizmoManager.gizmos.positionGizmo?.onDragEndObservable.observers.length);
```

## نکات مهم

- **detachControls()**: کنترل‌های دوربین را غیرفعال می‌کند
- **attachControls(canvas, true)**: کنترل‌های دوربین را فعال می‌کند
- **onDragStartObservable**: زمانی که drag شروع می‌شود
- **onDragEndObservable**: زمانی که drag تمام می‌شود
- **isTransformMode**: برای تشخیص حالت ترنسفورم

## نتیجه

با این تغییرات:
- ✅ چرخش دوربین بدون نگه داشتن کلیک متوقف می‌شود
- ✅ کنترل‌های دوربین در حین استفاده از gizmo غیرفعال می‌شوند
- ✅ کنترل‌های دوربین پس از تمام شدن drag فعال می‌شوند
- ✅ debug logs برای عیب‌یابی اضافه شده‌اند
- ✅ state management برای تشخیص حالت ترنسفورم اضافه شده است
