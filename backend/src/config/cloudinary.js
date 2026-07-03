import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// Product images storage
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'magilini-farms/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
  }
})

// Complaint photos storage
const complaintStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'magilini-farms/complaints',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, quality: 'auto' }]
  }
})

export const uploadProductImages  = multer({ storage: productStorage,  limits: { fileSize: 5 * 1024 * 1024, files: 5 } })
export const uploadComplaintPhotos = multer({ storage: complaintStorage, limits: { fileSize: 5 * 1024 * 1024, files: 3 } })
export { cloudinary }

