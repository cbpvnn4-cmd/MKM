"""
Reset a user's password
Usage: python reset_user_password.py <username> <new_password>
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.database.database import SessionLocal
from app.models.users import User
from app.core.security import get_password_hash


def reset_password(username: str, new_password: str):
    """Reset user password"""
    db = SessionLocal()

    try:
        # Find user
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"✗ Error: User '{username}' not found")
            return False

        # Update password
        user.hashed_password = get_password_hash(new_password)
        db.commit()

        print(f"✓ Password reset successfully for user '{username}'")
        print(f"\nNew credentials:")
        print(f"  Username: {username}")
        print(f"  Password: {new_password}")
        return True

    except Exception as e:
        print(f"✗ Error: {e}")
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python reset_user_password.py <username> <new_password>")
        print("Example: python reset_user_password.py sdd newpass123")
        exit(1)

    username = sys.argv[1]
    new_password = sys.argv[2]

    print("="*60)
    print(f"RESETTING PASSWORD FOR USER: {username}")
    print("="*60)
    reset_password(username, new_password)
