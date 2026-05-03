package com.nexusaid.admin.service;

import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.concurrent.TimeUnit;

/**
 * Wraps the MinIO client for file storage operations.
 * Used for: signature images, generated PDFs, report attachments.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final MinioClient minioClient;

    @Value("${minio.bucket:admin-files}")
    private String defaultBucket;

    /**
     * Uploads bytes to MinIO.
     *
     * @param bucket   target bucket name
     * @param key      object key (path within bucket)
     * @param data     raw bytes
     * @param mimeType MIME type, e.g. "image/png" or "application/pdf"
     */
    public void upload(String bucket, String key, byte[] data, String mimeType) {
        try {
            ensureBucketExists(bucket);
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(key)
                    .stream(new ByteArrayInputStream(data), data.length, -1)
                    .contentType(mimeType)
                    .build());
            log.info("Uploaded file to MinIO: bucket={} key={} size={}", bucket, key, data.length);
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file to MinIO [" + bucket + "/" + key + "]", e);
        }
    }

    /**
     * Downloads a file from MinIO and returns its bytes.
     */
    public byte[] download(String bucket, String key) {
        try (InputStream stream = minioClient.getObject(GetObjectArgs.builder()
                .bucket(bucket)
                .object(key)
                .build())) {
            return stream.readAllBytes();
        } catch (Exception e) {
            throw new RuntimeException("Failed to download file from MinIO [" + bucket + "/" + key + "]", e);
        }
    }

    /**
     * Returns a pre-signed URL valid for 1 hour (for frontend display).
     */
    public String getPresignedUrl(String bucket, String key) {
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .bucket(bucket)
                    .object(key)
                    .method(Method.GET)
                    .expiry(1, TimeUnit.HOURS)
                    .build());
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate presigned URL for [" + bucket + "/" + key + "]", e);
        }
    }

    private void ensureBucketExists(String bucket) throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            log.info("Created MinIO bucket: {}", bucket);
        }
    }
}
