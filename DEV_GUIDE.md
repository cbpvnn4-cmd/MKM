# دليل التطوير - Development Guide

## 🚀 وضع التطوير بدون Docker

### الآن النظام كامل يعمل محلياً بدون Docker!

## كيفية الاستخدام

### تشغيل النظام كامل (Local DEV Mode - No Docker)

#### 1. افتح نافذة CMD وشغل الباك إند:
```cmd
start_dev_backend.bat
```
**المميزات:**
- ✅ أي تعديل = إعادة تشغيل تلقائية (Hot Reload)
- ✅ SQLite - لا يحتاج Docker
- ✅ Rate Limiting معطل
- ✅ سرعة أكبر

#### 2. افتح نافذة CMD أخرى وشغل الفرونت إند:
```cmd
cd frontend
npm run dev
```

**لإيقافهما:** اضغط `Ctrl+C` في كل نافذة

---

## الأوضاع المتاحة

| الوضع | الباك إند | الفرونت إند | قاعدة البيانات | Auto-Reload |
|-------|----------|-------------|---------------|-------------|
| **Local DEV** | محلي | محلي | SQLite | ✅ نعم |
| **Docker** | Docker | Docker | PostgreSQL | ❌ لا |

---

## الروابط

| الخدمة | الرابط |
|--------|--------|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |

---

## ملاحظات مهمة

### وضع التطوير الحالي (Local DEV):
- ✅ **Database**: SQLite (ملف `elevator_management.db`)
- ✅ **Rate Limiting**: معطل
- ✅ **Auto-Reload**: مفعل للباك والفرونت

### للتبديل إلى PostgreSQL (Docker):
```cmd
# عدّل backend/.env
# غير السطر الأول إلى:
DATABASE_URL=postgresql://postgres:StrongP%40ssw0rd%212025@localhost:5433/elevator_management

# ثم شغل Docker
docker-compose up -d
```

---

## للعودة إلى Docker كامل

عندما تريد العودة إلى Docker:
1. اضغط `Ctrl+C` في جميع النوافذ
2. شغل: `docker-compose up -d`

---

## troubleshooting

### الباك إند لا يعمل؟
```cmd
# تأكد من المنفذ 8000 غير مستخدم
netstat -ano | findstr :8000
```

### الفرونت إند لا يعمل؟
```cmd
# تأكد من تثبيت المكتبات
cd frontend
npm install
```
