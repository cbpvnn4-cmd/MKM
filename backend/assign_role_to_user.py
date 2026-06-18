"""
Script to assign a role to a specific user
Usage: python assign_role_to_user.py <username> <role_name>
Example: python assign_role_to_user.py john_doe Admin
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.database.database import SessionLocal
from app.models.users import User, Role, UserRole


def assign_role_to_user(username: str, role_name: str):
    """Assign a role to a user"""
    db = SessionLocal()

    try:
        # Find user
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"✗ Error: User '{username}' not found")
            return False

        # Find role
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            print(f"✗ Error: Role '{role_name}' not found")
            print("\nAvailable roles:")
            roles = db.query(Role).all()
            for r in roles:
                print(f"  • {r.name}: {r.description}")
            return False

        # Check if user already has this role
        existing = db.query(UserRole).filter(
            UserRole.user_id == user.id,
            UserRole.role_id == role.id
        ).first()

        if existing:
            print(f"⊗ User '{username}' already has role '{role_name}'")
            return True

        # Assign role to user
        user_role = UserRole(
            user_id=user.id,
            role_id=role.id
        )
        db.add(user_role)
        db.commit()

        print(f"✓ Successfully assigned role '{role_name}' to user '{username}'")

        # Print user's current roles
        user_roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()
        print(f"\nUser '{username}' now has {len(user_roles)} role(s):")
        for ur in user_roles:
            r = db.query(Role).filter(Role.id == ur.role_id).first()
            if r:
                print(f"  • {r.name}")

        return True

    except Exception as e:
        print(f"\n✗ Error: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def list_all_users():
    """List all users in the system"""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print("\n" + "="*60)
        print("ALL USERS IN THE SYSTEM:")
        print("="*60)
        for user in users:
            user_roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()
            roles = []
            for ur in user_roles:
                role = db.query(Role).filter(Role.id == ur.role_id).first()
                if role:
                    roles.append(role.name)

            status = "Active" if user.is_active else "Inactive"
            roles_str = ", ".join(roles) if roles else "No roles"
            print(f"  • {user.username} ({user.email}) - {status}")
            print(f"    Full Name: {user.full_name}")
            print(f"    Roles: {roles_str}")
            print()
        print("="*60)
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) == 1:
        # No arguments - list all users
        print("Usage: python assign_role_to_user.py <username> <role_name>")
        print("Example: python assign_role_to_user.py john_doe Admin")
        list_all_users()

    elif len(sys.argv) == 3:
        # Assign role to user
        username = sys.argv[1]
        role_name = sys.argv[2]
        print("="*60)
        print(f"ASSIGNING ROLE '{role_name}' TO USER '{username}'")
        print("="*60)
        assign_role_to_user(username, role_name)

    else:
        print("✗ Error: Invalid arguments")
        print("Usage: python assign_role_to_user.py <username> <role_name>")
        print("Example: python assign_role_to_user.py john_doe Admin")
