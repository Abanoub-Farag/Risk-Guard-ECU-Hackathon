import React from 'react';
import { AuditLog } from '../types/audit.types';
import '../styles/audit-trail.css';

interface AuditTimelineViewerProps {
  logs: AuditLog[];
}

export const AuditTimelineViewer: React.FC<AuditTimelineViewerProps> = ({ logs }) => {
  if (logs.length === 0) {
    return <div className="text-gray-500 italic p-4 border rounded">No audit events found for this entity.</div>;
  }

  return (
    <div className="relative border-l-2 border-gray-200 ml-3 md:ml-6 my-6 space-y-8">
      {logs.map((log, index) => (
        <div key={log.id} className="relative pl-6 sm:pl-8">
          <div className="absolute w-4 h-4 bg-blue-600 rounded-full -left-[9px] top-1 border-2 border-white shadow"></div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  {new Date(log.created_at).toLocaleString()}
                </span>
                <h4 className="text-md font-semibold text-gray-900">{log.action.replace(/_/g, ' ')}</h4>
              </div>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-mono">
                {log.actor_role}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 mt-2 space-y-1">
              <p><strong>Actor ID:</strong> {log.actor_id || 'System Automated'}</p>
              <p><strong>IP Address:</strong> {log.ip_address || 'N/A'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
