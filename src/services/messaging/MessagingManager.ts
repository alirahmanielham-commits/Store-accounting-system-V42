import { MessagePayload, MessageResponse, MessageProvider } from './MessageProvider';
import { InternetSmsProvider } from './providers/InternetSmsProvider';
import { TelegramProvider } from './providers/TelegramProvider';
import { WhatsAppProvider } from './providers/WhatsAppProvider';
import { GsmModemProvider } from './providers/GsmModemProvider';

export class MessagingManager {
  private providers: MessageProvider[] = [];

  constructor() {
    // Providers will be loaded via loadProviders() from DB
  }

  /**
   * Initializes providers from the database configuration
   */
  async loadProviders(dbConfigurations: any[]) {
    this.providers = [];

    for (const config of dbConfigurations) {
      if (!config.isEnabled) continue;

      let provider: MessageProvider | null = null;
      
      try {
        const parsedConfig = typeof config.config === 'string' ? JSON.parse(config.config) : (config.config || {});
        
        switch (config.type) {
          case 'sms_panel':
            provider = new InternetSmsProvider(config.id, config.priority, parsedConfig);
            break;
          case 'telegram':
            provider = new TelegramProvider(config.id, config.priority, parsedConfig);
            break;
          case 'whatsapp':
            provider = new WhatsAppProvider(config.id, config.priority, parsedConfig);
            break;
          case 'gsm':
            provider = new GsmModemProvider(config.id, config.priority, parsedConfig);
            break;
        }

        if (provider) {
          this.providers.push(provider);
        }
      } catch (err) {
        console.error(`Failed to load messaging provider config for ${config.name}`, err);
      }
    }

    // Sort providers by highest priority first (higher number = higher priority, or lower number = higher priority)
    // Let's assume lower number = higher priority (e.g., Priority 1 is first)
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Send a message utilizing the fallback logic.
   * Logs everything and returns the final response.
   */
  async sendMessage(payload: MessagePayload): Promise<MessageResponse> {
    if (this.providers.length === 0) {
      return { success: false, error: 'No messaging providers configured or enabled' };
    }

    let lastError: string = '';
    const triedChannels: string[] = [];

    for (const provider of this.providers) {
      // If a specific type is requested and this provider doesn't match, skip if possible.
      // But if we want fallback across types (e.g., try WhatsApp, if fail, try SMS), we proceed.
      if (payload.type && provider.channelType !== payload.type && this.providers.some(p => p.channelType === payload.type)) {
          // If payload requested a specific type AND we have a provider for it, skip the others unless it's a fallback situation.
          // To keep it simple: we try all providers in priority order, but we can prioritize the requested type.
          // Actually, let's just stick to straight priority based fallback.
      }

      console.log(`[MessagingManager] Attempting to send via ${provider.channelType} (Priority: ${provider.priority})`);
      
      const response = await provider.send(payload);
      triedChannels.push(provider.channelType);

      if (response.success) {
        // Log success to DB here
        await this.logMessage(provider.id, payload, 'sent', null, response.messageId);
        return {
          ...response,
          metadata: { triedChannels }
        };
      } else {
        lastError = response.error || 'Unknown error';
        console.warn(`[MessagingManager] Failed via ${provider.channelType}: ${lastError}. Trying next...`);
        // We log the failure but continue the loop
        await this.logMessage(provider.id, payload, 'failed', lastError);
      }
    }

    // If we exhaust all providers
    return {
      success: false,
      error: `All providers failed. Last error: ${lastError}`,
      metadata: { triedChannels }
    };
  }

  /**
   * Stub for logging to database
   */
  private async logMessage(channelId: string, payload: MessagePayload, status: string, error: string | null = null, messageId?: string) {
    // In a real application, you would import the Drizzle DB instance and insert into messageLogs table
    console.log(`[DB LOG] Status: ${status} | Channel: ${channelId} | To: ${payload.to} | Error: ${error}`);
    // Example Drizzle Insert:
    // await db.insert(messageLogs).values({
    //   id: generateId(),
    //   channelId,
    //   recipient: payload.to,
    //   content: payload.text,
    //   status,
    //   error,
    //   messageId
    // });
  }
}

// Export a singleton instance
export const messagingManager = new MessagingManager();
