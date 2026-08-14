import { MessageProvider, MessagePayload, MessageResponse } from '../MessageProvider';

export class WhatsAppProvider implements MessageProvider {
  channelType = 'whatsapp';
  id: string;
  priority: number;
  private accessToken: string;
  private phoneNumberId: string;
  private apiVersion: string;

  constructor(id: string, priority: number, config: Record<string, any>) {
    this.id = id;
    this.priority = priority;
    this.accessToken = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.apiVersion = config.apiVersion || 'v17.0';
  }

  async send(payload: MessagePayload): Promise<MessageResponse> {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        return { success: false, error: 'WhatsApp credentials are missing' };
      }

      const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: payload.to,
          type: 'text',
          text: {
            body: payload.text
          }
        }),
      });

      const data = await response.json();

      if (response.ok && data.messages && data.messages.length > 0) {
        return {
          success: true,
          messageId: data.messages[0].id,
          rawResponse: data,
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to send WhatsApp message',
          rawResponse: data,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error while sending WhatsApp message',
      };
    }
  }
}
