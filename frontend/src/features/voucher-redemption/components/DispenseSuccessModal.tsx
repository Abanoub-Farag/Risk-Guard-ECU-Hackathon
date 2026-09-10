import React from 'react';
import { type PharmacyVoucher } from '../types/voucher.types';
import { maskNationalId } from '../utils/voucher-masking.helper';
import '../styles/voucher-redemption.css';

interface DispenseSuccessModalProps {
  isOpen: boolean;
  voucher: PharmacyVoucher | null;
  onClose: () => void;
}

export const DispenseSuccessModal: React.FC<DispenseSuccessModalProps> = ({ isOpen, voucher, onClose }) => {
  if (!isOpen || !voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6 print-receipt-container">
        <div className="text-center mb-6 no-print">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Dispensing Authorized</h3>
          <p className="text-sm text-gray-500 mt-2">The prescription has been successfully recorded as dispensed.</p>
        </div>

        {/* Receipt section for printing */}
        <div className="print-area border-t border-b border-dashed border-gray-300 py-6 my-6 space-y-4">
          <div className="text-center mb-4">
            <h4 className="font-bold text-lg uppercase tracking-widest">Pharmacy Receipt</h4>
            <p className="text-xs text-gray-500">Refill Authorization</p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Timestamp</dt>
              <dd className="font-medium">{new Date().toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Voucher Code</dt>
              <dd className="font-mono">{voucher.voucher_code}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Patient</dt>
              <dd className="font-medium">{voucher.patient_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">National ID</dt>
              <dd className="font-mono">{maskNationalId(voucher.national_id)}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
              <dt className="text-gray-900 font-bold">Dispensed Item</dt>
              <dd className="font-bold">{voucher.medication_name} ({voucher.dosage})</dd>
            </div>
          </dl>
        </div>

        <div className="flex justify-between space-x-3 no-print">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Close & Next
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none flex justify-center items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
