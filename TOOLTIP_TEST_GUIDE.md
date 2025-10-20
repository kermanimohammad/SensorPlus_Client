# 🧪 راهنمای تست Tooltip سنسورها

## 🎯 هدف
تست عملکرد tooltip سنسورها با داده‌های real-time از API.

## 📋 مراحل تست

### **مرحله 1: اتصال به API**
1. پروژه را باز کنید
2. در پنل **Connection**، روی دکمه **"Connect"** کلیک کنید
3. Console را باز کنید (F12) و پیام‌های زیر را بررسی کنید:
   ```
   [API] Connecting to DigitalTwin SensorPlus API...
   [API] Processing data for X devices
   [API] Updated reading for device: temp-1
   [API] Updated reading for device: hum-1
   ...
   ```

### **مرحله 2: ایجاد سنسور Temperature**
1. در پنل **Scene**، بخش **Sensor** را پیدا کنید
2. نوع سنسور را **"Temperature"** انتخاب کنید
3. روی دکمه **"Add Sensor"** کلیک کنید
4. سنسور در صحنه ظاهر می‌شود
5. **deviceId** به صورت خودکار **"temp-1"** تنظیم می‌شود

### **مرحله 3: تست Tooltip**
1. روی سنسور Temperature کلیک کنید
2. Tooltip باید نمایش داده شود با اطلاعات:
   - **Device:** temp-1
   - **temperature:** 21.3°C (مقدار فعلی از API)
   - **room:** room1
   - **updated:** زمان به‌روزرسانی

### **مرحله 4: بررسی به‌روزرسانی خودکار**
1. **5 ثانیه صبر کنید**
2. در Console باید پیام‌های جدید API را ببینید:
   ```
   [API] Updated reading for device: temp-1
   [Tooltip] Rendering for device: temp-1
   ```
3. Tooltip باید با مقدار جدید به‌روزرسانی شود

### **مرحله 5: تست سنسورهای مختلف**

#### **سنسور Humidity:**
1. سنسور Humidity اضافه کنید
2. deviceId: **"hum-1"** (پیش‌فرض)
3. Tooltip باید مقدار **46.1%** نمایش دهد

#### **سنسور CO2:**
1. سنسور CO2 اضافه کنید
2. deviceId: **"co2-1"** (پیش‌فرض)
3. Tooltip باید مقدار **431.0 ppm** نمایش دهد

#### **سنسور Light:**
1. سنسور Light اضافه کنید
2. deviceId: **"light-1"** (پیش‌فرض)
3. Tooltip باید مقدار **616.0 lux** و وضعیت **ON** نمایش دهد

#### **سنسور Solar:**
1. سنسور Solar اضافه کنید
2. deviceId: **"solar-plant"** (پیش‌فرض)
3. Tooltip باید مقدار **137.8 W** و ولتاژ/جریان تخمینی نمایش دهد

## 🔧 تنظیمات پیشرفته

### **تغییر DeviceId:**
1. سنسور را انتخاب کنید
2. در پنل **Scene Properties**، فیلد **Device ID** را تغییر دهید
3. مقادیر پیشنهادی:
   - **Temperature:** temp-1, temp-2, temp-3, temp-4, temp-5
   - **Humidity:** hum-1, hum-2, hum-3, hum-4, hum-5
   - **CO2:** co2-1, co2-2, co2-3, co2-4, co2-5
   - **Light:** light-1, light-2, light-3, light-4, light-5
   - **Solar:** solar-plant

### **تست با DeviceId های مختلف:**
- **temp-2:** 24.9°C (room2)
- **hum-3:** 40.3% (room3)
- **co2-4:** 479.0 ppm (room4)
- **light-5:** 722.0 lux (room5)

## 🚨 مشکلات احتمالی و راه‌حل

### **مشکل 1: Tooltip "no data yet" نمایش می‌دهد**
**علت:** deviceId با API مطابقت ندارد
**راه‌حل:** 
- deviceId را به یکی از مقادیر موجود در API تغییر دهید
- Console را بررسی کنید تا ببینید کدام deviceId ها موجود هستند

### **مشکل 2: Tooltip به‌روزرسانی نمی‌شود**
**علت:** API متصل نیست یا polling کار نمی‌کند
**راه‌حل:**
- اتصال API را بررسی کنید
- Console را برای پیام‌های خطا بررسی کنید
- 5 ثانیه صبر کنید

### **مشکل 3: مقادیر tooltip اشتباه است**
**علت:** مشکل در تبدیل داده‌های API
**راه‌حل:**
- Console را برای debug logs بررسی کنید
- مقادیر API را با [endpoint](https://digitaltwin-sensorplus-1.onrender.com/api/data) مقایسه کنید

## 📊 داده‌های API فعلی

بر اساس آخرین درخواست به API:

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

### **✅ تست موفق:**
- Tooltip با اولین کلیک نمایش داده می‌شود
- مقادیر با داده‌های API مطابقت دارد
- هر 5 ثانیه tooltip به‌روزرسانی می‌شود
- Console debug logs نمایش داده می‌شوند

### **❌ تست ناموفق:**
- Tooltip "no data yet" نمایش می‌دهد
- مقادیر تغییر نمی‌کند
- Console خطا نمایش می‌دهد
- API متصل نیست

## 🔍 Debug Console

برای debug کامل، Console باید شامل این پیام‌ها باشد:

```
[API] Connecting to DigitalTwin SensorPlus API...
[API] Processing data for 9 devices
[API] Updated reading for device: temp-1
[Tooltip] Rendering for device: temp-1
[API] Updated reading for device: temp-1
[Tooltip] Rendering for device: temp-1
```

---
**تاریخ ایجاد:** دسامبر 2024  
**وضعیت:** 🧪 آماده تست
