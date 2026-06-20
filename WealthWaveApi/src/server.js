import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import { initSchedulers } from './config/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8090;

// Standard Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount Routes
app.use('/api', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);

// Root endpoint: Health check (like Spring Boot Actuator)
app.get('/', async (req, res) => {
  try {
    // Verify DB connectivity
    await pool.query('SELECT 1');
    res.json({
      status: 'UP',
      message: 'FinanceTracker Node API is running successfully!',
      database: 'CONNECTED'
    });
  } catch (error) {
    res.status(500).json({
      status: 'DOWN',
      message: 'FinanceTracker Node API is running, but MySQL connection failed.',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'ERROR',
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log('Database Connected successfully!');
    // Initialize cron jobs
    initSchedulers();
  } catch (error) {
    console.log('Database Connection Failed:', error.message || error);
  }
});
export default app;
