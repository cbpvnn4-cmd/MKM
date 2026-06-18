#!/usr/bin/env python3
"""
Quick check for users in database
"""
import sqlite3
import os

# Database path
db_path = "elevator_management.db"

if not os.path.exists(db_path):
    print(f"❌ Database not found: {db_path}")
    exit(1)

print("=" * 60)
print("📊 فحص المستخدمين في قاعدة البيانات")
print("=" * 60)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check users table
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    print(f"\n✅ عدد المستخدمين الكلي: {user_count}")
    
    # Get all users
    cursor.execute("""
        SELECT id, username, email, full_name, is_active, is_superuser, created_at 
        FROM users
        ORDER BY id
    """)
    users = cursor.fetchall()
    
    print("\n📋 قائمة المستخدمين:")
    print("-" * 60)
    
    for user in users:
        user_id, username, email, full_name, is_active, is_superuser, created_at = user
        status = "✅ نشط" if is_active else "❌ معطل"
        admin_badge = "👑 مدير" if is_superuser else "👤 مستخدم"
        
        print(f"\n{admin_badge} | {status}")
        print(f"  ID: {user_id}")
        print(f"  اسم المستخدم: {username}")
        print(f"  البريد: {email}")
        print(f"  الاسم الكامل: {full_name or 'غير محدد'}")
        print(f"  تاريخ الإنشاء: {created_at}")
    
    # Check roles
    print("\n" + "=" * 60)
    cursor.execute("SELECT COUNT(*) FROM roles")
    role_count = cursor.fetchone()[0]
    print(f"🔑 عدد الأدوار (Roles): {role_count}")
    
    cursor.execute("SELECT id, name, description FROM roles ORDER BY id")
    roles = cursor.fetchall()
    
    if roles:
        print("\n📋 قائمة الأدوار:")
        print("-" * 60)
        for role_id, name, description in roles:
            print(f"  • {name}: {description}")
    
    # Check user-role assignments
    print("\n" + "=" * 60)
    cursor.execute("""
        SELECT u.username, r.name 
        FROM user_roles ur
        JOIN users u ON ur.user_id = u.id
        JOIN roles r ON ur.role_id = r.id
        ORDER BY u.username
    """)
    user_roles = cursor.fetchall()
    
    if user_roles:
        print(f"👥 تعيينات الأدوار للمستخدمين:")
        print("-" * 60)
        for username, role_name in user_roles:
            print(f"  • {username} ← {role_name}")
    else:
        print("⚠️  لا توجد تعيينات أدوار")
    
    print("\n" + "=" * 60)
    print("✅ تم الفحص بنجاح!")
    print("=" * 60)

except sqlite3.Error as e:
    print(f"\n❌ خطأ في قاعدة البيانات: {e}")
except Exception as e:
    print(f"\n❌ خطأ: {e}")
finally:
    conn.close()
