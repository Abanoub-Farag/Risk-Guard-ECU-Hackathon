import React, { useState } from 'react';

interface PosVerificationFormProps {
  onSubmit: (voucherCode: string, nationalId: string) => void;
  isLoading: boolean;
}

export const PosVerificationForm: React.FC<PosVerificationFormProps> = ({ onSubmit, isLoading }) => {
  const [voucherCode, setVoucherCode] = useState('');
  const [nationalId, setNationalId] = useState('');

  const handleVoucherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Uppercase and remove non-alphanumeric, limit 16
    const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16);
    setVoucherCode(clean);
  };

  const handleNationalIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only numbers, limit 14
    const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 14);
    setNationalId(clean);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (voucherCode.length === 16 && nationalId.length === 14) {
      onSubmit(voucherCode, nationalId);
    }
  };

  const isFormValid = voucherCode.length === 16 && nationalId.length === 14;

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Patient Verification</h2>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="voucherCode" className="block text-sm font-medium text-gray-700 mb-1">
            Voucher Code (16 chars)
          </label>
          <input
            type="text"
            id="voucherCode"
            value={voucherCode}
            onChange={handleVoucherChange}
            placeholder="e.g. ABCDEFGHJKLMNPQR"
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg font-mono p-3 uppercase border"
            required
            maxLength={16}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700 mb-1">
            Patient National ID (14 digits)
          </label>
          <input
            type="text"
            id="nationalId"
            value={nationalId}
            onChange={handleNationalIdChange}
            placeholder="e.g. 29901011234568"
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-lg p-3 border"
            required
            maxLength={14}
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            !isFormValid || isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Verifying...' : 'Verify Prescription'}
        </button>
      </div>
    </form>
  );
};
