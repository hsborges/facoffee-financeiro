import multer, { diskStorage } from 'multer';
import { join } from 'path';

// Set up storage for uploaded files
const storage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '..', '..', 'data', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, (req.body[file.fieldname] = Date.now() + '-' + file.originalname));
  },
});

// Create the multer instance
export const upload = multer({ storage: storage });
