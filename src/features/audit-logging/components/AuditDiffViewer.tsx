import React from 'react';

interface AuditDiffViewerProps {
  beforeState: Record<string, any> | null;
  afterState: Record<string, any> | null;
}

export const AuditDiffViewer: React.FC<AuditDiffViewerProps> = ({ beforeState, afterState }) => {
  // Simple delta inspector rendering JSON
  // In a full implementation, you would compute exact object diffs here
  
  return (
    <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-mono">
      <div className="bg-red-50 p-3 rounded border border-red-100 overflow-x-auto">
        <h5 className="font-bold text-red-800 mb-2 uppercase text-[10px] tracking-wider border-b border-red-200 pb-1">Before Mutation</h5>
        <pre className="text-red-900">{beforeState ? JSON.stringify(beforeState, null, 2) : 'null'}</pre>
      </div>
      <div className="bg-green-50 p-3 rounded border border-green-100 overflow-x-auto">
        <h5 className="font-bold text-green-800 mb-2 uppercase text-[10px] tracking-wider border-b border-green-200 pb-1">After Mutation</h5>
        <pre className="text-green-900">{afterState ? JSON.stringify(afterState, null, 2) : 'null'}</pre>
      </div>
    </div>
  );
};
