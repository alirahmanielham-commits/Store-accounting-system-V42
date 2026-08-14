import { lt } from 'drizzle-orm';
import { db } from '../../db';
import { smsDeliveryLogs, smsRetryLogs, smsMessages, smsAuditLogs } from '../../db/schema';

export class MessagingDataMaintenance {
  /**
   * Cleans up old delivery and retry logs to prevent the database from growing indefinitely.
   * This logic should be scheduled to run periodically (e.g., via node-cron or a serverless function).
   * 
   * @param daysToKeepLogs Number of days to keep transactional logs (default: 90 days)
   * @param daysToKeepMessages Number of days to keep full message history (default: 365 days)
   */
  static async pruneOldData(daysToKeepLogs: number = 90, daysToKeepMessages: number = 365) {
    const logCutoffDate = new Date();
    logCutoffDate.setDate(logCutoffDate.getDate() - daysToKeepLogs);

    const messageCutoffDate = new Date();
    messageCutoffDate.setDate(messageCutoffDate.getDate() - daysToKeepMessages);

    console.log(`[Messaging Maintenance] Starting data pruning...`);

    try {
      // 1. Prune Delivery Logs
      const deliveryDeleted = await db.delete(smsDeliveryLogs)
        .where(lt(smsDeliveryLogs.receivedAt, logCutoffDate))
        .returning({ id: smsDeliveryLogs.id });
        
      console.log(`[Messaging Maintenance] Pruned ${deliveryDeleted.length} old delivery logs.`);

      // 2. Prune Retry Logs
      const retriesDeleted = await db.delete(smsRetryLogs)
        .where(lt(smsRetryLogs.createdAt, logCutoffDate))
        .returning({ id: smsRetryLogs.id });

      console.log(`[Messaging Maintenance] Pruned ${retriesDeleted.length} old retry logs.`);

      // 3. Prune Audit Logs (keep longer than transactional logs, e.g. 180 days)
      const auditCutoffDate = new Date();
      auditCutoffDate.setDate(auditCutoffDate.getDate() - 180);
      
      const auditDeleted = await db.delete(smsAuditLogs)
        .where(lt(smsAuditLogs.createdAt, auditCutoffDate))
        .returning({ id: smsAuditLogs.id });
        
      console.log(`[Messaging Maintenance] Pruned ${auditDeleted.length} old audit logs.`);

      // 4. Archive or Prune Old SMS Messages
      // Note: In a real system, you might want to soft-delete or export to cold storage first.
      const messagesDeleted = await db.delete(smsMessages)
        .where(lt(smsMessages.createdAt, messageCutoffDate))
        .returning({ id: smsMessages.id });
        
      console.log(`[Messaging Maintenance] Pruned ${messagesDeleted.length} old messages.`);
      
    } catch (error) {
      console.error('[Messaging Maintenance] Failed to prune old messaging data:', error);
      throw error;
    }
  }
}
