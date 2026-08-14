import { MessageProvider, MessagePayload, MessageResponse } from '../MessageProvider';

export class InternetSmsProvider implements MessageProvider {
  channelType = 'sms_panel';
  id: string;
  priority: number;
  private apiKey: string;
  private senderNumber: string;
  private endpoint: string;

  constructor(id: string, priority: number, config: Record<string, any>) {
    this.id = id;
    this.priority = priority;
    // Store API key, sender number securely
    this.apiKey = config.apiKey || process.env.SMS_PANEL_API_KEY || '';
    this.senderNumber = config.senderNumber || '';
    this.endpoint = config.endpoint || 'http://api.sms-webservice.com/api/V3/';
  }

  async send(payload: MessagePayload): Promise<MessageResponse> {
    try {
      // Endpoint typically expects something like /Send?ApiKey=...&Text=...&Sender=...&Recipients=...
      const url = new URL(`${this.endpoint}Send`);
      url.searchParams.append('ApiKey', this.apiKey);
      url.searchParams.append('Text', payload.text);
      url.searchParams.append('Sender', this.senderNumber);
      url.searchParams.append('Recipients', payload.to);

      const response = await fetch(url.toString(), {
        method: 'GET', // Based on the doc html preview "ارسال یک متن به یک یا چند شماره با متد Get"
      });

      const data = await response.json();

      // Adjust based on the actual response structure of the API
      // Assume something like { Status: 1, MessageId: "12345" } for success
      if (response.ok && data) {
        return {
          success: true,
          messageId: data.MessageId || data.Id || Math.random().toString(36).substring(7),
          rawResponse: data
        };
      } else {
        return {
          success: false,
          error: data.Message || 'Failed to send SMS via panel',
          rawResponse: data
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error while sending SMS'
      };
    }
  }
}
