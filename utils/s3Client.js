import {GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();


const s3Client = new S3Client({
        credentials: {
            accessKeyId: process.env.AWS_S3_INTERACTER_ACCESS_TOKEN,
            secretAccessKey: process.env.AWS_S3_INTERACTER_SECRET_TOKEN,
        },
        region: 'us-east-2',
});


// Function to download an image from the source bucket
export async function downloadImage(key, bucketName) {
    const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
    });

    try {
        const data = await s3Client.send(getObjectCommand);
        const stream = data.Body;

        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        return Buffer.concat(chunks);
    } catch (err) {
        console.error('Error downloading image:', err);
        throw err;
    }
}

export async function uploadImage(buffer, key, bucketName) {
    try {

        // Upload the file if it doesn't exist
        const putObjectCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: 'image/webp',
        });

        await s3Client.send(putObjectCommand);
        console.log(`Successfully uploaded ${key} to ${bucketName}`);
    } catch (err) {
        console.error(`Error uploading ${key}:`, err);
        throw err;
    }
}

export function checkIfTheresAnImage(key, bucketName) {
    const headObjectCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
    });

    return s3Client.send(headObjectCommand)
        .then(() => true)
        .catch((err) => {
            if (err.name === 'NotFound') {
                return false
            }
            throw err;
        });
}

