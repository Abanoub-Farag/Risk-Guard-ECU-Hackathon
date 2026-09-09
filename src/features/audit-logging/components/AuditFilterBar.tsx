import React from 'react';
import { AuditAction, ActorRole, EntityType, AuditQueryFilter } from '../types/audit.types';

interface AuditFilterBarProps {
  filter: AuditQueryFilter;
  onFilterChange: (newFilter: AuditQueryFilter) => void;
}

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({ filter, onFilterChange }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end mb-6">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Entity ID</label>
        <input 
          type="text" 
          placeholder="e.g. UUID"
          value={filter.entityId || ''}
          onChange={e => onFilterChange({ ...filter, entityId: e.target.value })}
          className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-2 border focus:ring-blue-500"
        />
      </div>
      
      <div className="w-48">
        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Actor Role</label>
        <select 
          value={filter.actorRole || ''}
          onChange={e => onFilterChange({ ...filter, actorRole: e.target.value as ActorRole || undefined })}
          className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-2 border focus:ring-blue-500"
        >
          <option value="">Any</option>
          <option value="CLINICIAN">Clinician</option>
          <option value="PHARMACIST">Pharmacist</option>
          <option value="PATIENT">Patient</option>
          <option value="SYSTEM_WORKER">System</option>
        </select>
      </div>

      <div className="w-64">
        <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Action Type</label>
        <select 
          value={filter.action || ''}
          onChange={e => onFilterChange({ ...filter, action: e.target.value as AuditAction || undefined })}
          className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-2 border focus:ring-blue-500"
        >
          <option value="">Any</option>
          <option value="PATIENT_REGISTERED">Patient Registered</option>
          <option value="TRIAGE_EVALUATED">Triage Evaluated</option>
          <option value="MANUAL_ADJUDICATION_SUBMITTED">Adjudication Submitted</option>
          <option value="VOUCHER_ISSUED">Voucher Issued</option>
          <option value="VOUCHER_DISPENSED">Voucher Dispensed</option>
          <option value="VOUCHER_EXPIRED">Voucher Expired</option>
        </select>
      </div>
    </div>
  );
};
