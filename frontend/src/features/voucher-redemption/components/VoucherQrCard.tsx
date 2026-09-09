import React from 'react';
import { formatVoucherCode } from '../utils/voucher-masking.helper';

interface VoucherQrCardProps {
  voucherCode: string;
}

export const VoucherQrCard: React.FC<VoucherQrCardProps> = ({ voucherCode }) => {
  const formattedCode = formatVoucherCode(voucherCode);

  const handleCopy = () => {
    navigator.clipboard.writeText(voucherCode);
  };

  // Mocking SVG QR Code generation for the UI display
  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
      <div className="w-48 h-48 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center p-2 mb-4">
        {/* Placeholder for actual QR code rendering, like qrcode.react */}
        <svg viewBox="0 0 100 100" className="w-full h-full text-black">
          <path fill="currentColor" d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M50,10 h10 v10 h-10 z M70,10 h20 v30 h-20 z M75,15 v20 h10 v-20 z M10,50 h10 v10 h-10 z M30,50 h40 v10 h-40 z M80,50 h10 v10 h-10 z M10,70 h30 v20 h-30 z M15,75 v10 h20 v-10 z M50,70 h20 v20 h-20 z M80,70 h10 v10 h-10 z M90,80 h10 v20 h-10 z" />
        </svg>
      </div>

      <div className="text-center w-full">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Voucher Code</p>
        <div className="flex items-center justify-center space-x-2">
          <span className="text-2xl font-mono font-bold tracking-wider text-gray-900 bg-gray-50 px-4 py-2 rounded border border-gray-200">
            {formattedCode}
          </span>
          <button 
            onClick={handleCopy}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded"
            title="Copy Code"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
