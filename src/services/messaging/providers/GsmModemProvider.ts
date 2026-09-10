import { MessageProvider, MessagePayload, MessageResponse } from '../MessageProvider';
import { gsmUsbService } from '../GsmUsbService';

/**
 * Implementation for GSM Modem
 * Connects directly with USB GSM Dongles via Web Serial and GsmUsbService.
 */
export class GsmModemProvider implements MessageProvider {
  channelType = 'gsm';
  id: string;
  priority: number;
  private portPath: string;
  private baudRate: number;

  constructor(id: string, priority: number, config: Record<string, any>) {
    this.id = id;
    this.priority = priority;
    this.portPath = config.portPath || config.port || '/dev/ttyUSB0';
    this.baudRate = Number(config.baudRate) || 115200;
  }

  async send(payload: MessagePayload): Promise<MessageResponse> {
    try {
      // Direct call to gsmUsbService
      const result = await gsmUsbService.sendSms(payload.to, payload.text);
      if (result.success) {
        return {
          success: true,
          messageId: result.messageId,
          rawResponse: {
            port: this.portPath,
            status: 'OK',
            timestamp: result.timestamp,
            parts: result.partsCount
          }
        };
      } else {
        return {
          success: false,
          error: result.error || 'خطا در ارسال پیامک از طریق مودم GSM'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error communicating with GSM modem',
      };
    }
  }
}

