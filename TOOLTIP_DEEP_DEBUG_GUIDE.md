# 🔍 راهنمای Debug عمیق مشکل Tooltip

## 🎯 مشکل اصلی
Tooltip ها فقط یکبار داده دریافت می‌کنند و بعد از آن همان مقادیر اولیه را نمایش می‌دهند، حتی اگر API هر 5 ثانیه داده جدید ارسال کند.

## 🔍 علت احتمالی
1. **Polling متوقف می‌شود**
2. **latestByDev به‌روزرسانی نمی‌شود**
3. **convertToReading مشکل دارد**
4. **processSensorData مشکل دارد**
5. **startPopupAutoUpdate مشکل دارد**

## 🛠️ Debug Tools اضافه شده

### **Console Commands جدید:**
```javascript
// بررسی همه داده‌ها
testAllData()

// بررسی وضعیت popup
testPopup()

// بررسی وضعیت polling
getPollingStatus()

// restart کردن polling
restartPolling()

// تست دستی API
testApi()

// تست tooltip
testTooltip('temp-1')
```

### **Debug Logs جدید:**
- **Data Conversion:** `[API] Converting device data for temp-1: {...}`
- **Converted Reading:** `[API] Converted sensor reading: {...}`
- **Data Update:** `[API] Updated reading for device: temp-1`
- **Data Change:** `dataChanged: true/false`
- **Tooltip Auto-update:** `[Tooltip] Auto-updating tooltip for device: temp-1`
- **Current Data:** `[Tooltip] Current data for temp-1: {...}`

## 🧪 مراحل Debug عمیق

### **مرحله 1: بررسی اتصال API**
1. پروژه را باز کنید
2. Console را باز کنید (F12)
3. روی "Connect" کلیک کنید
4. باید پیام‌های زیر را ببینید:
   ```
   [API] Connecting to DigitalTwin SensorPlus API...
   [API] Fetching data from: https://digitaltwin-sensorplus-1.onrender.com/api/data at 12:00:00
   [API] Trying direct connection...
   [API] Direct connection successful! Received 20 devices
   [API] Processing data for 20 devices
   [API] Raw API data: {devices: {...}, success: true}
   ```

### **مرحله 2: بررسی Data Conversion**
1. باید پیام‌های زیر را ببینید:
   ```
   [API] Converting device data for temp-1: {device_id: "temp-1", kind: "temperature", value: 28.0, unit: "°C", timestamp: "2024-12-19T12:00:00Z"}
   [API] Converted sensor reading: {deviceId: "temp-1", kind: "temperature", value: 28.0, unit: "°C", ts: 1703000000000}
   [API] Updated reading for device: temp-1
   ```

### **مرحله 3: بررسی Data Update**
1. باید پیام‌های زیر را ببینید:
   ```
   [API] Updated reading for device: temp-1 {
     rawData: {...},
     convertedReading: {...},
     timestamp: "12:00:00",
     oldTimestamp: "none",
     dataChanged: true
   }
   ```

### **مرحله 4: بررسی Polling**
1. 5 ثانیه صبر کنید
2. باید پیام‌های زیر را ببینید:
   ```
   [API] Polling attempt at 12:00:05
   [API] Fetching data from: https://digitaltwin-sensorplus-1.onrender.com/api/data at 12:00:05
   [API] Direct connection successful! Received 20 devices
   [API] Polling successful - received data for 20 devices
   [API] Processing data for 20 devices
   ```

### **مرحله 5: تست Console Commands**
```javascript
// بررسی همه داده‌ها
testAllData()
```
**نتیجه مورد انتظار:**
```
[Data Test] Total devices in latestByDev: 20
[Data Test] temp-1: {
  kind: "temperature",
  timestamp: "12:00:05",
  hasValue: true,
  hasUnit: true,
  data: {deviceId: "temp-1", kind: "temperature", value: 28.5, unit: "°C", ts: 1703000005000}
}
```

### **مرحله 6: تست Tooltip**
1. سنسور Temperature اضافه کنید (deviceId: temp-1)
2. روی سنسور کلیک کنید
3. در Console بنویسید:
   ```javascript
   testTooltip('temp-1')
   ```
4. 5 ثانیه صبر کنید
5. دوباره `testTooltip('temp-1')` اجرا کنید
6. مقادیر باید تغییر کرده باشند

### **مرحله 7: بررسی Popup Status**
```javascript
testPopup()
```
**نتیجه مورد انتظار:**
```
[Popup Test] popupDevId: temp-1
[Popup Test] popupUpdateInterval: 12345
[Popup Test] popup.style.display: block
[Popup Test] Current popup data: {deviceId: "temp-1", kind: "temperature", value: 28.5, unit: "°C", ts: 1703000005000}
```

## 🚨 مشکلات احتمالی و راه‌حل

### **مشکل 1: Data Conversion مشکل دارد**
**علائم:**
- `[API] Converting device data` نمایش داده نمی‌شود
- `[API] Converted sensor reading` نمایش داده نمی‌شود

**راه‌حل:**
1. بررسی `convertToReading` function
2. بررسی `DeviceData` type
3. بررسی API response format

### **مشکل 2: latestByDev به‌روزرسانی نمی‌شود**
**علائم:**
- `dataChanged: false` در همه موارد
- `oldTimestamp` و `timestamp` یکسان هستند

**راه‌حل:**
1. بررسی `processSensorData` function
2. بررسی `latestByDev.set()` calls
3. بررسی API response timestamps

### **مشکل 3: Polling متوقف می‌شود**
**علائم:**
- `[API] Polling attempt` بعد از 5 ثانیه نمایش داده نمی‌شود
- `hasInterval: false` در `getPollingStatus()`

**راه‌حل:**
```javascript
restartPolling()
```

### **مشکل 4: Tooltip Auto-update مشکل دارد**
**علائم:**
- `[Tooltip] Auto-updating tooltip` نمایش داده نمی‌شود
- `[Tooltip] Current data` نمایش داده نمی‌شود

**راه‌حل:**
1. بررسی `startPopupAutoUpdate` function
2. بررسی `popupUpdateInterval`
3. بررسی `popup.style.display`

### **مشکل 5: API Response مشکل دارد**
**علائم:**
- `[API] Raw API data` خالی است
- `[API] Processing data for 0 devices`

**راه‌حل:**
1. تست مستقیم API در مرورگر
2. بررسی CORS proxy ها
3. بررسی API endpoint

## 🔧 تست‌های پیشنهادی

### **تست 1: بررسی Data Flow**
```javascript
testAllData()
```
**نتیجه مورد انتظار:**
- `latestByDev.size > 0`
- همه devices دارای `timestamp` جدید هستند
- `hasValue` و `hasUnit` true هستند

### **تست 2: بررسی Polling Status**
```javascript
getPollingStatus()
```
**نتیجه مورد انتظار:**
```
{
  isConnected: true,
  pollingInterval: 5000,
  hasInterval: true
}
```

### **تست 3: بررسی Popup Status**
```javascript
testPopup()
```
**نتیجه مورد انتظار:**
- `popupDevId` null نیست
- `popupUpdateInterval` null نیست
- `popup.style.display` "block" است

### **تست 4: تست دستی API**
```javascript
testApi()
```
**نتیجه مورد انتظار:**
```
[API Test] Testing API connection...
[API Test] API connection successful!
[API Test] Received data: {devices: {...}, success: true}
```

## 📊 Console Logs مورد انتظار

### **اتصال موفق:**
```
[API] Connecting to DigitalTwin SensorPlus API...
[API] Starting polling every 5000ms
[API] Connected successfully
```

### **Data Processing موفق:**
```
[API] Processing data for 20 devices
[API] Converting device data for temp-1: {...}
[API] Converted sensor reading: {...}
[API] Updated reading for device: temp-1
```

### **Polling موفق:**
```
[API] Polling attempt at 12:00:05
[API] Polling successful - received data for 20 devices
[API] Updated reading for device: temp-1 {
  dataChanged: true,
  timestamp: "12:00:05",
  oldTimestamp: "12:00:00"
}
```

### **Tooltip Update موفق:**
```
[Tooltip] Auto-updating tooltip for device: temp-1
[Tooltip] Current data for temp-1: {value: 28.5, unit: "°C", ts: 1703000005000}
[Tooltip] Rendering for device: temp-1
```

## 🎯 نتایج مورد انتظار

### **✅ Debug موفق:**
1. Data conversion کار می‌کند
2. latestByDev به‌روزرسانی می‌شود
3. Polling مداوم کار می‌کند
4. Tooltip auto-update کار می‌کند
5. Console logs کامل نمایش داده می‌شوند

### **❌ Debug ناموفق:**
1. Data conversion مشکل دارد
2. latestByDev به‌روزرسانی نمی‌شود
3. Polling متوقف می‌شود
4. Tooltip auto-update مشکل دارد
5. Console خطا نمایش می‌دهد

## 🔄 مراحل Debug کامل

1. **اتصال API** → بررسی Console logs
2. **بررسی Data Conversion** → `[API] Converting device data`
3. **بررسی Data Update** → `[API] Updated reading for device`
4. **بررسی Polling** → `getPollingStatus()`
5. **صبر 5 ثانیه** → بررسی polling logs
6. **تست All Data** → `testAllData()`
7. **تست Tooltip** → `testTooltip('temp-1')`
8. **تست Popup** → `testPopup()`
9. **Restart اگر لازم** → `restartPolling()`

---
**تاریخ ایجاد:** دسامبر 2024  
**وضعیت:** 🔍 آماده Debug عمیق
