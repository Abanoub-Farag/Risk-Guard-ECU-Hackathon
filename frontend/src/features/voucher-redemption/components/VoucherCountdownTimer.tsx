import React, { useState, useEffect } from 'react';
import { calculateTimeRemaining, formatTimeRemaining, type TimeRemaining } from '../utils/voucher-timer.helper';

interface VoucherCountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

export const VoucherCountdownTimer: React.FC<VoucherCountdownTimerProps> = ({ expiresAt, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(calculateTimeRemaining(expiresAt));

  useEffect(() => {
    if (timeLeft.isExpired) return;

    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(expiresAt);
      setTimeLeft(remaining);

      if (remaining.isExpired) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire, timeLeft.isExpired]);

  if (timeLeft.isExpired) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-center font-bold" role="status" aria-live="assertive">
        EXPIRED
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg flex flex-col items-center" role="status" aria-live="polite">
      <span className="text-xs uppercase tracking-wider text-gray-400 mb-1">Time Remaining to Redeem</span>
      <span className="text-3xl font-mono font-bold tabular-nums tracking-wider">
        {formatTimeRemaining(timeLeft)}
      </span>
    </div>
  );
};
