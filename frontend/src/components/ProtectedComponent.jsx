import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, hasAnyPermission, hasRole, hasAnyRole } from '../utils/permissions';

const ProtectedComponent = ({
  children,
  permission,
  permissions,
  role,
  roles,
  requireAll = false,
  fallback = null,
  showFallback = false
}) => {
  const { user } = useAuth();

  // Check if user has required permission(s)
  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(user, permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? permissions.every(perm => hasPermission(user, perm))
      : hasAnyPermission(user, permissions);
  } else if (role) {
    hasAccess = hasRole(user, role);
  } else if (roles && roles.length > 0) {
    hasAccess = requireAll
      ? roles.every(r => hasRole(user, r))
      : hasAnyRole(user, roles);
  }

  if (!hasAccess) {
    if (showFallback && fallback) {
      return fallback;
    }
    return null;
  }

  return children;
};

export default ProtectedComponent;