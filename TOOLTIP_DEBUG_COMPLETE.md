# 🔍 راهنمای Debug کامل Tooltip ها

## 🎯 مشکل
Tooltip ها به‌روزرسانی نمی‌شوند و فقط دفعه اول اطلاعات را نمایش می‌دهند.

## 🛠️ Debug Tools اضافه شده

### **1. Console Commands:**
```javascript
// تست tooltip برای device مشخص
testTooltip('temp-1')

// بررسی وضعیت API client
apiClient.getConnectionInfo()

// بررسی devices موجود
apiClient.getDiscoveredDevices()
```

### **2. Debug Logs:**
- **API Connection:** `[API] Fetching data from: ...`
- **Direct Connection:** `[API] Trying direct connection...`
- **CORS Proxies:** `[API] Trying proxy X: ...`
- **Data Processing:** `[API] Updated reading for device: ...`
- **Tooltip Updates:** `[Tooltip] Rendering for device: ...`
- **Auto-update:** `[Tooltip] Auto-updating tooltip for device: ...`

## 🧪 مراحل Debug

### **مرحله 1: اتصال به API**
1. پروژه را باز کنید
2. Console را باز کنید (F12)
3. در پنل Connection، روی "Connect" کلیک کنید
4. باید پیام‌های زیر را ببینید:
   ```
   [API] Connecting to DigitalTwin SensorPlus API...
   [API] Fetching data from: https://digitaltwin-sensorplus-1.onrender.com/api/data
   [API] Trying direct connection...
   ```

### **مرحله 2: بررسی اتصال**
اگر direct connection موفق باشد:
```
[API] Direct connection successful!
[API] Processing data for X devices
[API] Updated reading for device: temp-1
```

اگر direct connection ناموفق باشد:
```
[API] Direct connection failed: [error]
[API] Trying CORS proxies...
[API] Trying proxy 1: https://api.allorigins.win/raw?url=...
```

### **مرحله 3: ایجاد سنسور**
1. سنسور Temperature اضافه کنید
2. deviceId باید "temp-1" باشد (پیش‌فرض)
3. روی سنسور کلیک کنید

### **مرحله 4: تست Tooltip**
1. Tooltip باید نمایش داده شود
2. در Console باید ببینید:
   ```
   [Tooltip] Rendering for device: temp-1
   [Tooltip] Starting auto-update for device: temp-1
   ```

### **مرحله 5: تست Auto-update**
1. 5 ثانیه صبر کنید
2. در Console باید ببینید:
   ```
   [API] Updated reading for device: temp-1
   [Tooltip] Auto-updating tooltip for device: temp-1
   [Tooltip] Rendering for device: temp-1
   ```

## 🔧 تست‌های Console

### **تست 1: بررسی داده‌های موجود**
```javascript
testTooltip('temp-1')
```
**نتیجه مورد انتظار:**
```
[Tooltip Test] Testing tooltip for device: temp-1
[Tooltip Test] latestByDev size: 9
[Tooltip Test] Available devices: ["co2-1", "co2-2", "hum-1", "hum-2", "light-1", "light-2", "solar-plant", "temp-1", "temp-2"]
[Tooltip Test] Data for temp-1: {deviceId: "temp-1", kind: "temperature", roomId: "room1", ts: 1703000000000, value: 21.3, unit: "°C"}
[Tooltip Test] Data timestamp: 12:00:00
[Tooltip Test] Data value: 21.3 °C
```

### **تست 2: بررسی اتصال API**
```javascript
apiClient.getConnectionInfo()
```
**نتیجه مورد انتظار:**
```
{
  url: "https://digitaltwin-sensorplus-1.onrender.com",
  pollingInterval: 5000,
  isConnected: true
}
```

### **تست 3: بررسی Devices**
```javascript
apiClient.getDiscoveredDevices()
```
**نتیجه مورد انتظار:**
```
["co2-1", "co2-2", "hum-1", "hum-2", "light-1", "light-2", "solar-plant", "temp-1", "temp-2"]
```

## 🚨 مشکلات احتمالی و راه‌حل

### **مشکل 1: API متصل نمی‌شود**
**علائم:**
- `[API] Direct connection failed`
- `[API] All CORS proxies failed`

**راه‌حل:**
1. بررسی اتصال اینترنت
2. بررسی URL API
3. تست مستقیم API در مرورگر:
   ```
   https://digitaltwin-sensorplus-1.onrender.com/api/data
   ```

### **مشکل 2: داده‌ها دریافت نمی‌شوند**
**علائم:**
- `[API] Processing data for 0 devices`
- `latestByDev size: 0`

**راه‌حل:**
1. بررسی response API
2. بررسی CORS headers
3. تست با proxy مختلف

### **مشکل 3: Tooltip نمایش داده نمی‌شود**
**علائم:**
- `[Tooltip Test] No data found for device: temp-1`
- `hasData: false`

**راه‌حل:**
1. بررسی deviceId سنسور
2. مطمئن شوید deviceId با API مطابقت دارد
3. تست با deviceId های مختلف

### **مشکل 4: Auto-update کار نمی‌کند**
**علائم:**
- `[Tooltip] Auto-updating tooltip` نمایش داده نمی‌شود
- Tooltip تغییر نمی‌کند

**راه‌حل:**
1. بررسی `popupUpdateInterval`
2. بررسی `popupDevId`
3. بررسی `popup.style.display`

## 📊 داده‌های API فعلی

بر اساس آخرین تست:

```json
{
  "devices": {
    "temp-1": {"value": 21.3, "unit": "°C", "room_id": "room1"},
    "temp-2": {"value": 24.9, "unit": "°C", "room_id": "room2"},
    "hum-1": {"value": 46.1, "unit": "%", "room_id": "room1"},
    "hum-2": {"value": 40.9, "unit": "%", "room_id": "room2"},
    "co2-1": {"value": 431.0, "unit": "ppm", "room_id": "room1"},
    "co2-2": {"value": 463.0, "unit": "ppm", "room_id": "room2"},
    "light-1": {"value": 616.0, "unit": "lux", "room_id": "room1"},
    "light-2": {"value": 859.0, "unit": "lux", "room_id": "room2"},
    "solar-plant": {"value": 137.8, "unit": "W", "room_id": "solar-farm"}
  }
}
```

## 🎯 نتایج مورد انتظار

### **✅ Debug موفق:**
1. API متصل می‌شود
2. داده‌ها دریافت می‌شوند
3. Tooltip نمایش داده می‌شود
4. Auto-update کار می‌کند
5. مقادیر تغییر می‌کنند

### **❌ Debug ناموفق:**
1. API متصل نمی‌شود
2. داده‌ها دریافت نمی‌شوند
3. Tooltip "no data yet" نمایش می‌دهد
4. Auto-update کار نمی‌کند
5. مقادیر تغییر نمی‌کنند

## 🔄 مراحل Debug کامل

1. **اتصال API** → بررسی Console logs
2. **ایجاد سنسور** → deviceId = "temp-1"
3. **کلیک روی سنسور** → نمایش tooltip
4. **تست Console** → `testTooltip('temp-1')`
5. **صبر 5 ثانیه** → بررسی auto-update
6. **تست مجدد** → `testTooltip('temp-1')`

---
**تاریخ ایجاد:** دسامبر 2024  
**وضعیت:** 🔍 آماده Debug
