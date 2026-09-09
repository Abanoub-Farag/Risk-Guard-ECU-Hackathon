import { useAuth } from './useAuth';
import { hasPermission, AppFeature } from '../utils/role-matrix';

export function usePermission(feature: AppFeature) {
  const { user } = useAuth();

  if (!user) {
    return false;
  }

  return hasPermission(user.role, feature);
}
