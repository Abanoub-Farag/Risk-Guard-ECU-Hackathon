import { NotificationDispatcher } from '../../src/features/notifications/services/notification-dispatcher';
import { SmsProvider } from '../../src/features/notifications/providers/sms-provider.interface';
import { PushProvider } from '../../src/features/notifications/providers/push-provider.interface';
import { SendNotificationDTO } from '../../src/features/notifications/types/notification.types';

describe('NotificationDispatcher Unit Tests', () => {
  let smsProvider: jest.Mocked<SmsProvider>;
  let pushProvider: jest.Mocked<PushProvider>;
  let inAppStore: any;
  let dispatcher: NotificationDispatcher;

  beforeEach(() => {
    smsProvider = { sendSms: jest.fn().mockResolvedValue('msg_123') };
    pushProvider = { sendPush: jest.fn().mockResolvedValue('push_123') };
    inAppStore = { save: jest.fn().mockResolvedValue(true) };
    
    dispatcher = new NotificationDispatcher(smsProvider, pushProvider, inAppStore);
  });

  it('asserts idempotency by ignoring duplicate dispatch calls with the same key', async () => {
    const payload: SendNotificationDTO = {
      userId: 'u1',
      phone: '+1234567890',
      eventType: 'CLAIM_APPROVED',
      refillRequestId: 'req1',
      variables: { voucherCode: 'ABCDEF1234567890' }
    };

    await dispatcher.dispatch(payload);
    await dispatcher.dispatch(payload); // Duplicate call

    // Should only call providers once despite two dispatches
    expect(smsProvider.sendSms).toHaveBeenCalledTimes(1);
    expect(inAppStore.save).toHaveBeenCalledTimes(1);
  });

  it('does not bubble up third-party SMS failures to block the main thread', async () => {
    smsProvider.sendSms.mockRejectedValue(new Error('Twilio Gateway Timeout'));

    const payload: SendNotificationDTO = {
      userId: 'u2',
      phone: '+0987654321',
      eventType: 'VOUCHER_EXPIRING_SOON',
      refillRequestId: 'req2',
      variables: {}
    };

    // Should resolve cleanly without throwing, despite SMS failure
    await expect(dispatcher.dispatch(payload)).resolves.toBeUndefined();
    
    // Internal inbox still gets saved
    expect(inAppStore.save).toHaveBeenCalledTimes(1);
  });
});
