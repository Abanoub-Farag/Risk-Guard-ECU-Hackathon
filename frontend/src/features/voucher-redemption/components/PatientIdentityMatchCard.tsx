import React from 'react';
import { PharmacyVoucher } from '../types/voucher.types';
import { maskNationalId } from '../utils/voucher-masking.helper';

interface PatientIdentityMatchCardProps {
  voucher: PharmacyVoucher;
  inputNationalId: string;
}

export const PatientIdentityMatchCard: React.FC<PatientIdentityMatchCardProps> = ({ voucher, inputNationalId }) => {
  const isMatch = voucher.national_id === inputNationalId;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className={`p-4 border-b ${isMatch ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <h3 className={`text-lg font-bold ${isMatch ? 'text-green-800' : 'text-red-800'}`}>
          {isMatch ? 'Identity Verified' : 'Identity Mismatch'}
        </h3>
        {!isMatch && (
          <p className="text-sm text-red-600 mt-1">
            The provided National ID does not match the prescription record.
          </p>
        )}
      </div>

      <div className="p-6 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase">Patient Name</h4>
          <p className="text-lg font-semibold text-gray-900">{voucher.patient_name}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-500 uppercase">National ID (Record)</h4>
          <p className="text-lg font-mono text-gray-900">{maskNationalId(voucher.national_id)}</p>
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">Prescription Authorization</h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <dt className="text-sm text-gray-500">Medication</dt>
              <dd className="text-sm font-medium text-gray-900">{voucher.medication_name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Dosage</dt>
              <dd className="text-sm font-medium text-gray-900">{voucher.dosage}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm text-gray-500">Refill Interval</dt>
              <dd className="text-sm font-medium text-gray-900">{voucher.refill_interval_days} Days</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};
