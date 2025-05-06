import dotenv from 'dotenv';
dotenv.config();

const str = "https://temp-lym-listing-images.s3.us-east-2.amazonaws.com/7be9af0d-7904-46e5-bf2e-655ffb8fda74";



const updateBucketLink = (str) => {
    const key = str.split(".").pop();
    const initialPath = 'https://'+process.env.AWS_DESTINATION_BUCKET;
    let obj = str.split(".");
     obj[0] = initialPath;

    return obj.join(".");
}



console.log(updateBucketLink(str), 'umgc');