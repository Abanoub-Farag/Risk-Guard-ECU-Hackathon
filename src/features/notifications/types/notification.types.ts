export enum NotificationChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP'
}

export type NotificationEvent = 
  | 'CLAIM_APPROVED'
  | 'CLAIM_FLAGGED_FOR_REVIEW'
  | 'CLAIM_REJECTED'
  | 'VOUCHER_EXPIRING_SOON';

export type NotificationStatus = 'PENDING' | 'DELIVERED' | 'FAILED' | 'READ';

export interface NotificationPayload {
  id: string; // UUID
  userId: string; // UUID
  refillRequestId: string;
  eventType: NotificationEvent;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  metadata?: Record<string, any>;
  createdAt: string; // ISO String
}

export interface SendNotificationDTO {
  userId: string;
  phone?: string;
  pushToken?: string;
  eventType: NotificationEvent;
  refillRequestId: string;
  variables: Record<string, string>;
}
