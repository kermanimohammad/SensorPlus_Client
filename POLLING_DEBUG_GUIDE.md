# 🔄 راهنمای Debug مشکل Polling API

## 🎯 مشکل
API فقط یکبار داده دریافت می‌کند و بعد از آن polling متوقف می‌شود. Tooltip ها همان مقادیر اولیه را نمایش می‌دهند.

## 🔍 علت احتمالی
1. **Polling interval متوقف می‌شود**
2. **fetchSensorData بعد از اولین درخواست fail می‌کند**
3. **CORS proxy ها کار نمی‌کنند**
4. **Max retries رسیده و disconnect می‌شود**

## 🛠️ Debug Tools اضافه شده

### **Console Commands:**
```javascript
// بررسی وضعیت polling
getPollingStatus()

// restart کردن polling
restartPolling()

// تست دستی API
testApi()

// تست tooltip
testTooltip('temp-1')
```

### **Debug Logs:**
- **Polling Start:** `[API] Starting polling every 5000ms`
- **Polling Attempt:** `[API] Polling attempt at 12:00:00`
- **Fetch Data:** `[API] Fetching data from: ... at 12:00:00`
- **Success:** `[API] Polling successful - received data for X devices`
- **Failure:** `[API] Polling failed, retry X/3`

## 🧪 مراحل Debug

### **مرحله 1: اتصال اولیه**
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
   [API] Starting polling every 5000ms
   [API] Connected successfully
   ```

### **مرحله 2: بررسی Polling**
1. 5 ثانیه صبر کنید
2. باید پیام‌های زیر را ببینید:
   ```
   [API] Polling attempt at 12:00:05
   [API] Fetching data from: https://digitaltwin-sensorplus-1.onrender.com/api/data at 12:00:05
   [API] Trying direct connection...
   [API] Direct connection successful! Received 20 devices
   [API] Polling successful - received data for 20 devices
   [API] Processing data for 20 devices
   ```

### **مرحله 3: تست Console Commands**
```javascript
// بررسی وضعیت polling
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

### **مرحله 4: تست Tooltip**
1. سنسور Temperature اضافه کنید (deviceId: temp-1)
2. روی سنسور کلیک کنید
3. در Console بنویسید:
   ```javascript
   testTooltip('temp-1')
   ```
4. 5 ثانیه صبر کنید
5. دوباره `testTooltip('temp-1')` اجرا کنید
6. مقادیر باید تغییر کرده باشند

## 🚨 مشکلات احتمالی و راه‌حل

### **مشکل 1: Polling متوقف می‌شود**
**علائم:**
- `[API] Polling attempt` بعد از 5 ثانیه نمایش داده نمی‌شود
- `hasInterval: false` در `getPollingStatus()`

**راه‌حل:**
```javascript
restartPolling()
```

### **مشکل 2: fetchSensorData fail می‌کند**
**علائم:**
- `[API] Direct connection failed`
- `[API] Polling failed, retry X/3`
- `[API] Max retries reached, disconnecting`

**راه‌حل:**
1. بررسی اتصال اینترنت
2. تست مستقیم API در مرورگر
3. بررسی CORS proxy ها

### **مشکل 3: داده‌ها تغییر نمی‌کنند**
**علائم:**
- `testTooltip('temp-1')` همیشه همان مقدار را نمایش می‌دهد
- `timestamp` در tooltip تغییر نمی‌کند

**راه‌حل:**
1. بررسی `latestByDev` در Console
2. بررسی `processSensorData` logs
3. تست دستی API

### **مشکل 4: CORS Proxy ها کار نمی‌کنند**
**علائم:**
- `[API] Trying CORS proxies...`
- `[API] All CORS proxies failed`

**راه‌حل:**
1. تست با proxy مختلف
2. بررسی proxy URLs
3. استفاده از direct connection

## 🔧 تست‌های پیشنهادی

### **تست 1: بررسی Polling Status**
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

### **تست 2: تست دستی API**
```javascript
testApi()
```
**نتیجه مورد انتظار:**
```
[API Test] Testing API connection...
[API Test] API connection successful!
[API Test] Received data: {devices: {...}, success: true}
```

### **تست 3: Restart Polling**
```javascript
restartPolling()
```
**نتیجه مورد انتظار:**
```
[API] Restarting polling...
[API] Starting polling every 5000ms
```

### **تست 4: تست Tooltip**
```javascript
testTooltip('temp-1')
```
**نتیجه مورد انتظار:**
```
[Tooltip Test] Testing tooltip for device: temp-1
[Tooltip Test] latestByDev size: 20
[Tooltip Test] Data for temp-1: {deviceId: "temp-1", kind: "temperature", value: 28.0, unit: "°C", ts: 1703000000000}
```

## 📊 Console Logs مورد انتظار

### **اتصال موفق:**
```
[API] Connecting to DigitalTwin SensorPlus API...
[API] Fetching data from: https://digitaltwin-sensorplus-1.onrender.com/api/data at 12:00:00
[API] Trying direct connection...
[API] Direct connection successful! Received 20 devices
[API] Processing data for 20 devices
[API] Starting polling every 5000ms
[API] Connected successfully
```

### **Polling موفق:**
```
[API] Polling attempt at 12:00:05
[API] Fetching data from: https://digitaltwin-sensorplus-1.onrender.com/api/data at 12:00:05
[API] Trying direct connection...
[API] Direct connection successful! Received 20 devices
[API] Polling successful - received data for 20 devices
[API] Processing data for 20 devices
[API] Updated reading for device: temp-1
```

### **Tooltip Update:**
```
[Tooltip] Auto-updating tooltip for device: temp-1
[Tooltip] Rendering for device: temp-1
```

## 🎯 نتایج مورد انتظار

### **✅ Debug موفق:**
1. Polling هر 5 ثانیه کار می‌کند
2. داده‌ها هر 5 ثانیه به‌روزرسانی می‌شوند
3. Tooltip ها مقادیر جدید نمایش می‌دهند
4. Console logs کامل نمایش داده می‌شوند

### **❌ Debug ناموفق:**
1. Polling متوقف می‌شود
2. داده‌ها به‌روزرسانی نمی‌شوند
3. Tooltip ها همان مقادیر اولیه را نمایش می‌دهند
4. Console خطا نمایش می‌دهد

## 🔄 مراحل Debug کامل

1. **اتصال API** → بررسی Console logs
2. **بررسی Polling** → `getPollingStatus()`
3. **صبر 5 ثانیه** → بررسی polling logs
4. **تست Tooltip** → `testTooltip('temp-1')`
5. **صبر 5 ثانیه** → تست مجدد tooltip
6. **Restart اگر لازم** → `restartPolling()`

---
**تاریخ ایجاد:** دسامبر 2024  
**وضعیت:** 🔍 آماده Debug
