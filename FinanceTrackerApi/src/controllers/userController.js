import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

// GET CURRENT USER PROFILE (GET /api/me)
export const getCurrentUser = async (req, res, next) => {
  try {
    const email = req.user.email;

    // Fetch user details
    const [users] = await pool.query(
      `SELECT user_id as id, username, email, profile_image_url as profileImageUrl, created_at as createdAt, updated_at as updatedAt 
       FROM users WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Fetch user roles
    const [roles] = await pool.query(
      `SELECT r.user_role FROM roles r 
       JOIN user_roles ur ON r.role_id = ur.role_id 
       WHERE ur.user_id = ?`,
      [user.id]
    );
    user.roles = roles.map(r => r.user_role);

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// EDIT USER (PUT /api/edit/:email)
// Replicates Spring Boot's: @PreAuthorize("#email == authentication.name or hasRole('ADMIN')")
export const editUser = async (req, res, next) => {
  try {
    const { email } = req.params;
    const { username, password, role } = req.body;
    const authUser = req.user;

    // PreAuthorize check: user must edit their own profile or be an admin
    const isAdmin = authUser.roles && authUser.roles.includes('ROLE_ADMIN');
    if (authUser.email !== email && !isAdmin) {
      return res.status(403).json({ error: 'Access Denied: You can only edit your own profile' });
    }

    // Fetch existing user to update
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingUser = users[0];
    let updateFields = [];
    let updateValues = [];

    if (username) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');
      updateValues.push(existingUser.user_id); // for WHERE clause

      await pool.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`,
        updateValues
      );
    }

    // Role update (if requested and user is ADMIN)
    if (role && isAdmin) {
      const [roleRows] = await pool.query('SELECT role_id FROM roles WHERE user_role = ?', [role]);
      if (roleRows.length > 0) {
        const roleId = roleRows[0].role_id;
        // Delete old roles and assign new role
        await pool.query('DELETE FROM user_roles WHERE user_id = ?', [existingUser.user_id]);
        await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [existingUser.user_id, roleId]);
      }
    }

    res.status(200).send('User updated successfully');
  } catch (error) {
    next(error);
  }
};

// UPLOAD PROFILE IMAGE (POST /api/upload-profile)
export const uploadProfile = async (req, res, next) => {
  try {
    const email = req.user.email;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Mock upload: Save local file path or connect Cloudinary
    // If you want to use Cloudinary, you would use:
    // const result = await cloudinary.uploader.upload(req.file.path);
    // const imageUrl = result.secure_url;
    
    // For now, let's return the local relative file path
    const imageUrl = `/uploads/${req.file.filename}`;

    await pool.query(
      'UPDATE users SET profile_image_url = ?, updated_at = NOW() WHERE email = ?',
      [imageUrl, email]
    );

    res.status(200).send(imageUrl);
  } catch (error) {
    next(error);
  }
};
