# api/auth_helpers.py
from .models import Users, Roles

def authenticate_user(username, password):
    """
    Authenticate a user by username and password
    Returns user object if successful, None otherwise
    """
    try:
        # Find user by username
        user = Users.objects.get(username=username, password_hash=password, is_active=True)
        return user
    except Users.DoesNotExist:
        return None

def check_permission(user_id, required_role):
    """
    Check if user has required role or higher
    Returns True if user has permission, False otherwise
    
    Role hierarchy: Admin(4) > Researcher(3) > Member(2) > Visitor(1)
    """
    try:
        user = Users.objects.get(user_id=user_id, is_active=True)
        role_mapping = {
            'Visitor': 1,
            'Member': 2,
            'Researcher': 3,
            'Admin': 4
        }
        
        # Get required role level
        required_role_level = role_mapping.get(required_role, 0)
        
        # Get user's role level
        user_role_name = user.role.role_name
        user_role_level = role_mapping.get(user_role_name, 0)
        
        # Check if user's role level is greater than or equal to required role level
        return user_role_level >= required_role_level
    except Users.DoesNotExist:
        return False