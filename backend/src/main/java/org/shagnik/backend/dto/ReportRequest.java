package org.shagnik.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.shagnik.backend.entity.ReportTargetType;

import java.util.UUID;

public class ReportRequest {

    @NotNull
    private ReportTargetType targetType;

    @NotNull
    private UUID targetId;

    @NotBlank
    @Size(max = 255)
    private String reason;

    public ReportRequest() {}

    public ReportTargetType getTargetType() { return targetType; }
    public void setTargetType(ReportTargetType targetType) { this.targetType = targetType; }

    public UUID getTargetId() { return targetId; }
    public void setTargetId(UUID targetId) { this.targetId = targetId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}