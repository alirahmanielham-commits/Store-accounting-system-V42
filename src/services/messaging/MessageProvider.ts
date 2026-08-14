export interface MessagePayload {
  to: string;
  text: string;
  type?: 'sms' | 'whatsapp' | 'telegram'; // Hint for the manager to select appropriate channel
  metadata?: Record<string, any>;
}

export interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  rawResponse?: any;
  metadata?: any;
}

export interface MessageProvider {
  channelType: string;
  id: string; // The channel ID
  priority: number;
  send(payload: MessagePayload): Promise<MessageResponse>;
}
