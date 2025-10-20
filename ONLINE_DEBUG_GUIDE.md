# 🌐 راهنمای Debug نسخه آنلاین

## 🎯 مشکل
در نسخه آنلاین سنسورها آپدیت نمی‌شوند.

## 🔍 علت احتمالی
1. **CORS Issues** - مرورگر اجازه دسترسی مستقیم نمی‌دهد
2. **CORS Proxy ها کار نمی‌کنند**
3. **API endpoint در دسترس نیست**
4. **Network issues**

## 🛠️ Debug Tools جدید

### **Console Commands:**
```javascript
// Debug کامل نسخه آنلاین
debugOnline()

// تست مستقیم API (بدون CORS proxy)
testDirectApi()

// تست CORS proxy ها
testCorsProxy()

// تست API معمولی
testApi()

// بررسی وضعیت
getPollingStatus()
```

## 🧪 مراحل Debug

### **مرحله 1: Debug کامل**
1. نسخه آنلاین را باز کنید
2. Console را باز کنید (F12)
3. در Console بنویسید:
   ```javascript
   debugOnline()
   ```
4. نتایج را بررسی کنید

### **مرحله 2: بررسی نتایج**

#### **✅ Environment OK:**
```
User Agent: Mozilla/5.0...
Location: https://your-domain.com/
Protocol: https:
```

#### **❌ Environment Issues:**
```
Protocol: http:  // ممکن است مشکل باشد
```

#### **✅ API Connected:**
```
Polling status: {
  isConnected: true,
  pollingInterval: 5000,
  hasInterval: true,
  retryCount: 0,
  maxRetries: 10
}
```

#### **❌ API Not Connected:**
```
Polling status: {
  isConnected: false,
  pollingInterval: 5000,
  hasInterval: false,
  retryCount: 10,
  maxRetries: 10
}
```

### **مرحله 3: تست Direct API**
```javascript
testDirectApi()
```

**نتیجه مورد انتظار:**
```
[Direct API Test] Direct connection failed: CORS error
[Direct API Test] This is expected in production due to CORS
```

### **مرحله 4: تست CORS Proxy**
```javascript
testCorsProxy()
```

**نتیجه مورد انتظار:**
```
[CORS Test] Testing CORS proxy connection to: https://digitaltwin-sensorplus-1.onrender.com/api/data
[CORS Test] Testing proxy 1: https://api.allorigins.win/raw?url=
[CORS Test] Proxy 1 successful!
[CORS Test] Received data: {success: true, devices: {...}}
```

## 🚨 مشکلات احتمالی و راه‌حل

### **مشکل 1: همه CORS Proxy ها fail می‌کنند**
**علائم:**
```
[CORS Test] All CORS proxies failed
```

**راه‌حل:**
1. بررسی اتصال اینترنت
2. تست دستی proxy ها در مرورگر
3. بررسی firewall/proxy settings

### **مشکل 2: Direct API کار می‌کند اما CORS Proxy ها نه**
**علائم:**
```
[Direct API Test] Direct connection successful!
[CORS Test] All CORS proxies failed
```

**راه‌حل:**
1. مشکل در CORS proxy ها است
2. Proxy های جدید اضافه شده‌اند
3. `restartPolling()` را اجرا کنید

### **مشکل 3: API endpoint در دسترس نیست**
**علائم:**
```
[Direct API Test] Direct connection failed: HTTP 404
[CORS Test] All CORS proxies failed
```

**راه‌حل:**
1. بررسی API endpoint
2. تست مستقیم در مرورگر
3. بررسی server status

### **مشکل 4: Polling متوقف می‌شود**
**علائم:**
```
Polling status: {hasInterval: false}
```

**راه‌حل:**
```javascript
restartPolling()
// یا
forceConnect()
```

## 🔧 Console Commands مفید

### **بررسی وضعیت:**
```javascript
// Debug کامل
debugOnline()

// بررسی وضعیت
getPollingStatus()

// بررسی داده‌ها
testAllData()
```

### **تست اتصال:**
```javascript
// تست مستقیم
testDirectApi()

// تست CORS proxy
testCorsProxy()

// تست API معمولی
testApi()
```

### **اصلاح مشکلات:**
```javascript
// Restart polling
restartPolling()

// Force connect
forceConnect()
```

## 📊 Console Logs مورد انتظار

### **Debug موفق:**
```
=== DEBUG ONLINE VERSION ===
1. Checking environment...
User Agent: Mozilla/5.0...
Location: https://your-domain.com/
Protocol: https:
2. Checking API connection...
Polling status: {isConnected: true, pollingInterval: 5000, hasInterval: true, retryCount: 0, maxRetries: 10}
3. Testing direct API...
[Direct API Test] Direct connection failed: CORS error
[Direct API Test] This is expected in production due to CORS
4. Testing CORS proxy...
[CORS Test] Proxy 1 successful!
[CORS Test] Received data: {success: true, devices: {...}}
5. Checking latestByDev...
[Data Test] Total devices in latestByDev: 20
=== END DEBUG ONLINE ===
```

### **Debug ناموفق:**
```
=== DEBUG ONLINE VERSION ===
1. Checking environment...
User Agent: Mozilla/5.0...
Location: https://your-domain.com/
Protocol: https:
2. Checking API connection...
Polling status: {isConnected: false, pollingInterval: 5000, hasInterval: false, retryCount: 10, maxRetries: 10}
3. Testing direct API...
[Direct API Test] Direct connection failed: CORS error
4. Testing CORS proxy...
[CORS Test] All CORS proxies failed
5. Checking latestByDev...
[Data Test] Total devices in latestByDev: 0
=== END DEBUG ONLINE ===
```

## 🎯 مراحل Debug کامل

### **1. Debug کامل:**
```javascript
debugOnline()
```

### **2. بررسی نتایج:**
- Environment درست است؟
- API متصل است؟
- CORS proxy ها کار می‌کنند؟

### **3. اصلاح مشکلات:**
- اگر CORS proxy ها fail می‌کنند → بررسی اتصال
- اگر API متصل نیست → `forceConnect()`
- اگر polling متوقف شده → `restartPolling()`

### **4. تست نهایی:**
```javascript
// بررسی داده‌ها
testAllData()

// تست tooltip
testTooltip('temp-1')
```

## 🚀 بهبودهای انجام شده

### **1. CORS Proxy های جدید:**
- `https://corsproxy.io/?`
- `https://api.codetabs.com/v1/proxy?quest=`
- `https://cors.bridged.cc/`

### **2. Debug Tools:**
- `debugOnline()` - debug کامل
- `testDirectApi()` - تست مستقیم
- `testCorsProxy()` - تست CORS proxy ها

### **3. Detailed Logging:**
- Response status codes
- Response headers
- Detailed error messages

## 🔄 مراحل Debug کامل

1. **Debug کامل:** `debugOnline()`
2. **بررسی نتایج:** Environment، API، CORS
3. **اصلاح مشکلات:** بر اساس نتایج
4. **تست نهایی:** `testAllData()` و `testTooltip()`

---
**تاریخ ایجاد:** دسامبر 2024  
**وضعیت:** 🌐 آماده Debug نسخه آنلاین
