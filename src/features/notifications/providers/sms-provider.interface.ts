export interface SmsProvider {
  /**
   * Sends an SMS message to the given phone number.
   * @param phoneNumber Destination phone number (E.164 format)
   * @param message Text body of the SMS
   * @returns Promise resolving to the provider's message ID
   */
  sendSms(phoneNumber: string, message: string): Promise<string>;
}
