import pool from '../config/db.js';
import { predictCategory } from '../services/aiService.js';
import { exportToExcel } from '../services/excelService.js';
import { sendEmail, sendEmailWithAttachment } from '../services/emailService.js';

// Helper: Get user_id by email
const getUserIdByEmail = async (email) => {
  const [rows] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
  if (rows.length === 0) throw new Error('User not found');
  return rows[0].user_id;
};

// Fraud Detection Logic: Check if expense is 3x the user's average expense
const detectFraud = async (userId, amount) => {
  const [rows] = await pool.query(
    "SELECT AVG(amount) as avgExpense FROM transactions WHERE user_id = ? AND type = 'EXPENSE'",
    [userId]
  );
  const avgExpense = parseFloat(rows[0].avgExpense);
  if (!avgExpense) return false;
  return amount > avgExpense * 3;
};

// Fraud Alert Email Sender
const sendFraudAlert = async (email, title, amount) => {
  const message = `Suspicious transaction detected\n\nTitle: ${title}\nAmount: ${amount}\nDate: ${new Date().toLocaleString()}`;
  await sendEmail(email, "Suspicious Transaction Alert", message);
};

// Budget Expiry & Limit Checker (replicates checkBudget in Java)
const checkBudgetLimit = async (userId, categoryId, email) => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  const year = now.getFullYear();

  // Find Budget
  const [budgets] = await pool.query(
    'SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?',
    [userId, categoryId, month, year]
  );
  if (budgets.length === 0) return;

  const budget = budgets[0];
  const limitAmount = parseFloat(budget.limit_amount);

  // Sum category expense for this month
  const [expenseRows] = await pool.query(
    `SELECT SUM(amount) as total 
     FROM transactions 
     WHERE user_id = ? AND category_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ? AND type = 'EXPENSE'`,
    [userId, categoryId, month, year]
  );

  const totalExpense = parseFloat(expenseRows[0].total || '0');
  const percentUsed = (totalExpense / limitAmount) * 100;

  // Get category name
  const [catRows] = await pool.query('SELECT name FROM categories WHERE id = ?', [categoryId]);
  const categoryName = catRows.length > 0 ? catRows[0].name : 'Category';

  // 80% ALERT
  if (percentUsed >= 80 && percentUsed < 90) {
    await sendEmail(
      email,
      "Budget Warning (80%)",
      `You have used ${percentUsed.toFixed(1)}% of your ${categoryName} budget.`
    );
  }

  // 90% ALERT
  if (percentUsed >= 90 && percentUsed < 100) {
    await sendEmail(
      email,
      "Budget Critical (90%)",
      `You have used ${percentUsed.toFixed(1)}% of your ${categoryName} budget.`
    );
  }

  // BUDGET EXCEEDED
  if (percentUsed >= 100) {
    await sendEmail(
      email,
      "Budget Exceeded",
      `You exceeded your budget for category: ${categoryName}`
    );
  }
};

// CREATE TRANSACTION
export const createTransaction = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);
    let { title, amount, type, note, categoryId } = req.body;

    if (!title || !amount || !type) {
      return res.status(400).json({ error: 'Title, amount, and type are required' });
    }

    // AI Prediction: If no categoryId is provided, predict using the rules
    if (!categoryId) {
      const predictedName = predictCategory(title);
      // Check if category already exists for user
      const [existingCat] = await pool.query(
        'SELECT id FROM categories WHERE name = ? AND user_id = ?',
        [predictedName, userId]
      );

      if (existingCat.length > 0) {
        categoryId = existingCat[0].id;
      } else {
        // Create new predicted category
        const [newCat] = await pool.query(
          `INSERT INTO categories (name, type, user_id, created_at, updated_at) 
           VALUES (?, 'EXPENSE', ?, NOW(), NOW())`,
          [predictedName, userId]
        );
        categoryId = newCat.insertId;
      }
    }

    // Detect suspicious transaction (fraud check)
    const suspicious = type === 'EXPENSE' ? await detectFraud(userId, amount) : false;

    // Insert transaction
    const [result] = await pool.query(
      `INSERT INTO transactions (title, amount, type, note, category_id, user_id, suspicious, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [title, amount, type, note || null, categoryId, userId, suspicious]
    );

    // If fraudulent, send alert immediately
    if (suspicious) {
      await sendFraudAlert(email, title, amount);
    }

    // Check budget limits for expenses
    if (type === 'EXPENSE') {
      await checkBudgetLimit(userId, categoryId, email);
    }

    // Fetch and return transaction DTO
    const [rows] = await pool.query(
      `SELECT t.id, t.title, t.amount, t.type, t.note, t.category_id as categoryId, c.name as categoryName 
       FROM transactions t 
       JOIN categories c ON t.category_id = c.id 
       WHERE t.id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

// GET PAGINATED TRANSACTIONS
export const getTransactions = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    const page = parseInt(req.query.page || '0', 10);
    const size = parseInt(req.query.size || '10', 10);
    const offset = page * size;

    const [content] = await pool.query(
      `SELECT t.id, t.title, t.amount, t.type, t.note, t.category_id as categoryId, c.name as categoryName, t.created_at as createdAt 
       FROM transactions t 
       JOIN categories c ON t.category_id = c.id 
       WHERE t.user_id = ? 
       ORDER BY t.created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, size, offset]
    );

    const [countRows] = await pool.query(
      'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?',
      [userId]
    );
    const totalElements = countRows[0].total;
    const totalPages = Math.ceil(totalElements / size);

    res.status(200).json({
      content: content.map(item => ({
        id: item.id,
        title: item.title,
        amount: parseFloat(item.amount),
        type: item.type,
        note: item.note,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        createdAt: item.createdAt
      })),
      totalElements,
      totalPages,
      pageNumber: page,
      pageSize: size
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE TRANSACTION
export const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);
    const { title, amount, type, note, categoryId } = req.body;

    const [existing] = await pool.query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    }

    await pool.query(
      `UPDATE transactions 
       SET title = ?, amount = ?, type = ?, note = ?, category_id = ? 
       WHERE id = ? AND user_id = ?`,
      [title, amount, type, note || null, categoryId, id, userId]
    );

    const [rows] = await pool.query(
      `SELECT t.id, t.title, t.amount, t.type, t.note, t.category_id as categoryId, c.name as categoryName 
       FROM transactions t 
       JOIN categories c ON t.category_id = c.id 
       WHERE t.id = ?`,
      [id]
    );

    res.status(200).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

// DELETE TRANSACTION
export const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    const [existing] = await pool.query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    }

    await pool.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
    res.status(200).send('Transaction deleted successfully');
  } catch (error) {
    next(error);
  }
};

// RECENT TRANSACTIONS
export const getRecentTransactions = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    const [rows] = await pool.query(
      `SELECT t.id, t.title, t.amount, t.type, t.note, t.category_id as categoryId, c.name as categoryName 
       FROM transactions t 
       JOIN categories c ON t.category_id = c.id 
       WHERE t.user_id = ? 
       ORDER BY t.created_at DESC 
       LIMIT 5`,
      [userId]
    );

    res.status(200).json(rows.map(r => ({ ...r, amount: parseFloat(r.amount) })));
  } catch (error) {
    next(error);
  }
};

// FINANCE SUMMARY
export const getSummary = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    const [rows] = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as totalIncome,
         COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as totalExpense
       FROM transactions 
       WHERE user_id = ?`,
      [userId]
    );

    const { totalIncome, totalExpense } = rows[0];
    const balance = totalIncome - totalExpense;

    res.status(200).json({
      totalIncome: parseFloat(totalIncome),
      totalExpense: parseFloat(totalExpense),
      balance: parseFloat(balance)
    });
  } catch (error) {
    next(error);
  }
};

// EXPORT TO EXCEL SPREADSHEET
export const exportExcel = async (req, res, next) => {
  try {
    const email = req.user.email;
    const excelBuffer = await exportToExcel(email);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');
    res.status(200).send(excelBuffer);
  } catch (error) {
    next(error);
  }
};

// SEND TRANSACTION REPORT BY EMAIL
export const sendReport = async (req, res, next) => {
  try {
    const email = req.user.email;
    const excelBuffer = await exportToExcel(email);

    await sendEmailWithAttachment(
      email,
      "Your Finance Report",
      "Please find attached your transaction report.",
      excelBuffer,
      "transactions.xlsx"
    );

    res.status(200).send('Report sent to email successfully');
  } catch (error) {
    next(error);
  }
};

// FINANCIAL ANALYTICS
export const getAnalytics = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    // Get totals
    const [totals] = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
         COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
       FROM transactions WHERE user_id = ?`,
      [userId]
    );
    const income = parseFloat(totals[0].income);
    const expense = parseFloat(totals[0].expense);

    // Get top category
    const [topCatRows] = await pool.query(
      `SELECT c.name, SUM(t.amount) as total 
       FROM transactions t 
       JOIN categories c ON t.category_id = c.id 
       WHERE t.user_id = ? AND t.type = 'EXPENSE' 
       GROUP BY c.id 
       ORDER BY total DESC 
       LIMIT 1`,
      [userId]
    );
    const topExpenseCategory = topCatRows.length > 0 ? topCatRows[0].name : 'N/A';

    // Get monthly totals to calculate monthly average expense
    const [monthlyTotals] = await pool.query(
      `SELECT SUM(amount) as total 
       FROM transactions 
       WHERE user_id = ? AND type = 'EXPENSE' 
       GROUP BY YEAR(created_at), MONTH(created_at)`,
      [userId]
    );
    
    let monthlyAverageExpense = 0;
    if (monthlyTotals.length > 0) {
      const sum = monthlyTotals.reduce((acc, curr) => acc + parseFloat(curr.total), 0);
      monthlyAverageExpense = sum / monthlyTotals.length;
    }

    res.status(200).json({
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      topExpenseCategory,
      monthlyAverageExpense
    });
  } catch (error) {
    next(error);
  }
};

// EXPENSE PREDICTION
export const predictExpense = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    // Query monthly averages
    const [rows] = await pool.query(
      `SELECT SUM(amount) as total 
       FROM transactions 
       WHERE user_id = ? AND type = 'EXPENSE' 
       GROUP BY YEAR(created_at), MONTH(created_at)`,
      [userId]
    );

    let predictedNextMonthExpense = 0;
    if (rows.length > 0) {
      const sum = rows.reduce((acc, curr) => acc + parseFloat(curr.total), 0);
      predictedNextMonthExpense = sum / rows.length;
    }

    res.status(200).json({ predictedNextMonthExpense });
  } catch (error) {
    next(error);
  }
};

// GET SUSPICIOUS TRANSACTIONS
export const getSuspiciousTransactions = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    const [rows] = await pool.query(
      `SELECT t.id, t.title, t.amount, t.type, t.note, t.category_id as categoryId, c.name as categoryName 
       FROM transactions t 
       JOIN categories c ON t.category_id = c.id 
       WHERE t.user_id = ? AND t.suspicious = true`,
      [userId]
    );

    res.status(200).json(rows.map(r => ({ ...r, amount: parseFloat(r.amount) })));
  } catch (error) {
    next(error);
  }
};

// DAILY SPENDING HEATMAP
export const getDailySpending = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    // Select date and sum of expenses grouped by date
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, SUM(amount) as amount 
       FROM transactions 
       WHERE user_id = ? AND type = 'EXPENSE' 
       GROUP BY DATE(created_at) 
       ORDER BY date ASC`,
      [userId]
    );

    res.status(200).json(rows.map(r => ({ date: r.date, amount: parseFloat(r.amount) })));
  } catch (error) {
    next(error);
  }
};

// FINANCIAL HEALTH SCORE
export const getHealthScore = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    // Get total income & expenses
    const [totals] = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
         COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
       FROM transactions WHERE user_id = ?`,
      [userId]
    );
    const income = parseFloat(totals[0].income);
    const expense = parseFloat(totals[0].expense);

    // 1. Savings Rate Score (0-250)
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    const savingsScore = Math.min(250, Math.max(0, savingsRate * 5));

    // 2. Budget Adherence Score (0-250)
    const [budgets] = await pool.query('SELECT * FROM budgets WHERE user_id = ?', [userId]);
    let budgetScore = 250;
    if (budgets.length > 0) {
      let withinBudget = 0;
      for (const b of budgets) {
        const [spentRows] = await pool.query(
          `SELECT SUM(amount) as total 
           FROM transactions 
           WHERE user_id = ? AND category_id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ? AND type = 'EXPENSE'`,
          [userId, b.category_id, b.month, b.year]
        );
        const spent = parseFloat(spentRows[0].total || '0');
        if (spent <= parseFloat(b.limit_amount)) {
          withinBudget++;
        }
      }
      budgetScore = (withinBudget / budgets.length) * 250;
    }

    // 3. Spending Consistency (0-200)
    const [monthlyTotals] = await pool.query(
      `SELECT SUM(amount) as total 
       FROM transactions 
       WHERE user_id = ? AND type = 'EXPENSE' 
       GROUP BY YEAR(created_at), MONTH(created_at)`,
      [userId]
    );
    let consistencyScore = 200;
    if (monthlyTotals.length >= 2) {
      const totalsList = monthlyTotals.map(t => parseFloat(t.total));
      const avg = totalsList.reduce((a, b) => a + b, 0) / totalsList.length;
      const variance = totalsList.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / totalsList.length;
      const stdDev = Math.sqrt(variance);
      const cv = avg > 0 ? (stdDev / avg) * 100 : 0;
      consistencyScore = Math.max(0, 200 - cv * 2);
    }

    // 4. Activity Score (0-150)
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?', [userId]);
    const activityScore = Math.min(150, countRows[0].count * 5.0);

    const totalScore = Math.min(850, savingsScore + budgetScore + consistencyScore + activityScore);

    let grade = 'Critical';
    if (totalScore >= 750) grade = "Excellent";
    else if (totalScore >= 600) grade = "Good";
    else if (totalScore >= 400) grade = "Fair";
    else if (totalScore >= 200) grade = "Needs Work";

    res.status(200).json({
      score: Math.round(totalScore),
      grade,
      maxScore: 850,
      savingsScore: Math.round(savingsScore),
      budgetScore: Math.round(budgetScore),
      consistencyScore: Math.round(consistencyScore),
      activityScore: Math.round(activityScore),
      savingsRate: Math.round(savingsRate)
    });
  } catch (error) {
    next(error);
  }
};
