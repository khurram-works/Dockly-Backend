import multer from 'multer'
import type { Request, Response, NextFunction } from 'express'

// memoryStorage = hold the file in RAM, never touch the disk
// This is what we want — file lives in memory just long enough
// to be sent to R2, then garbage collected automatically
const storage = multer.memoryStorage()

const upload = multer({
  storage,

  limits: {
    fileSize: 50 * 1024 * 1024,
    // Maximum file size: 50MB
    // 50 * 1024 * 1024 = 52,428,800 bytes
    // If the file is bigger, multer rejects it automatically
  },

  fileFilter: (req, file, callback) => {
    // fileFilter runs before the file is accepted
    // callback(error, acceptFile)
    // callback(null, true)  = accept the file
    // callback(null, false) = reject the file

    if (file.mimetype === 'application/pdf') {
      callback(null, true)
      // It's a PDF — accept it
    } else {
      callback(new Error('Only PDF files are allowed'))
      // Not a PDF — reject it with an error message
    }
  },
})

// This is the middleware function you'll use on your route
// upload.single('file') means:
// "expect one file, and it will be in the form field named 'file'"
// After this runs, req.file will contain all the file information
export const uploadMiddleware = upload.single('file')

// A wrapper that handles multer errors nicely
// Without this, multer errors would crash the app or return ugly messages
export const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // MulterError = file too large, too many files, etc.
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
      // Our custom error from fileFilter — "Only PDF files allowed"
      return res.status(400).json({
        success: false,
        message: err.message
      })
    }

    // No errors — file is in req.file, move to the next middleware
    next()
  })
}