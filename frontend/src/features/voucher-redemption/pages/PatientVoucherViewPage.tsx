import React from 'react';
import { useParams } from 'react-router-dom';
import { useVoucherDetails } from '../hooks/useVoucherDetails';
import { VoucherQrCard } from '../components/VoucherQrCard';
import { VoucherCountdownTimer } from '../components/VoucherCountdownTimer';
import { VoucherStatusBadge } from '../components/VoucherStatusBadge';

export const PatientVoucherViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { voucher, setVoucher, isLoading, error } = useVoucherDetails(id || '');

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading your digital pass...</div>;
  if (error || !voucher) return <div className="p-8 text-center text-red-500">{error || 'Voucher not found'}</div>;

  const isActive = voucher.status === 'ACTIVE';

  const handleExpire = () => {
    if (voucher) {
      setVoucher({ ...voucher, status: 'EXPIRED' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden relative">
        {/* Decorative Top Border */}
        <div className="h-3 bg-blue-600 w-full" />
        
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Digital Prescription</h1>
              <p className="text-sm text-gray-500 mt-1">Present this pass at any participating pharmacy</p>
            </div>
            <VoucherStatusBadge status={voucher.status} />
          </div>

          {isActive && (
            <div className="space-y-6">
              <VoucherCountdownTimer expiresAt={voucher.expires_at} onExpire={handleExpire} />
              <VoucherQrCard voucherCode={voucher.voucher_code} />
            </div>
          )}

          {!isActive && (
            <div className="bg-gray-100 p-8 rounded-xl text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">Pass Inactive</h3>
              <p className="text-sm text-gray-500 mt-2">
                This voucher is currently {voucher.status.toLowerCase()} and cannot be used for dispensing.
              </p>
            </div>
          )}

          <div className="border-t border-dashed border-gray-300 pt-6">
            <h4 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Prescription Details</h4>
            <dl className="space-y-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Patient</dt>
                <dd className="font-medium text-gray-900">{voucher.patient_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Medication</dt>
                <dd className="font-medium text-gray-900">{voucher.medication_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Dosage</dt>
                <dd className="font-medium text-gray-900">{voucher.dosage}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Issued</dt>
                <dd className="font-medium text-gray-900">{new Date(voucher.issued_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};
