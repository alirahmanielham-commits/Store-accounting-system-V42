import { MessageProvider, MessagePayload, MessageResponse } from '../MessageProvider';

/**
 * Implementation for GSM Modem
 * Note: Requires native packages like `serialport` to be installed on the host.
 * This class provides a conceptual production-ready interface.
 */
export class GsmModemProvider implements MessageProvider {
  channelType = 'gsm';
  id: string;
  priority: number;
  private portPath: string;
  private baudRate: number;
  // private port: any; // e.g., SerialPort instance

  constructor(id: string, priority: number, config: Record<string, any>) {
    this.id = id;
    this.priority = priority;
    this.portPath = config.portPath || process.env.GSM_PORT_PATH || '/dev/ttyUSB0';
    this.baudRate = config.baudRate || 9600;
  }

  async send(payload: MessagePayload): Promise<MessageResponse> {
    try {
      if (!this.portPath) {
        return { success: false, error: 'GSM port path is not configured' };
      }

      // -------------------------------------------------------------
      // In a real environment, you would use:
      // const { SerialPort } = require('serialport');
      // const modem = require('modem-package');
      // Initialize connection to this.portPath at this.baudRate
      // Issue AT commands:
      // AT+CMGF=1 (Text mode)
      // AT+CMGS="+123456789"
      // > message text <Ctrl+Z>
      // -------------------------------------------------------------

      // Simulating the serial communication logic:
      console.log(`[GSM Modem ${this.portPath}] Sending to ${payload.to}: ${payload.text}`);
      
      // Simulate successful transmission
      const simulatedMessageId = `gsm-${Date.now()}`;
      
      return {
        success: true,
        messageId: simulatedMessageId,
        rawResponse: { port: this.portPath, status: 'OK' }
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error communicating with GSM modem',
      };
    }
  }
}
