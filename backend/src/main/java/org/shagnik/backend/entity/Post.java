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

    // No Caption entity yet — store the raw FK value.
    // TODO: replace with @ManyToOne Caption once that entity exists.
    @Column(name = "winning_caption_id")
    private UUID winningCaptionId;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "post_tags",
            joinColumns = @JoinColumn(name = "post_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<Tag> tags = new HashSet<>();

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

    public UUID getWinningCaptionId() { return winningCaptionId; }
    public void setWinningCaptionId(UUID winningCaptionId) { this.winningCaptionId = winningCaptionId; }

    public Set<Tag> getTags() { return tags; }
    public void setTags(Set<Tag> tags) { this.tags = tags; }
}