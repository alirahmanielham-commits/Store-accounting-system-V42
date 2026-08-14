import { MessageProvider, MessagePayload, MessageResponse } from '../MessageProvider';

export class TelegramProvider implements MessageProvider {
  channelType = 'telegram';
  id: string;
  priority: number;
  private botToken: string;

  constructor(id: string, priority: number, config: Record<string, any>) {
    this.id = id;
    this.priority = priority;
    this.botToken = config.botToken || process.env.TELEGRAM_BOT_TOKEN || '';
  }

  async send(payload: MessagePayload): Promise<MessageResponse> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Telegram bot token is missing' };
      }

      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: payload.to,
          text: payload.text,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        return {
          success: true,
          messageId: data.result.message_id.toString(),
          rawResponse: data,
        };
      } else {
        return {
          success: false,
          error: data.description || 'Failed to send Telegram message',
          rawResponse: data,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error while sending Telegram message',
      };
    }
  }
}
