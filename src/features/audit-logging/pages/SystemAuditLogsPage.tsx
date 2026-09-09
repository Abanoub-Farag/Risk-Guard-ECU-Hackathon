import React, { useState } from 'react';
import { AuditTimelineViewer } from '../components/AuditTimelineViewer';
import { AuditDiffViewer } from '../components/AuditDiffViewer';
import { AuditFilterBar } from '../components/AuditFilterBar';
import { AuditQueryFilter, AuditLog } from '../types/audit.types';

export const SystemAuditLogsPage: React.FC = () => {
  const [filter, setFilter] = useState<AuditQueryFilter>({});
  
  // Mock data for demonstration. In production, this would use a hook fetching from the API.
  const [logs] = useState<AuditLog[]>([
    {
      id: 'log-1',
      actor_id: 'cl-uuid',
      actor_role: 'CLINICIAN',
      action: 'MANUAL_ADJUDICATION_SUBMITTED',
      entity_type: 'REFILL_REQUEST',
      entity_id: 'req-uuid',
      ip_address: '192.168.1.10',
      user_agent: 'Mozilla/5.0...',
      before_state: { status: 'NEEDS_REVIEW' },
      after_state: { status: 'APPROVED' },
      metadata: null,
      created_at: new Date()
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Compliance & Audit Trail</h1>
          <p className="text-gray-500 mt-2">Immutable forensic record of system mutations</p>
        </header>

        <AuditFilterBar filter={filter} onFilterChange={setFilter} />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">Event Stream</h2>
          </div>
          <div className="p-6">
            <AuditTimelineViewer logs={logs} />
            
            {logs.length > 0 && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Latest Delta Inspection</h3>
                <AuditDiffViewer beforeState={logs[0].before_state} afterState={logs[0].after_state} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
