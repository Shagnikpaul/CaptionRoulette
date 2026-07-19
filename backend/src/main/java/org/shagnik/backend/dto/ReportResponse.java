package org.shagnik.backend.dto;

import org.shagnik.backend.entity.ReportStatus;
import org.shagnik.backend.entity.ReportTargetType;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReportResponse(
        UUID id,
        ReportTargetType targetType,
        UUID targetId,
        String reporterUsername,
        String reason,
        ReportStatus status,
        LocalDateTime createdAt
) {}