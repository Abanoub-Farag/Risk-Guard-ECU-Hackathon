import { SendNotificationDTO, NotificationEvent, NotificationChannel } from '../types/notification.types';
import { SmsProvider } from '../providers/sms-provider.interface';
import { PushProvider } from '../providers/push-provider.interface';
import { buildVoucherIssuedMessage } from '../templates/voucher-issued.template';
import { buildTriageFlaggedMessage } from '../templates/triage-flagged.template';
import { buildClaimRejectedMessage } from '../templates/claim-rejected.template';

export class NotificationDispatcher {
  // In-memory idempotency cache (use Redis in prod)
  private processedKeys = new Set<string>();

  constructor(
    private smsProvider: SmsProvider,
    private pushProvider: PushProvider,
    private inAppStore: any // E.g., Database repo for in-app inbox
  ) {}

  private generateIdempotencyKey(payload: SendNotificationDTO): string {
    return `${payload.refillRequestId}:${payload.eventType}`;
  }

  private buildMessage(eventType: NotificationEvent, vars: Record<string, string>) {
    switch (eventType) {
      case 'CLAIM_APPROVED':
        return buildVoucherIssuedMessage(vars);
      case 'CLAIM_FLAGGED_FOR_REVIEW':
        return buildTriageFlaggedMessage(vars);
      case 'CLAIM_REJECTED':
        return buildClaimRejectedMessage(vars);
      case 'VOUCHER_EXPIRING_SOON':
        return {
          title: 'Voucher Expiring Soon',
          body: `Reminder: Your voucher expires in 24 hours. Please visit a partner pharmacy soon.`
        };
      default:
        return { title: 'System Notification', body: 'You have a new update.' };
    }
  }

  public async dispatch(payload: SendNotificationDTO): Promise<void> {
    const key = this.generateIdempotencyKey(payload);
    
    if (this.processedKeys.has(key)) {
      console.warn(`[Dispatcher] Idempotency hit: Skipping duplicate notification ${key}`);
      return;
    }

    const { title, body } = this.buildMessage(payload.eventType, payload.variables);

    try {
      // 1. Always record in-app notification
      await this.inAppStore.save({
        userId: payload.userId,
        refillRequestId: payload.refillRequestId,
        eventType: payload.eventType,
        title,
        body,
        channel: NotificationChannel.IN_APP,
        status: 'DELIVERED',
        createdAt: new Date().toISOString()
      });

      // 2. Dispatch Push if token exists
      if (payload.pushToken) {
        await this.pushProvider.sendPush(payload.pushToken, title, body, { requestId: payload.refillRequestId })
          .catch(err => console.error('[PushProvider Error]', err));
      }

      // 3. Dispatch SMS if phone exists and event is high-priority
      if (payload.phone && ['CLAIM_APPROVED', 'VOUCHER_EXPIRING_SOON'].includes(payload.eventType)) {
        await this.smsProvider.sendSms(payload.phone, `${title}: ${body}`)
          .catch(err => console.error('[SmsProvider Error]', err));
      }

      this.processedKeys.add(key);
    } catch (error) {
      console.error('[NotificationDispatcher] Fatal routing error', error);
      // We don't bubble the error up because notification failures 
      // should NOT roll back core business transactions.
    }
  }
}
