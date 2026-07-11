package org.shagnik.backend.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class SelectWinnerRequest {

    @NotNull
    private UUID captionId;

    public SelectWinnerRequest() {}

    public UUID getCaptionId() { return captionId; }
    public void setCaptionId(UUID captionId) { this.captionId = captionId; }
}