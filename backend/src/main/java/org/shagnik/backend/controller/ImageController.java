package org.shagnik.backend.controller;

import jakarta.validation.Valid;
import org.shagnik.backend.dto.ImageUploadRequest;
import org.shagnik.backend.dto.ImageUploadResponse;
import org.shagnik.backend.entity.User;
import org.shagnik.backend.service.AuthService;
import org.shagnik.backend.service.StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/images")
public class ImageController {

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024; // 10 MB

    private final StorageService storageService;
    private final AuthService authService;

    public ImageController(StorageService storageService, AuthService authService) {
        this.storageService = storageService;
        this.authService = authService;
    }

    @PostMapping("/presign")
    public ResponseEntity<ImageUploadResponse> getPresignedUrl(
            @Valid @RequestBody ImageUploadRequest request,
            Authentication authentication) {

        if (!ALLOWED_CONTENT_TYPES.contains(request.getContentType())) {
            throw new IllegalArgumentException("Unsupported image type: " + request.getContentType());
        }
        if (request.getFileSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File exceeds max allowed size of 10MB");
        }

        User currentUser = authService.getCurrentUser(authentication.getName());

        String objectKey = storageService.generateObjectKey(currentUser.getId(), request.getFileName());
        String uploadUrl = storageService.generatePresignedPutUrl(objectKey, request.getContentType());

        return ResponseEntity.ok(new ImageUploadResponse(objectKey, uploadUrl, "PUT"));
    }
}