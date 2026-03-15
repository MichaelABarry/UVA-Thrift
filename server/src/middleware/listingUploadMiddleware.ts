import multer from 'multer';
import { HttpError } from '../utils/httpError';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_IMAGE_SIZE_BYTES
    },
    fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
            callback(new HttpError('Please upload a valid image file.', 400));
            return;
        }

        callback(null, true);
    }
});

export const uploadListingImage = upload.single('image');
