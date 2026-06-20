import cron from 'node-cron';
import pool from './db.js';
import { sendEmail, sendEmailWithAttachment } from '../services/emailService.js';
import { exportToExcel } from '../services/excelService.js';

/**
 * Initialize daily and monthly cron schedulers on server boot
 */
export const initSchedulers = () => {
  console.log('⏰ Initializing Cron Schedulers...');

  // 1. Daily Reminder (Every day at 9:00 AM)
  cron.schedule('0 9 * * *', async () => {
    console.log('🏃 Running Daily Reminder Scheduler...');
    try {
      const [users] = await pool.query('SELECT email FROM users WHERE active = true');
      for (const user of users) {
        await sendEmail(
          user.email,
          "Daily Finance Reminder",
          "Don't forget to track your income & expenses today 💰"
        );
      }
      console.log('✓ Daily Reminder Completed');
    } catch (error) {
      console.error('⚠️ Daily Reminder Scheduler error:', error.message);
    }
  });

  // 2. Monthly Report Sender (1st of every month at 10:00 AM)
  cron.schedule('0 10 1 * *', async () => {
    console.log('🏃 Starting monthly finance report scheduler...');
    try {
      const [users] = await pool.query('SELECT email FROM users WHERE active = true');
      for (const user of users) {
        try {
          const excelBuffer = await exportToExcel(user.email);
          await sendEmailWithAttachment(
            user.email,
            "Your Monthly Finance Report",
            "Attached is your monthly finance report.",
            excelBuffer,
            "monthly-report.xlsx"
          );
          console.log(`✓ Report sent to ${user.email}`);
        } catch (innerError) {
          console.error(`⚠️ Failed to send monthly report to ${user.email}:`, innerError.message);
        }
      }
      console.log('✓ Monthly report scheduler completed.');
    } catch (error) {
      console.error('⚠️ Monthly Report Scheduler error:', error.message);
    }
  });
};

export default { initSchedulers };
