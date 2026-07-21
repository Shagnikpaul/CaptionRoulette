package org.shagnik.backend.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "posts")
public class Post {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "poster_id", nullable = false)
    private User poster;

    @Column(name = "image_key", nullable = false)
    private String imageKey;

    @Column(name = "processed_image_key")
    private String processedImageKey;

    @Column(name = "thumbnail_key")
    private String thumbnailKey;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "processing_status", nullable = false, columnDefinition = "processing_status")
    private ProcessingStatus processingStatus = ProcessingStatus.PROCESSING;

    @Column(name = "title")
    private String title;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "post_status")
    private PostStatus status = PostStatus.OPEN;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "lock_at", nullable = false)
    private LocalDateTime lockAt;

    @Column(name = "settled_at")
    private LocalDateTime settledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winning_caption_id")
    private Caption winningCaption;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "post_tags",
            joinColumns = @JoinColumn(name = "post_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<Tag> tags = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "ai_moderation_status", nullable = false, columnDefinition = "ai_moderation_status")
    private AiModerationStatus aiModerationStatus = AiModerationStatus.PENDING;

    @Column(name = "shadow_banned", nullable = false)
    private boolean shadowBanned = false;

    @Column(name = "ai_flag_reason")
    private String aiFlagReason;

    public Post() {}

    public void addTag(Tag tag) {
        this.tags.add(tag);
        tag.getPosts().add(this);
    }

    // --- getters & setters ---

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getPoster() { return poster; }
    public void setPoster(User poster) { this.poster = poster; }

    public String getImageKey() { return imageKey; }
    public void setImageKey(String imageKey) { this.imageKey = imageKey; }

    public String getProcessedImageKey() { return processedImageKey; }
    public void setProcessedImageKey(String processedImageKey) { this.processedImageKey = processedImageKey; }

    public String getThumbnailKey() { return thumbnailKey; }
    public void setThumbnailKey(String thumbnailKey) { this.thumbnailKey = thumbnailKey; }

    public ProcessingStatus getProcessingStatus() { return processingStatus; }
    public void setProcessingStatus(ProcessingStatus processingStatus) { this.processingStatus = processingStatus; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public PostStatus getStatus() { return status; }
    public void setStatus(PostStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getLockAt() { return lockAt; }
    public void setLockAt(LocalDateTime lockAt) { this.lockAt = lockAt; }

    public LocalDateTime getSettledAt() { return settledAt; }
    public void setSettledAt(LocalDateTime settledAt) { this.settledAt = settledAt; }

    public Caption getWinningCaption() {
        return winningCaption;
    }

    public void setWinningCaption(Caption winningCaption) {
        this.winningCaption = winningCaption;
    }

    public Set<Tag> getTags() { return tags; }
    public void setTags(Set<Tag> tags) { this.tags = tags; }

    public AiModerationStatus getAiModerationStatus() { return aiModerationStatus; }
    public void setAiModerationStatus(AiModerationStatus aiModerationStatus) { this.aiModerationStatus = aiModerationStatus; }

    public boolean isShadowBanned() { return shadowBanned; }
    public void setShadowBanned(boolean shadowBanned) { this.shadowBanned = shadowBanned; }

    public String getAiFlagReason() { return aiFlagReason; }
    public void setAiFlagReason(String aiFlagReason) { this.aiFlagReason = aiFlagReason; }
}