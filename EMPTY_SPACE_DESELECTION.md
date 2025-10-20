# راهنمای لغو انتخاب با کلیک روی فضای خالی

## قابلیت
اگر با هر یک از ابزارهای انتخاب یا ترنسفورم در فضای خالی کلیک شود، مدل انتخابی از حالت انتخاب خارج می‌شود.

## پیاده‌سازی

### 1. تابع کمکی clearSelection
```typescript
// تابع کمکی برای لغو کامل انتخاب
function clearSelection() {
  console.log("[DEBUG] Clearing current selection");
  
  // لغو انتخاب فعلی
  (window as any).selectedId = null;
  hidePopup();
  removeSelectionHighlight();
  
  // جدا کردن gizmo از mesh
  gizmos.attachToMesh(null);
  
  // بازگشت به حالت انتخاب (غیرفعال کردن همه ابزارهای ترنسفورم)
  enableSelect();
  
  console.log("[DEBUG] Selection cleared, returned to select mode");
}
```

### 2. مدیریت کلیک روی فضای خالی
```typescript
scene.onPointerObservable.add((pi) => {
  if (pi.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
  const pick = pi.pickInfo;
  
  // اگر روی فضای خالی کلیک شده، انتخاب را لغو کن
  if (!pick?.hit || !pick.pickedMesh) {
    console.log("[DEBUG] Empty space clicked - deselecting current selection");
    clearSelection();
    return;
  }
  
  // ... باقی کد انتخاب
});
```

### 3. کلید میانبر Escape
```typescript
document.addEventListener("keydown", (event) => {
  // کلید Escape برای لغو انتخاب
  if (event.key === "Escape") {
    console.log("[DEBUG] Escape key pressed - clearing selection");
    clearSelection();
  }
});
```

## نحوه کارکرد

### 1. تشخیص فضای خالی
- `!pick?.hit`: هیچ شیء‌ای در مسیر ray وجود ندارد
- `!pick.pickedMesh`: هیچ mesh ای انتخاب نشده است

### 2. عملیات لغو انتخاب
1. **لغو انتخاب فعلی**: `(window as any).selectedId = null`
2. **مخفی کردن popup**: `hidePopup()`
3. **حذف highlight**: `removeSelectionHighlight()`
4. **جدا کردن gizmo**: `gizmos.attachToMesh(null)`
5. **بازگشت به حالت انتخاب**: `enableSelect()`

### 3. استفاده در جاهای مختلف
- کلیک روی فضای خالی
- حذف مدل‌ها
- عدم انتخاب مدل

## تست عملکرد

### 1. تست کلیک روی فضای خالی
1. یک مدل (سنسور یا محیط) انتخاب کنید
2. ابزار ترنسفورم (Move/Rotate/Scale) را انتخاب کنید
3. روی فضای خالی کلیک کنید
4. Console را باز کنید (F12)
5. باید این پیام‌ها را ببینید:
   ```
   [DEBUG] Empty space clicked - deselecting current selection
   [DEBUG] Clearing current selection
   [DEBUG] Selection cleared, returned to select mode
   ```

### 2. تست کلید Escape
1. یک مدل انتخاب کنید
2. کلید Escape را فشار دهید
3. باید این پیام‌ها را ببینید:
   ```
   [DEBUG] Escape key pressed - clearing selection
   [DEBUG] Clearing current selection
   [DEBUG] Selection cleared, returned to select mode
   ```

### 3. تست با همه ابزارها
1. **ابزار Select**: انتخاب مدل → کلیک فضای خالی → لغو انتخاب
2. **ابزار Move**: انتخاب مدل → کلیک فضای خالی → لغو انتخاب
3. **ابزار Rotate**: انتخاب مدل → کلیک فضای خالی → لغو انتخاب
4. **ابزار Scale**: انتخاب مدل → کلیک فضای خالی → لغو انتخاب

## مزایا

### 1. تجربه کاربری بهتر
- لغو آسان انتخاب با کلیک روی فضای خالی
- کلید میانبر Escape برای دسترسی سریع
- یکپارچگی در همه ابزارها

### 2. کد تمیزتر
- تابع `clearSelection()` برای استفاده مجدد
- کاهش تکرار کد
- مدیریت متمرکز لغو انتخاب

### 3. Debug بهتر
- Log های واضح برای عیب‌یابی
- تشخیص آسان عملیات لغو انتخاب

## نکات مهم

- **فضای خالی**: هر جایی که مدل یا سنسوری وجود ندارد
- **همه ابزارها**: Select, Move, Rotate, Scale
- **کلید Escape**: میانبر برای لغو انتخاب
- **Gizmo**: به صورت خودکار جدا می‌شود
- **Highlight**: به صورت خودکار حذف می‌شود

## نتیجه

با این تغییرات:
- ✅ کلیک روی فضای خالی انتخاب را لغو می‌کند
- ✅ کلید Escape برای لغو انتخاب اضافه شد
- ✅ همه ابزارها (انتخاب و ترنسفورم) پشتیبانی می‌شوند
- ✅ کد تمیزتر و قابل استفاده مجدد شد
- ✅ debug logs برای عیب‌یابی اضافه شدند
