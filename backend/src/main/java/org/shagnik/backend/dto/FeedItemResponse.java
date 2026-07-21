package org.shagnik.backend.dto;

import org.shagnik.backend.entity.AiModerationStatus;
import org.shagnik.backend.entity.PostStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class FeedItemResponse {

    private UUID id;
    private String posterUsername;
    private String imageKey;
    private String title;
    private PostStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime lockAt;
    private LocalDateTime settledAt;
    private UUID winningCaptionId;
    private String winningCaptionText;
    private String winningCaptionAuthor;
    private List<String> tags;
    private AiModerationStatus aiModerationStatus;
    private boolean shadowBanned;
    private String aiFlagReason;

    public FeedItemResponse() {}

    public FeedItemResponse(UUID id, String posterUsername, String imageKey, String title,
                            PostStatus status, LocalDateTime createdAt, LocalDateTime lockAt,
                            LocalDateTime settledAt, UUID winningCaptionId, String winningCaptionText,
                            String winningCaptionAuthor, List<String> tags,
                            AiModerationStatus aiModerationStatus, boolean shadowBanned,
                            String aiFlagReason) {
        this.id = id;
        this.posterUsername = posterUsername;
        this.imageKey = imageKey;
        this.title = title;
        this.status = status;
        this.createdAt = createdAt;
        this.lockAt = lockAt;
        this.settledAt = settledAt;
        this.winningCaptionId = winningCaptionId;
        this.winningCaptionText = winningCaptionText;
        this.winningCaptionAuthor = winningCaptionAuthor;
        this.tags = tags;
        this.aiModerationStatus = aiModerationStatus;
        this.shadowBanned = shadowBanned;
        this.aiFlagReason = aiFlagReason;
    }

    public UUID getId() { return id; }
    public String getPosterUsername() { return posterUsername; }
    public String getImageKey() { return imageKey; }
    public String getTitle() { return title; }
    public PostStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getLockAt() { return lockAt; }
    public LocalDateTime getSettledAt() { return settledAt; }
    public UUID getWinningCaptionId() { return winningCaptionId; }
    public String getWinningCaptionText() { return winningCaptionText; }
    public String getWinningCaptionAuthor() { return winningCaptionAuthor; }
    public List<String> getTags() { return tags; }
    public AiModerationStatus getAiModerationStatus() { return aiModerationStatus; }
    public boolean isShadowBanned() { return shadowBanned; }
    public String getAiFlagReason() { return aiFlagReason; }
}