# راهنمای کاتالوگ محیط‌ها

## 📋 معرفی

کاتالوگ محیط‌ها امکان اضافه کردن محیط‌های 3D پیش‌فرض به پروژه Digital Twin را فراهم می‌کند. این ویژگی به کاربران اجازه می‌دهد بدون نیاز به آپلود فایل‌های GLB، از محیط‌های آماده استفاده کنند.

## 🏗️ محیط‌های موجود

### Rooms
- **Room 1** - اولین اتاق برای مانیتورینگ سنسورها
- فایل: `/models/room1.glb`

- **Room 2** - دومین اتاق برای مانیتورینگ سنسورها
- فایل: `/models/room2.glb`

- **Room 3** - سومین اتاق برای مانیتورینگ سنسورها
- فایل: `/models/room3.glb`

- **Room 4** - چهارمین اتاق برای مانیتورینگ سنسورها
- فایل: `/models/room4.glb`

- **Room 5** - پنجمین اتاق برای مانیتورینگ سنسورها
- فایل: `/models/room5.glb`

## 🎮 نحوه استفاده

### 1. انتخاب از کاتالوگ
1. در پنل Scene، بخش Environment را پیدا کنید
2. از dropdown "Environment Catalog" یک محیط انتخاب کنید
3. روی دکمه "Add" کلیک کنید
4. محیط انتخاب شده به صحنه اضافه می‌شود

### 2. آپلود فایل سفارشی
1. در بخش "Custom Environment (GLB)" روی "Choose File" کلیک کنید
2. فایل GLB مورد نظر را انتخاب کنید
3. فایل به صورت خودکار به صحنه اضافه می‌شود

## 🔧 اضافه کردن محیط جدید

### 1. اضافه کردن فایل GLB
```bash
# فایل GLB را در پوشه public/models قرار دهید
cp your-environment.glb public/models/
```

### 2. به‌روزرسانی کاتالوگ
فایل `src/env.ts` را ویرایش کنید:

```typescript
export const environmentCatalog: EnvironmentCatalogItem[] = [
  // محیط‌های موجود...
  {
    id: "your-environment",
    name: "Your Environment Name",
    description: "Description of your environment",
    url: "/models/your-environment.glb",
    category: "Your Category"
  }
];
```

### 3. دسته‌بندی‌های پیشنهادی
- **Commercial** - محیط‌های تجاری و اداری
- **Industrial** - محیط‌های صنعتی و کارخانه‌ای
- **Residential** - محیط‌های مسکونی
- **Educational** - محیط‌های آموزشی
- **Healthcare** - محیط‌های درمانی

## 📁 ساختار فایل‌ها

```
public/models/
├── room1.glb          # اتاق 1
├── room2.glb          # اتاق 2
├── room3.glb          # اتاق 3
├── room4.glb          # اتاق 4
├── room5.glb          # اتاق 5
├── temperature.glb    # سنسور دما
├── humidity.glb       # سنسور رطوبت
├── co2.glb           # سنسور CO2
├── light.glb         # سنسور نور
└── solar.glb         # سنسور خورشیدی
```

## 🎨 ویژگی‌های UI

### Dropdown کاتالوگ
- نمایش نام محیط و دسته‌بندی
- توضیحات در tooltip
- انتخاب آسان با کلیک

### دکمه Add
- آیکون + برای اضافه کردن
- فعال‌سازی ابزارهای ترنسفورم بعد از اضافه کردن
- پیام‌های خطا در صورت عدم موفقیت

## 🔄 مدیریت محیط‌ها

### اضافه کردن
```typescript
// اضافه کردن از کاتالوگ
await addEnvironmentFromCatalog("room1");
await addEnvironmentFromCatalog("room2");
await addEnvironmentFromCatalog("room3");

// اضافه کردن از فایل
const response = await fetch("/models/custom.glb");
const buffer = await response.arrayBuffer();
await addEnvironmentFromGLBArrayBuffer(buffer, "Custom Environment");
```

### حذف کردن
- انتخاب محیط در لیست
- کلیک روی دکمه Delete
- یا استفاده از دکمه Delete در toolbar

## 🚀 نکات بهینه‌سازی

### اندازه فایل‌ها
- فایل‌های GLB را تا حد امکان کوچک نگه دارید
- از فشرده‌سازی مناسب استفاده کنید
- مدل‌های پیچیده را ساده‌سازی کنید

### عملکرد
- فایل‌های بزرگ ممکن است زمان بارگذاری را افزایش دهند
- از LOD (Level of Detail) استفاده کنید
- بافت‌ها را بهینه کنید

## 🐛 عیب‌یابی

### خطاهای رایج

#### "Environment catalog item not found"
- بررسی کنید که ID محیط در کاتالوگ موجود باشد
- از نام‌گذاری صحیح استفاده کنید

#### "Failed to load environment"
- بررسی کنید که فایل GLB در مسیر صحیح قرار دارد
- فایل GLB معتبر باشد
- دسترسی به فایل وجود داشته باشد

#### "Only .glb files are supported"
- فقط فایل‌های با پسوند .glb پشتیبانی می‌شوند
- فایل را به فرمت GLB تبدیل کنید

## 📈 توسعه آینده

### ویژگی‌های پیشنهادی
- [ ] پیش‌نمایش محیط‌ها
- [ ] جستجو در کاتالوگ
- [ ] فیلتر بر اساس دسته‌بندی
- [ ] رتبه‌بندی محیط‌ها
- [ ] اشتراک‌گذاری محیط‌های سفارشی
- [ ] ویرایشگر محیط‌ها

### API های مفید
- [ ] API برای مدیریت کاتالوگ
- [ ] سیستم آپلود محیط‌های جدید
- [ ] کش کردن محیط‌های پرکاربرد
- [ ] به‌روزرسانی خودکار کاتالوگ

---

**آخرین به‌روزرسانی:** دسامبر 2024  
**نسخه:** 1.0  
**وضعیت:** ✅ آماده استفاده
