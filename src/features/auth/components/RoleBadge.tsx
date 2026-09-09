import React from 'react';
import { UserRole } from '../types/auth.types';

export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const getRoleStyle = (r: UserRole) => {
    switch (r) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CLINICIAN': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PHARMACIST': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PATIENT': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs font-bold rounded-md border ${getRoleStyle(role)} uppercase tracking-widest`}>
      {role}
    </span>
  );
};
