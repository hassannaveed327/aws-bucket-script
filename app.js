// app.js
import {checkIfTheresAnImage, downloadImage, uploadImage} from './utils/s3Client.js';
import {convertToWebP} from './imageProcessing/imageProcessing.js';

import chalk from 'chalk';
import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config()

const blogFilePath = './blogs.json';
const listingFilePath = './listings.json';
const landingFilePath = './landingpages.json';

const SOURCE_BUCKET = process.env.AWS_SOURCE_BUCKET;
const DEST_BUCKET = process.env.AWS_DESTINATION_BUCKET;

function getKeyFromUrl(url) {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
}

async function loadDataBlogs() {
    try {
        const data = await fs.readFile(blogFilePath, 'utf-8');
        const parsedData = JSON.parse(data);

        return parsedData.flatMap(item => {
            const img = getKeyFromUrl(item.heroImage);
            const images = item.images?.map(image => getKeyFromUrl(image)) || [];
            return [img, ...images];
        });
    } catch (err) {
        console.error('Error loading JSON:', err);
        return [];
    }
}

async function loadDataListings() {
    try {
        const data = await fs.readFile(listingFilePath, 'utf-8');
        const parsedData = JSON.parse(data);

        return parsedData.flatMap(item => {
            return item.imageUrls?.map(image => getKeyFromUrl(image)) || [];
        });
    } catch (err) {
        console.error('Error loading JSON:', err);
        return [];
    }
}

async function loadDataLandingPages() {
    try {
        const data = await fs.readFile(landingFilePath, 'utf-8');
        const parsedData = JSON.parse(data);

        return parsedData.flatMap(item => {
            const img = getKeyFromUrl(item.heroImage);
            const images = item.slidesUrl?.map(image => getKeyFromUrl(image)) || [];
            return [img, ...images];
        });
    } catch (err) {
        console.error('Error loading JSON:', err);
        return [];
    }
}



async function processImages(objects) {
    let failedKeys = [];
    let totalImages = 0;
    let processedImages = 0;

    try {
        if (objects.length === 0) {
            console.log(chalk.yellow('No objects found in the source bucket.'));
            return;
        }

        // Calculate the total number of images
        totalImages = objects.reduce((sum, object) => sum + object.length, 0);
        console.log(chalk.blue(`Total images to process: ${totalImages}`));

        // Step 2: Process each image object
        for (const object of objects) {
            for (const key of object) {
                try {
                    console.log(chalk.cyan(`Processing image: ${key}`));
                    const checkImageExists = await checkIfTheresAnImage(key, DEST_BUCKET);
                    if (checkImageExists) {
                        console.log(chalk.green(`Image ${key} already exists in bucket ${DEST_BUCKET}. Skipping...`));
                        processedImages++;
                        console.log(chalk.magenta(`Progress: ${processedImages}/${totalImages} images processed.`));
                        continue;
                    }

                    const imageBuffer = await downloadImage(key, SOURCE_BUCKET);
                    const webpBuffer = await convertToWebP(imageBuffer);
                    await uploadImage(webpBuffer, key.replace(/\.[^/.]+$/, '.webp'), DEST_BUCKET);

                    processedImages++;
                    console.log(chalk.magenta(`Progress: ${processedImages}/${totalImages} images processed.`));
                } catch (err) {
                    console.error(chalk.red(`Error processing image ${key}:`, err));
                    failedKeys.push(key);
                }
            }
        }

        console.log(chalk.green('Completed processing all images.','failedKeys',failedKeys.length, 'totalImages' ,totalImages.length, 'processedImages',processedImages.length));
        if (failedKeys.length > 0) {
            console.log(chalk.red('Failed keys:', failedKeys.length));
        }
    } catch (err) {
        console.error(chalk.red('Error processing images:', err));
    }
}
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

export const processImagesHandler = async () => {
    try {
        const blogImages = await loadDataBlogs();
        const listingImages = await loadDataListings();
        const landingPageImages = await loadDataLandingPages();

        let allImages = [...blogImages, ...listingImages, ...landingPageImages];
        allImages = allImages.reverse();

        const chunkSize = 50; // Number of images to process in each chunk
        const imageChunks = chunkArray(allImages, chunkSize);

        console.log(`Total images to process: ${allImages.length}`);
        console.log(`Processing in chunks of ${chunkSize} images.`);

        for (let i = 0; i < imageChunks.length; i++) {
            console.log(`Processing chunk ${i + 1} of ${imageChunks.length}...`);
            await processImages([imageChunks[i]]);
        }

        console.log(chalk.green('All images processed successfully.'));
    } catch (err) {
        console.error(chalk.red('Error processing images:', err));
    }
};

processImagesHandler()
    .then(() => {
        console.log(chalk.green('All images processed successfully.'));
    })
    .catch(err => {
        console.error(chalk.red('Error processing images:', err));
    });