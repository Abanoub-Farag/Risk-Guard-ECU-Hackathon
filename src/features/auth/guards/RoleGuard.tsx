import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { AppFeature } from '../utils/role-matrix';

interface RoleGuardProps {
  feature: AppFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ feature, children, fallback = null }) => {
  const isAllowed = usePermission(feature);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
