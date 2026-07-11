package org.shagnik.backend.dto;

import org.shagnik.backend.entity.PostStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class PostResponse {

    private UUID id;
    private UUID posterId;
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

    public PostResponse() {}

    public PostResponse(UUID id, UUID posterId, String posterUsername, String imageKey,
                        String title, PostStatus status, LocalDateTime createdAt,
                        LocalDateTime lockAt, LocalDateTime settledAt,
                        UUID winningCaptionId,String winningCaptionText,
                        String winningCaptionAuthor, List<String> tags) {
        this.id = id;
        this.posterId = posterId;
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
    }

    public UUID getId() { return id; }
    public UUID getPosterId() { return posterId; }
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
}