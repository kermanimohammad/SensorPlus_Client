# راهنمای حل مشکل OutlineMaterial

## مشکل
```
Uncaught TypeError: BABYLON.OutlineMaterial is not a constructor
    at addSelectionHighlight (main.ts:107:27)
```

## علت مشکل
`BABYLON.OutlineMaterial` یک constructor نیست. در Babylon.js، برای اضافه کردن outline به mesh ها، باید از properties خود mesh استفاده کرد، نه از material جداگانه.

## راه‌حل

### قبل (کد اشتباه):
```typescript
function addSelectionHighlight(mesh: BABYLON.AbstractMesh) {
  // ❌ اشتباه: OutlineMaterial یک constructor نیست
  const outlineMaterial = new BABYLON.OutlineMaterial("outline", scene);
  outlineMaterial.color = new BABYLON.Color3(1, 1, 0);
  outlineMaterial.width = 0.02;
  
  mesh.outlineColor = new BABYLON.Color3(1, 1, 0);
  mesh.outlineWidth = 0.02;
  mesh.renderOutline = true;
}
```

### بعد (کد صحیح):
```typescript
function addSelectionHighlight(mesh: BABYLON.AbstractMesh) {
  // ✅ صحیح: استفاده از properties خود mesh
  mesh.outlineColor = new BABYLON.Color3(1, 1, 0); // رنگ زرد
  mesh.outlineWidth = 0.02;
  mesh.renderOutline = true;
  
  console.log("[DEBUG] Selection highlight added to:", mesh.name);
}
```

## نحوه کارکرد Outline در Babylon.js

### Properties مورد نیاز:
- `mesh.outlineColor`: رنگ outline
- `mesh.outlineWidth`: ضخامت outline
- `mesh.renderOutline`: فعال/غیرفعال کردن outline

### مثال کامل:
```typescript
// اضافه کردن outline
mesh.outlineColor = new BABYLON.Color3(1, 1, 0); // زرد
mesh.outlineWidth = 0.02; // ضخامت
mesh.renderOutline = true; // فعال کردن

// حذف outline
mesh.renderOutline = false; // غیرفعال کردن
```

## تست عملکرد

### 1. تست انتخاب محیط
1. فایل GLB آپلود کنید
2. روی مدل کلیک کنید
3. Console را باز کنید (F12)
4. باید این پیام را ببینید:
   ```
   [DEBUG] Selection highlight added to: Floor
   ```

### 2. تست حذف highlight
1. روی مدل دیگری کلیک کنید
2. باید این پیام را ببینید:
   ```
   [DEBUG] Selection highlight removed from: Floor
   [DEBUG] Selection highlight added to: NewMesh
   ```

### 3. تست لغو انتخاب
1. روی فضای خالی کلیک کنید
2. باید این پیام را ببینید:
   ```
   [DEBUG] Selection highlight removed from: MeshName
   ```

## نکات مهم

- **OutlineMaterial**: در Babylon.js وجود ندارد
- **mesh.outlineColor**: برای تنظیم رنگ outline
- **mesh.outlineWidth**: برای تنظیم ضخامت outline
- **mesh.renderOutline**: برای فعال/غیرفعال کردن outline
- **Color3**: برای تعریف رنگ (R, G, B) از 0 تا 1

## نتیجه

با این تغییرات:
- ✅ خطای OutlineMaterial حل شد
- ✅ highlight بصری به درستی کار می‌کند
- ✅ debug logs برای عیب‌یابی اضافه شدند
- ✅ انتخاب مدل‌های محیط با highlight زرد نمایش داده می‌شود
