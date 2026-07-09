import multer from 'multer'
import type { Request, Response, NextFunction } from 'express'

const storage = multer.memoryStorage()

const upload = multer({
  storage,

  limits: {
    fileSize: 50 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {

    if (file.mimetype === 'application/pdf') {
      callback(null, true)
    } else {
      callback(new Error('Only PDF files are allowed'))
    }
  },
})

export const uploadMiddleware = upload.single('file')

export const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 50MB'
        })
      }
      return res.status(400).json({
        success: false,
        message: err.message
      })
    }

    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      })
    }

    next()
  })
}