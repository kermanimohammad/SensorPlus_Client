# 📊 تحلیل ساختار ذخیره‌سازی و فراخوانی پروژه

## 🎯 هدف
بررسی کامل ساختار ذخیره‌سازی و فراخوانی پروژه برای اطمینان از ذخیره‌سازی همه اطلاعات لازم.

## 📋 اطلاعات ذخیره‌شده در پروژه

### 1️⃣ **اطلاعات محیط‌ها (Environments)**

#### **✅ مدل سه‌بعدی:**
- **فایل GLB کامل** در ZIP پروژه ذخیره می‌شود
- **نام فایل:** `{safeBase}_{envId}.glb`
- **فرمت:** Binary GLB data در ZIP

#### **✅ اطلاعات ترنسفورم:**
```typescript
transform: {
  position: { x: number; y: number; z: number },
  rotationEulerDeg: { x: number; y: number; z: number },
  scale: { x: number; y: number; z: number }
}
```

#### **✅ متادیتا:**
- **نام محیط:** `name`
- **شناسه محیط:** `id`
- **مسیر فایل:** `file` (در ZIP)

### 2️⃣ **اطلاعات سنسورها (Sensors)**

#### **✅ اطلاعات ترنسفورم:**
```typescript
transform: {
  position: { x: number; y: number; z: number },
  rotationEulerDeg: { x: number; y: number; z: number },
  scale: { x: number; y: number; z: number }
}
```

#### **✅ خصوصیات اتصالی:**
- **شناسه دستگاه:** `deviceId`
- **نوع سنسور:** `type`
- **برچسب:** `label`
- **تاپیک:** `topic` (اختیاری)
- **رنگ:** `color`

#### **✅ اطلاعات اضافی:**
- **شناسه سنسور:** `id`
- **مقیاس:** `scale`

### 3️⃣ **اطلاعات کانکشن API**

#### **✅ تنظیمات کانکشن:**
```typescript
connection: {
  url: string,                    // URL سرور API
  pollingInterval: number,        // فاصله زمانی polling (ms)
  isConnected: boolean           // وضعیت اتصال
}
```

## 🔄 فرآیند ذخیره‌سازی

### **مرحله 1: جمع‌آوری اطلاعات**
1. **محیط‌ها:** از `getAllEnvEntries()` دریافت می‌شوند
2. **سنسورها:** از `serializeSensors()` دریافت می‌شوند
3. **کانکشن:** از `apiClient.getConnectionInfo()` دریافت می‌شود

### **مرحله 2: ایجاد ZIP**
1. **فایل‌های GLB** در ZIP قرار می‌گیرند
2. **project.json** با متادیتا ایجاد می‌شود
3. **فشرده‌سازی** با DEFLATE انجام می‌شود

### **مرحله 3: ذخیره‌سازی**
- **روش 1:** File System Access API (ترجیحی)
- **روش 2:** Direct Download (fallback)

## 🔄 فرآیند فراخوانی

### **مرحله 1: بارگذاری ZIP**
1. **استخراج project.json** از ZIP
2. **پارس کردن متادیتا** از JSON

### **مرحله 2: بازیابی محیط‌ها**
1. **بارگذاری فایل‌های GLB** از ZIP
2. **ایجاد محیط‌ها** با `addEnvironmentFromGLBArrayBuffer`
3. **اعمال ترنسفورم** ذخیره‌شده

### **مرحله 3: بازیابی سنسورها**
1. **ایجاد سنسورها** با `recreateSensorFromSerialized`
2. **اعمال ترنسفورم** ذخیره‌شده
3. **بازیابی خصوصیات اتصالی**

### **مرحله 4: بازیابی کانکشن**
1. **به‌روزرسانی URL** با `apiClient.updateServerUrl`
2. **به‌روزرسانی polling interval** با `apiClient.updatePollingInterval`
3. **به‌روزرسانی UI** با `updateConnectionUI`

## 📁 ساختار فایل پروژه (.dtsp)

```
project.dtsp (ZIP)
├── project.json              # متادیتای اصلی
├── Env_1_123456.glb         # فایل محیط 1
├── Room_2_789012.glb        # فایل محیط 2
└── ...
```

### **محتوای project.json:**
```json
{
  "kind": "digital-twin-project-meta",
  "version": 3,
  "savedAt": "2024-12-XX...",
  "connection": {
    "url": "https://digitaltwin-sensorplus-1.onrender.com",
    "pollingInterval": 5000,
    "isConnected": false
  },
  "environments": [
    {
      "name": "Env",
      "file": "Env_1_123456.glb",
      "transform": {
        "position": { "x": 0, "y": 0, "z": 0 },
        "rotationEulerDeg": { "x": 0, "y": 0, "z": 0 },
        "scale": { "x": 1, "y": 1, "z": 1 }
      }
    }
  ],
  "sensors": [
    {
      "id": "s-abc123",
      "type": "temperature",
      "label": "Temp Sensor",
      "deviceId": "device-001",
      "topic": "sensors/temp",
      "color": "#ff0000",
      "transform": {
        "position": { "x": 1, "y": 0.7, "z": 2 },
        "rotationEulerDeg": { "x": 0, "y": 0, "z": 0 },
        "scale": { "x": 1, "y": 1, "z": 1 }
      }
    }
  ]
}
```

## ✅ بررسی کامل بودن ذخیره‌سازی

### **محیط‌ها:**
- ✅ **مدل سه‌بعدی:** فایل GLB کامل
- ✅ **ترنسفورم:** position, rotation, scale
- ✅ **متادیتا:** نام، شناسه، مسیر فایل

### **سنسورها:**
- ✅ **ترنسفورم:** position, rotation, scale
- ✅ **خصوصیات اتصالی:** deviceId, type, label, topic
- ✅ **ویژگی‌های بصری:** color, scale

### **کانکشن:**
- ✅ **تنظیمات API:** URL, polling interval
- ✅ **وضعیت اتصال:** isConnected
- ✅ **بازیابی UI:** به‌روزرسانی فیلدهای UI

## 🔧 توابع کلیدی

### **ذخیره‌سازی:**
- `saveProjectToFolder()` - ذخیره پروژه
- `serializeSensors()` - سریال‌سازی سنسورها
- `getAllEnvEntries()` - دریافت محیط‌ها
- `apiClient.getConnectionInfo()` - دریافت اطلاعات کانکشن

### **فراخوانی:**
- `loadProjectFromDtsp()` - لود از فایل .dtsp
- `loadProjectFromFile()` - لود از فایل JSON
- `recreateSensorFromSerialized()` - بازسازی سنسورها
- `addEnvironmentFromGLBArrayBuffer()` - بازسازی محیط‌ها
- `updateConnectionUI()` - به‌روزرسانی UI کانکشن

## 🚨 نکات مهم

### **سازگاری:**
- **نسخه 3:** فرمت جدید با پشتیبانی کامل
- **نسخه 2:** سازگاری با پروژه‌های قدیمی
- **نسخه 1:** پشتیبانی legacy

### **خطاها:**
- **فایل GLB مفقود:** warning در console
- **کانکشن نامعتبر:** fallback به تنظیمات پیش‌فرض
- **سنسور نامعتبر:** skip و ادامه

### **بهینه‌سازی:**
- **فشرده‌سازی:** DEFLATE برای کاهش حجم
- **Binary data:** GLB به صورت binary ذخیره می‌شود
- **JSON:** متادیتا به صورت JSON قابل خواندن

## 📊 خلاصه

### **✅ همه اطلاعات ذخیره می‌شوند:**
1. **مدل‌های سه‌بعدی محیط‌ها** (فایل‌های GLB کامل)
2. **ترنسفورم محیط‌ها** (position, rotation, scale)
3. **ترنسفورم سنسورها** (position, rotation, scale)
4. **خصوصیات اتصالی سنسورها** (deviceId, type, label, topic)
5. **اطلاعات کانکشن API** (URL, polling interval, status)

### **✅ فراخوانی کامل:**
1. **بازیابی محیط‌ها** با ترنسفورم صحیح
2. **بازیابی سنسورها** با خصوصیات اتصالی
3. **بازیابی کانکشن** با به‌روزرسانی UI
4. **سازگاری** با نسخه‌های مختلف پروژه

---
**تاریخ تحلیل:** دسامبر 2024  
**وضعیت:** ✅ کامل و آماده
