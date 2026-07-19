package org.shagnik.backend.dto;

import org.shagnik.backend.entity.NotificationType;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        NotificationType type,
        UUID referencePostId,
        boolean read,
        LocalDateTime createdAt
) {}