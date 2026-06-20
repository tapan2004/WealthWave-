import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary with environmental variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload local file to Cloudinary
 * @param {string} filePath - Local temp path of the uploaded file (via multer)
 * @returns {Promise<string>} Secure URL of the uploaded image
 */
export const uploadImage = async (filePath) => {
  const result = await cloudinary.uploader.upload(filePath);
  return result.secure_url;
};
export default { uploadImage };
