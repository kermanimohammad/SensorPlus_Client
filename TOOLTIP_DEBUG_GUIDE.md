# 🔍 راهنمای Debug مشکل Tooltip سنسورها

## 🎯 مشکل
Tooltip سنسورها فقط دفعه اول اطلاعات را نمایش می‌دهند و بعد از آن به‌روزرسانی نمی‌شوند، در حالی که باید هر 5 ثانیه از API داده‌های جدید دریافت کنند.

## 🔧 Debug Logs اضافه شده

### **1. در `src/sensors.ts` - `renderPopupContent`:**
```typescript
// Debug: نمایش اطلاعات tooltip
console.log(`[Tooltip] Rendering for device: ${popupDevId}`, {
  hasData: !!data,
  data: data,
  latestByDevSize: latestByDev.size,
  allDevices: Array.from(latestByDev.keys())
});
```

### **2. در `src/api-client.ts` - `processSensorData`:**
```typescript
// Debug: نمایش به‌روزرسانی داده‌ها
console.log(`[API] Updated reading for device: ${deviceId}`, {
  reading: reading,
  timestamp: new Date(reading.ts).toLocaleTimeString()
});
```

## 🧪 مراحل تست

### **مرحله 1: اتصال به API**
1. پروژه را باز کنید
2. در پنل Connection، روی "Connect" کلیک کنید
3. Console را باز کنید (F12)
4. باید پیام‌های زیر را ببینید:
   ```
   [API] Connecting to DigitalTwin SensorPlus API...
   [API] Processing data for X devices
   [API] Updated reading for device: temp-1
   [API] Updated reading for device: hum-1
   ...
   ```

### **مرحله 2: ایجاد سنسور**
1. یک سنسور Temperature اضافه کنید
2. deviceId را به "temp-1" تنظیم کنید
3. سنسور را در صحنه قرار دهید

### **مرحله 3: تست Tooltip**
1. روی سنسور کلیک کنید
2. Tooltip باید نمایش داده شود
3. در Console باید پیام زیر را ببینید:
   ```
   [Tooltip] Rendering for device: temp-1
   ```

### **مرحله 4: بررسی به‌روزرسانی**
1. 5 ثانیه صبر کنید
2. در Console باید پیام‌های جدید API را ببینید:
   ```
   [API] Updated reading for device: temp-1
   ```
3. Tooltip باید به‌روزرسانی شود

## 🔍 بررسی مشکلات احتمالی

### **مشکل 1: API داده دریافت نمی‌کند**
**علائم:**
- پیام‌های `[API] Updated reading` در Console نیست
- `latestByDevSize` در tooltip همیشه 0 است

**راه‌حل:**
- بررسی اتصال اینترنت
- بررسی URL API: `https://digitaltwin-sensorplus-1.onrender.com/api/data`
- بررسی CORS proxy

### **مشکل 2: deviceId مطابقت ندارد**
**علائم:**
- `hasData: false` در tooltip
- `allDevices` شامل deviceId سنسور نیست

**راه‌حل:**
- مطمئن شوید deviceId سنسور با API مطابقت دارد
- deviceId های موجود در API: `temp-1`, `temp-2`, `hum-1`, `hum-2`, `co2-1`, `co2-2`, `light-1`, `light-2`, `solar-plant`

### **مشکل 3: Auto-update کار نمی‌کند**
**علائم:**
- Tooltip فقط یک بار نمایش داده می‌شود
- `popupUpdateInterval` null است

**راه‌حل:**
- بررسی `startPopupAutoUpdate()` در `showPopupFor`
- بررسی `popupUpdateInterval` در Console

### **مشکل 4: latestByDev به‌روزرسانی نمی‌شود**
**علائم:**
- `data` در tooltip همیشه همان مقدار اولیه است
- `timestamp` تغییر نمی‌کند

**راه‌حل:**
- بررسی `latestByDev.set()` در `processSensorData`
- بررسی import `latestByDev` در `api-client.ts`

## 📊 داده‌های API موجود

بر اساس [API endpoint](https://digitaltwin-sensorplus-1.onrender.com/api/data):

### **Temperature Sensors:**
- `temp-1` (room1): 21.3°C
- `temp-2` (room2): 24.9°C
- `temp-3` (room3): 25.5°C
- `temp-4` (room4): 28.2°C
- `temp-5` (room5): 19.0°C

### **Humidity Sensors:**
- `hum-1` (room1): 46.1%
- `hum-2` (room2): 40.9%
- `hum-3` (room3): 40.3%
- `hum-4` (room4): 35.8%
- `hum-5` (room5): 50.1%

### **CO2 Sensors:**
- `co2-1` (room1): 431.0 ppm
- `co2-2` (room2): 463.0 ppm
- `co2-3` (room3): 448.0 ppm
- `co2-4` (room4): 479.0 ppm
- `co2-5` (room5): 373.0 ppm

### **Light Sensors:**
- `light-1` (room1): 616.0 lux
- `light-2` (room2): 859.0 lux
- `light-3` (room3): 802.0 lux
- `light-4` (room4): 619.0 lux
- `light-5` (room5): 722.0 lux

### **Solar Panel:**
- `solar-plant` (solar-farm): 137.8 W

## 🎯 تست‌های پیشنهادی

### **تست 1: سنسور Temperature**
1. سنسور با deviceId: `temp-1` ایجاد کنید
2. Tooltip باید مقدار 21.3°C نمایش دهد
3. هر 5 ثانیه مقدار باید تغییر کند

### **تست 2: سنسور Light**
1. سنسور با deviceId: `light-1` ایجاد کنید
2. Tooltip باید مقدار 616.0 lux نمایش دهد
3. وضعیت ON/OFF باید بر اساس lux > 0 تعیین شود

### **تست 3: سنسور Solar**
1. سنسور با deviceId: `solar-plant` ایجاد کنید
2. Tooltip باید مقدار 137.8 W نمایش دهد
3. ولتاژ و جریان تخمینی نمایش داده شود

## 🚨 نکات مهم

1. **Console را همیشه باز نگه دارید** برای دیدن debug logs
2. **5 ثانیه صبر کنید** بین هر تست
3. **deviceId دقیق** وارد کنید (case-sensitive)
4. **API باید متصل باشد** قبل از تست tooltip

---
**تاریخ ایجاد:** دسامبر 2024  
**وضعیت:** 🔍 آماده Debug
