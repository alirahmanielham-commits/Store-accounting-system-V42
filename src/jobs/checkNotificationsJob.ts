import cron from 'node-cron';
import { db } from '../db';
import { issuedChecks, receivedChecks, notifications } from '../db/schema';
import { sendEmail } from '../services/emailService';
import { and, eq, isNull, sql } from 'drizzle-orm';

// Configuration: Days before due date to notify
const NOTIFICATION_DAYS = 3;

export const startCronJobs = () => {
  // Run every day at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily check notification job...');
    await processCheckNotifications();
  });
  
  // Also run immediately on startup for testing if needed
  // setTimeout(processCheckNotifications, 5000);
};

const processCheckNotifications = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + NOTIFICATION_DAYS);
    const targetDateString = targetDate.toISOString().split('T')[0];

    // 1. Process Issued Checks
    const dueIssuedChecks = await db.select().from(issuedChecks).where(
      and(
        eq(issuedChecks.status, 'issued'),
        isNull(issuedChecks.deletedAt)
      )
    );

    for (const check of dueIssuedChecks) {
      if (check.dueDate) {
         const checkDue = new Date(check.dueDate).toISOString().split('T')[0];
         if (checkDue === targetDateString || checkDue < targetDateString) {
            // Check if we already notified for this recently to avoid duplicates?
            // For simplicity, we just notify if it matches the criteria. In a real app we'd add a flag 'isNotified'.
            await createNotification(
              `یادآوری سررسید چک پرداختی`,
              `چک پرداختی شماره ${check.checkNumber} به مبلغ ${Number(check.amount).toLocaleString()} تومان، در تاریخ ${new Date(check.dueDate).toLocaleDateString('fa-IR')} سررسید می‌شود.`
            );
         }
      }
    }

    // 2. Process Received Checks
    const dueReceivedChecks = await db.select().from(receivedChecks).where(
      and(
        isNull(receivedChecks.deletedAt)
      )
    );

    for (const check of dueReceivedChecks) {
      if ((check.status === 'received' || check.status === 'deposited') && check.dueDate) {
         const checkDue = new Date(check.dueDate).toISOString().split('T')[0];
         if (checkDue === targetDateString || checkDue < targetDateString) {
            await createNotification(
              `یادآوری سررسید چک دریافتی`,
              `چک دریافتی شماره ${check.checkNumber} به مبلغ ${Number(check.amount).toLocaleString()} تومان، در تاریخ ${new Date(check.dueDate).toLocaleDateString('fa-IR')} سررسید می‌شود.`
            );
         }
      }
    }

  } catch (error) {
    console.error('Error in processCheckNotifications:', error);
  }
};

const createNotification = async (title: string, message: string) => {
  try {
    // Basic duplication check: don't create if identical message exists from the last 24h
    const existing = await db.select().from(notifications).where(
      and(
        eq(notifications.message, message)
      )
    );
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentDupe = existing.find(n => n.createdAt && new Date(n.createdAt) > yesterday);
    
    if (recentDupe) {
      return; // Skip duplicate
    }
  } catch (err) {
    console.error('Error checking for duplicate notification:', err);
  }

  try {
    const id = Math.random().toString(36).substring(2, 15);
    await db.insert(notifications).values({
      id,
      title,
      message,
      type: 'warning',
    });
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    await sendEmail(adminEmail, title, message);
  } catch(e) {
     console.error('Error creating notification:', e);
  }
};
