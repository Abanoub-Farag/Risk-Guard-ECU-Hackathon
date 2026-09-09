import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOcrTrigger } from '../hooks/useOcrTrigger';
import '../styles/triage-engine.css';

export const OcrProcessingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { triggerOcr, isProcessing, error } = useOcrTrigger(id || '');

  useEffect(() => {
    if (!id) return;
    
    // Automatically trigger on mount for demo/flow purposes
    triggerOcr({ file_id: 'mock-file-id' })
      .then(() => {
        navigate(`/refills/${id}/triage-summary`);
      })
      .catch((err) => {
        console.error('OCR Processing failed', err);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Processing Biometrics</h2>
        
        {isProcessing && (
          <div className="space-y-4">
            <div className="relative h-48 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              {/* Scanner animation */}
              <div className="scanner-line absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] z-10" />
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <span className="text-sm">Analyzing Scan...</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 animate-pulse">Extracting telemetry data and generating triage outcome...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium text-sm">{error}</p>
            <button 
              onClick={() => triggerOcr({ file_id: 'mock-file-id' })}
              className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Retry Extraction
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
