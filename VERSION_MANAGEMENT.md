# 📋 مدیریت ورژن پروژه

## 🎯 هدف
مدیریت ورژن پروژه برای مقایسه و ردیابی تغییرات.

## 📁 فایل‌های مربوط به ورژن

### **1. `version.json`**
فایل اصلی که شامل اطلاعات ورژن است:
```json
{
  "version": "1.0.0",
  "build": "2024.12.19",
  "features": [...],
  "api": {...}
}
```

### **2. `index.html`**
- نمایش ورژن در گوشه پایین راست صفحه
- بارگذاری خودکار از `version.json`
- Tooltip با اطلاعات build و features

### **3. `styles.css`**
- استایل‌دهی ورژن نامبر
- موقعیت ثابت در گوشه پایین راست
- طراحی شفاف با backdrop blur

## 🔄 نحوه به‌روزرسانی ورژن

### **مرحله 1: تغییر ورژن**
1. فایل `version.json` را باز کنید
2. فیلد `version` را تغییر دهید (مثلاً `1.0.1`)
3. فیلد `build` را به تاریخ فعلی تغییر دهید

### **مرحله 2: اضافه کردن Features**
1. فیلد `features` را به‌روزرسانی کنید
2. ویژگی‌های جدید را اضافه کنید
3. ویژگی‌های حذف شده را حذف کنید

### **مرحله 3: Build پروژه**
```bash
npm run build
```

### **مرحله 4: تست**
1. پروژه را باز کنید
2. ورژن نامبر در گوشه پایین راست را بررسی کنید
3. روی ورژن نامبر hover کنید تا tooltip نمایش داده شود

## 📊 تاریخچه ورژن‌ها

### **v1.0.0 - 2024.12.19**
**Features:**
- Environment Catalog (room1.glb - room5.glb)
- Auto-selection for new models
- Cross-selection between sensors and environments
- Real-time sensor tooltips with API data
- Project save/load with connection info
- Green border selection highlighting

**API Support:**
- Endpoint: https://digitaltwin-sensorplus-1.onrender.com/api/data
- Polling interval: 5000ms
- Supported devices: temp-1 to temp-5, hum-1 to hum-5, co2-1 to co2-5, light-1 to light-5, solar-plant

## 🎨 طراحی ورژن نامبر

### **موقعیت:**
- گوشه پایین راست صفحه
- فاصله 10px از لبه‌ها

### **ظاهر:**
- پس‌زمینه شفاف مشکی (rgba(0,0,0,0.7))
- متن سفید با فونت Courier New
- سایه و border برای برجستگی
- Backdrop blur برای جلوه مدرن

### **تعامل:**
- غیرقابل کلیک (pointer-events: none)
- غیرقابل انتخاب (user-select: none)
- Tooltip با اطلاعات کامل

## 🔧 تنظیمات پیشرفته

### **تغییر موقعیت:**
در `styles.css`:
```css
.version-number {
  bottom: 10px;  /* فاصله از پایین */
  right: 10px;   /* فاصله از راست */
}
```

### **تغییر ظاهر:**
```css
.version-number {
  background: rgba(0, 0, 0, 0.7);  /* پس‌زمینه */
  color: #ffffff;                  /* رنگ متن */
  font-size: 12px;                 /* اندازه فونت */
  border-radius: 4px;              /* گوشه‌های گرد */
}
```

### **اضافه کردن انیمیشن:**
```css
.version-number {
  transition: all 0.3s ease;
}

.version-number:hover {
  transform: scale(1.1);
  background: rgba(0, 0, 0, 0.9);
}
```

## 📝 نکات مهم

1. **همیشه ورژن را قبل از build تغییر دهید**
2. **تاریخ build را به‌روزرسانی کنید**
3. **features جدید را اضافه کنید**
4. **تست کنید که ورژن درست نمایش داده می‌شود**
5. **version.json را در git commit کنید**

## 🚀 مثال به‌روزرسانی

### **قبل:**
```json
{
  "version": "1.0.0",
  "build": "2024.12.19"
}
```

### **بعد:**
```json
{
  "version": "1.0.1",
  "build": "2024.12.20",
  "features": [
    "Environment Catalog (room1.glb - room5.glb)",
    "Auto-selection for new models",
    "Cross-selection between sensors and environments",
    "Real-time sensor tooltips with API data",
    "Project save/load with connection info",
    "Green border selection highlighting",
    "Version number display"
  ]
}
```

---
**تاریخ ایجاد:** دسامبر 2024  
**آخرین به‌روزرسانی:** v1.0.0
