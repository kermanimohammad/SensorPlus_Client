# 🔄 راهنمای حل مشکل Real-time Updates

## 🎯 مشکل
اطلاعات سنسورها باید real-time باشند، اما الان فقط یکبار دریافت می‌کند و بعد از آن polling متوقف می‌شود.

## 🔧 اصلاحات انجام شده

### **1. افزایش Timeout:**
- **Direct connection:** 10s → 30s
- **CORS proxy:** 15s → 30s

### **2. افزایش Max Retries:**
- **قبل:** 3 retries
- **بعد:** 10 retries

### **3. بهبود Error Handling:**
- **قبل:** بعد از max retries، disconnect می‌شد
- **بعد:** بعد از max retries، polling ادامه می‌یابد

### **4. بهبود Polling Logic:**
- **Try-catch** برای polling attempts
- **Reset retry count** بعد از موفقیت
- **Continue polling** حتی بعد از خطاها

## 🛠️ Console Commands جدید

### **بررسی وضعیت:**
```javascript
// بررسی وضعیت polling
getPollingStatus()

// Debug کامل
debugSimpleTest()

// بررسی داده‌ها
testAllData()
```

### **اصلاح مشکلات:**
```javascript
// Restart polling
restartPolling()

// Force connect
forceConnect()

// تست API
testApi()
```

## 🧪 مراحل تست

### **مرحله 1: اتصال API**
1. پروژه را باز کنید
2. Console را باز کنید (F12)
3. روی "Connect" کلیک کنید
4. Console logs را بررسی کنید

### **مرحله 2: بررسی Polling**
```javascript
getPollingStatus()
```
**نتیجه مورد انتظار:**
```
{
  isConnected: true,
  pollingInterval: 5000,
  hasInterval: true,
  retryCount: 0,
  maxRetries: 10
}
```

### **مرحله 3: انتظار برای Updates**
1. 5 ثانیه صبر کنید
2. باید polling logs را ببینید:
   ```
   [API] Polling attempt at 12:00:05
   [API] Polling successful - received data for 20 devices
   ```

### **مرحله 4: تست مداوم**
1. هر 5 ثانیه باید polling logs ببینید
2. فیلد "Simple Test - temp-1 Value" باید به‌روزرسانی شود
3. Tooltip ها باید مقادیر جدید نمایش دهند

## 🚨 مشکلات احتمالی و راه‌حل

### **مشکل 1: Polling متوقف می‌شود**
**علائم:**
- `[API] Polling attempt` بعد از 5 ثانیه نمایش داده نمی‌شود
- `hasInterval: false` در `getPollingStatus()`

**راه‌حل:**
```javascript
restartPolling()
```

### **مشکل 2: API Connection Issues**
**علائم:**
- `[API] Polling failed, retry X/10`
- `retryCount` بالا می‌رود

**راه‌حل:**
```javascript
forceConnect()
```

### **مشکل 3: CORS Issues**
**علائم:**
- `[API] Direct connection failed`
- `[API] All CORS proxies failed`

**راه‌حل:**
1. بررسی اتصال اینترنت
2. تست مستقیم API در مرورگر
3. `testApi()` را اجرا کنید

### **مشکل 4: Data Not Updating**
**علائم:**
- Polling کار می‌کند اما داده‌ها تغییر نمی‌کنند
- `testAllData()` همان timestamp ها را نمایش می‌دهد

**راه‌حل:**
1. `testApi()` را اجرا کنید
2. بررسی کنید که API واقعاً داده‌های جدید ارسال می‌کند

## 📊 Console Logs مورد انتظار

### **اتصال موفق:**
```
[API] Connecting to DigitalTwin SensorPlus API...
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
[Simple Test] Updated temp-1 field: 28.50 °C
```

### **Polling با خطا (اما ادامه می‌یابد):**
```
[API] Polling attempt at 12:00:10
[API] Polling failed, retry 1/10
[API] Polling attempt at 12:00:15
[API] Polling successful - received data for 20 devices
```

## 🎯 تست کامل Real-time

### **مراحل تست:**
1. **اتصال** → Connect کلیک کنید
2. **بررسی وضعیت** → `getPollingStatus()`
3. **انتظار** → 5 ثانیه صبر کنید
4. **مشاهده logs** → Console logs را بررسی کنید
5. **تست مداوم** → هر 5 ثانیه بررسی کنید
6. **تست فیلد** → فیلد "Simple Test - temp-1 Value" را بررسی کنید

### **نتایج موفق:**
- ✅ Polling هر 5 ثانیه کار می‌کند
- ✅ داده‌ها هر 5 ثانیه به‌روزرسانی می‌شوند
- ✅ فیلد "Simple Test - temp-1 Value" به‌روزرسانی می‌شود
- ✅ Tooltip ها مقادیر جدید نمایش می‌دهند
- ✅ Console logs کامل نمایش داده می‌شوند

### **نتایج ناموفق:**
- ❌ Polling متوقف می‌شود
- ❌ داده‌ها به‌روزرسانی نمی‌شوند
- ❌ فیلد "Simple Test - temp-1 Value" ثابت می‌ماند
- ❌ Tooltip ها همان مقادیر اولیه را نمایش می‌دهند
- ❌ Console خطا نمایش می‌دهد

## 🔄 مراحل Debug کامل

### **1. بررسی وضعیت:**
```javascript
getPollingStatus()
```

### **2. Debug کامل:**
```javascript
debugSimpleTest()
```

### **3. اصلاح مشکلات:**
```javascript
// اگر polling متوقف شده
restartPolling()

// اگر اتصال مشکل دارد
forceConnect()

// اگر داده‌ها به‌روزرسانی نمی‌شوند
testApi()
```

### **4. تست نهایی:**
```javascript
// بررسی داده‌ها
testAllData()

// به‌روزرسانی دستی
updateSimpleTest()
```

## 🚀 بهبودهای انجام شده

### **1. Robustness:**
- Timeout افزایش یافت
- Max retries افزایش یافت
- Error handling بهبود یافت

### **2. Persistence:**
- Polling متوقف نمی‌شود
- بعد از خطاها ادامه می‌یابد
- Retry count reset می‌شود

### **3. Debug Tools:**
- Console commands جدید
- Detailed logging
- Status monitoring

---
**تاریخ ایجاد:** دسامبر 2024  
**وضعیت:** 🔄 Real-time Updates اصلاح شد
