// imageConverter.js
import sharp from 'sharp';

// Function to convert the image buffer to WebP format
export async function convertToWebP(buffer) {
    try {
        return await sharp(buffer)
            .webp()
            .toBuffer();
    } catch (err) {
        console.error('Error converting image to WebP:', err);
        throw err;
    }
}
