export interface PushProvider {
  /**
   * Sends a Web Push Notification to a registered device token.
   * @param token The device push token
   * @param title Title of the notification
   * @param body Body text of the notification
   * @param data Optional actionable payload data (e.g. URLs)
   */
  sendPush(token: string, title: string, body: string, data?: Record<string, any>): Promise<string>;
}
