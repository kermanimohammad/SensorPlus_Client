# سیستم لاگ کامل برای ردیابی وضعیت انتخاب

## تابع logSelectionStatus

### تعریف:
```typescript
function logSelectionStatus(action: string, details?: any) {
  const selectedId = (window as any).selectedId;
  const isTransformMode = (window as any).isTransformMode;
  const hasHighlight = (window as any).selectedMeshOutline !== null;
  const gizmoAttached = gizmos.attachedMesh !== null;
  
  console.log(`[SELECTION LOG] ${action}:`, {
    selectedId: selectedId,
    isTransformMode: isTransformMode,
    hasHighlight: hasHighlight,
    gizmoAttached: gizmoAttached,
    gizmoAttachedTo: gizmoAttached ? gizmos.attachedMesh?.name : null,
    details: details
  });
}
```

### اطلاعات لاگ شده:
- **selectedId**: شناسه مدل انتخاب شده (null اگر هیچ چیز انتخاب نشده)
- **isTransformMode**: آیا در حالت ترنسفورم هستیم
- **hasHighlight**: آیا highlight بصری فعال است
- **gizmoAttached**: آیا gizmo به mesh متصل است
- **gizmoAttachedTo**: نام mesh ای که gizmo به آن متصل است
- **details**: اطلاعات اضافی مربوط به action

## انواع لاگ‌ها

### 1. انتخاب مدل‌ها
```typescript
// انتخاب سنسور
logSelectionStatus("SENSOR SELECTED", { 
  sensorId: r.sensorId, 
  meshName: pick.pickedMesh.name,
  deviceId: r.deviceId 
});

// انتخاب محیط
logSelectionStatus("ENVIRONMENT SELECTED", { 
  envId: envId, 
  meshName: pick.pickedMesh.name 
});
```

### 2. لغو انتخاب
```typescript
// کلیک روی فضای خالی
logSelectionStatus("EMPTY SPACE CLICKED", { 
  pickInfo: { hit: pick?.hit, pickedMesh: pick?.pickedMesh } 
});

// کلیک روی ground/grid
logSelectionStatus("GROUND/GRID CLICKED", { 
  meshName: pick.pickedMesh.name 
});

// کلید Escape
logSelectionStatus("ESCAPE KEY PRESSED");

// لغو انتخاب
logSelectionStatus("CLEARING SELECTION", { currentId });
logSelectionStatus("SELECTION CLEARED");
```

### 3. ابزارهای ترنسفورم
```typescript
// فعال‌سازی ابزارها
logSelectionStatus("SELECT TOOL ENABLED");
logSelectionStatus("MOVE TOOL ENABLED");
logSelectionStatus("ROTATE TOOL ENABLED");
logSelectionStatus("SCALE TOOL ENABLED");
```

### 4. سایر موارد
```typescript
// کلیک روی gizmo
logSelectionStatus("GIZMO CLICKED - NOT DESELECTING", { 
  meshName: pick.pickedMesh.name 
});

// عدم انتخاب معتبر
logSelectionStatus("NO VALID SELECTION - CLEARING");
```

## مثال‌های لاگ

### انتخاب سنسور:
```
[SELECTION LOG] SENSOR SELECTED: {
  selectedId: "sensor_123",
  isTransformMode: false,
  hasHighlight: false,
  gizmoAttached: false,
  gizmoAttachedTo: null,
  details: {
    sensorId: "sensor_123",
    meshName: "sensor_123-handle",
    deviceId: "temp-456"
  }
}

[SELECTION LOG] SENSOR SELECTION COMPLETED: {
  selectedId: "sensor_123",
  isTransformMode: false,
  hasHighlight: true,
  gizmoAttached: false,
  gizmoAttachedTo: null,
  details: undefined
}
```

### انتخاب محیط:
```
[SELECTION LOG] ENVIRONMENT SELECTED: {
  selectedId: "env_1759875527863-kam0eh",
  isTransformMode: false,
  hasHighlight: false,
  gizmoAttached: false,
  gizmoAttachedTo: null,
  details: {
    envId: "1759875527863-kam0eh",
    meshName: "Floor"
  }
}

[SELECTION LOG] ENVIRONMENT SELECTION COMPLETED: {
  selectedId: "env_1759875527863-kam0eh",
  isTransformMode: false,
  hasHighlight: true,
  gizmoAttached: false,
  gizmoAttachedTo: null,
  details: undefined
}
```

### لغو انتخاب:
```
[SELECTION LOG] EMPTY SPACE CLICKED: {
  selectedId: "env_1759875527863-kam0eh",
  isTransformMode: true,
  hasHighlight: true,
  gizmoAttached: true,
  gizmoAttachedTo: "Floor",
  details: {
    pickInfo: { hit: false, pickedMesh: null }
  }
}

[SELECTION LOG] CLEARING SELECTION: {
  selectedId: "env_1759875527863-kam0eh",
  isTransformMode: true,
  hasHighlight: true,
  gizmoAttached: true,
  gizmoAttachedTo: "Floor",
  details: { currentId: "env_1759875527863-kam0eh" }
}

[SELECTION LOG] SELECTION CLEARED: {
  selectedId: null,
  isTransformMode: false,
  hasHighlight: false,
  gizmoAttached: false,
  gizmoAttachedTo: null,
  details: undefined
}
```

### فعال‌سازی ابزار ترنسفورم:
```
[SELECTION LOG] MOVE TOOL ENABLED: {
  selectedId: "env_1759875527863-kam0eh",
  isTransformMode: true,
  hasHighlight: true,
  gizmoAttached: true,
  gizmoAttachedTo: "Floor",
  details: undefined
}
```

## نحوه استفاده

### 1. باز کردن Console
- F12 را فشار دهید
- به تب Console بروید

### 2. فیلتر کردن لاگ‌ها
```javascript
// فقط لاگ‌های انتخاب را ببینید
console.clear();
// سپس عملیات انتخاب را انجام دهید
```

### 3. جستجو در لاگ‌ها
```javascript
// جستجو برای لاگ‌های خاص
// در console: Ctrl+F و تایپ کنید: [SELECTION LOG]
```

## عیب‌یابی

### مشکل: مدل انتخاب نمی‌شود
1. بررسی کنید که لاگ "SENSOR SELECTED" یا "ENVIRONMENT SELECTED" نمایش داده می‌شود
2. اگر نمایش داده نمی‌شود، مشکل در تشخیص mesh است
3. اگر نمایش داده می‌شود اما "SELECTION COMPLETED" نمایش داده نمی‌شود، مشکل در highlight است

### مشکل: مدل لغو انتخاب نمی‌شود
1. بررسی کنید که لاگ "EMPTY SPACE CLICKED" نمایش داده می‌شود
2. اگر نمایش داده نمی‌شود، مشکل در تشخیص فضای خالی است
3. اگر نمایش داده می‌شود اما "SELECTION CLEARED" نمایش داده نمی‌شود، مشکل در تابع clearSelection است

### مشکل: ابزار ترنسفورم کار نمی‌کند
1. بررسی کنید که لاگ "MOVE TOOL ENABLED" نمایش داده می‌شود
2. اگر نمایش داده نمی‌شود، مشکل در تابع enableMove است
3. اگر نمایش داده می‌شود اما gizmo نمایش داده نمی‌شود، مشکل در attachToCurrentSelection است

## نتیجه

با این سیستم لاگ:
- ✅ تمام عملیات انتخاب ردیابی می‌شوند
- ✅ وضعیت کامل سیستم در هر لحظه مشخص است
- ✅ عیب‌یابی آسان و دقیق است
- ✅ لاگ‌ها ساختاریافته و قابل فهم هستند
