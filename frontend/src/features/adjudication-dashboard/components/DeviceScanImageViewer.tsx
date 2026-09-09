import React, { useState } from 'react';

interface DeviceScanImageViewerProps {
  imageUrl: string;
}

export const DeviceScanImageViewer: React.FC<DeviceScanImageViewerProps> = ({ imageUrl }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const handleRotate = () => setRotation(r => (r + 90) % 360);

  return (
    <div className="adjudication-left-pane flex flex-col items-center justify-center relative p-4 h-full bg-gray-900">
      <div className="absolute top-4 right-4 flex space-x-2 z-10 bg-black/50 p-2 rounded-lg">
        <button onClick={handleZoomIn} className="p-2 text-white hover:bg-gray-700 rounded" title="Zoom In">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
        <button onClick={handleZoomOut} className="p-2 text-white hover:bg-gray-700 rounded" title="Zoom Out">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        <button onClick={handleRotate} className="p-2 text-white hover:bg-gray-700 rounded" title="Rotate">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="overflow-auto w-full h-full flex items-center justify-center">
        <img 
          src={imageUrl} 
          alt="Device Screen Capture" 
          style={{ 
            transform: `scale(${scale}) rotate(${rotation}deg)`, 
            transition: 'transform 0.2s ease-in-out',
            maxHeight: '100%',
            maxWidth: '100%',
            objectFit: 'contain'
          }}
          className="shadow-2xl"
        />
      </div>
    </div>
  );
};
