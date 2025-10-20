# راهنمای Deployment پروژه Digital Twin

## 🔧 مشکل فعلی
نسخه آنلاین پروژه از `localhost:3001` استفاده می‌کند که فقط روی کامپیوتر محلی در دسترس است.

## ✅ راه‌حل‌های پیاده‌سازی شده

### 1. تشخیص خودکار محیط
- پروژه حالا به طور خودکار تشخیص می‌دهد که در محیط local یا online اجرا می‌شود
- در محیط local: از `http://localhost:3001/api/proxy/data` استفاده می‌کند
- در محیط online: از `/api/proxy/data` استفاده می‌کند

### 2. سرور آنلاین جدید
- فایل `server-online.js` ایجاد شده که endpoint `/api/proxy/data` را فراهم می‌کند
- این سرور برای deployment آنلاین طراحی شده است

## 🚀 نحوه استفاده

### برای Development محلی:
```bash
npm run dev:full
```

### برای Production آنلاین:
```bash
npm run start:online
```

## 📋 مراحل Deployment

### 1. Build پروژه:
```bash
npm run build
```

### 2. اجرای سرور آنلاین:
```bash
npm run server:online
```

### 3. یا استفاده از PM2:
```bash
pm2 start server-online.js --name "digital-twin-online"
```

## 🔍 تست عملکرد

### تست محلی:
- باز کردن `http://localhost:5173`
- بررسی console برای پیام: `Environment: local`

### تست آنلاین:
- باز کردن URL آنلاین
- بررسی console برای پیام: `Environment: online`

## 🛠️ تنظیمات اضافی

### متغیرهای محیطی:
```bash
PORT=3000  # پورت سرور آنلاین
NODE_ENV=production
```

### CORS Configuration:
سرور آنلاین CORS را برای همه origins فعال کرده است.

## 📊 Monitoring

### Health Check:
```
GET /api/health
```

### Proxy Status:
```
GET /api/proxy/data
```

## 🔧 عیب‌یابی

### مشکل: "Failed to fetch"
- بررسی اینکه سرور آنلاین در حال اجرا است
- بررسی endpoint `/api/proxy/data`

### مشکل: "CORS error"
- سرور آنلاین CORS را پیکربندی کرده است
- اگر مشکل ادامه داشت، بررسی تنظیمات مرورگر

## 📝 نکات مهم

1. **سرور محلی**: فقط برای development استفاده می‌شود
2. **سرور آنلاین**: برای production و deployment
3. **تشخیص خودکار**: نیازی به تغییر کد برای محیط‌های مختلف نیست
4. **Fallback**: اگر proxy محلی کار نکند، مستقیماً به API متصل می‌شود
