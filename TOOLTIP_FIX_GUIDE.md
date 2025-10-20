# 🔧 راهنمای حل مشکل Tooltip ها

## 🎯 مشکل حل شده
Tooltip ها به‌روزرسانی نمی‌شدند و فقط دفعه اول اطلاعات را نمایش می‌دادند.

## 🔍 علت مشکل
1. **مشکل در تبدیل داده‌ها:** برای light و solar sensors، فیلدهای `value` و `unit` وجود نداشتند
2. **مشکل در renderPopupContent:** سعی می‌کرد به فیلدهای ناموجود دسترسی پیدا کند
3. **عدم debug مناسب:** نبود لاگ‌های کافی برای ردیابی مشکل

## ✅ راه‌حل‌های پیاده‌سازی شده

### **1. اصلاح renderPopupContent:**
```typescript
// قبل (مشکل‌دار):
pL1.textContent=`${data.kind}: ${data.value.toFixed(2)} ${data.unit}`;

// بعد (اصلاح شده):
if ('value' in data && 'unit' in data) {
  pL1.textContent=`${data.kind}: ${data.value.toFixed(2)} ${data.unit}`; 
} else {
  pL1.textContent=`${data.kind}: no data`; 
}
```

### **2. بهبود Debug Logs:**
```typescript
// اضافه شده در api-client.ts:
console.log(`[API] Raw API data:`, data);
console.log(`[API] Updated reading for device: ${deviceId}`, {
  rawData: deviceData,
  convertedReading: reading,
  timestamp: new Date(reading.ts).toLocaleTimeString()
});

// اضافه شده در sensors.ts:
console.log(`[Tooltip] Rendering for device: ${popupDevId}`, {
  hasData: !!data,
  data: data,
  latestByDevSize: latestByDev.size,
  allDevices: Array.from(latestByDev.keys())
});
```

### **3. تابع تست API:**
```typescript
// اضافه شده در api-client.ts:
public async testApiConnection(): Promise<void> {
  console.log('[API Test] Testing API connection...');
  const data = await this.fetchSensorData();
  if (data) {
    console.log('[API Test] API connection successful!');
    this.processSensorData(data);
  }
}
```

## 🧪 مراحل تست

### **مرحله 1: اتصال به API**
1. پروژه را باز کنید
2. Console را باز کنید (F12)
3. در پنل Connection، روی "Connect" کلیک کنید
4. باید پیام‌های زیر را ببینید:
   ```
   [API] Connecting to DigitalTwin SensorPlus API...
   [API] Fetching data from: https://digitaltwin-sensorplus-1.onrender.com/api/data
   [API] Trying direct connection...
   [API] Direct connection successful!
   [API] Processing data for 20 devices
   ```

### **مرحله 2: بررسی داده‌های API**
در Console باید ببینید:
```
[API] Raw API data: {
  "devices": {
    "temp-1": {"device_id": "temp-1", "kind": "temperature", "value": 28.0, "unit": "°C", "room_id": "room1"},
    "hum-1": {"device_id": "hum-1", "kind": "humidity", "value": 36.0, "unit": "%", "room_id": "room1"},
    "co2-1": {"device_id": "co2-1", "kind": "co2", "value": 465.0, "unit": "ppm", "room_id": "room1"},
    "light-1": {"device_id": "light-1", "kind": "light", "value": 951.0, "unit": "lux", "room_id": "room1"},
    "solar-plant": {"device_id": "solar-plant", "kind": "solar", "value": 118.5, "unit": "W", "room_id": "solar-farm"}
  }
}
```

### **مرحله 3: ایجاد سنسور و تست Tooltip**
1. سنسور Temperature اضافه کنید (deviceId: temp-1)
2. روی سنسور کلیک کنید
3. در Console باید ببینید:
   ```
   [Tooltip] Rendering for device: temp-1
   [Tooltip] Starting auto-update for device: temp-1
   ```
4. Tooltip باید نمایش دهد:
   - **Device:** temp-1
   - **temperature:** 28.0°C
   - **room:** room1
   - **updated:** زمان فعلی

### **مرحله 4: تست Auto-update**
1. 5 ثانیه صبر کنید
2. در Console باید ببینید:
   ```
   [API] Updated reading for device: temp-1
   [Tooltip] Auto-updating tooltip for device: temp-1
   [Tooltip] Rendering for device: temp-1
   ```
3. Tooltip باید با مقدار جدید به‌روزرسانی شود

### **مرحله 5: تست Console Commands**
```javascript
// تست tooltip برای device مشخص
testTooltip('temp-1')

// نتیجه مورد انتظار:
[Tooltip Test] Testing tooltip for device: temp-1
[Tooltip Test] latestByDev size: 20
[Tooltip Test] Available devices: ["co2-1", "co2-2", "co2-3", "co2-4", "co2-5", "hum-1", "hum-2", "hum-3", "hum-4", "hum-5", "light-1", "light-2", "light-3", "light-4", "light-5", "solar-plant", "temp-1", "temp-2", "temp-3", "temp-4", "temp-5"]
[Tooltip Test] Data for temp-1: {deviceId: "temp-1", kind: "temperature", roomId: "room1", ts: 1703000000000, value: 28.0, unit: "°C"}
[Tooltip Test] Data timestamp: 12:00:00
[Tooltip Test] Data value: 28.0 °C
```

## 📊 داده‌های API فعلی

بر اساس [API endpoint](https://digitaltwin-sensorplus-1.onrender.com/api/data):

### **Temperature Sensors:**
- temp-1: 28.0°C (room1)
- temp-2: 24.5°C (room2)
- temp-3: 24.0°C (room3)
- temp-4: 18.2°C (room4)
- temp-5: 16.1°C (room5)

### **Humidity Sensors:**
- hum-1: 36.0% (room1)
- hum-2: 41.6% (room2)
- hum-3: 41.7% (room3)
- hum-4: 50.9% (room4)
- hum-5: 53.6% (room5)

### **CO2 Sensors:**
- co2-1: 465.0 ppm (room1)
- co2-2: 427.0 ppm (room2)
- co2-3: 432.0 ppm (room3)
- co2-4: 402.0 ppm (room4)
- co2-5: 379.0 ppm (room5)

### **Light Sensors:**
- light-1: 951.0 lux (room1)
- light-2: 629.0 lux (room2)
- light-3: 931.0 lux (room3)
- light-4: 628.0 lux (room4)
- light-5: 996.0 lux (room5)

### **Solar Panel:**
- solar-plant: 118.5 W (solar-farm)

## 🎯 نتایج مورد انتظار

### **✅ تست موفق:**
1. API متصل می‌شود
2. 20 device داده دریافت می‌شود
3. Tooltip نمایش داده می‌شود
4. Auto-update هر 5 ثانیه کار می‌کند
5. مقادیر tooltip تغییر می‌کنند
6. Console logs کامل نمایش داده می‌شوند

### **❌ تست ناموفق:**
1. API متصل نمی‌شود
2. داده‌ها دریافت نمی‌شوند
3. Tooltip "no data yet" نمایش می‌دهد
4. Auto-update کار نمی‌کند
5. مقادیر تغییر نمی‌کنند

## 🔧 تست‌های پیشنهادی

### **تست 1: سنسور Temperature**
- deviceId: temp-1
- مقدار مورد انتظار: 28.0°C
- room: room1

### **تست 2: سنسور Humidity**
- deviceId: hum-1
- مقدار مورد انتظار: 36.0%
- room: room1

### **تست 3: سنسور CO2**
- deviceId: co2-1
- مقدار مورد انتظار: 465.0 ppm
- room: room1

### **تست 4: سنسور Light**
- deviceId: light-1
- مقدار مورد انتظار: 951.0 lux (ON)
- room: room1

### **تست 5: سنسور Solar**
- deviceId: solar-plant
- مقدار مورد انتظار: 118.5 W
- room: solar-farm

## 🚀 آماده برای استفاده

Tooltip ها حالا باید:
- **✅ اطلاعات real-time** از API نمایش دهند
- **✅ هر 5 ثانیه** از API داده جدید دریافت کنند
- **✅ هر 1 ثانیه** tooltip به‌روزرسانی شود
- **✅ همه انواع سنسور** پشتیبانی شوند
- **✅ Debug logs کامل** داشته باشند

---
**تاریخ ایجاد:** دسامبر 2024  
**وضعیت:** ✅ مشکل حل شده
