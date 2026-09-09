import React, { useState } from 'react';
import { usePosRedemption } from '../hooks/usePosRedemption';
import { PosVerificationForm } from '../components/PosVerificationForm';
import { PatientIdentityMatchCard } from '../components/PatientIdentityMatchCard';
import { DispenseSuccessModal } from '../components/DispenseSuccessModal';

export const PharmacyPosTerminalPage: React.FC = () => {
  // In a real app, this would come from the authenticated terminal context
  const PHARMACY_ID = 'PHARM-12345';
  
  const { 
    handleVerify, executeDispense, resetState, 
    isLoading, error, verifiedVoucher, inputNationalId 
  } = usePosRedemption(PHARMACY_ID);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const onAuthorizeDispense = async () => {
    const success = await executeDispense();
    if (success) {
      setShowSuccessModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    resetState();
  };

  const isVerifiedAndMatched = verifiedVoucher && verifiedVoucher.national_id === inputNationalId;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Terminal Header */}
      <header className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shadow-md no-print">
        <div>
          <h1 className="text-xl font-bold tracking-wider uppercase">Pharmacy Point of Sale</h1>
          <p className="text-xs text-gray-400 font-mono mt-1">Terminal ID: {PHARMACY_ID}</p>
        </div>
        <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
          System Online
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-6 space-y-6">
        <PosVerificationForm onSubmit={handleVerify} isLoading={isLoading && !verifiedVoucher} />

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm no-print">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {verifiedVoucher && (
          <div className="space-y-6 no-print">
            <PatientIdentityMatchCard voucher={verifiedVoucher} inputNationalId={inputNationalId} />

            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-300">
              <button
                onClick={resetState}
                className="py-3 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                Cancel / Reset
              </button>
              <button
                onClick={onAuthorizeDispense}
                disabled={!isVerifiedAndMatched || isLoading}
                className={`py-3 px-6 border border-transparent rounded-md shadow-sm text-sm font-bold text-white focus:outline-none uppercase tracking-wide ${
                  !isVerifiedAndMatched || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isLoading ? 'Processing...' : 'Authorize & Dispense'}
              </button>
            </div>
          </div>
        )}
      </main>

      <DispenseSuccessModal 
        isOpen={showSuccessModal} 
        voucher={verifiedVoucher} 
        onClose={handleCloseModal} 
      />
    </div>
  );
};
