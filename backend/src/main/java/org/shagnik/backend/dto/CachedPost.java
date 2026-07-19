package org.shagnik.backend.dto;

import org.shagnik.backend.entity.PostStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record CachedPost(
        UUID id,
        UUID posterId,
        String posterUsername,
        // Pre-resolved at cache-write time — ready to pass straight into responses
        String detailImageKey,   // processedImageKey ?? imageKey  (used by PostResponse)
        String feedImageKey,     // thumbnailKey ?? imageKey        (used by FeedItemResponse)
        String title,
        PostStatus status,
        LocalDateTime createdAt,
        LocalDateTime lockAt,
        LocalDateTime settledAt,
        UUID winningCaptionId,
        String winningCaptionText,
        String winningCaptionAuthor,
        List<String> tags
) {}