import { useAuth } from '../contexts/AuthContext';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  canAccessRoute,
  canPerformAction
} from '../utils/permissions';

export const usePermissions = () => {
  const { user } = useAuth();

  return {
    hasPermission: (permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions) => hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions) => hasAllPermissions(user, permissions),
    hasRole: (role) => hasRole(user, role),
    hasAnyRole: (roles) => hasAnyRole(user, roles),
    canAccessRoute: (route) => canAccessRoute(user, route),
    canPerformAction: (action, resource) => canPerformAction(user, action, resource),
    user
  };
};