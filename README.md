# Digital Twin SensorPlus - راهنمای کامل پروژه

## 📋 فهرست مطالب

- [معرفی پروژه](#معرفی-پروژه)
- [ویژگی‌ها](#ویژگیها)
- [تکنولوژی‌های استفاده شده](#تکنولوژیهای-استفاده-شده)
- [پیش‌نیازها](#پیشنیازها)
- [نصب و راه‌اندازی](#نصب-و-راهاندازی)
- [روش‌های اجرا](#روشهای-اجرا)
- [ساختار پروژه](#ساختار-پروژه)
- [API Endpoints](#api-endpoints)
- [راهنمای استفاده](#راهنمای-استفاده)
- [ذخیره و بارگذاری پروژه](#ذخیره-و-بارگذاری-پروژه)
- [تنظیمات اتصال](#تنظیمات-اتصال)
- [توسعه و ساخت](#توسعه-و-ساخت)
- [مشکلات رایج](#مشکلات-رایج)

---

## 🎯 معرفی پروژه

**Digital Twin SensorPlus** یک پلتفرم پیشرفته برای ساخت و مدیریت Digital Twin (دوقلوی دیجیتال) است که به شما امکان می‌دهد:

- محیط‌های 3D را بارگذاری و مدیریت کنید
- سنسورهای مختلف را در صحنه 3D قرار دهید
- داده‌های سنسورها را به صورت Real-time دریافت و نمایش دهید
- پروژه‌های خود را ذخیره و بارگذاری کنید
- تاریخچه داده‌های سنسورها را مشاهده کنید

این پروژه با استفاده از **Babylon.js** برای رندرینگ 3D و **TypeScript** برای توسعه ساخته شده است.

---

## ✨ ویژگی‌ها

### 🎨 محیط 3D
- بارگذاری فایل‌های GLB برای محیط‌های 3D
- کاتالوگ محیط‌های از پیش تعریف شده
- مدیریت چند محیط همزمان
- ابزارهای Transform (جابجایی، چرخش، مقیاس)

### 📊 سنسورها
- **5 نوع سنسور مختلف:**
  - 🌡️ Temperature (دما)
  - 💧 Humidity (رطوبت)
  - 🌫️ CO₂ (دی‌اکسید کربن)
  - 💡 Light (نور)
  - ☀️ Solar (انرژی خورشیدی)

- نمایش Real-time داده‌های سنسورها
- Popup های دائمی برای نمایش مقادیر
- تاریخچه داده‌ها با نمودار

### 🔌 اتصال به API
- اتصال به سرور API برای دریافت داده‌های Real-time
- پشتیبانی از Polling با بازه زمانی قابل تنظیم
- نمایش وضعیت اتصال
- مدیریت دستگاه‌های کشف شده

### 💾 مدیریت پروژه
- ذخیره پروژه در قالب `.dtsp` (Digital Twin SensorPlus Project)
- بارگذاری پروژه‌های ذخیره شده
- ذخیره خودکار موقعیت و تنظیمات سنسورها

### 🛠️ ابزارها
- **Select**: انتخاب سنسورها و محیط‌ها
- **Move**: جابجایی در فضای 3D
- **Rotate**: چرخش
- **Scale**: تغییر اندازه
- **Delete**: حذف

---

## 🛠️ تکنولوژی‌های استفاده شده

### Frontend
- **TypeScript** - زبان برنامه‌نویسی
- **Vite** - Build tool و Dev Server
- **Babylon.js** - موتور رندرینگ 3D
  - `@babylonjs/core` - هسته اصلی
  - `@babylonjs/loaders` - بارگذاری مدل‌های 3D
  - `@babylonjs/materials` - مواد و متریال‌ها

### Backend
- **Node.js** - Runtime محیط
- **Express.js** - فریمورک وب سرور
- **CORS** - پشتیبانی از Cross-Origin
- **MySQL2** - اتصال به دیتابیس (اختیاری)

### ابزارها
- **Concurrently** - اجرای همزمان چند دستور
- **JSZip** - مدیریت فایل‌های ZIP

---

## 📦 پیش‌نیازها

قبل از شروع، مطمئن شوید که موارد زیر را نصب کرده‌اید:

1. **Node.js** (نسخه 16 یا بالاتر)
   - دانلود از [nodejs.org](https://nodejs.org/)
   - برای بررسی نسخه: `node --version`

2. **npm** (معمولاً همراه Node.js نصب می‌شود)
   - برای بررسی نسخه: `npm --version`

3. **Git** (اختیاری - برای کلون کردن پروژه)

---

## 🚀 نصب و راه‌اندازی

### 1. کلون کردن پروژه (اگر از Git استفاده می‌کنید)
```bash
git clone <repository-url>
cd my-twin
```

### 2. نصب وابستگی‌ها
```bash
npm install
```

این دستور تمام پکیج‌های لازم را از `package.json` نصب می‌کند.

### 3. بررسی نصب موفق
```bash
npm list --depth=0
```

---

## ▶️ روش‌های اجرا

### روش 1: حالت توسعه کامل (توصیه می‌شود) ⭐

اجرای همزمان فرانت‌اند و بک‌اند:

```bash
npm run dev:full
```

این دستور:
- Vite dev server را روی `http://localhost:5173` اجرا می‌کند
- Express server را روی `http://localhost:3001` اجرا می‌کند
- Hot Module Replacement (HMR) فعال است

**دسترسی:**
- فرانت‌اند: http://localhost:5173
- API Backend: http://localhost:3001/api/data
- Health Check: http://localhost:3001/health

---

### روش 2: فقط فرانت‌اند (Development)

```bash
npm run dev
```

فقط Vite dev server اجرا می‌شود. برای استفاده از API باید سرور بک‌اند را جداگانه اجرا کنید.

---

### روش 3: فقط سرور بک‌اند

```bash
npm run server
```

سرور Express روی پورت 3001 اجرا می‌شود و فایل‌های build شده از پوشه `dist` را سرو می‌دهد.

---

### روش 4: اجرای Production

```bash
npm run start
```

این دستور:
1. ابتدا پروژه را build می‌کند (`npm run build`)
2. سپس سرور را اجرا می‌کند

**نکته:** قبل از اجرا، مطمئن شوید که پوشه `dist` وجود دارد یا پروژه build شده است.

---

### روش 5: اجرای آنلاین (Online Mode)

```bash
npm run start:online
```

برای اتصال به سرور آنلاین استفاده می‌شود.

---

### روش 6: پیش‌نمایش Build

```bash
npm run build
npm run preview
```

برای تست نسخه production قبل از deploy.

---

## 📁 ساختار پروژه

```
my-twin/
├── dist/                  # فایل‌های build شده (Production)
├── src/                   # کدهای منبع
│   ├── core/             # هسته اصلی (Scene, Camera)
│   ├── main.ts           # نقطه ورود اصلی
│   ├── sensors.ts        # مدیریت سنسورها
│   ├── env.ts            # مدیریت محیط‌های 3D
│   ├── api-client.ts     # کلاینت API
│   ├── api-ui.ts         # رابط کاربری API
│   ├── project.ts        # مدیریت پروژه‌ها
│   ├── history-ui.ts     # رابط کاربری تاریخچه
│   ├── types.ts          # تعاریف TypeScript
│   └── style.css         # استایل‌های CSS
├── public/               # فایل‌های استاتیک
├── models/               # مدل‌های 3D
├── icons/                # آیکون‌ها
├── index.html            # فایل HTML اصلی
├── server.js             # سرور Express
├── package.json          # وابستگی‌ها و اسکریپت‌ها
├── tsconfig.json         # تنظیمات TypeScript
└── version.json          # اطلاعات نسخه
```

---

## 🔌 API Endpoints

### Local Server (http://localhost:3001)

#### Health Check
```
GET /health
```
بررسی وضعیت سرور

#### دریافت داده‌های سنسورها
```
GET /api/data
```
دریافت تمام داده‌های سنسورها

#### دریافت داده‌های Proxy
```
GET /api/proxy/data
```
دریافت داده‌ها در قالب Proxy (سازگار با کلاینت)

#### تاریخچه داده‌ها
```
GET /api/history/:type/:deviceId?hours=24
```
دریافت تاریخچه داده‌های یک سنسور خاص

**پارامترها:**
- `type`: نوع سنسور (temperature, humidity, co2, light, solar)
- `deviceId`: شناسه دستگاه
- `hours`: تعداد ساعت‌های تاریخچه (پیش‌فرض: 24)

**مثال:**
```
GET /api/history/temperature/temp-1?hours=48
```

#### لیست دستگاه‌ها
```
GET /api/devices/:type
```
دریافت لیست دستگاه‌های یک نوع سنسور

**مثال:**
```
GET /api/devices/temperature
```

### Online Server
پروژه از سرور آنلاین زیر پشتیبانی می‌کند:
```
https://digitaltwin-sensorplus-yd09.onrender.com
```

---

## 📖 راهنمای استفاده

### 1. افزودن محیط 3D

#### از کاتالوگ:
1. پنل **Scene** را باز کنید
2. در بخش **Environment**، یک محیط از کاتالوگ انتخاب کنید
3. روی دکمه **Add** کلیک کنید

#### آپلود فایل GLB:
1. در بخش **Custom Environment (GLB)**
2. روی **Choose File** کلیک کنید
3. فایل GLB خود را انتخاب کنید
4. محیط به صورت خودکار بارگذاری می‌شود

### 2. افزودن سنسور

1. پنل **Scene** را باز کنید
2. در بخش **Sensors**، نوع سنسور را انتخاب کنید:
   - 🌡️ Temperature
   - 💧 Humidity
   - 🌫️ CO₂
   - 💡 Light
   - ☀️ Solar
3. روی دکمه **Add Sensor** کلیک کنید
4. سنسور در مرکز صحنه قرار می‌گیرد

### 3. ویرایش سنسور

1. روی سنسور کلیک کنید تا انتخاب شود
2. پنل **Properties** نمایش داده می‌شود
3. تنظیمات را تغییر دهید:
   - **Label**: نام نمایشی
   - **Device ID**: شناسه دستگاه (برای اتصال به API)
   - **Topic**: موضوع MQTT (اختیاری)
   - **Color**: رنگ سنسور
   - **Scale**: اندازه
4. روی **Apply Changes** کلیک کنید

### 4. جابجایی و Transform

#### انتخاب ابزار:
- **Select** (فلش): انتخاب اشیاء
- **Move** (فلش): جابجایی
- **Rotate** (چرخش): چرخش
- **Scale** (مقیاس): تغییر اندازه
- **Delete** (حذف): حذف

#### استفاده:
1. ابزار مورد نظر را انتخاب کنید
2. روی شیء کلیک کنید
3. با ماوس جابجا/بچرخانید/مقیاس کنید
4. یا از پنل **Transform** مقادیر را وارد کنید

### 5. اتصال به API

1. پنل **Connection** را باز کنید
2. **Server URL** را وارد کنید:
   - Local: `http://localhost:3001`
   - Online: `https://digitaltwin-sensorplus-yd09.onrender.com`
3. **Polling Interval** را تنظیم کنید (به میلی‌ثانیه)
4. روی **Connect** کلیک کنید
5. وضعیت اتصال در بالای پنل نمایش داده می‌شود

### 6. مشاهده تاریخچه

1. یک سنسور را انتخاب کنید
2. در پنل **Properties**، روی **Show History** کلیک کنید
3. نمودار تاریخچه داده‌ها نمایش داده می‌شود

---

## 💾 ذخیره و بارگذاری پروژه

### ذخیره پروژه

1. پنل **Project** را باز کنید
2. روی **Save Project** کلیک کنید
3. یک پوشه انتخاب کنید
4. پروژه به صورت فایل `.dtsp` ذخیره می‌شود

**فایل پروژه شامل:**
- تمام سنسورها و تنظیمات آنها
- تمام محیط‌های 3D
- فایل‌های GLB محیط‌ها
- تنظیمات اتصال

### بارگذاری پروژه

1. پنل **Project** را باز کنید
2. روی **Load Project** کلیک کنید
3. فایل `.dtsp` را انتخاب کنید
4. پروژه بارگذاری می‌شود

**نکته:** بارگذاری پروژه، صحنه فعلی را پاک می‌کند.

---

## ⚙️ تنظیمات اتصال

### تنظیمات پیش‌فرض

پروژه به صورت پیش‌فرض به سرور زیر متصل می‌شود:
```
https://digitaltwin-sensorplus-yd09.onrender.com
```

### تغییر سرور

1. پنل **Connection** را باز کنید
2. **Server URL** را تغییر دهید
3. روی **Connect** کلیک کنید

### Polling Interval

بازه زمانی دریافت داده‌ها از API (به میلی‌ثانیه):
- پیش‌فرض: `5000` (5 ثانیه)
- حداقل: `1000` (1 ثانیه)
- حداکثر: `60000` (60 ثانیه)

---

## 🔨 توسعه و ساخت

### ساخت پروژه

```bash
npm run build
```

فایل‌های build شده در پوشه `dist` قرار می‌گیرند.

### بررسی TypeScript

```bash
npx tsc --noEmit
```

بررسی خطاهای TypeScript بدون ساخت فایل‌ها.

### ساخت Production

```bash
npm run build
```

سپس برای تست:
```bash
npm run preview
```

---

## 🐛 مشکلات رایج

### مشکل 1: پورت در حال استفاده است

**خطا:** `Port 3001 is already in use`

**راه حل:**
- پورت دیگری را در `server.js` تنظیم کنید
- یا پروسه قبلی را ببندید:
  ```bash
  # Windows
  netstat -ano | findstr :3001
  taskkill /PID <PID> /F
  
  # Linux/Mac
  lsof -ti:3001 | xargs kill
  ```

### مشکل 2: وابستگی‌ها نصب نشده

**خطا:** `Cannot find module`

**راه حل:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### مشکل 3: فایل‌های Build موجود نیست

**خطا:** `Cannot find dist/index.html`

**راه حل:**
```bash
npm run build
```

### مشکل 4: اتصال به API برقرار نمی‌شود

**راه حل:**
1. مطمئن شوید سرور بک‌اند در حال اجرا است
2. URL سرور را بررسی کنید
3. CORS را در سرور فعال کنید
4. Console مرورگر را برای خطاها بررسی کنید

### مشکل 5: مدل‌های 3D بارگذاری نمی‌شوند

**راه حل:**
1. مطمئن شوید فایل‌ها فرمت GLB دارند
2. اندازه فایل را بررسی کنید (فایل‌های بزرگ ممکن است زمان بیشتری نیاز داشته باشند)
3. Console مرورگر را برای خطاها بررسی کنید

---

## 📝 اسکریپت‌های NPM

| دستور | توضیح |
|------|-------|
| `npm run dev` | اجرای Vite dev server |
| `npm run build` | ساخت پروژه برای Production |
| `npm run preview` | پیش‌نمایش نسخه Build شده |
| `npm run server` | اجرای سرور Express |
| `npm run server:online` | اجرای سرور در حالت آنلاین |
| `npm run dev:full` | اجرای همزمان dev و server |
| `npm run start` | Build + اجرای سرور |
| `npm run start:online` | Build + اجرای سرور آنلاین |

---

## 🔗 لینک‌های مفید

- [Babylon.js Documentation](https://doc.babylonjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [Express.js Documentation](https://expressjs.com/)

---

## 📄 مجوز

این پروژه برای استفاده آموزشی و تجاری در دسترس است.

---

## 👥 مشارکت

برای مشارکت در پروژه:
1. Fork کنید
2. Branch جدید بسازید (`git checkout -b feature/AmazingFeature`)
3. تغییرات را Commit کنید (`git commit -m 'Add some AmazingFeature'`)
4. Push کنید (`git push origin feature/AmazingFeature`)
5. Pull Request باز کنید

---

## 📧 تماس

برای سوالات و پشتیبانی، لطفاً Issue در Repository باز کنید.

---

## 🎉 تشکر

از استفاده از Digital Twin SensorPlus متشکریم!

**نسخه:** 2025.0.1.34  
**تاریخ Build:** 2025.01.09

---

*این راهنما به صورت مداوم به‌روزرسانی می‌شود. برای آخرین نسخه، لطفاً Repository را بررسی کنید.*

