package org.shagnik.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.UUID;

@Service
public class StorageService {

    private final S3Presigner s3Presigner;

    @Value("${aws.s3_bucket}")
    private String bucketName;

    private static final Duration PRESIGN_DURATION = Duration.ofMinutes(15);

    public StorageService(S3Presigner s3Presigner) {
        this.s3Presigner = s3Presigner;
    }

    // users/{userId}/{random_uuid}.ext
    public String generateObjectKey(UUID userId, String originalFileName) {
        return "users/" + userId + "/" + UUID.randomUUID() + extractExtension(originalFileName);
    }

    private String extractExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex == -1 || dotIndex == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dotIndex).toLowerCase();
    }

    public String generatePresignedPutUrl(String objectKey, String contentType) {
        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(PRESIGN_DURATION)
                .putObjectRequest(objectRequest)
                .build();

        return s3Presigner.presignPutObject(presignRequest).url().toString();
    }
}