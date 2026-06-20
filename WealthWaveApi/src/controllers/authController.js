import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'mySuperSecretKeyForJwtAuthentication123456';
const JWT_EXPIRATION = parseInt(process.env.JWT_EXPIRATION || '6000000', 10);
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:8090';
const APP_FRONTEND_URL = process.env.APP_FRONTEND_URL || 'http://localhost:5173';

// SIGNUP
export const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate activation token
    const activationToken = crypto.randomUUID();
    const activationExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Insert user (active is false by default, user must verify)
    const [userResult] = await pool.query(
      `INSERT INTO users (username, email, password, active, verification_token, verification_expiry, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [username, email, hashedPassword, false, activationToken, activationExpiry]
    );

    const userId = userResult.insertId;

    // Get ROLE_USER ID
    const [roles] = await pool.query('SELECT role_id FROM roles WHERE user_role = ?', ['ROLE_USER']);
    if (roles.length > 0) {
      const roleId = roles[0].role_id;
      // Map user to ROLE_USER
      await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
    }

    // Log the verification link to the console for testing
    const verifyLink = `${APP_BASE_URL}/api/auth/verify?token=${activationToken}`;
    console.log('\n=============================================');
    console.log(`MOCK EMAIL SENT TO: ${email}`);
    console.log(`Verification Link: ${verifyLink}`);
    console.log('=============================================\n');

    res.status(201).json({
      id: userId,
      username,
      email,
      roles: ['ROLE_USER'],
      message: 'Signup successful! Please click the verification link printed in your server console to activate your account.'
    });
  } catch (error) {
    next(error);
  }
};

// LOGIN
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];

    // Check activation
    if (!user.active) {
      return res.status(403).json({ error: 'Account not activated. Please verify your email.' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Get roles
    const [roles] = await pool.query(
      `SELECT r.user_role FROM roles r 
       JOIN user_roles ur ON r.role_id = ur.role_id 
       WHERE ur.user_id = ?`,
      [user.user_id]
    );
    const roleNames = roles.map(r => r.user_role);

    // Generate JWT (matching structure used in React)
    const token = jwt.sign(
      { 
        id: user.user_id, 
        email: user.email, 
        username: user.username,
        roles: roleNames 
      },
      JWT_SECRET,
      { expiresIn: `${JWT_EXPIRATION}ms` }
    );

    // Return the JWT as a string (matching your Spring Boot controller which returns plain text JWT token)
    res.status(200).send(token);
  } catch (error) {
    next(error);
  }
};

// VERIFY
export const verify = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const [users] = await pool.query(
      'SELECT * FROM users WHERE verification_token = ?',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const user = users[0];

    // Check expiry
    if (new Date() > new Date(user.verification_expiry)) {
      return res.status(400).json({ error: 'Token expired' });
    }

    // Activate user
    await pool.query(
      `UPDATE users 
       SET active = true, verification_token = NULL, verification_expiry = NULL, updated_at = NOW() 
       WHERE user_id = ?`,
      [user.user_id]
    );

    res.status(200).send('Account activated successfully');
  } catch (error) {
    next(error);
  }
};

// RESEND VERIFICATION
export const resend = async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    if (user.active) {
      return res.status(200).send('Account already verified');
    }

    // Regenerate token
    const activationToken = crypto.randomUUID();
    const activationExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      `UPDATE users 
       SET verification_token = ?, verification_expiry = ?, updated_at = NOW() 
       WHERE user_id = ?`,
      [activationToken, activationExpiry, user.user_id]
    );

    const verifyLink = `${APP_BASE_URL}/api/auth/verify?token=${activationToken}`;
    console.log('\n=============================================');
    console.log(`MOCK EMAIL RESENT TO: ${email}`);
    console.log(`Verification Link: ${verifyLink}`);
    console.log('=============================================\n');

    res.status(200).send('Verification email resent');
  } catch (error) {
    next(error);
  }
};

// FORGOT PASSWORD
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'No account found with this email address. Please sign up first.' });
    }

    const user = users[0];
    const resetToken = crypto.randomUUID();
    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await pool.query(
      `UPDATE users 
       SET reset_token = ?, reset_token_expiry = ?, updated_at = NOW() 
       WHERE user_id = ?`,
      [resetToken, resetExpiry, user.user_id]
    );

    const resetLink = `${APP_FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log('\n=============================================');
    console.log(`MOCK PASSWORD RESET EMAIL TO: ${email}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log('=============================================\n');

    res.status(200).send('Password reset link sent to your email');
  } catch (error) {
    next(error);
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.query;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and newPassword are required' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE reset_token = ?', [token]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = users[0];

    if (new Date() > new Date(user.reset_token_expiry)) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users 
       SET password = ?, reset_token = NULL, reset_token_expiry = NULL, updated_at = NOW() 
       WHERE user_id = ?`,
      [hashedPassword, user.user_id]
    );

    res.status(200).send('Password has been successfully reset');
  } catch (error) {
    next(error);
  }
};
