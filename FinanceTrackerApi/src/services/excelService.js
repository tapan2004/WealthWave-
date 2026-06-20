import XLSX from 'xlsx';
import pool from '../config/db.js';

/**
 * Generate Excel buffer of all user transactions
 * @param {string} email - User email
 * @returns {Promise<Buffer>} Spreadsheet binary buffer
 */
export const exportToExcel = async (email) => {
  // Fetch user_id from DB
  const [userRows] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
  if (userRows.length === 0) {
    throw new Error('User not found');
  }
  const userId = userRows[0].user_id;

  // Query transactions matching database schema
  const [transactions] = await pool.query(
    `SELECT t.title, t.amount, t.type, c.name as categoryName, t.note, t.created_at as createdAt 
     FROM transactions t 
     LEFT JOIN categories c ON t.category_id = c.id 
     WHERE t.user_id = ? 
     ORDER BY t.created_at DESC`,
    [userId]
  );

  // Map to column headers
  const rows = transactions.map(t => ({
    'Title': t.title || '',
    'Amount': t.amount || 0,
    'Type': t.type || 'UNKNOWN',
    'Category': t.categoryName || 'Uncategorized',
    'Note': t.note || '',
    'Date': t.createdAt ? new Date(t.createdAt).toLocaleString() : ''
  }));

  // Convert JSON to Worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns (replicates sheet.autoSizeColumn)
  const colWidths = [
    { wch: 25 }, // Title
    { wch: 12 }, // Amount
    { wch: 10 }, // Type
    { wch: 18 }, // Category
    { wch: 30 }, // Note
    { wch: 22 }  // Date
  ];
  worksheet['!cols'] = colWidths;

  // Create Workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

  // Output as binary spreadsheet buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return excelBuffer;
};

export default { exportToExcel };
