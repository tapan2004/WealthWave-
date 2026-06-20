import pool from '../config/db.js';

// Helper: Get user_id by email
const getUserIdByEmail = async (email) => {
  const [rows] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
  if (rows.length === 0) throw new Error('User not found');
  return rows[0].user_id;
};

// Helper: Get single Category DTO (with aggregated count and sum)
const fetchCategoryDto = async (categoryId, userId) => {
  const [rows] = await pool.query(
    `SELECT 
       c.id, c.name, c.type, c.icon, c.created_at as createdAt, c.updated_at as updatedAt,
       COUNT(t.id) as transactionCount,
       COALESCE(SUM(t.amount), 0) as totalAmount
     FROM categories c
     LEFT JOIN transactions t ON c.id = t.category_id AND t.user_id = ?
     WHERE c.id = ? AND c.user_id = ?
     GROUP BY c.id`,
    [userId, categoryId, userId]
  );
  if (rows.length === 0) return null;
  
  const item = rows[0];
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    icon: item.icon,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    transactionCount: parseInt(item.transactionCount, 10),
    totalAmount: parseFloat(item.totalAmount)
  };
};

// CREATE CATEGORY
export const saveCategory = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);
    const { name, type, icon } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // Check if category name exists for this user
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE name = ? AND user_id = ?',
      [name, userId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    // Save Category
    const [result] = await pool.query(
      `INSERT INTO categories (name, type, icon, user_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [name, type, icon || null, userId]
    );

    // Fetch and return the category as DTO
    const dto = await fetchCategoryDto(result.insertId, userId);
    res.status(201).json(dto);
  } catch (error) {
    next(error);
  }
};

// GET ALL CATEGORIES FOR CURRENT USER
export const getCategories = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    // Optimized aggregated query (replaces transaction count/sum loops)
    const [rows] = await pool.query(
      `SELECT 
         c.id, c.name, c.type, c.icon, c.created_at as createdAt, c.updated_at as updatedAt,
         COUNT(t.id) as transactionCount,
         COALESCE(SUM(t.amount), 0) as totalAmount
       FROM categories c
       LEFT JOIN transactions t ON c.id = t.category_id AND t.user_id = ?
       WHERE c.user_id = ?
       GROUP BY c.id 
       ORDER BY c.name ASC`,
      [userId, userId]
    );

    const dtos = rows.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      icon: item.icon,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      transactionCount: parseInt(item.transactionCount, 10),
      totalAmount: parseFloat(item.totalAmount)
    }));

    res.status(200).json(dtos);
  } catch (error) {
    next(error);
  }
};

// GET CATEGORIES BY TYPE (INCOME/EXPENSE)
export const getCategoriesByType = async (req, res, next) => {
  try {
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);
    const { type } = req.query;

    if (!type) {
      return res.status(400).json({ error: 'Query parameter type is required' });
    }

    const [rows] = await pool.query(
      `SELECT 
         c.id, c.name, c.type, c.icon, c.created_at as createdAt, c.updated_at as updatedAt,
         COUNT(t.id) as transactionCount,
         COALESCE(SUM(t.amount), 0) as totalAmount
       FROM categories c
       LEFT JOIN transactions t ON c.id = t.category_id AND t.user_id = ?
       WHERE c.user_id = ? AND c.type = ?
       GROUP BY c.id 
       ORDER BY c.name ASC`,
      [userId, userId, type]
    );

    const dtos = rows.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      icon: item.icon,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      transactionCount: parseInt(item.transactionCount, 10),
      totalAmount: parseFloat(item.totalAmount)
    }));

    res.status(200).json(dtos);
  } catch (error) {
    next(error);
  }
};

// UPDATE CATEGORY
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);
    const { name, type, icon } = req.body;

    // Check ownership
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Update
    await pool.query(
      `UPDATE categories 
       SET name = ?, type = ?, icon = ?, updated_at = NOW() 
       WHERE id = ? AND user_id = ?`,
      [name, type, icon || null, id, userId]
    );

    const dto = await fetchCategoryDto(id, userId);
    res.status(200).json(dto);
  } catch (error) {
    next(error);
  }
};

// DELETE CATEGORY
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = req.user.email;
    const userId = await getUserIdByEmail(email);

    // Check ownership
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await pool.query('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, userId]);
    res.status(200).send('Category deleted successfully');
  } catch (error) {
    next(error);
  }
};
