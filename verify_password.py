from passlib.context import CryptContext
import sqlite3

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

conn = sqlite3.connect('elevator_management.db')
c = conn.cursor()
c.execute('SELECT hashed_password FROM users WHERE username = ?', ('admin',))
result = c.fetchone()

if result:
    hash = result[0]
    print('Hash stored in DB:', hash[:60] + '...')
    
    # Test different passwords
    passwords_to_test = ['admin123', 'admin', 'password', '123456', 'Admin123']
    
    for pwd in passwords_to_test:
        matches = pwd_context.verify(pwd, hash)
        print(f'Password "{pwd}" matches: {matches}')
        if matches:
            print(f'\n*** FOUND! The correct password is: {pwd} ***')
            break
else:
    print('No admin user found!')

conn.close()
