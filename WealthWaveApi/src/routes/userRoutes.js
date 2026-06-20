import express from 'express';
import multer from 'multer';
import { signup, login } from '../controllers/authController.js';
import { getCurrentUser, editUser, uploadProfile } from '../controllers/userController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer configuration for temporary file uploads
const upload = multer({ dest: 'uploads/' });

// Public endpoints (no authentication required)
router.post('/signup', signup);
router.post('/login', login);

// Protected endpoints (require authenticateJWT)
router.get('/me', authenticateJWT, getCurrentUser);
router.put('/edit/:email', authenticateJWT, editUser);
router.post('/upload-profile', authenticateJWT, upload.single('file'), uploadProfile);

export default router;
