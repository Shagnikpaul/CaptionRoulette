package org.shagnik.backend.dto;

import org.shagnik.backend.entity.PostStatus;
import org.shagnik.backend.entity.Tag;

import java.time.LocalDateTime;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public record CachedPost(
        UUID id,
        UUID posterId,
        String posterUsername,
        String imageKey,
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