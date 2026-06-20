import pool from '../config/db.js';

// Helper: Get user_id by email
const getUserIdByEmail = async (email) => {
  const [rows] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
  if (rows.length === 0) throw new Error('User not found');
  return rows[0].user_id;
};

// CREATE BUDGET
export const createBudget = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);
    const { limitAmount, month, year, categoryId } = req.body;

    if (!limitAmount || !month || !year || !categoryId) {
      return res.status(400).json({ error: 'limitAmount, month, year, and categoryId are required' });
    }

    // Check unique constraint: one budget per user, category, and month
    const [existing] = await pool.query(
      'SELECT id FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?',
      [userId, categoryId, month, year]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'A budget already exists for this category and month' });
    }

    // Save Budget (mapping CamelCase limitAmount to snake_case column limit_amount)
    const [result] = await pool.query(
      `INSERT INTO budgets (limit_amount, month, year, category_id, user_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [limitAmount, month, year, categoryId, userId]
    );

    // Fetch and return created budget details
    const [rows] = await pool.query(
      `SELECT b.id, b.limit_amount as limitAmount, b.month, b.year, b.category_id as categoryId, c.name as categoryName 
       FROM budgets b 
       JOIN categories c ON b.category_id = c.id 
       WHERE b.id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

// GET USER BUDGETS
export const getBudgets = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    const [rows] = await pool.query(
      `SELECT b.id, b.limit_amount as limitAmount, b.month, b.year, b.category_id as categoryId, c.name as categoryName 
       FROM budgets b 
       JOIN categories c ON b.category_id = c.id 
       WHERE b.user_id = ?`,
      [userId]
    );

    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

// CHECK BUDGET STATUS (LIMITS vs SPENT)
export const checkBudgets = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    // Perform query with subquery to aggregate expenses
    const [rows] = await pool.query(
      `SELECT 
         b.id,
         b.category_id as categoryId,
         c.name as category,
         b.limit_amount as budget,
         b.month,
         b.year,
         COALESCE(
           (SELECT SUM(t.amount) 
            FROM transactions t 
            WHERE t.user_id = b.user_id 
              AND t.category_id = b.category_id 
              AND MONTH(t.created_at) = b.month 
              AND YEAR(t.created_at) = b.year 
              AND t.type = 'EXPENSE'
           ), 0
         ) as spent
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ?`,
      [userId]
    );

    const results = rows.map(item => ({
      id: item.id,
      categoryId: item.categoryId,
      category: item.category,
      budget: parseFloat(item.budget),
      month: item.month,
      year: item.year,
      spent: parseFloat(item.spent),
      remaining: parseFloat(item.budget) - parseFloat(item.spent)
    }));

    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
};

// UPDATE BUDGET
export const updateBudget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);
    const { limitAmount } = req.body;

    if (limitAmount === undefined) {
      return res.status(400).json({ error: 'limitAmount is required' });
    }

    // Check ownership
    const [existing] = await pool.query(
      'SELECT id FROM budgets WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Budget not found or unauthorized' });
    }

    // Update
    await pool.query(
      'UPDATE budgets SET limit_amount = ? WHERE id = ? AND user_id = ?',
      [limitAmount, id, userId]
    );

    // Fetch and return the updated budget details
    const [rows] = await pool.query(
      `SELECT b.id, b.limit_amount as limitAmount, b.month, b.year, b.category_id as categoryId, c.name as categoryName 
       FROM budgets b 
       JOIN categories c ON b.category_id = c.id 
       WHERE b.id = ?`,
      [id]
    );

    res.status(200).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

// DELETE BUDGET
export const deleteBudget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    // Check ownership
    const [existing] = await pool.query(
      'SELECT id FROM budgets WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Budget not found or unauthorized' });
    }

    await pool.query('DELETE FROM budgets WHERE id = ? AND user_id = ?', [id, userId]);
    res.status(200).send('Budget deleted successfully');
  } catch (error) {
    next(error);
  }
};
