import React from 'react';
import { VoucherStatus } from '../types/voucher.types';

interface VoucherStatusBadgeProps {
  status: VoucherStatus;
}

export const VoucherStatusBadge: React.FC<VoucherStatusBadgeProps> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'DISPENSED':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-500 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStyles()}`}>
      {status}
    </span>
  );
};
