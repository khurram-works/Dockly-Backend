import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import path from "path";

const allowedExtensions = [
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".md",
  ".epub",
  ".html",
  ".csv",
  ".ppt",
  ".pptx",
  ".jpg",
  ".jpeg",
  ".png",
];

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 50 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(extension)) {
      callback(null, true);
    } else {
      callback(new Error("Unsupported File Type"));
    }
  },
});

export const uploadMiddleware = upload.single("file");

export const handleUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 50MB",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    next();
  });
};
