# Elevator Management System - PostgreSQL Docker Setup

## نظرة عامة

هذا النظام الآن يعمل بـ **PostgreSQL 15** في Docker بدلاً من SQLite.

---

## المتطلبات

- Docker Desktop for Windows (يجب أن يكون mُفعّل)
- 4GB RAM على الأقل
- 10GB مساحة قرص حرة

---

## خطوات التشغيل السريع

### 1. تأكد من تشغيل Docker

افتح Docker Desktop وتأكد أنه يعمل.

```bash
docker ps
```

### 2. ابدأ الخدمات

```bash
docker-compose up -d
```

انتظر حتى يظهر للحاوية `elevator_db` الحالة `healthy`:

```bash
docker ps
```

### 3. أنشئ الجداول في PostgreSQL

عند أول تشغيل، ستُنشأ الجداول تلقائياً بواسطة SQLAlchemy.

### 4. (اختياري) ترحيل البيانات من SQLite القديم

إذا كان لديك بيانات في SQLite وتريد نقلها:

```bash
cd backend
python migrate_to_postgres.py
```

### 5. أعد تشغيل الـ Backend

```bash
docker-compose restart backend
```

### 6. افتح التطبيق

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

---

## ملفات الإعداد المحدثة

| الملف | الوصف |
|-------|-------|
| [backend/.env](backend/.env) | إعدادات قاعدة البيانات PostgreSQL |
| [backend/app/database/database.py](backend/app/database/database.py) | إصلاح: لم يعد يحوّل PostgreSQL إلى SQLite |
| [docker-compose.yml](docker-compose.yml) | PostgreSQL with healthcheck |
| [init-scripts/01-init.sql](init-scripts/01-init.sql) | تهيئة PostgreSQL extensions |

---

## معلومات قاعدة البيانات

| الخاصية | القيمة |
|---------|--------|
| النوع | PostgreSQL 15 Alpine |
| الحاوية | `elevator_db` |
| اسم قاعدة البيانات | `elevator_management` |
| المستخدم | `postgres` |
| كلمة المرور | `StrongP@ssw0rd!2025` |
| المنفذ | `5432:5432` |

**داخل Docker** (للـ backend):
```
postgresql://postgres:StrongP@ssw0rd!2025@db:5432/elevator_management
```

**من خارج Docker** (لأدوات مثل pgAdmin, DBeaver):
```
postgresql://postgres:StrongP@ssw0rd!2025@localhost:5432/elevator_management
```

---

## الأوامر الشائعة

### عرض حالة الخدمات

```bash
docker-compose ps
```

### عرض سجلات الـ Backend

```bash
docker-compose logs -f backend
```

### عرض سجلات قاعدة البيانات

```bash
docker-compose logs -f db
```

### إيقاف الخدمات

```bash
docker-compose down
```

### حذف كل شيء (بيانات + حاويات)

```bash
docker-compose down -v
```

### إعادة بناء Backend بعد تعديلات الكود

```bash
docker-compose up -d --build backend
```

---

## الوصول المباشر لقاعدة البيانات

### من داخل الحاوية

```bash
docker exec -it elevator_db psql -U postgres -d elevator_management
```

### أوامر SQL شائعة داخل psql

```sql
-- عرض جميع الجداول
\dt

-- عرض هيكل جدول
\d table_name

-- استعلام بسيط
SELECT COUNT(*) FROM users;

-- خروج
\q
```

---

## استكشاف الأخطاء

### المشكلة: "port is already allocated"

```bash
# أوقف خدمة PostgreSQL المحلية إذا كانت تعمل
netstat -ano | findstr :5432
taskkill /PID <PID> /F
```

### المشكلة: Backend لا يتصل بقاعدة البيانات

```bash
# تحقق من حالة قاعدة البيانات
docker-compose logs db

# تأكد من أن الحاوية healthy
docker ps

# أعد تشغيل Backend
docker-compose restart backend
```

### المشكلة: Tables don't exist

الجداول تُنشأ تلقائياً عند أول تشغيل للـ Backend. تأكد أن Backend يعمل:

```bash
docker-compose logs backend | grep "Creating tables"
```

---

## النسخ الاحتياطي والاسترجاع

### نسخ احتياطي

```bash
docker exec elevator_db pg_dump -U postgres elevator_management > backup.sql
```

### استرجاع

```bash
docker exec -i elevator_db psql -U postgres elevator_management < backup.sql
```

---

## الأمان

⚠️ **مهم**: قبل الانتقال للإنتاج:

1. غيّر كلمة مرور PostgreSQL في:
   - `docker-compose.yml` (POSTGRES_PASSWORD)
   - `backend/.env` (DATABASE_URL)

2. غيّر `SECRET_KEY` في `backend/.env`

3. فعّل SSL لقاعدة البيانات

4. أغلق المنافذ غير الضرورية

---

## الدعم

للمساعدة، تحقق من:
- سجلات Docker: `docker-compose logs`
- سجلات Backend: `docker-compose logs -f backend`
- توثيق FastAPI: http://localhost:8000/docs
"# New-folder-29-" 
