import express from 'express';
import { verify, resend, forgotPassword, resetPassword } from '../controllers/authController.js';

const router = express.Router();

// Maps /api/auth/verify
router.get('/verify', verify);

// Maps /api/auth/resend
router.post('/resend', resend);

// Maps /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// Maps /api/auth/reset-password
router.post('/reset-password', resetPassword);

export default router;
