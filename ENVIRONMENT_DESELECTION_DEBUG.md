# راهنمای عیب‌یابی مشکل لغو انتخاب مدل‌های محیط

## مشکل
مدل محیط انتخاب شده پس از کلیک روی فضای خالی در حالت انتخاب می‌ماند.

## تغییرات اعمال شده برای عیب‌یابی

### 1. اضافه کردن Debug Logs بیشتر
```typescript
console.log("[DEBUG] Pointer pick event:", {
  hit: pick?.hit,
  pickedMesh: pick?.pickedMesh?.name,
  distance: pick?.distance,
  isTransformMode: (window as any).isTransformMode,
  currentSelectedId: (window as any).selectedId
});
```

### 2. بهبود تابع clearSelection
```typescript
function clearSelection() {
  const currentId = (window as any).selectedId;
  console.log("[DEBUG] Clearing current selection, currentId:", currentId);
  
  // لغو انتخاب فعلی
  (window as any).selectedId = null;
  console.log("[DEBUG] selectedId set to null");
  
  hidePopup();
  console.log("[DEBUG] Popup hidden");
  
  removeSelectionHighlight();
  console.log("[DEBUG] Selection highlight removed");
  
  // جدا کردن gizmo از mesh
  gizmos.attachToMesh(null);
  console.log("[DEBUG] Gizmo detached from mesh");
  
  // بازگشت به حالت انتخاب
  enableSelect();
  console.log("[DEBUG] Returned to select mode");
  
  console.log("[DEBUG] Selection cleared completely");
}
```

### 3. بهبود تشخیص فضای خالی
```typescript
// اگر روی فضای خالی کلیک شده، انتخاب را لغو کن
if (!pick?.hit || !pick.pickedMesh) {
  console.log("[DEBUG] Empty space clicked - deselecting current selection");
  console.log("[DEBUG] Pick info:", { hit: pick?.hit, pickedMesh: pick?.pickedMesh });
  console.log("[DEBUG] Current selectedId before clear:", (window as any).selectedId);
  clearSelection();
  console.log("[DEBUG] Current selectedId after clear:", (window as any).selectedId);
  return;
}

// اگر روی ground یا grid کلیک شده، انتخاب را لغو کن
if (pick.pickedMesh && (pick.pickedMesh.name === "ground" || pick.pickedMesh.name === "grid")) {
  console.log("[DEBUG] Ground/Grid clicked - deselecting current selection");
  console.log("[DEBUG] Picked mesh name:", pick.pickedMesh.name);
  console.log("[DEBUG] Current selectedId before clear:", (window as any).selectedId);
  clearSelection();
  console.log("[DEBUG] Current selectedId after clear:", (window as any).selectedId);
  return;
}

// اگر روی gizmo کلیک شده، انتخاب را لغو نکن
if (pick.pickedMesh && (pick.pickedMesh.name.includes("gizmo") || pick.pickedMesh.name.includes("Gizmo"))) {
  console.log("[DEBUG] Gizmo clicked - not deselecting");
  return;
}
```

## نحوه عیب‌یابی

### 1. تست کلیک روی فضای خالی
1. یک مدل محیط انتخاب کنید
2. Console را باز کنید (F12)
3. روی فضای خالی کلیک کنید
4. بررسی کنید که این پیام‌ها نمایش داده می‌شوند:
   ```
   [DEBUG] Empty space clicked - deselecting current selection
   [DEBUG] Pick info: { hit: false, pickedMesh: null }
   [DEBUG] Current selectedId before clear: env_1234567-abc123
   [DEBUG] Clearing current selection, currentId: env_1234567-abc123
   [DEBUG] selectedId set to null
   [DEBUG] Popup hidden
   [DEBUG] Selection highlight removed
   [DEBUG] Gizmo detached from mesh
   [DEBUG] Returned to select mode
   [DEBUG] Selection cleared completely
   [DEBUG] Current selectedId after clear: null
   ```

### 2. تست کلیک روی Ground/Grid
1. یک مدل محیط انتخاب کنید
2. روی ground یا grid کلیک کنید
3. بررسی کنید که این پیام‌ها نمایش داده می‌شوند:
   ```
   [DEBUG] Ground/Grid clicked - deselecting current selection
   [DEBUG] Picked mesh name: ground
   [DEBUG] Current selectedId before clear: env_1234567-abc123
   [DEBUG] Clearing current selection, currentId: env_1234567-abc123
   [DEBUG] Current selectedId after clear: null
   ```

### 3. تست کلیک روی Gizmo
1. یک مدل محیط انتخاب کنید
2. ابزار ترنسفورم را انتخاب کنید
3. روی gizmo کلیک کنید
4. بررسی کنید که این پیام نمایش داده می‌شود:
   ```
   [DEBUG] Gizmo clicked - not deselecting
   ```

## مشکلات احتمالی

### 1. مشکل در تشخیص فضای خالی
- اگر `pick.hit` برابر با `true` است اما `pick.pickedMesh` برابر با `null` است
- اگر روی ground یا grid کلیک می‌کنید اما نام mesh متفاوت است

### 2. مشکل در تابع clearSelection
- اگر `selectedId` به `null` تنظیم نمی‌شود
- اگر highlight حذف نمی‌شود
- اگر gizmo جدا نمی‌شود

### 3. مشکل در state management
- اگر `selectedId` در جای دیگری دوباره تنظیم می‌شود
- اگر event listener دیگری تداخل می‌کند

## راه‌حل‌های احتمالی

### 1. بررسی Console Logs
```javascript
// در console بررسی کنید:
console.log("Current selectedId:", window.selectedId);
console.log("Current transform mode:", window.isTransformMode);
console.log("Gizmo attached to:", window.gizmoManager.attachedMesh);
```

### 2. بررسی Mesh Names
```javascript
// در console بررسی کنید:
scene.meshes.forEach(m => console.log("Mesh:", m.name, "isPickable:", m.isPickable));
```

### 3. بررسی Event Listeners
```javascript
// در console بررسی کنید:
console.log("Pointer observers:", scene.onPointerObservable.observers.length);
```

## نتیجه

با این تغییرات:
- ✅ Debug logs کامل برای عیب‌یابی اضافه شدند
- ✅ تشخیص فضای خالی بهبود یافت
- ✅ تشخیص ground/grid اضافه شد
- ✅ تشخیص gizmo اضافه شد
- ✅ تابع clearSelection بهبود یافت

اگر هنوز مشکل وجود دارد، console logs دقیقاً نشان می‌دهند که مشکل کجاست.
