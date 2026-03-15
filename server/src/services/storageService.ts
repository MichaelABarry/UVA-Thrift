import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

const s3Client = new S3Client({
    region: env.AWS_REGION
});

function getBucketConfig() {
    if (!env.AWS_REGION || !env.S3_BUCKET_NAME) {
        throw new HttpError('Listing image uploads are not configured.', 500);
    }

    return {
        region: env.AWS_REGION,
        bucketName: env.S3_BUCKET_NAME,
        publicBaseUrl: env.S3_PUBLIC_BASE_URL
    };
}

function buildPublicUrl(key: string) {
    const { bucketName, publicBaseUrl, region } = getBucketConfig();

    if (publicBaseUrl) {
        return `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
    }

    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}

function createObjectKey(originalName: string) {
    const extension = path.extname(originalName).toLowerCase();
    return `listings/${randomUUID()}${extension}`;
}

export async function uploadListingImage(file: Express.Multer.File) {
    const { bucketName } = getBucketConfig();
    const key = createObjectKey(file.originalname);

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            CacheControl: 'public, max-age=31536000, immutable'
        })
    );

    return {
        imageKey: key,
        imageUrl: buildPublicUrl(key)
    };
}

export async function deleteListingImage(imageKey: string | null | undefined) {
    if (!imageKey || !env.AWS_REGION || !env.S3_BUCKET_NAME) {
        return;
    }

    await s3Client.send(
        new DeleteObjectCommand({
            Bucket: env.S3_BUCKET_NAME,
            Key: imageKey
        })
    );
}
